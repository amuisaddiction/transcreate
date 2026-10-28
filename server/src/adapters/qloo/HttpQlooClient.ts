import { randomUUID } from 'node:crypto';
import { Candidate, QlooEntity, QlooObservation, ReferenceKind } from '../../agent/contracts.js';
import { redactSecret } from '../../config.js';
import { IQlooClient, QlooDiscoveryResult, QlooHealthResult, QlooRankingResult, QlooResolutionResult } from './QlooClient.js';

const KIND_TO_URN: Record<ReferenceKind, string> = {
  movie: 'urn:entity:movie',
  tv: 'urn:entity:tv_show',
  artist: 'urn:entity:artist',
  brand: 'urn:entity:brand',
};

export class HttpQlooClient implements IQlooClient {
  readonly mode = 'live' as const;
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(apiKey: string, baseUrl: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  private mapKindToUrn(kind?: ReferenceKind): string | undefined {
    return kind ? KIND_TO_URN[kind] : undefined;
  }

  private async fetchWithRetry<T>(
    path: string,
    params: Record<string, string | number | boolean | undefined>,
    operationName: string
  ): Promise<{ data: T; latencyMs: number; observationId: string }> {
    const observationId = `obs_${randomUUID().slice(0, 12)}`;
    const url = new URL(`${this.baseUrl}${path}`);

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }

    const maxAttempts = 2;
    let lastError: unknown;
    const start = Date.now();

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            'X-Api-Key': this.apiKey,
            'Accept': 'application/json',
            'User-Agent': 'Transcreate-Studio/1.0.0',
            'X-Correlation-Id': observationId,
          },
          signal: AbortSignal.timeout(12000),
        });

        const latencyMs = Date.now() - start;

        if (response.status === 401 || response.status === 403) {
          throw new Error(`Qloo authentication failed (HTTP ${response.status}). Verify credentials.`);
        }

        if (response.status === 429) {
          if (attempt < maxAttempts) {
            await new Promise((r) => setTimeout(r, 1000));
            continue;
          }
          throw new Error('Qloo rate limit exceeded (HTTP 429).');
        }

        if (!response.ok) {
          throw new Error(`Qloo API request failed with status ${response.status}`);
        }

        const data = (await response.json()) as T;
        return { data, latencyMs, observationId };
      } catch (err: any) {
        lastError = err;
        if (attempt < maxAttempts && !err.message?.includes('authentication')) {
          await new Promise((r) => setTimeout(r, 600));
        }
      }
    }

    throw lastError ?? new Error(`Qloo operation ${operationName} failed`);
  }

  async healthCheck(): Promise<QlooHealthResult> {
    try {
      const { data, latencyMs } = await this.fetchWithRetry<any>(
        '/search',
        { query: 'Friends', take: 1 },
        'healthCheck'
      );

      const hasEntities = Boolean(data?.results?.entities?.length);
      return {
        ok: true,
        message: hasEntities ? 'Qloo live connectivity verified' : 'Connected to Qloo API',
        latencyMs,
        mode: 'live',
      };
    } catch (err: any) {
      return {
        ok: false,
        message: err.message ? err.message.replace(this.apiKey, '[REDACTED]') : 'Qloo connection failed',
        latencyMs: 0,
        mode: 'live',
      };
    }
  }

  async resolveEntity(input: string, kind?: ReferenceKind): Promise<QlooResolutionResult> {
    const urn = this.mapKindToUrn(kind);
    const { data, latencyMs, observationId } = await this.fetchWithRetry<any>(
      '/search',
      { query: input, ...(urn ? { types: urn } : {}), take: 5 },
      'resolveEntity'
    );

    const entities: QlooEntity[] = Array.isArray(data?.results?.entities)
      ? data.results.entities.map((e: any) => ({
          id: e.id || e.entity_id,
          name: e.name,
          type: e.type,
          subtype: e.subtype,
          popularity: typeof e.popularity === 'number' ? e.popularity : undefined,
          properties: e.properties,
        }))
      : [];

    const observation: QlooObservation = {
      id: observationId,
      operation: 'searchEntities',
      endpoint: '/search',
      argsRedacted: { query: input, types: urn, take: 5 },
      responseSummary: {
        count: entities.length,
        topMatch: entities[0]?.name,
        topId: entities[0]?.id,
      },
      latencyMs,
      timestamp: new Date().toISOString(),
      cacheHit: false,
      isSynthetic: false,
    };

    if (entities.length === 0) {
      return { status: 'not_found', observation };
    }

    const normalizedInput = input.trim().toLowerCase();
    const exactMatches = entities.filter((e) => e.name.toLowerCase() === normalizedInput);

    if (exactMatches.length === 1) {
      return { status: 'resolved', entity: exactMatches[0], observation };
    }

    if (entities.length > 1 && !exactMatches.length) {
      // Check if top match is very close
      const top = entities[0];
      if (top.name.toLowerCase().includes(normalizedInput) || normalizedInput.includes(top.name.toLowerCase())) {
        return { status: 'resolved', entity: top, observation };
      }
      return { status: 'ambiguous', candidates: entities.slice(0, 4), observation };
    }

    return { status: 'resolved', entity: entities[0], observation };
  }

  async discoverCandidates(params: {
    referenceEntity: QlooEntity;
    targetKind: ReferenceKind;
    market: string;
    limit?: number;
  }): Promise<QlooDiscoveryResult> {
    const urn = this.mapKindToUrn(params.targetKind);
    const take = params.limit ?? 6;

    const { data, latencyMs, observationId } = await this.fetchWithRetry<any>(
      '/v2/insights',
      {
        'filter.type': urn,
        'signal.interests.entities': params.referenceEntity.id,
        'signal.location.query': params.market,
        'take': take,
        'feature.explainability': true,
      },
      'discoverCandidates'
    );

    const rawList = Array.isArray(data?.results?.entities) ? data.results.entities : [];
    const candidates: Candidate[] = rawList.map((e: any) => ({
      id: e.id || e.entity_id,
      name: e.name,
      kind: params.targetKind,
      popularity: typeof e.popularity === 'number' ? e.popularity : undefined,
      affinity: typeof e.query?.affinity === 'number' ? e.query.affinity : (typeof e.affinity === 'number' ? e.affinity : undefined),
      properties: e.properties,
      sourceObservationId: observationId,
    }));

    const observation: QlooObservation = {
      id: observationId,
      operation: 'insights',
      endpoint: '/v2/insights',
      argsRedacted: {
        filterType: urn,
        signalEntityId: params.referenceEntity.id,
        location: params.market,
        take,
      },
      responseSummary: {
        candidatesFound: candidates.length,
        topCandidate: candidates[0]?.name,
        topAffinity: candidates[0]?.affinity,
      },
      latencyMs,
      timestamp: new Date().toISOString(),
      cacheHit: false,
      isSynthetic: false,
    };

    return { candidates, observation };
  }

  async rankCandidates(params: {
    candidateIds: string[];
    referenceEntityId: string;
    targetKind: ReferenceKind;
    market: string;
  }): Promise<QlooRankingResult> {
    const urn = this.mapKindToUrn(params.targetKind);
    const { data, latencyMs, observationId } = await this.fetchWithRetry<any>(
      '/v2/insights',
      {
        'filter.type': urn,
        'filter.results.entities': params.candidateIds.join(','),
        'signal.interests.entities': params.referenceEntityId,
        'signal.location.query': params.market,
        'take': params.candidateIds.length,
      },
      'rankCandidates'
    );

    const rawList = Array.isArray(data?.results?.entities) ? data.results.entities : [];
    const rankedCandidates: Candidate[] = rawList.map((e: any) => ({
      id: e.id || e.entity_id,
      name: e.name,
      kind: params.targetKind,
      popularity: typeof e.popularity === 'number' ? e.popularity : undefined,
      affinity: typeof e.query?.affinity === 'number' ? e.query.affinity : undefined,
      properties: e.properties,
      sourceObservationId: observationId,
    }));

    const observation: QlooObservation = {
      id: observationId,
      operation: 'rank',
      endpoint: '/v2/insights',
      argsRedacted: {
        candidateCount: params.candidateIds.length,
        referenceEntityId: params.referenceEntityId,
        location: params.market,
      },
      responseSummary: {
        rankedCount: rankedCandidates.length,
        topRanked: rankedCandidates[0]?.name,
      },
      latencyMs,
      timestamp: new Date().toISOString(),
      cacheHit: false,
      isSynthetic: false,
    };

    return { rankedCandidates, observation };
  }
}
