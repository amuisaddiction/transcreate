import { randomUUID } from 'node:crypto';
import { Candidate, ExtractedReference, QlooEntity, ReferenceDecision, ReferenceKind } from '../../agent/contracts.js';
import { config } from '../../config.js';
import { EvaluationResult, ILLMClient } from './LLMClient.js';

const KNOWN_PATTERNS: Array<{ regex: RegExp; kind: ReferenceKind; name: string }> = [
  { regex: /\bFriends\b/i, kind: 'tv', name: 'Friends' },
  { regex: /\bSeinfeld\b/i, kind: 'tv', name: 'Seinfeld' },
  { regex: /\bSuccession\b/i, kind: 'tv', name: 'Succession' },
  { regex: /\bThe Office\b/i, kind: 'tv', name: 'The Office' },
  { regex: /\bGame of Thrones\b/i, kind: 'tv', name: 'Game of Thrones' },
  { regex: /\bBreaking Bad\b/i, kind: 'tv', name: 'Breaking Bad' },
  { regex: /\bTaylor Swift\b/i, kind: 'artist', name: 'Taylor Swift' },
  { regex: /\bBeyoncé\b/i, kind: 'artist', name: 'Beyoncé' },
  { regex: /\bDrake\b/i, kind: 'artist', name: 'Drake' },
  { regex: /\bNike\b/i, kind: 'brand', name: 'Nike' },
  { regex: /\bApple\b/i, kind: 'brand', name: 'Apple' },
  { regex: /\bStarbucks\b/i, kind: 'brand', name: 'Starbucks' },
  { regex: /\bInception\b/i, kind: 'movie', name: 'Inception' },
  { regex: /\bThe Godfather\b/i, kind: 'movie', name: 'The Godfather' },
  { regex: /\bBarbie\b/i, kind: 'movie', name: 'Barbie' },
];

export class ProviderLLMClient implements ILLMClient {
  private readonly apiKey: string;
  private readonly provider: string;

  constructor(apiKey = config.llmApiKey, provider = config.llmProvider) {
    this.apiKey = apiKey;
    this.provider = provider;
  }

  async extractReferences(copy: string): Promise<ExtractedReference[]> {
    if (this.apiKey && this.provider === 'gemini') {
      try {
        const result = await this.extractWithGemini(copy);
        if (result.length > 0) return result;
      } catch (err) {
        console.warn('Gemini extraction failed, falling back to deterministic extraction:', err);
      }
    }

    return this.extractDeterministically(copy);
  }

  private extractDeterministically(copy: string): ExtractedReference[] {
    const references: ExtractedReference[] = [];
    const lower = copy.toLowerCase();

    for (const pattern of KNOWN_PATTERNS) {
      const match = pattern.regex.exec(copy);
      if (match) {
        const start = match.index;
        const end = start + match[0].length;
        const sentenceMatch = copy.slice(Math.max(0, start - 40), Math.min(copy.length, end + 40));

        // Avoid duplicate overlapping spans
        const overlaps = references.some((r) => !(end <= r.span[0] || start >= r.span[1]));
        if (!overlaps) {
          references.push({
            id: `ref_${randomUUID().slice(0, 8)}`,
            originalText: match[0],
            span: [start, end],
            kind: pattern.kind,
            contextSentence: sentenceMatch.trim(),
          });
        }
      }

      if (references.length >= 6) break;
    }

    return references;
  }

  private async extractWithGemini(copy: string): Promise<ExtractedReference[]> {
    const prompt = `Identify cultural references (movies, tv shows, artists, brands) in this text.
Return ONLY a valid JSON object matching this schema:
{
  "references": [
    {
      "originalText": "exact text from source",
      "kind": "movie" | "tv" | "artist" | "brand"
    }
  ]
}

Source text: "${copy}"`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);
    const data = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return [];

    const parsed = JSON.parse(rawText);
    const list = Array.isArray(parsed.references) ? parsed.references : [];

    const results: ExtractedReference[] = [];
    for (const item of list) {
      const idx = copy.indexOf(item.originalText);
      if (idx !== -1) {
        results.push({
          id: `ref_${randomUUID().slice(0, 8)}`,
          originalText: item.originalText,
          span: [idx, idx + item.originalText.length],
          kind: item.kind,
          contextSentence: copy,
        });
      }
      if (results.length >= 6) break;
    }

    return results;
  }

  async evaluateCandidates(params: {
    copy: string;
    targetMarket: string;
    reference: ExtractedReference;
    originalEntity?: QlooEntity;
    candidates: Candidate[];
  }): Promise<EvaluationResult> {
    const { reference, candidates, targetMarket } = params;

    if (!candidates || candidates.length === 0) {
      return {
        action: 'keep',
        reason: `Qloo returned no alternative candidates for "${reference.originalText}" in ${targetMarket}. Retaining original copy.`,
        modelInterpretation: 'Without verified cultural intelligence data, an automated substitution cannot be defended.',
        rejectedCandidates: [],
      };
    }

    // Sort candidates by affinity desc
    const sorted = [...candidates].sort((a, b) => (b.affinity ?? 0) - (a.affinity ?? 0));
    const top = sorted[0];

    // If highest affinity is low (< 0.70), prefer keep
    if (!top || (top.affinity !== undefined && top.affinity < 0.70)) {
      return {
        action: 'keep',
        reason: `Available alternatives in ${targetMarket} had insufficient audience affinity (< 0.70) to warrant altering the original copy.`,
        modelInterpretation: 'Evidence threshold not met. The original reference communicates intent better than a weak substitute.',
        rejectedCandidates: sorted.map((c) => ({
          candidateId: c.id,
          candidateName: c.name,
          reason: `Affinity ${(c.affinity ? (c.affinity * 100).toFixed(0) : 'unknown')}% is below threshold.`,
        })),
      };
    }

    const rejected = sorted.slice(1).map((c) => ({
      candidateId: c.id,
      candidateName: c.name,
      reason: `Ranked below top candidate (affinity ${(c.affinity ? (c.affinity * 100).toFixed(0) : 'unknown')}%).`,
    }));

    return {
      action: 'swap',
      chosenCandidateId: top.id,
      reason: `Qloo affinity index of ${(top.affinity! * 100).toFixed(0)}% demonstrates strong cultural resonance in ${targetMarket} for ${reference.kind} references.`,
      modelInterpretation: `Adapting "${reference.originalText}" to "${top.name}" preserves the thematic tone of a beloved cultural milestone while grounding it in ${targetMarket}'s cultural vocabulary.`,
      rejectedCandidates: rejected,
    };
  }

  async rewriteCopy(params: {
    originalCopy: string;
    targetMarket: string;
    decisions: ReferenceDecision[];
  }): Promise<string> {
    let result = params.originalCopy;

    // Apply substitutions in reverse position order so earlier indices remain valid
    const swaps = params.decisions
      .filter((d) => d.action === 'swap' && d.chosenCandidate)
      .sort((a, b) => params.originalCopy.indexOf(b.originalText) - params.originalCopy.indexOf(a.originalText));

    for (const swap of swaps) {
      const candidateName = swap.chosenCandidate!.name;
      // Replace only whole phrase occurrences
      result = result.replace(swap.originalText, candidateName);
    }

    return result;
  }
}
