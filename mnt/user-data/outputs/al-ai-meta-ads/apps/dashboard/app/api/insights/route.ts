import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  const rl = await rateLimit(req, { limit: 60, window: '1h' });
  if (!rl.success) return NextResponse.json({ error: 'Rate limit' }, { status: 429 });

  const hasToken = process.env.META_ACCESS_TOKEN && process.env.META_ACCESS_TOKEN !== 'stub_token';
  if (hasToken) {
    const { searchParams } = new URL(req.url);
    const datePreset = searchParams.get('datePreset') ?? 'last_7d';
    const url = new URL(`https://graph.facebook.com/v21.0/${process.env.META_AD_ACCOUNT_ID}/insights`);
    url.searchParams.set('access_token', process.env.META_ACCESS_TOKEN!);
    url.searchParams.set('date_preset', datePreset);
    url.searchParams.set('level', 'campaign');
    url.searchParams.set('fields', 'campaign_id,campaign_name,spend,impressions,clicks,ctr,cpm,cpc,purchase_roas,actions');
    url.searchParams.set('limit', '50');
    const res = await fetch(url.toString());
    const data = await res.json() as { error?: { message: string }; data?: unknown[] };
    if (data.error) return NextResponse.json({ error: data.error.message }, { status: 400 });
    return NextResponse.json({ data: data.data ?? [], source: 'live' });
  }

  return NextResponse.json({
    data: [
      { campaign_id:'c1', campaign_name:'alai_LEADS_SA_202603',  spend:'4820', impressions:'912000', clicks:'19152', ctr:'2.10', cpm:'5.29', cpc:'0.25', health:'good',     healthReasons:['Performing well'], roasValue:4.8, country:'SA' },
      { campaign_id:'c2', campaign_name:'alai_LEADS_KW_202603',  spend:'2140', impressions:'350000', clicks:'6650',  ctr:'1.90', cpm:'6.11', cpc:'0.32', health:'good',     healthReasons:['Performing well'], roasValue:4.1, country:'KW' },
      { campaign_id:'c3', campaign_name:'alai_AWARE_QA_202603',  spend:'1380', impressions:'154000', clicks:'1694',  ctr:'1.10', cpm:'8.96', cpc:'0.81', health:'warning',  healthReasons:['CTR below benchmark','CPM too high'], roasValue:1.6, country:'QA' },
      { campaign_id:'c4', campaign_name:'alai_SALES_JO_202603',  spend:'850',  impressions:'265000', clicks:'1590',  ctr:'0.60', cpm:'3.21', cpc:'0.53', health:'critical', healthReasons:['CTR critically low'], roasValue:0.9, country:'JO' },
      { campaign_id:'c5', campaign_name:'alai_TRAFFIC_SA_202603',spend:'1650', impressions:'294000', clicks:'5292',  ctr:'1.80', cpm:'5.61', cpc:'0.31', health:'good',     healthReasons:['Performing well'], roasValue:3.2, country:'SA' },
    ],
    summary: { totalSpend:'10840.00', totalImpressions:1975000, totalClicks:34378, avgCtr:'1.74', avgCpm:'5.49', avgRoas:'3.43', criticalCampaigns:1, warningCampaigns:1 },
    source: 'demo',
    note: 'Add META_ACCESS_TOKEN to .env.local for live data',
  });
}
