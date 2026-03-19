// al-ai.ai — P3 Reporting & Analytics Module
// Design: editorial luxury — Playfair Display + DM Sans, warm ivory + amber
import { useState, useEffect, useCallback } from "react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine
} from "recharts";

// ─── Tokens ───────────────────────────────────────────────────────────────────
const T = {
  bg:       "#FAFAF7",
  surface:  "#F4F3EE",
  card:     "#FFFFFF",
  border:   "#E5E3DB",
  borderHi: "#D0CEC4",
  text:     "#1C1B18",
  muted:    "#6B6860",
  hint:     "#B5B3AB",
  amber:    "#D97706",
  amberLt:  "#FEF3C7",
  amberMid: "#F59E0B",
  teal:     "#0F766E",
  tealLt:   "#CCFBF1",
  red:      "#DC2626",
  redLt:    "#FEE2E2",
  blue:     "#1D4ED8",
  blueLt:   "#DBEAFE",
  green:    "#059669",
  greenLt:  "#D1FAE5",
};

// ─── Mock data ────────────────────────────────────────────────────────────────
const DAILY = [
  { date: "Mar 16", spend: 980,  roas: 3.8, leads: 38 },
  { date: "Mar 17", spend: 1140, roas: 4.4, leads: 52 },
  { date: "Mar 18", spend: 890,  roas: 3.2, leads: 29 },
  { date: "Mar 19", spend: 1380, roas: 5.1, leads: 71 },
  { date: "Mar 20", spend: 1520, roas: 5.6, leads: 86 },
  { date: "Mar 21", spend: 1690, roas: 4.9, leads: 79 },
  { date: "Mar 22", spend: 1240, roas: 4.2, leads: 57 },
];

const CAMPAIGNS = [
  { name: "alai_LEADS_SA_202603",    country: "SA", spend: 4820, roas: 4.8, ctr: 2.4, leads: 198, health: "good"     },
  { name: "alai_LEADS_KW_202603",    country: "KW", spend: 2140, roas: 4.1, ctr: 2.0, leads:  87, health: "good"     },
  { name: "alai_AWARE_QA_202603",    country: "QA", spend: 1380, roas: 1.6, ctr: 1.1, leads:  18, health: "warning"  },
  { name: "alai_SALES_JO_202603",    country: "JO", spend:  850, roas: 0.9, ctr: 0.6, leads:   0, health: "critical" },
  { name: "alai_TRAFFIC_SA_202603",  country: "SA", spend: 1650, roas: 3.2, ctr: 1.8, leads:  29, health: "good"     },
];

const BENCHMARKS = [
  { country: "SA", targetCpm: 7,   actualCpm: 5.3,  targetCtr: 1.5,  actualCtr: 2.1,  targetRoas: 3.0,  actualRoas: 4.4,  spend: 6470 },
  { country: "KW", targetCpm: 8,   actualCpm: 7.1,  targetCtr: 1.8,  actualCtr: 2.0,  targetRoas: 3.5,  actualRoas: 4.1,  spend: 2140 },
  { country: "QA", targetCpm: 9,   actualCpm: 9.8,  targetCtr: 1.6,  actualCtr: 1.1,  targetRoas: 3.0,  actualRoas: 1.6,  spend: 1380 },
  { country: "JO", targetCpm: 4,   actualCpm: 3.2,  targetCtr: 1.2,  actualCtr: 0.6,  targetRoas: 2.5,  actualRoas: 0.9,  spend:  850 },
];

const REPORTS = [
  { id: "r1", period: "2026-W12", type: "weekly",  status: "published", spend: 10840, roas: 4.1, leads: 412, pdfUrl: "#" },
  { id: "r2", period: "2026-W11", type: "weekly",  status: "published", spend: 9320,  roas: 3.7, leads: 367, pdfUrl: "#" },
  { id: "r3", period: "2026-03",  type: "monthly", status: "draft",     spend: 31480, roas: 3.9, leads: 1241, pdfUrl: null },
];

