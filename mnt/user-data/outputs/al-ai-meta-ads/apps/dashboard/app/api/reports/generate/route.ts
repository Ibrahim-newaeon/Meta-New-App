import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';

const EN = `Strong performance this period across Gulf markets. Saudi Arabia delivered a 4.8x ROAS against a 3.0x target — a 60% outperformance driven by high-intent Reels placements. Kuwait maintained solid efficiency at 4.1x with stable CPMs.

Qatar and Jordan require immediate attention. Qatar's awareness campaign recorded 1.6x ROAS with CPMs 9% above market ceiling — creative fatigue is the likely cause (frequency: 3.4x this week). Jordan failed to break even at 0.9x; addressable audience is critically narrow at ~80,000 users.

Recommendations: (1) Refresh Qatar creatives with 3 new variants, reduce budget to $120/day pending recovery. (2) Expand Jordan targeting to include Lebanon and Egypt. (3) Scale Saudi Arabia budget +20% — current trajectory supports it.`;

const AR = `أداء قوي هذه الفترة عبر أسواق الخليج. حققت المملكة العربية السعودية معدل عائد 4.8x مقارنةً بهدف 3.0x — تفوق بنسبة 60% مدفوع بإعلانات Reels عالية النية. حافظت الكويت على كفاءة قوية بمعدل 4.1x مع استقرار تكاليف الألف ظهور.

تستدعي كل من قطر والأردن اهتماماً فورياً. سجّلت حملة الوعي في قطر معدل عائد 1.6x مع تكاليف ألف ظهور تتجاوز السقف السوقي بنسبة 9% — إرهاق المحتوى هو السبب الأرجح (معدل التكرار 3.4x). أما الأردن فلم يحقق نقطة التعادل عند 0.9x؛ حجم الجمهور المستهدف ضيق للغاية.

التوصيات: (١) تجديد محتوى قطر بثلاثة متغيرات وخفض الميزانية إلى 120 دولاراً يومياً. (٢) توسيع استهداف الأردن ليشمل لبنان ومصر. (٣) رفع ميزانية السعودية 20% — المسار الحالي يدعم ذلك.`;

export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, { limit: 10, window: '1h' });
  if (!rl.success) return NextResponse.json({ error: 'Rate limit' }, { status: 429 });
  const body = await req.json().catch(() => ({})) as Record<string, string>;
  if (!body.period) return NextResponse.json({ error: 'period required' }, { status: 400 });
  await new Promise(r => setTimeout(r, 1800));
  const id = `rpt_${Date.now()}`;
  // In real app: generate via Claude + persist to DB
  return NextResponse.json({ success: true, reportId: id, period: body.period, metrics: { totalSpend:'10840.00', avgRoas:'4.10', avgCtr:'2.04', totalLeads:412 }, narrativeEn: EN, narrativeAr: AR }, { status: 201 });
}
