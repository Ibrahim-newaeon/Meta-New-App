// packages/claude-agents/tools.ts
import Anthropic from '@anthropic-ai/sdk';

export const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
export const MODEL = 'claude-sonnet-4-5';

// ─── Tool definitions for the agentic campaign manager ────────────────────────
export const META_AD_TOOLS: Anthropic.Tool[] = [
  {
    name: 'get_campaign_insights',
    description: 'Fetch performance metrics for active campaigns from Meta Insights API',
    input_schema: {
      type: 'object' as const,
      properties: {
        date_preset: {
          type: 'string',
          enum: ['today', 'yesterday', 'last_7d', 'last_14d', 'last_30d', 'this_month'],
          description: 'Time range for the insights data',
        },
        level: {
          type: 'string',
          enum: ['campaign', 'adset', 'ad'],
          description: 'Granularity level',
        },
        campaign_id: {
          type: 'string',
          description: 'Optional: filter to specific campaign ID',
        },
      },
      required: ['date_preset'],
    },
  },
  {
    name: 'pause_campaign',
    description: 'Pause a campaign that is underperforming. Use when CTR < 0.5% or ROAS < 1.5x',
    input_schema: {
      type: 'object' as const,
      properties: {
        campaign_id: { type: 'string', description: 'Meta campaign ID' },
        reason: { type: 'string', description: 'Human-readable reason for pausing' },
      },
      required: ['campaign_id', 'reason'],
    },
  },
  {
    name: 'activate_campaign',
    description: 'Activate (unpause) a paused campaign',
    input_schema: {
      type: 'object' as const,
      properties: {
        campaign_id: { type: 'string' },
      },
      required: ['campaign_id'],
    },
  },
  {
    name: 'update_adset_budget',
    description: 'Increase or decrease ad set daily budget. Max single change: 50% in either direction',
    input_schema: {
      type: 'object' as const,
      properties: {
        adset_id: { type: 'string' },
        daily_budget_cents: { type: 'number', description: 'New daily budget in cents (USD)' },
        reason: { type: 'string' },
      },
      required: ['adset_id', 'daily_budget_cents', 'reason'],
    },
  },
  {
    name: 'create_campaign',
    description: 'Create a new Meta campaign in PAUSED state for human review',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string' },
        objective: {
          type: 'string',
          enum: ['OUTCOME_LEADS', 'OUTCOME_SALES', 'OUTCOME_AWARENESS', 'OUTCOME_TRAFFIC'],
        },
        daily_budget_cents: { type: 'number' },
        countries: { type: 'array', items: { type: 'string' } },
        age_min: { type: 'number' },
        age_max: { type: 'number' },
        gender: { type: 'string', enum: ['all', 'male', 'female'] },
      },
      required: ['name', 'objective', 'daily_budget_cents', 'countries'],
    },
  },
  {
    name: 'send_alert',
    description: 'Send a budget or performance alert notification',
    input_schema: {
      type: 'object' as const,
      properties: {
        severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
        campaign_name: { type: 'string' },
        message: { type: 'string' },
        recommended_action: { type: 'string' },
      },
      required: ['severity', 'campaign_name', 'message'],
    },
  },
];

// ─── Gulf market system prompt ─────────────────────────────────────────────────
export const GULF_SYSTEM_PROMPT = `You are an autonomous Meta Ads manager for al-ai.ai, specializing in Gulf markets: Saudi Arabia (SA), Kuwait (KW), Qatar (QA), and Jordan (JO).

## Gulf Market Benchmarks (use these to evaluate performance):
| Market | CPM target | CTR min | CPC target | ROAS target |
|--------|-----------|---------|-----------|------------|
| SA     | < $7      | > 1.5%  | < $0.45   | > 3x       |
| KW     | < $8      | > 1.8%  | < $0.45   | > 3.5x     |
| QA     | < $9      | > 1.6%  | < $0.55   | > 3x       |
| JO     | < $4      | > 1.2%  | < $0.30   | > 2.5x     |

## Rules:
1. NEVER auto-activate campaigns — always create as PAUSED for human review
2. NEVER increase budget more than 50% in a single change
3. NEVER exceed $10,000/day total spend across all campaigns
4. Always exclude existing customers from prospecting campaigns
5. Attribution window: 7-day click, 1-day view
6. Pause any campaign with CTR < 0.5% and spend > $20
7. Scale budgets +20% for campaigns with ROAS > 4x for 3+ consecutive days
8. Always respond with structured analysis + clear recommended actions`;

// ─── JSON parser with fallback ────────────────────────────────────────────────
export function parseClaudeJSON<T>(text: string): T {
  // Strip markdown fences if present
  const clean = text.replace(/```(?:json)?\n?/g, '').trim();
  return JSON.parse(clean) as T;
}

// ─── Retry wrapper ────────────────────────────────────────────────────────────
export async function claudeWithRetry(
  params: Anthropic.MessageCreateParamsNonStreaming,
  maxRetries = 3,
): Promise<Anthropic.Message> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await client.messages.create(params);
    } catch (err) {
      if (attempt === maxRetries - 1) throw err;
      await new Promise(r => setTimeout(r, 1000 * 2 ** attempt)); // exponential backoff
    }
  }
  throw new Error('Unreachable');
}
