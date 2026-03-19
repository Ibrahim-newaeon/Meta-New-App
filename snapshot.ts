// services/snapshot.ts
// Pulls Meta Insights for a given client+date and upserts into Postgres.
// Called by: n8n cron workflow OR /api/snapshots/sync endpoint.

import { prisma } from '@/lib/prisma';
import type { Client } from '@prisma/client';

const META_BASE = 'https://graph.facebook.com/v21.0';

interface MetaInsightRow {
  campaign_id: string;
  campaign_name: string;
  adset_id?: string;
  adset_name?: string;
  status?: string;
  spend: string;
  impressions: string;
  reach?: string;
  clicks: string;
  ctr: string;
  cpm: string;
  cpc: string;
  frequency?: string;
  actions?: Array<{ action_type: string; value: string }>;
  purchase_roas?: Array<{ action_type: string; value: string }>;
  outbound_clicks?: Array<{ action_type: string; value: string }>;
  video_play_actions?: Array<{ action_type: string; value: string }>;
  landing_page_views?: string;
}

function parseAction(actions: MetaInsightRow['actions'], type: string): number {
  return parseInt(actions?.find(a => a.action_type === type)?.value ?? '0');
}

export async function syncClientSnapshot(
  client: Client,
  targetDate: Date,
): Promise<{ upserted: number; errors: string[] }> {
  const dateStr = targetDate.toISOString().split('T')[0]; // YYYY-MM-DD
  const startMs = Date.now();
  const errors: string[] = [];

  try {
    const url = new URL(`${META_BASE}/${client.metaAccountId}/insights`);
    url.searchParams.set('access_token', process.env.META_ACCESS_TOKEN!);
    url.searchParams.set('time_range', JSON.stringify({ since: dateStr, until: dateStr }));
    url.searchParams.set('level', 'adset');
    url.searchParams.set('fields', [
      'campaign_id', 'campaign_name', 'adset_id', 'adset_name', 'status',
      'spend', 'impressions', 'reach', 'clicks', 'ctr', 'cpm', 'cpc', 'frequency',
      'actions', 'purchase_roas', 'outbound_clicks', 'video_play_actions', 'landing_page_views',
    ].join(','));
    url.searchParams.set('breakdowns', 'country');
    url.searchParams.set('limit', '200');

    const res = await fetch(url.toString());
    const data = await res.json();

    if (data.error) throw new Error(`Meta API: ${data.error.message}`);

    const rows: MetaInsightRow[] = data.data ?? [];
    let upserted = 0;

    for (const row of rows) {
      const roas = parseFloat(row.purchase_roas?.[0]?.value ?? '0');
      const purchases = parseAction(row.actions, 'offsite_conversion.fb_pixel_purchase');
      const revenue = roas * parseFloat(row.spend ?? '0');

      await prisma.campaignSnapshot.upsert({
        where: {
          clientId_campaignId_date: {
            clientId: client.id,
            campaignId: row.campaign_id,
            date: new Date(dateStr),
          },
        },
        create: {
          clientId:    client.id,
          campaignId:  row.campaign_id,
          campaignName: row.campaign_name,
          adSetId:     row.adset_id,
          adSetName:   row.adset_name,
          date:        new Date(dateStr),
          country:     (row as unknown as { country: string }).country ?? 'SA',
          status:      row.status ?? 'ACTIVE',
          spend:       parseFloat(row.spend ?? '0'),
          impressions: parseInt(row.impressions ?? '0'),
          reach:       parseInt(row.reach ?? '0'),
          clicks:      parseInt(row.clicks ?? '0'),
          ctr:         parseFloat(row.ctr ?? '0'),
          cpm:         parseFloat(row.cpm ?? '0'),
          cpc:         parseFloat(row.cpc ?? '0'),
          frequency:   parseFloat(row.frequency ?? '0'),
          leads:       parseAction(row.actions, 'lead'),
          purchases,
          revenue,
          roas,
          videoPlays:      parseAction(row.video_play_actions, 'video_view'),
          outboundClicks:  parseAction(row.outbound_clicks, 'outbound_click'),
          landingPageViews: parseInt(row.landing_page_views ?? '0'),
        },
        update: {
          spend:       parseFloat(row.spend ?? '0'),
          impressions: parseInt(row.impressions ?? '0'),
          reach:       parseInt(row.reach ?? '0'),
          clicks:      parseInt(row.clicks ?? '0'),
          ctr:         parseFloat(row.ctr ?? '0'),
          cpm:         parseFloat(row.cpm ?? '0'),
          cpc:         parseFloat(row.cpc ?? '0'),
          frequency:   parseFloat(row.frequency ?? '0'),
          leads:       parseAction(row.actions, 'lead'),
          purchases,
          revenue,
          roas,
        },
      });
      upserted++;
    }

    // Log the sync
    await prisma.syncLog.create({
      data: {
        clientId:    client.id,
        syncedDate:  new Date(dateStr),
        rowsUpserted: upserted,
        durationMs:  Date.now() - startMs,
        status:      'success',
      },
    });

    return { upserted, errors };
  } catch (err) {
    const msg = (err as Error).message;
    errors.push(msg);
    await prisma.syncLog.create({
      data: {
        clientId:  client.id,
        syncedDate: new Date(dateStr),
        status:    'error',
        errorMsg:  msg,
        durationMs: Date.now() - startMs,
      },
    });
    return { upserted: 0, errors };
  }
}

