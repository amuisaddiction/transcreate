import { Candidate, ExtractedReference, QlooEntity, ReferenceDecision } from '../../agent/contracts.js';

export interface EvaluationResult {
  action: 'swap' | 'keep' | 'unresolved';
  chosenCandidateId?: string;
  reason: string;
  modelInterpretation: string;
  rejectedCandidates: Array<{
    candidateId: string;
    candidateName: string;
    reason: string;
  }>;
}

export interface ILLMClient {
  extractReferences(copy: string): Promise<ExtractedReference[]>;
  evaluateCandidates(params: {
    copy: string;
    targetMarket: string;
    reference: ExtractedReference;
    originalEntity?: QlooEntity;
    candidates: Candidate[];
  }): Promise<EvaluationResult>;
  rewriteCopy(params: {
    originalCopy: string;
    targetMarket: string;
    decisions: ReferenceDecision[];
  }): Promise<string>;
}