const EN_NARRATIVE = `Performance this week exceeded Gulf market benchmarks on all primary KPIs. Saudi Arabia continues to drive the majority of qualified leads, achieving a 4.8x ROAS against a 3.0x target — a 60% outperformance. Kuwait maintained solid efficiency at 4.1x with stable CPMs.

Two campaigns require immediate attention. The Qatar awareness campaign delivered only 1.6x ROAS against a 3.0x target, with CPMs 9% above market ceiling. Creative fatigue is the likely driver — frequency reached 3.4 this week. The Jordan sales campaign failed to break even at 0.9x ROAS; audience size is critically narrow at approximately 80,000 addressable users.

For the coming week: (1) Refresh Qatar creatives with 3 new variants and reduce daily budget to $120 pending performance recovery. (2) Expand Jordan targeting to include Lebanon and Egypt to broaden the addressable audience. (3) Scale Saudi Arabia budget by 20% — current ROAS trajectory supports it.`;

const AR_NARRATIVE = `تجاوز أداء هذا الأسبوع معايير أسواق الخليج في جميع المؤشرات الرئيسية. تواصل المملكة العربية السعودية قيادة غالبية العملاء المحتملين المؤهلين، محققةً معدل عائد إعلاني يبلغ 4.8x مقارنةً بالهدف المحدد عند 3.0x، أي تفوقاً بنسبة 60%. حافظت الكويت على كفاءة قوية بمعدل 4.1x مع استقرار تكاليف الألف ظهور.

تستدعي حملتان اهتماماً فورياً. أنتجت حملة الوعي في قطر معدل عائد 1.6x فحسب مقارنةً بهدف 3.0x، مع تكاليف ألف ظهور تتجاوز السقف السوقي بنسبة 9%، ويُرجَّح أن يكون إرهاق المحتوى الإعلاني هو السبب الجذري إذ بلغ معدل التكرار 3.4 مرات هذا الأسبوع. أما حملة المبيعات في الأردن فلم تحقق نقطة التعادل بمعدل 0.9x، إذ يبقى حجم الجمهور المستهدف ضيقاً جداً بحوالي 80,000 مستخدم.

للأسبوع القادم: (١) تجديد المحتوى الإبداعي لقطر بثلاثة متغيرات جديدة مع خفض الميزانية اليومية إلى 120 دولاراً ريثما يتعافى الأداء. (٢) توسيع استهداف الأردن ليشمل لبنان ومصر لتوسيع قاعدة الجمهور. (٣) رفع ميزانية السعودية بنسبة 20% — مسار ROAS الحالي يدعم ذلك.`;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt  = (n, d = 2) => Number(n).toFixed(d);
const fmtK = n => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(Math.round(n));
const fmtC = n => `$${fmt(n)}`;

const HealthPill = ({ h }) => {
  const map = { good: [T.green, T.greenLt, "Good"], warning: [T.amber, T.amberLt, "Review"], critical: [T.red, T.redLt, "Critical"] };
  const [color, bg, label] = map[h] ?? [T.muted, T.surface, "—"];
  return (
    <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: bg, color, letterSpacing: "0.04em" }}>
      {label}
    </span>
  );
};

const StatusPill = ({ s }) => {
  const map = { published: [T.green, T.greenLt], draft: [T.amber, T.amberLt], archived: [T.muted, T.surface] };
  const [color, bg] = map[s] ?? [T.muted, T.surface];
  return <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: bg, color }}>{s}</span>;
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ id, label, value, sub, good }) {
  return (
    <div data-testid={`kpi-${id}`} style={{ background: T.card, border: `0.5px solid ${T.border}`, borderRadius: 10, padding: "18px 20px", flex: 1 }}>
      <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "'Playfair Display', Georgia, serif", color: T.text, lineHeight: 1.1, marginBottom: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: good === true ? T.green : good === false ? T.red : T.muted }}>{sub}</div>}
    </div>
  );
}

