// packages/schemas/meta.ts
import { z } from 'zod';

export const CountryCode = z.enum(['SA', 'KW', 'QA', 'JO', 'AE', 'BH', 'OM']);
export const CampaignObjective = z.enum([
  'OUTCOME_LEADS',
  'OUTCOME_SALES',
  'OUTCOME_AWARENESS',
  'OUTCOME_TRAFFIC',
  'OUTCOME_ENGAGEMENT',
]);
export const AdLanguage = z.enum(['ar', 'en', 'both']);
export const AdStatus = z.enum(['ACTIVE', 'PAUSED', 'DELETED', 'ARCHIVED']);

export const CampaignBriefSchema = z.object({
  brand: z.string().min(1).max(100),
  product: z.string().min(1).max(200),
  objective: CampaignObjective,
  dailyBudgetUSD: z.number().min(5).max(10000),
  targetCountries: z.array(CountryCode).min(1),
  targetAgeMin: z.number().min(18).max(64),
  targetAgeMax: z.number().min(19).max(65),
  targetGender: z.enum(['male', 'female', 'all']).default('all'),
  language: AdLanguage,
  tone: z.enum(['luxury', 'urgent', 'friendly', 'professional', 'playful']).default('professional'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  pixelId: z.string().optional(),
  destinationUrl: z.string().url().optional(),
}).refine(d => d.targetAgeMin < d.targetAgeMax, {
  message: 'targetAgeMin must be less than targetAgeMax',
  path: ['targetAgeMin'],
});

export const AdCreativeSchema = z.object({
  lang: z.enum(['ar', 'en']),
  headline: z.string().min(1).max(40),
  primaryText: z.string().min(1).max(125),
  description: z.string().max(30).optional(),
  cta: z.enum([
    'LEARN_MORE', 'SHOP_NOW', 'SIGN_UP', 'GET_QUOTE',
    'CONTACT_US', 'BOOK_NOW', 'APPLY_NOW', 'GET_OFFER',
  ]),
});

export const CopyGenerationSchema = z.object({
  brand: z.string().min(1).max(100),
  product: z.string().min(1).max(200),
  usp: z.array(z.string()).min(1).max(5),
  targetMarket: z.enum(['KSA', 'Kuwait', 'Qatar', 'Jordan', 'Gulf']),
  goal: z.string().min(1).max(200),
  tone: z.enum(['luxury', 'urgent', 'friendly', 'professional', 'playful']),
  numVariants: z.number().min(3).max(10).default(5),
});

export const InsightsQuerySchema = z.object({
  datePreset: z.enum([
    'today', 'yesterday', 'last_3d', 'last_7d',
    'last_14d', 'last_28d', 'last_30d', 'this_month',
  ]).default('last_7d'),
  level: z.enum(['campaign', 'adset', 'ad']).default('campaign'),
  campaignId: z.string().optional(),
});

export const AlertsQuerySchema = z.object({
  adAccountId: z.string().optional(),
  threshold: z.number().min(0).max(1).default(0.8),
});

// API response types
export type CampaignBrief = z.infer<typeof CampaignBriefSchema>;
export type AdCreative = z.infer<typeof AdCreativeSchema>;
export type CopyGenerationInput = z.infer<typeof CopyGenerationSchema>;
export type InsightsQuery = z.infer<typeof InsightsQuerySchema>;
