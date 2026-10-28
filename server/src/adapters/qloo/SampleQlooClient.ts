import { randomUUID } from 'node:crypto';
import { Candidate, QlooEntity, QlooObservation, ReferenceKind } from '../../agent/contracts.js';
import { IQlooClient, QlooDiscoveryResult, QlooHealthResult, QlooRankingResult, QlooResolutionResult } from './QlooClient.js';

interface FixtureDatabase {
  entities: Record<string, QlooEntity>;
  marketCandidates: Record<string, Record<string, Array<{ name: string; affinity: number; popularity: number; desc: string }>>>;
}

const FIXTURES: FixtureDatabase = {
  entities: {
    'friends': {
      id: 'syn_entity_friends_tv',
      name: 'Friends',
      type: 'urn:entity:tv_show',
      subtype: 'Sitcom',
      popularity: 0.95,
      properties: {
        description: 'Iconic 90s ensemble sitcom following six friends in Manhattan.',
        release_year: 1994,
      },
    },
    'seinfeld': {
      id: 'syn_entity_seinfeld_tv',
      name: 'Seinfeld',
      type: 'urn:entity:tv_show',
      subtype: 'Sitcom',
      popularity: 0.92,
      properties: {
        description: 'Comedy series revolving around four single friends in New York.',
        release_year: 1989,
      },
    },
    'succession': {
      id: 'syn_entity_succession_tv',
      name: 'Succession',
      type: 'urn:entity:tv_show',
      subtype: 'Drama',
      popularity: 0.91,
      properties: {
        description: 'Satirical drama about the dysfunctional Roy family media dynasty.',
        release_year: 2018,
      },
    },
    'taylor swift': {
      id: 'syn_entity_taylorswift_artist',
      name: 'Taylor Swift',
      type: 'urn:entity:artist',
      subtype: 'Pop',
      popularity: 0.98,
      properties: {
        description: 'Global pop superstar and singer-songwriter.',
      },
    },
    'nike': {
      id: 'syn_entity_nike_brand',
      name: 'Nike',
      type: 'urn:entity:brand',
      subtype: 'Sportswear',
      popularity: 0.97,
      properties: {
        description: 'Leading global athletic footwear and apparel brand.',
      },
    },
  },
  marketCandidates: {
    'syn_entity_friends_tv': {
      'mumbai': [
        {
          name: 'Sarabhai vs Sarabhai',
          affinity: 0.88,
          popularity: 0.85,
          desc: 'Cult classic Indian ensemble comedy centered on a delightfully chaotic family dynamic.',
        },
        {
          name: 'Taarak Mehta Ka Ooltah Chashmah',
          affinity: 0.81,
          popularity: 0.92,
          desc: 'Long-running neighborhood community comedy beloved across households.',
        },
        {
          name: 'Office Office',
          affinity: 0.74,
          popularity: 0.79,
          desc: 'Celebrated workplace satire highlighting social absurdities with beloved characters.',
        },
      ],
      'bengaluru': [
        {
          name: 'Sarabhai vs Sarabhai',
          affinity: 0.85,
          popularity: 0.84,
          desc: 'Cult classic urban ensemble comedy with massive tech-worker nostalgia.',
        },
        {
          name: 'Permanent Roommates',
          affinity: 0.82,
          popularity: 0.78,
          desc: 'Pioneering Indian modern urban relationship comedy web series.',
        },
      ],
      'london': [
        {
          name: 'Peep Show',
          affinity: 0.87,
          popularity: 0.82,
          desc: 'Cult British flatmate comedy exploring existential neuroses and friendship.',
        },
        {
          name: 'The Inbetweeners',
          affinity: 0.84,
          popularity: 0.86,
          desc: 'Beloved coming-of-age ensemble comedy capturing British cultural milestones.',
        },
        {
          name: 'Spaced',
          affinity: 0.79,
          popularity: 0.75,
          desc: 'Creative London flatmate sitcom brimming with pop culture homages.',
        },
      ],
      'new york': [
        {
          name: 'Broad City',
          affinity: 0.89,
          popularity: 0.83,
          desc: 'Authentic modern NYC friendship comedy navigating metropolitan survival.',
        },
        {
          name: 'How I Met Your Mother',
          affinity: 0.85,
          popularity: 0.88,
          desc: 'Manhattan-based friend group sitcom exploring modern romance and loyalty.',
        },
      ],
    },
    'syn_entity_succession_tv': {
      'mumbai': [
        {
          name: 'Scam 1992',
          affinity: 0.91,
          popularity: 0.89,
          desc: 'Gripping financial saga depicting high-stakes ambition and corporate maneuvering.',
        },
      ],
    },
  },
};

