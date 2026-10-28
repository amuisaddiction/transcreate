import { Router } from 'express';

export const marketsRouter = Router();

export interface MarketPreset {
  id: string;
  name: string;
  country: string;
  culturalContext: string;
  tested: boolean;
}

const TESTED_MARKETS: MarketPreset[] = [
  {
    id: 'mumbai',
    name: 'Mumbai',
    country: 'India',
    culturalContext: 'Commercial & entertainment capital; high affinity for Bollywood, Hindi comedy, and urban youth nostalgia.',
    tested: true,
  },
  {
    id: 'bengaluru',
    name: 'Bengaluru',
    country: 'India',
    culturalContext: 'Tech ecosystem hub; bilingual urban culture with heavy indie content and startup-centric references.',
    tested: true,
  },
  {
    id: 'london',
    name: 'London',
    country: 'United Kingdom',
    culturalContext: 'Cosmopolitan European cultural center; dry British humour, classic sitcoms, and indie music scenes.',
    tested: true,
  },
  {
    id: 'new_york',
    name: 'New York',
    country: 'United States',
    culturalContext: 'High-density metropolitan market; Broadway, American sitcoms, and fast-paced urban lifestyle branding.',
    tested: true,
  },
];

marketsRouter.get('/markets', (_req, res) => {
  res.json({
    markets: TESTED_MARKETS,
    note: 'Market presets verified against Qloo location queries and cultural intelligence affinity signals.',
  });
});