// ─── Benchmark Table ──────────────────────────────────────────────────────────
function BenchmarkTable() {
  const health = (actual, target) => actual >= target ? "good" : actual >= target * 0.7 ? "warning" : "critical";
  const healthColor = (h) => ({ good: T.green, warning: T.amber, critical: T.red })[h];

  return (
    <div style={{ background: T.card, border: `0.5px solid ${T.border}`, borderRadius: 10, overflow: "hidden", marginBottom: 16 }}>
      <div style={{ padding: "14px 20px", borderBottom: `0.5px solid ${T.border}` }}>
        <div style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>Gulf market benchmarks</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.text, fontFamily: "'Playfair Display', Georgia, serif" }}>Actual vs target</div>
      </div>
      <table data-testid="benchmark-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ background: T.surface }}>
            {["Market", "Spend", "CPM actual / target", "CTR actual / target", "ROAS actual / target", "Health"].map(h => (
              <th key={h} style={{ padding: "9px 16px", textAlign: "left", fontWeight: 500, fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `0.5px solid ${T.border}` }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {BENCHMARKS.map(b => {
            const roasH = health(b.actualRoas, b.targetRoas);
            return (
              <tr key={b.country} data-testid={`benchmark-row-${b.country}`} style={{ borderBottom: `0.5px solid ${T.border}` }}>
                <td style={{ padding: "11px 16px", fontWeight: 600, color: T.text }}>{b.country}</td>
                <td style={{ padding: "11px 16px", fontFamily: "monospace" }}>${fmtK(b.spend)}</td>
                <td style={{ padding: "11px 16px" }}>
                  <span style={{ color: b.actualCpm <= b.targetCpm ? T.green : T.red, fontFamily: "monospace", fontWeight: 600 }}>${fmt(b.actualCpm)}</span>
                  <span style={{ color: T.hint, margin: "0 4px" }}>/</span>
                  <span style={{ color: T.muted, fontFamily: "monospace" }}>${b.targetCpm}</span>
                </td>
                <td style={{ padding: "11px 16px" }}>
                  <span style={{ color: b.actualCtr >= b.targetCtr ? T.green : T.red, fontFamily: "monospace", fontWeight: 600 }}>{fmt(b.actualCtr)}%</span>
                  <span style={{ color: T.hint, margin: "0 4px" }}>/</span>
                  <span style={{ color: T.muted, fontFamily: "monospace" }}>{b.targetCtr}%</span>
                </td>
                <td style={{ padding: "11px 16px" }} data-testid={`benchmark-roas-${b.country}`}>
                  <span style={{ color: healthColor(roasH), fontFamily: "monospace", fontWeight: 600 }}>{fmt(b.actualRoas)}x</span>
                  <span style={{ color: T.hint, margin: "0 4px" }}>/</span>
                  <span style={{ color: T.muted, fontFamily: "monospace" }}>{b.targetRoas}x</span>
                </td>
                <td style={{ padding: "11px 16px" }}>
                  <span data-testid={`benchmark-health-${b.country}`} data-health={roasH}>
                    <HealthPill h={roasH} />
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Report Viewer ────────────────────────────────────────────────────────────
function ReportViewer({ report, onClose }) {
  const [lang, setLang] = useState("en");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(report.pdfUrl);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const exportPdf = async () => {
    setPdfLoading(true);
    // Simulate real API call
    await new Promise(r => setTimeout(r, 2000));
    setPdfUrl(`/reports/al-ai-${report.period}.pdf`);
    setPdfLoading(false);
  };

  const createShareLink = async () => {
    setShareLoading(true);
    await new Promise(r => setTimeout(r, 800));
    setShareUrl(`https://app.al-ai.ai/share/sl_${Date.now().toString(36)}`);
    setShareLoading(false);
    setShowShareModal(true);
  };

  const copyUrl = () => {
    navigator.clipboard?.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: T.card, border: `0.5px solid ${T.border}`, borderRadius: 6, padding: "8px 12px", fontSize: 11, color: T.text }}>
        <div style={{ color: T.muted, marginBottom: 2 }}>{payload[0]?.payload?.date}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ color: p.color, fontFamily: "monospace" }}>{p.name}: {p.name === "roas" ? `${p.value}x` : p.name === "leads" ? p.value : `$${p.value}`}</div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ background: T.bg, minHeight: "100vh", fontFamily: "'DM Sans', system-ui, sans-serif", color: T.text }}>
      {/* Header */}
      <div style={{ background: T.card, borderBottom: `0.5px solid ${T.border}`, padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>al-ai.ai · Report viewer</div>
          <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Playfair Display', Georgia, serif", color: T.text }}>
            {report.period} · {report.type} review
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <StatusPill s={report.status} />
          <button data-testid="btn-export-pdf" onClick={exportPdf} disabled={pdfLoading}
            style={{ background: pdfLoading ? T.surface : T.amber, color: pdfLoading ? T.muted : "#fff", border: `0.5px solid ${pdfLoading ? T.border : T.amber}`, borderRadius: 6, padding: "7px 16px", fontSize: 12, fontWeight: 600, cursor: pdfLoading ? "wait" : "pointer" }}>
            {pdfLoading ? "Generating…" : "Export PDF"}
          </button>
          {pdfUrl && (
            <a href={pdfUrl} data-testid="pdf-download-link" download
              style={{ background: T.surface, border: `0.5px solid ${T.border}`, borderRadius: 6, padding: "7px 14px", fontSize: 12, color: T.text, textDecoration: "none" }}>
              Download PDF
            </a>
          )}
          <button data-testid="btn-create-share-link" onClick={createShareLink} disabled={shareLoading}
            style={{ background: T.surface, border: `0.5px solid ${T.border}`, borderRadius: 6, padding: "7px 14px", fontSize: 12, color: T.text, cursor: "pointer" }}>
            {shareLoading ? "Creating…" : "Share link"}
          </button>
          <button onClick={onClose}
            style={{ background: "transparent", border: `0.5px solid ${T.border}`, borderRadius: 6, padding: "7px 14px", fontSize: 12, color: T.muted, cursor: "pointer" }}>
            ← Back
          </button>
        </div>
      </div>

      <div style={{ padding: "24px 32px", maxWidth: 1100 }}>
        {/* KPIs */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          <KpiCard id="spend" label="Total spend"  value={fmtC(report.spend)} sub={`Period: ${report.period}`} />
          <KpiCard id="roas"  label="Avg ROAS"     value={`${report.roas}x`}  sub={report.roas >= 3 ? "↑ above target" : "↓ below target"} good={report.roas >= 3} />
          <KpiCard id="ctr"   label="Avg CTR"      value="2.04%"              sub="↑ vs 1.5% target" good={true} />
          <KpiCard id="cpm"   label="Avg CPM"      value="$5.48"              sub="↓ below $7 target" good={true} />
          <KpiCard id="leads" label="Total leads"  value={fmtK(report.leads)} sub={`~$${fmt(report.spend / Math.max(report.leads, 1))} CPL`} />
        </div>

        {/* Charts row */}
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 12, marginBottom: 20 }}>
          <div data-testid="chart-daily-spend" style={{ background: T.card, border: `0.5px solid ${T.border}`, borderRadius: 10, padding: "16px 20px" }}>
            <div style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Daily spend & ROAS</div>
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={DAILY} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={T.amber} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={T.amber} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fill: T.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: T.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="spend" stroke={T.amber} fill="url(#spendGrad)" strokeWidth={2} name="spend" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div style={{ background: T.card, border: `0.5px solid ${T.border}`, borderRadius: 10, padding: "16px 20px" }}>
            <div style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Leads by day</div>
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={DAILY} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <XAxis dataKey="date" tick={{ fill: T.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: T.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="leads" fill={T.teal} radius={[3, 3, 0, 0]} name="leads">
                    {DAILY.map((_, i) => <Cell key={i} fill={i === 4 || i === 5 ? T.teal : T.tealLt} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Benchmark table */}
        <BenchmarkTable />

        {/* Campaign table */}
        <div style={{ background: T.card, border: `0.5px solid ${T.border}`, borderRadius: 10, overflow: "hidden", marginBottom: 20 }}>
          <div style={{ padding: "14px 20px", borderBottom: `0.5px solid ${T.border}`, fontSize: 13, fontWeight: 600, color: T.text, fontFamily: "'Playfair Display', Georgia, serif" }}>
            Campaign breakdown
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: T.surface }}>
                {["Campaign", "Country", "Spend", "ROAS", "CTR", "Leads", "Health"].map(h => (
                  <th key={h} style={{ padding: "9px 16px", textAlign: "left", fontWeight: 500, fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `0.5px solid ${T.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CAMPAIGNS.map((c, i) => (
                <tr key={i} style={{ borderBottom: `0.5px solid ${T.border}`, background: i % 2 === 0 ? T.card : T.bg }}>
                  <td style={{ padding: "10px 16px", color: T.text, fontSize: 11, fontFamily: "monospace" }}>{c.name}</td>
                  <td style={{ padding: "10px 16px" }}><span style={{ fontSize: 10, fontWeight: 600, background: T.amberLt, color: T.amber, padding: "2px 7px", borderRadius: 4 }}>{c.country}</span></td>
                  <td style={{ padding: "10px 16px", fontFamily: "monospace" }}>{fmtC(c.spend)}</td>
                  <td style={{ padding: "10px 16px", fontFamily: "monospace", fontWeight: 700, color: c.roas >= 3 ? T.green : c.roas >= 1.5 ? T.amber : T.red }}>{fmt(c.roas)}x</td>
                  <td style={{ padding: "10px 16px", fontFamily: "monospace" }}>{fmt(c.ctr)}%</td>
                  <td style={{ padding: "10px 16px", fontFamily: "monospace" }}>{c.leads}</td>
                  <td style={{ padding: "10px 16px" }}><HealthPill h={c.health} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Narrative */}
        <div style={{ background: T.card, border: `0.5px solid ${T.border}`, borderRadius: 10, padding: "20px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, fontFamily: "'Playfair Display', Georgia, serif", color: T.text }}>Claude narrative analysis</div>
            <div style={{ display: "flex", gap: 6 }}>
              {["en", "ar"].map(l => (
                <button key={l} data-testid={`tab-narrative-${l}`} onClick={() => setLang(l)}
                  style={{ background: lang === l ? T.amber : "transparent", color: lang === l ? "#fff" : T.muted, border: `0.5px solid ${lang === l ? T.amber : T.border}`, borderRadius: 5, padding: "5px 14px", fontSize: 11, fontWeight: 500, cursor: "pointer" }}>
                  {l === "en" ? "English" : "العربية"}
                </button>
              ))}
            </div>
          </div>
          {lang === "en" ? (
            <div data-testid="narrative-en" style={{ fontSize: 13, lineHeight: 1.8, color: T.text, whiteSpace: "pre-line" }}>{EN_NARRATIVE}</div>
          ) : (
            <div data-testid="narrative-ar" dir="rtl" style={{ fontSize: 14, lineHeight: 2, color: T.text, whiteSpace: "pre-line", textAlign: "right", direction: "rtl" }}>{AR_NARRATIVE}</div>
          )}
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: `0.5px solid ${T.border}`, fontSize: 10, color: T.hint }}>
            Generated by claude-sonnet-4-5 · Attribution: 7d click / 1d view · Gulf market benchmarks applied
          </div>
        </div>
      </div>

      {/* Share modal */}
      {showShareModal && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(28,27,24,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div data-testid="share-modal" style={{ background: T.card, borderRadius: 12, padding: 28, width: 440, border: `0.5px solid ${T.border}` }}>
            <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Playfair Display', Georgia, serif", marginBottom: 6 }}>Shareable link created</div>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 16 }}>Anyone with this link can view the report. No login required.</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <input data-testid="share-url-input" readOnly value={shareUrl}
                style={{ flex: 1, background: T.surface, border: `0.5px solid ${T.border}`, borderRadius: 6, padding: "9px 12px", fontSize: 11, color: T.text, fontFamily: "monospace", outline: "none" }} />
              <button data-testid="btn-copy-share-url" onClick={copyUrl}
                style={{ background: copied ? T.green : T.amber, color: "#fff", border: "none", borderRadius: 6, padding: "9px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", minWidth: 64 }}>
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <div style={{ flex: 1, background: T.surface, borderRadius: 8, padding: "10px 14px" }}>
                <div style={{ fontSize: 10, color: T.muted, marginBottom: 2 }}>Views</div>
                <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Playfair Display', Georgia, serif" }}>0</div>
              </div>
              <div style={{ flex: 1, background: T.surface, borderRadius: 8, padding: "10px 14px" }}>
                <div style={{ fontSize: 10, color: T.muted, marginBottom: 2 }}>Expires</div>
                <div style={{ fontSize: 12, color: T.text, fontWeight: 500 }}>Never</div>
              </div>
              <div style={{ flex: 1, background: T.surface, borderRadius: 8, padding: "10px 14px" }}>
                <div style={{ fontSize: 10, color: T.muted, marginBottom: 2 }}>Password</div>
                <div style={{ fontSize: 12, color: T.muted }}>None</div>
              </div>
            </div>
            <button onClick={() => setShowShareModal(false)}
              style={{ background: "transparent", border: `0.5px solid ${T.border}`, borderRadius: 6, padding: "8px 20px", fontSize: 12, color: T.muted, cursor: "pointer" }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Report list ──────────────────────────────────────────────────────────────
function ReportList({ onOpen, onGenerate, generating }) {
  const [toast, setToast] = useState(null);
  const [genForm, setGenForm] = useState({ period: "2026-W13", type: "weekly", dateFrom: "2026-03-23", dateTo: "2026-03-29" });

  const generate = async () => {
    onGenerate();
    await new Promise(r => setTimeout(r, 2500));
    setToast("success");
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div>
      {/* Generate panel */}
      <div style={{ background: T.card, border: `0.5px solid ${T.border}`, borderRadius: 10, padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, fontFamily: "'Playfair Display', Georgia, serif", marginBottom: 14, color: T.text }}>
          Generate new report
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto", gap: 10, alignItems: "end" }}>
          <div>
            <label style={{ display: "block", fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>Period label</label>
            <input value={genForm.period} onChange={e => setGenForm(f => ({ ...f, period: e.target.value }))}
              style={{ width: "100%", background: T.surface, border: `0.5px solid ${T.border}`, borderRadius: 6, padding: "8px 10px", fontSize: 12, color: T.text, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>Type</label>
            <select value={genForm.type} onChange={e => setGenForm(f => ({ ...f, type: e.target.value }))}
              style={{ width: "100%", background: T.surface, border: `0.5px solid ${T.border}`, borderRadius: 6, padding: "8px 10px", fontSize: 12, color: T.text, outline: "none" }}>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>Date from</label>
            <input type="date" value={genForm.dateFrom} onChange={e => setGenForm(f => ({ ...f, dateFrom: e.target.value }))}
              style={{ width: "100%", background: T.surface, border: `0.5px solid ${T.border}`, borderRadius: 6, padding: "8px 10px", fontSize: 12, color: T.text, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>Date to</label>
            <input type="date" value={genForm.dateTo} onChange={e => setGenForm(f => ({ ...f, dateTo: e.target.value }))}
              style={{ width: "100%", background: T.surface, border: `0.5px solid ${T.border}`, borderRadius: 6, padding: "8px 10px", fontSize: 12, color: T.text, outline: "none", boxSizing: "border-box" }} />
          </div>
          <button data-testid="btn-generate-report" onClick={generate} disabled={generating}
            style={{ background: generating ? T.surface : T.amber, color: generating ? T.muted : "#fff", border: `0.5px solid ${generating ? T.border : T.amber}`, borderRadius: 6, padding: "8px 20px", fontSize: 12, fontWeight: 600, cursor: generating ? "wait" : "pointer", whiteSpace: "nowrap" }}>
            {generating ? "Generating…" : "Generate →"}
          </button>
        </div>
        {generating && (
          <div data-testid="generating-indicator" style={{ marginTop: 12, fontSize: 11, color: T.amber, display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: T.amber, animation: "pulse 1s infinite" }} />
            Claude is writing bilingual narratives (EN + AR)…
          </div>
        )}
      </div>

      {/* Report list */}
      <div style={{ background: T.card, border: `0.5px solid ${T.border}`, borderRadius: 10, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: `0.5px solid ${T.border}`, fontSize: 13, fontWeight: 600, fontFamily: "'Playfair Display', Georgia, serif", color: T.text }}>
          Report history
        </div>
        {REPORTS.map((r, i) => (
          <div key={r.id} style={{ display: "flex", alignItems: "center", padding: "14px 20px", borderBottom: i < REPORTS.length - 1 ? `0.5px solid ${T.border}` : "none", gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 2 }}>{r.period}</div>
              <div style={{ fontSize: 11, color: T.muted }}>{r.type.charAt(0).toUpperCase() + r.type.slice(1)} · {r.pdfUrl ? "PDF ready" : "No PDF"}</div>
            </div>
            <StatusPill s={r.status} />
            <div style={{ fontFamily: "monospace", fontSize: 12, color: T.text }}>${fmtK(r.spend)}</div>
            <div style={{ fontFamily: "monospace", fontSize: 12, color: r.roas >= 3 ? T.green : T.amber, fontWeight: 700 }}>{r.roas}x ROAS</div>
            <div style={{ fontFamily: "monospace", fontSize: 12, color: T.muted }}>{fmtK(r.leads)} leads</div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => onOpen(r)}
                style={{ background: T.amberLt, border: `0.5px solid ${T.amber}30`, borderRadius: 5, padding: "5px 12px", fontSize: 11, color: T.amber, fontWeight: 600, cursor: "pointer" }}>
                View
              </button>
              {r.pdfUrl && (
                <a href={r.pdfUrl} download style={{ background: T.surface, border: `0.5px solid ${T.border}`, borderRadius: 5, padding: "5px 12px", fontSize: 11, color: T.muted, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
                  PDF
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Toasts */}
      {toast === "success" && (
        <div data-testid="toast-success" style={{ position: "absolute", bottom: 24, right: 24, background: T.greenLt, border: `0.5px solid ${T.green}`, borderRadius: 8, padding: "12px 20px", fontSize: 13, color: T.green, fontWeight: 600 }}>
          Report generated — bilingual narratives ready
        </div>
      )}
      {toast === "error" && (
        <div data-testid="toast-error" style={{ position: "absolute", bottom: 24, right: 24, background: T.redLt, border: `0.5px solid ${T.red}`, borderRadius: 8, padding: "12px 20px", fontSize: 13, color: T.red, fontWeight: 600 }}>
          Error generating report
        </div>
      )}

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [viewingReport, setViewingReport] = useState(null);
  const [generating, setGenerating]       = useState(false);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=DM+Sans:wght@300;400;500;600&display=swap";
    document.head.appendChild(link);
  }, []);

  if (viewingReport) return <ReportViewer report={viewingReport} onClose={() => setViewingReport(null)} />;

  return (
    <div style={{ background: T.bg, minHeight: "100vh", fontFamily: "'DM Sans', system-ui, sans-serif", color: T.text, position: "relative" }}>
      {/* Page header */}
      <div style={{ background: T.card, borderBottom: `0.5px solid ${T.border}`, padding: "20px 32px 0" }}>
        <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>al-ai.ai · Phase 3</div>
        <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Playfair Display', Georgia, serif", marginBottom: 16 }}>Reporting & analytics</div>
        <div style={{ display: "flex", gap: 28, borderTop: `0.5px solid ${T.border}`, paddingTop: 0 }}>
          {["reports", "benchmarks", "attribution"].map(t => (
            <div key={t} style={{ padding: "10px 0", fontSize: 12, fontWeight: 500, color: t === "reports" ? T.amber : T.muted, borderBottom: `2px solid ${t === "reports" ? T.amber : "transparent"}`, cursor: "pointer" }}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: "24px 32px", maxWidth: 1100 }}>
        {/* Summary KPIs */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          <KpiCard id="spend" label="Month-to-date spend" value="$31,480" sub="Mar 2026" />
          <KpiCard id="roas"  label="Avg ROAS (MTD)"      value="3.9x"    sub="↑ vs 3.0x target" good={true} />
          <KpiCard id="ctr"   label="Avg CTR (MTD)"       value="1.88%"   sub="↑ vs 1.5% target" good={true} />
          <KpiCard id="leads" label="Leads (MTD)"         value="1,241"   sub="~$25.4 CPL" />
        </div>

        <ReportList
          onOpen={setViewingReport}
          onGenerate={() => setGenerating(true)}
          generating={generating}
        />
      </div>
    </div>
  );
}