export class SampleQlooClient implements IQlooClient {
  readonly mode = 'sample' as const;

  async healthCheck(): Promise<QlooHealthResult> {
    return {
      ok: true,
      message: 'Running in SAMPLE mode (offline synthetic fixtures). Add QLOO_API_KEY for live data.',
      latencyMs: 12,
      mode: 'sample',
    };
  }

  async resolveEntity(input: string, kind?: ReferenceKind): Promise<QlooResolutionResult> {
    const key = input.trim().toLowerCase();
    const found = FIXTURES.entities[key];
    const observationId = `syn_obs_${randomUUID().slice(0, 10)}`;

    const observation: QlooObservation = {
      id: observationId,
      operation: 'sample_search',
      endpoint: '/search (SYNTHETIC FIXTURE)',
      argsRedacted: { query: input, kind },
      responseSummary: { match: Boolean(found), entityName: found?.name },
      latencyMs: 25,
      timestamp: new Date().toISOString(),
      cacheHit: false,
      isSynthetic: true,
    };

    if (found) {
      return { status: 'resolved', entity: found, observation };
    }

    // Return synthetic fallback entity
    const fallback: QlooEntity = {
      id: `syn_entity_${key.replace(/[^a-z0-9]/g, '_')}`,
      name: input,
      type: kind ? `urn:entity:${kind}` : 'urn:entity:culture',
      popularity: 0.75,
      properties: {
        description: `Synthetic entity representation for ${input}`,
      },
    };

    return { status: 'resolved', entity: fallback, observation };
  }

  async discoverCandidates(params: {
    referenceEntity: QlooEntity;
    targetKind: ReferenceKind;
    market: string;
    limit?: number;
  }): Promise<QlooDiscoveryResult> {
    const marketKey = params.market.toLowerCase();
    const entityKey = params.referenceEntity.id;
    const candidatesList = FIXTURES.marketCandidates[entityKey]?.[marketKey] || [];
    const observationId = `syn_obs_${randomUUID().slice(0, 10)}`;

    const candidates: Candidate[] = candidatesList.map((item, idx) => ({
      id: `syn_cand_${idx}_${item.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      name: item.name,
      kind: params.targetKind,
      popularity: item.popularity,
      affinity: item.affinity,
      properties: { description: item.desc },
      sourceObservationId: observationId,
    }));

    const observation: QlooObservation = {
      id: observationId,
      operation: 'sample_insights_recommend',
      endpoint: '/v2/insights (SYNTHETIC FIXTURE)',
      argsRedacted: {
        signalEntity: params.referenceEntity.name,
        market: params.market,
        targetKind: params.targetKind,
      },
      responseSummary: {
        syntheticCandidatesCount: candidates.length,
        market: params.market,
      },
      latencyMs: 38,
      timestamp: new Date().toISOString(),
      cacheHit: false,
      isSynthetic: true,
    };

    return { candidates, observation };
  }

  async rankCandidates(params: {
    candidateIds: string[];
    referenceEntityId: string;
    targetKind: ReferenceKind;
    market: string;
  }): Promise<QlooRankingResult> {
    const observationId = `syn_obs_${randomUUID().slice(0, 10)}`;
    const observation: QlooObservation = {
      id: observationId,
      operation: 'sample_insights_rank',
      endpoint: '/v2/insights (SYNTHETIC FIXTURE)',
      argsRedacted: {
        candidateCount: params.candidateIds.length,
        market: params.market,
      },
      responseSummary: { note: 'Ranked synthetic candidate set' },
      latencyMs: 30,
      timestamp: new Date().toISOString(),
      cacheHit: false,
      isSynthetic: true,
    };

    return { rankedCandidates: [], observation };
  }
}