// Sync all active clients for a date range
export async function syncAllClients(
  daysBack = 1,
): Promise<Record<string, { upserted: number; errors: string[] }>> {
  const clients = await prisma.client.findMany({ where: { active: true } });
  const results: Record<string, { upserted: number; errors: string[] }> = {};

  for (const client of clients) {
    for (let d = 0; d < daysBack; d++) {
      const date = new Date();
      date.setDate(date.getDate() - d - 1); // yesterday back
      const key = `${client.slug}:${date.toISOString().split('T')[0]}`;
      results[key] = await syncClientSnapshot(client, date);
    }
  }

  return results;
}

// ─── Aggregation queries ──────────────────────────────────────────────────────
export interface PeriodMetrics {
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  totalLeads: number;
  totalPurchases: number;
  totalRevenue: number;
  avgRoas: number;
  avgCtr: number;
  avgCpm: number;
  avgCpc: number;
  byCampaign: Array<{
    campaignName: string;
    spend: number;
    roas: number;
    ctr: number;
    leads: number;
  }>;
  byCountry: Array<{
    country: string;
    spend: number;
    roas: number;
    impressions: number;
  }>;
  dailySpend: Array<{ date: string; spend: number; roas: number }>;
}

export async function getMetricsForPeriod(
  clientId: string,
  dateFrom: Date,
  dateTo: Date,
): Promise<PeriodMetrics> {
  const rows = await prisma.campaignSnapshot.findMany({
    where: { clientId, date: { gte: dateFrom, lte: dateTo } },
    orderBy: { date: 'asc' },
  });

  const totalSpend       = rows.reduce((s, r) => s + r.spend, 0);
  const totalImpressions = rows.reduce((s, r) => s + r.impressions, 0);
  const totalClicks      = rows.reduce((s, r) => s + r.clicks, 0);
  const totalLeads       = rows.reduce((s, r) => s + r.leads, 0);
  const totalPurchases   = rows.reduce((s, r) => s + r.purchases, 0);
  const totalRevenue     = rows.reduce((s, r) => s + r.revenue, 0);

  const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  const avgCtr  = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const avgCpm  = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
  const avgCpc  = totalClicks > 0 ? totalSpend / totalClicks : 0;

  // Group by campaign
  const campaignMap = new Map<string, typeof rows>();
  for (const r of rows) {
    if (!campaignMap.has(r.campaignName)) campaignMap.set(r.campaignName, []);
    campaignMap.get(r.campaignName)!.push(r);
  }
  const byCampaign = Array.from(campaignMap.entries()).map(([name, rs]) => ({
    campaignName: name,
    spend:  rs.reduce((s, r) => s + r.spend, 0),
    roas:   rs.reduce((s, r) => s + r.revenue, 0) / Math.max(rs.reduce((s, r) => s + r.spend, 0), 1),
    ctr:    rs.reduce((s, r) => s + r.impressions, 0) > 0 ? (rs.reduce((s, r) => s + r.clicks, 0) / rs.reduce((s, r) => s + r.impressions, 0)) * 100 : 0,
    leads:  rs.reduce((s, r) => s + r.leads, 0),
  })).sort((a, b) => b.roas - a.roas);

  // Group by country
  const countryMap = new Map<string, typeof rows>();
  for (const r of rows) {
    if (!countryMap.has(r.country)) countryMap.set(r.country, []);
    countryMap.get(r.country)!.push(r);
  }
  const byCountry = Array.from(countryMap.entries()).map(([country, rs]) => ({
    country,
    spend:       rs.reduce((s, r) => s + r.spend, 0),
    roas:        rs.reduce((s, r) => s + r.revenue, 0) / Math.max(rs.reduce((s, r) => s + r.spend, 0), 1),
    impressions: rs.reduce((s, r) => s + r.impressions, 0),
  })).sort((a, b) => b.spend - a.spend);

  // Daily spend
  const dailyMap = new Map<string, { spend: number; revenue: number }>();
  for (const r of rows) {
    const d = r.date.toISOString().split('T')[0];
    if (!dailyMap.has(d)) dailyMap.set(d, { spend: 0, revenue: 0 });
    const entry = dailyMap.get(d)!;
    entry.spend += r.spend;
    entry.revenue += r.revenue;
  }
  const dailySpend = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, spend: v.spend, roas: v.spend > 0 ? v.revenue / v.spend : 0 }));

  return {
    totalSpend, totalImpressions, totalClicks, totalLeads,
    totalPurchases, totalRevenue,
    avgRoas, avgCtr, avgCpm, avgCpc,
    byCampaign, byCountry, dailySpend,
  };
}
