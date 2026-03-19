import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';

const DEMO_VARIANTS = (brand: string, product: string) => [
  { lang:'ar', headline:`اكتشف ${brand} — الفرق الحقيقي`, primaryText:`${product} للسوق الخليجي — نتائج مثبتة في السعودية والكويت وقطر والأردن`, description:'ابدأ مجاناً', cta:'LEARN_MORE', angle:'benefit-led' },
  { lang:'ar', headline:'ضاعف عائدك الإعلاني 3 أضعاف', primaryText:'أكثر من 200 علامة تجارية خليجية تثق بنا لإدارة حملاتها على ميتا', description:'احجز عرضاً', cta:'GET_QUOTE', angle:'social-proof' },
  { lang:'ar', headline:'لا تخمّن — استخدم الذكاء الاصطناعي', primaryText:`${product}: حل ذكي يراقب حملاتك 24 ساعة ويحسّنها تلقائياً`, description:'جرّب الآن', cta:'SIGN_UP', angle:'urgency' },
  { lang:'en', headline:`${brand}: Gulf-first AI`, primaryText:`${product} — built for KSA, Kuwait, Qatar & Jordan with bilingual copy and local benchmarks.`, description:'Start free', cta:'SIGN_UP', angle:'market-specific' },
  { lang:'en', headline:'4.2x ROAS. Not a fluke.', primaryText:'Our AI watches your Meta campaigns 24/7 — adjusts budgets before you lose a dirham.', description:'Book demo', cta:'GET_QUOTE', angle:'results-led' },
];

export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, { limit: 30, window: '1h' });
  if (!rl.success) return NextResponse.json({ error: 'Rate limit' }, { status: 429 });

  const body = await req.json().catch(() => ({})) as Record<string, string>;
  if (!body.product) return NextResponse.json({ error: 'product required' }, { status: 400 });

  const hasKey = process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'stub_key';

  if (!hasKey) {
    return NextResponse.json({
      success: true,
      variants: DEMO_VARIANTS(body.brand ?? 'Brand', body.product),
      meta: { arVariants: 3, enVariants: 2, source: 'demo — add ANTHROPIC_API_KEY for Claude-generated copy' }
    });
  }

  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await claude.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1500,
      system: `You are a bilingual Gulf market copywriter (Arabic/English). Return ONLY valid JSON:
{"variants":[{"lang":"ar"|"en","headline":"≤40 chars","primaryText":"≤125 chars","description":"≤30 chars","cta":"LEARN_MORE|SHOP_NOW|SIGN_UP|GET_QUOTE|CONTACT_US","angle":"creative angle"}]}
Arabic: natural Gulf dialect, not formal MSA. English: professional, no Americanisms.`,
      messages: [{ role: 'user', content: `Write 5 variants (3 Arabic + 2 English) for:
Brand: ${body.brand}, Product: ${body.product}
USPs: ${body.usp ?? 'not specified'}
Market: ${body.targetMarket ?? 'KSA'}
Goal: ${body.goal ?? 'leads'}
Tone: ${body.tone ?? 'professional'}` }],
    });

    const raw = msg.content[0].type === 'text' ? msg.content[0].text.replace(/```(?:json)?\n?/g, '').trim() : '{"variants":[]}';
    const parsed = JSON.parse(raw) as { variants: unknown[] };
    return NextResponse.json({ success: true, ...parsed, meta: { source: 'claude' } });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
