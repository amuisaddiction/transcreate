import { Candidate, QlooEntity, QlooObservation, ReferenceKind } from '../../agent/contracts.js';

export interface QlooResolutionResult {
  entity?: QlooEntity;
  status: 'resolved' | 'ambiguous' | 'not_found';
  candidates?: QlooEntity[];
  observation: QlooObservation;
}

export interface QlooDiscoveryResult {
  candidates: Candidate[];
  observation: QlooObservation;
}

export interface QlooRankingResult {
  rankedCandidates: Candidate[];
  observation: QlooObservation;
}

export interface QlooHealthResult {
  ok: boolean;
  message: string;
  latencyMs: number;
  mode: 'live' | 'sample';
}

export interface IQlooClient {
  readonly mode: 'live' | 'sample';
  healthCheck(): Promise<QlooHealthResult>;
  resolveEntity(input: string, kind?: ReferenceKind): Promise<QlooResolutionResult>;
  discoverCandidates(params: {
    referenceEntity: QlooEntity;
    targetKind: ReferenceKind;
    market: string;
    limit?: number;
  }): Promise<QlooDiscoveryResult>;
  rankCandidates(params: {
    candidateIds: string[];
    referenceEntityId: string;
    targetKind: ReferenceKind;
    market: string;
  }): Promise<QlooRankingResult>;
}
