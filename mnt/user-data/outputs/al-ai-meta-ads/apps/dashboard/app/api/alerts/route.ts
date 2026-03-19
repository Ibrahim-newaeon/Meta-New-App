import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  const rl = await rateLimit(req, { limit: 60, window: '1h' });
  if (!rl.success) return NextResponse.json({ error: 'Rate limit' }, { status: 429 });
  const astHour = ((new Date().getUTCHours() + 3) % 24);
  const frac = astHour / 24;
  const ep = (b: number, f: number) => parseFloat((b * f).toFixed(2));
  return NextResponse.json({
    alerts: [
      { adsetId:'as1', adsetName:'SA_25-45_All_Reels',    campaignName:'alai_LEADS_SA',  dailyBudgetUSD:200, spentTodayUSD:ep(200,frac*1.05), pacingPercent:parseFloat((frac*105).toFixed(1)), expectedPct:parseFloat((frac*100).toFixed(1)), severity:'ok',       status:'on_track',     message:'On pace', recommendation:'No action needed' },
      { adsetId:'as2', adsetName:'KW_22-55_All_Stories',  campaignName:'alai_LEADS_KW',  dailyBudgetUSD:100, spentTodayUSD:97,                 pacingPercent:97,                               expectedPct:parseFloat((frac*100).toFixed(1)), severity:'critical',  status:'near_cap',     message:'Near budget cap (97% spent)', recommendation:'Increase daily budget by $25' },
      { adsetId:'as3', adsetName:'QA_25-50_All_Feed',     campaignName:'alai_AWARE_QA',  dailyBudgetUSD:80,  spentTodayUSD:ep(80,frac*0.4),   pacingPercent:parseFloat((frac*40).toFixed(1)), expectedPct:parseFloat((frac*100).toFixed(1)), severity:'warning',   status:'underspending', message:`Only ${(frac*40).toFixed(0)}% spent vs ${(frac*100).toFixed(0)}% expected`, recommendation:'Check audience size and creative quality' },
      { adsetId:'as4', adsetName:'SA_18-35_Male_Feed',    campaignName:'alai_TRAFFIC_SA',dailyBudgetUSD:150, spentTodayUSD:ep(150,frac*0.98), pacingPercent:parseFloat((frac*98).toFixed(1)), expectedPct:parseFloat((frac*100).toFixed(1)), severity:'ok',       status:'on_track',     message:'On pace', recommendation:'No action needed' },
    ],
    summary: { total:4, critical:1, warning:1, ok:2, totalDailyBudget:'530.00', totalSpentToday:String(ep(530,frac)), hourOfDay:astHour },
    source: 'demo',
  });
}
