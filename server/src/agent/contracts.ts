import { z } from 'zod';

export type ReferenceKind = 'movie' | 'tv' | 'artist' | 'brand';
export type DecisionAction = 'swap' | 'keep' | 'unresolved';
export type ReferenceStatus = 'kept' | 'swapped' | 'unresolved' | 'ambiguous';

export interface ExtractedReference {
  id: string;
  originalText: string;
  span: [number, number];
  kind: ReferenceKind;
  contextSentence: string;
}

export interface QlooEntity {
  id: string;
  name: string;
  type: string;
  subtype?: string;
  popularity?: number;
  affinity?: number;
  properties?: {
    description?: string;
    short_description?: string;
    release_year?: number;
    image?: string;
  };
  query?: {
    affinity?: number;
    explainability?: Record<string, unknown>;
  };
}

export interface QlooObservation {
  id: string;
  operation: string;
  endpoint: string;
  argsRedacted: Record<string, unknown>;
  responseSummary: Record<string, unknown>;
  latencyMs: number;
  timestamp: string;
  cacheHit: boolean;
  isSynthetic: boolean;
}

export interface Candidate {
  id: string;
  name: string;
  kind: ReferenceKind;
  popularity?: number;
  affinity?: number;
  properties?: {
    description?: string;
    release_year?: number;
  };
  sourceObservationId: string;
}

export interface RejectedCandidate {
  candidateId: string;
  candidateName: string;
  reason: string;
}

export interface ReferenceDecision {
  referenceId: string;
  originalText: string;
  kind: ReferenceKind;
  action: DecisionAction;
  chosenCandidate?: Candidate;
  reason: string;
  rejectedCandidates: RejectedCandidate[];
  evidenceObservationIds: string[];
  modelInterpretation: string;
  ambiguousChoices?: Array<{ id: string; name: string; popularity?: number }>;
}

export interface EditSpan {
  type: 'text' | 'kept' | 'swapped' | 'unresolved';
  originalText: string;
  replacementText?: string;
  referenceId?: string;
}

export interface EvidenceReceipt {
  referenceId: string;
  originalReference: string;
  action: DecisionAction;
  chosenReplacement?: string;
  qlooObservation?: {
    observationId: string;
    operation: string;
    endpoint: string;
    entityId?: string;
    entityName?: string;
    popularity?: number;
    affinity?: number;
    rawExcerpt: Record<string, unknown>;
    isSynthetic: boolean;
  };
  modelInterpretation: string;
  decisionReason: string;
  limitations: string;
  provenance: {
    timestamp: string;
    observationIds: string[];
  };
}

export interface TraceEvent {
  id: string;
  timestamp: string;
  stage: 'extraction' | 'resolution' | 'discovery' | 'ranking' | 'decision' | 'rewrite' | 'verification';
  status: 'info' | 'success' | 'warning' | 'error';
  message: string;
  durationMs?: number;
  details?: Record<string, unknown>;
}

export interface LocalizationResult {
  originalCopy: string;
  transcreatedCopy: string;
  edits: EditSpan[];
  decisions: ReferenceDecision[];
  receipts: EvidenceReceipt[];
  trace: TraceEvent[];
  mode: 'live' | 'sample';
  verified: boolean;
  retryCount: number;
  executionTimeMs: number;
}

export const LocalizeRequestSchema = z.object({
  copy: z.string().min(1, 'Copy is required').max(900, 'Copy cannot exceed 900 characters'),
  market: z.string().min(1, 'Target market is required').default('Mumbai'),
  audienceDemographic: z.string().optional(),
});

export type LocalizeRequest = z.infer<typeof LocalizeRequestSchema>;
