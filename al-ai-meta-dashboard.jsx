// al-ai.ai — Meta Ads Platform Dashboard
// Phase 1: Campaign Launcher · Performance Dashboard · Copy Generator · Budget Alerts
import { useState, useEffect, useCallback } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  bg:      "#080810",
  surface: "#0F0F1A",
  card:    "#13131F",
  border:  "#1E1E2E",
  borderHi:"#2A2A40",
  text:    "#E2E8F0",
  muted:   "#64748B",
  hint:    "#3A3A55",
  amber:   "#F59E0B",
  amberDim:"#78490A",
  teal:    "#2DD4BF",
  tealDim: "#0D4A44",
  red:     "#F87171",
  redDim:  "#5A1F1F",
  blue:    "#60A5FA",
  purple:  "#A78BFA",
  green:   "#34D399",
};

// ─── Mock data ────────────────────────────────────────────────────────────────
const TREND_DATA = [
  { day: "Mo", spend: 840, roas: 3.1, ctr: 1.6, cpm: 6.2 },
  { day: "Tu", spend: 920, roas: 3.8, ctr: 1.9, cpm: 5.8 },
  { day: "We", spend: 780, roas: 2.9, ctr: 1.4, cpm: 7.1 },
  { day: "Th", spend: 1100, roas: 4.2, ctr: 2.1, cpm: 5.3 },
  { day: "Fr", spend: 1340, roas: 4.8, ctr: 2.4, cpm: 5.0 },
  { day: "Sa", spend: 1580, roas: 5.1, ctr: 2.7, cpm: 4.8 },
  { day: "Su", spend: 1240, roas: 4.1, ctr: 2.0, cpm: 5.5 },
];

const CAMPAIGNS = [
  { id: "c1", name: "alai_LEADS_SA_202603", country: "SA", status: "ACTIVE",  spend: 4820, roas: 4.2, ctr: 2.1, cpm: 5.3, health: "good" },
  { id: "c2", name: "alai_LEADS_KW_202603", country: "KW", status: "ACTIVE",  spend: 2140, roas: 3.8, ctr: 1.9, cpm: 6.1, health: "good" },
  { id: "c3", name: "alai_AWARE_QA_202603", country: "QA", status: "ACTIVE",  spend: 1680, roas: 1.4, ctr: 0.8, cpm: 8.9, health: "warning" },
  { id: "c4", name: "alai_SALES_JO_202603", country: "JO", status: "PAUSED",  spend: 890,  roas: 0,   ctr: 0.3, cpm: 3.2, health: "critical" },
  { id: "c5", name: "alai_TRAFFIC_SA_202603",country:"SA", status: "ACTIVE",  spend: 3200, roas: 3.1, ctr: 1.8, cpm: 5.8, health: "good" },
];

const ALERT_DATA = [
  { id: "as1", name: "SA_25-45_All_Reels", campaign: "alai_LEADS_SA_202603",   budget: 200, spent: 112, pacing: 56, expected: 50, severity: "ok",       status: "on_track",    msg: "On pace" },
  { id: "as2", name: "KW_22-55_All_Stories", campaign: "alai_LEADS_KW_202603", budget: 100, spent: 97,  pacing: 97, expected: 50, severity: "critical",  status: "near_cap",    msg: "Near budget cap (97%)" },
  { id: "as3", name: "QA_25-50_All_Feed",  campaign: "alai_AWARE_QA_202603",   budget: 80,  spent: 12,  pacing: 15, expected: 50, severity: "warning",   status: "underspending",msg: "Only 15% spent vs 50% expected" },
  { id: "as4", name: "SA_18-35_Male_Feed", campaign: "alai_TRAFFIC_SA_202603", budget: 150, spent: 78,  pacing: 52, expected: 50, severity: "ok",        status: "on_track",    msg: "On pace" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n, prefix = "") => `${prefix}${Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
const pct = n => `${Number(n).toFixed(1)}%`;
const HealthDot = ({ h }) => {
  const c = { good: T.teal, warning: T.amber, critical: T.red }[h] ?? T.muted;
  return <span style={{ display:"inline-block", width:7, height:7, borderRadius:"50%", background:c, marginRight:6 }} />;
};
const Badge = ({ children, color = T.amber, bg }) => (
  <span style={{ display:"inline-block", fontSize:10, fontWeight:600, padding:"2px 7px", borderRadius:4,
    background: bg ?? color+"22", color, letterSpacing:"0.04em", fontFamily:"'JetBrains Mono', monospace" }}>
    {children}
  </span>
);
const Pill = ({ children, active, onClick }) => (
  <button onClick={onClick} style={{
    background: active ? T.amber : "transparent",
    color: active ? T.bg : T.muted,
    border: `0.5px solid ${active ? T.amber : T.border}`,
    borderRadius: 6, padding: "6px 14px", fontSize: 12, fontWeight: 500,
    cursor: "pointer", transition: "all 0.15s",
  }}>{children}</button>
);

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, prefix = "", suffix = "", delta, id }) {
  const up = delta >= 0;
  return (
    <div data-testid={`kpi-${id}`} style={{
      background: T.card, border: `0.5px solid ${T.border}`, borderRadius: 10,
      padding: "16px 20px", flex: 1,
    }}>
      <div style={{ fontSize: 11, color: T.muted, marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 600, color: T.text, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.2 }}>
        {prefix}{value}{suffix}
      </div>
      {delta != null && (
        <div style={{ fontSize: 11, color: up ? T.teal : T.red, marginTop: 5 }}>
          {up ? "↑" : "↓"} {Math.abs(delta)}% vs last week
        </div>
      )}
    </div>
  );
}

// ─── Performance Dashboard ────────────────────────────────────────────────────
function PerformanceDashboard() {
  const [metric, setMetric] = useState("roas");
  const [range, setRange] = useState("last_7d");
  const metricConfig = {
    roas:  { label: "ROAS", color: T.amber, fmt: v => `${v}x` },
    spend: { label: "Spend $", color: T.blue, fmt: v => `$${v}` },
    ctr:   { label: "CTR %", color: T.teal, fmt: v => `${v}%` },
    cpm:   { label: "CPM $", color: T.purple, fmt: v => `$${v}` },
  };
  const mc = metricConfig[metric];

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: T.surface, border: `0.5px solid ${T.border}`, borderRadius: 6, padding: "8px 12px", fontSize: 12, color: T.text }}>
        <div style={{ color: T.muted, marginBottom: 2 }}>{payload[0]?.payload?.day}</div>
        <div style={{ color: mc.color, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
          {mc.fmt(payload[0]?.value)}
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* KPI row */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <KpiCard id="spend" label="Total spend" value={fmt(13870)} prefix="$" delta={12} />
        <KpiCard id="roas"  label="Avg ROAS"    value="4.1x"                    delta={8} />
        <KpiCard id="ctr"   label="Avg CTR"     value={pct(2.0)}                delta={5} />
        <KpiCard id="cpm"   label="Avg CPM"     value={fmt(5.8)} prefix="$"     delta={-4} />
      </div>

      {/* Chart */}
      <div style={{ background: T.card, border: `0.5px solid ${T.border}`, borderRadius: 10, padding: "16px 20px", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: T.text, fontWeight: 500 }}>7-day trend</div>
          <div style={{ display: "flex", gap: 6 }}>
            {Object.entries(metricConfig).map(([k, v]) => (
              <Pill key={k} active={metric === k} onClick={() => setMetric(k)}>{v.label}</Pill>
            ))}
          </div>
        </div>
        <div data-testid="performance-chart" style={{ height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={TREND_DATA} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <XAxis dataKey="day" tick={{ fill: T.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: T.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey={metric} stroke={mc.color} strokeWidth={2} dot={{ fill: mc.color, r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Campaigns table */}
      <div style={{ background: T.card, border: `0.5px solid ${T.border}`, borderRadius: 10, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: `0.5px solid ${T.border}`, fontSize: 13, color: T.text, fontWeight: 500 }}>
          Active campaigns
        </div>
        <table data-testid="campaigns-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: T.surface }}>
              {["Campaign", "Country", "Status", "Spend", "ROAS", "CTR", "CPM", "Health"].map(h => (
                <th key={h} style={{ padding: "9px 16px", fontSize: 11, color: T.muted, textAlign: "left", fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CAMPAIGNS.map((c, i) => (
              <tr key={c.id} data-testid={`campaign-row-${c.id}`} style={{
                borderTop: `0.5px solid ${T.border}`,
                background: i % 2 === 0 ? "transparent" : T.surface + "60",
              }}>
                <td style={{ padding: "10px 16px", fontSize: 12, color: T.text, fontFamily: "'JetBrains Mono', monospace" }}>{c.name}</td>
                <td style={{ padding: "10px 16px" }}><Badge color={T.blue}>{c.country}</Badge></td>
                <td style={{ padding: "10px 16px" }}>
                  <Badge color={c.status === "ACTIVE" ? T.teal : T.muted}>{c.status}</Badge>
                </td>
                <td style={{ padding: "10px 16px", fontSize: 12, color: T.text, fontFamily: "'JetBrains Mono', monospace" }}>${fmt(c.spend)}</td>
                <td style={{ padding: "10px 16px", fontSize: 12, color: c.roas > 3 ? T.teal : c.roas > 1.5 ? T.amber : T.red, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{c.roas > 0 ? `${c.roas}x` : "—"}</td>
                <td style={{ padding: "10px 16px", fontSize: 12, color: T.text, fontFamily: "'JetBrains Mono', monospace" }}>{pct(c.ctr)}</td>
                <td style={{ padding: "10px 16px", fontSize: 12, color: T.text, fontFamily: "'JetBrains Mono', monospace" }}>${c.cpm}</td>
                <td style={{ padding: "10px 16px" }}><HealthDot h={c.health} /><span style={{ fontSize: 11, color: T.muted }}>{c.health}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Campaign Launcher ────────────────────────────────────────────────────────
function CampaignLauncher() {
  const [step, setStep] = useState(0); // 0=brief, 1=targeting, 2=review, 3=done
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    brand: "al-ai.ai", product: "", objective: "OUTCOME_LEADS",
    dailyBudget: "100", countries: [], ageMin: "25", ageMax: "55",
    gender: "all", language: "both", tone: "professional", startDate: "",
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleCountry = c => set("countries", form.countries.includes(c) ? form.countries.filter(x => x !== c) : [...form.countries, c]);

  const validate = () => {
    const e = {};
    if (!form.product) e.product = "Required";
    if (parseFloat(form.dailyBudget) < 5) e.dailyBudget = "Minimum $5/day";
    if (!form.countries.length) e.countries = "Select at least one market";
    if (!form.startDate) e.startDate = "Required";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const launch = async () => {
    if (!validate()) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 2000));
    setResult({ success: true, campaign: { id: "camp_" + Date.now(), name: `${form.brand}_${form.objective}_${form.countries.join("")}_${form.startDate}`, status: "PAUSED" }, ads: ["ad_1", "ad_2", "ad_3"] });
    setLoading(false);
    setStep(3);
  };

  const Field = ({ label, id, type = "text", placeholder, value, onChange, error, ...rest }) => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 11, color: T.muted, marginBottom: 5, letterSpacing: "0.05em", textTransform: "uppercase" }}>{label}</label>
      <input
        data-testid={`field-${id}`}
        aria-label={label}
        type={type} placeholder={placeholder} value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: "100%", background: T.surface, border: `0.5px solid ${error ? T.red : T.border}`,
          borderRadius: 6, padding: "9px 12px", fontSize: 13, color: T.text, outline: "none",
          fontFamily: "'JetBrains Mono', monospace", boxSizing: "border-box",
        }}
        {...rest}
      />
      {error && <div data-testid={`error-${id}`} style={{ fontSize: 11, color: T.red, marginTop: 4 }}>{error}</div>}
    </div>
  );

  const steps = ["Brief", "Targeting", "Review", "Done"];
  const countries = [
    { code: "SA", label: "Saudi Arabia" },
    { code: "KW", label: "Kuwait" },
    { code: "QA", label: "Qatar" },
    { code: "JO", label: "Jordan" },
  ];

  if (step === 3 && result) {
    return (
      <div style={{ maxWidth: 560 }}>
        <div data-testid="campaign-success" style={{ background: T.tealDim, border: `0.5px solid ${T.teal}`, borderRadius: 10, padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 14, color: T.teal, fontWeight: 600, marginBottom: 8 }}>Campaign created — pending review</div>
          <div style={{ fontSize: 12, color: T.text, fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>{result.campaign.name}</div>
          <div style={{ fontSize: 12, color: T.muted }}>{result.ads.length} ads created · Status: <Badge color={T.amber}>PAUSED</Badge></div>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 10 }}>Activate in Meta Ads Manager after reviewing creatives</div>
        </div>
        <button onClick={() => { setStep(0); setResult(null); setForm({ brand: "al-ai.ai", product: "", objective: "OUTCOME_LEADS", dailyBudget: "100", countries: [], ageMin: "25", ageMax: "55", gender: "all", language: "both", tone: "professional", startDate: "" }); }}
          style={{ background: "transparent", border: `0.5px solid ${T.border}`, borderRadius: 6, padding: "9px 20px", color: T.muted, fontSize: 13, cursor: "pointer" }}>
          New campaign
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640 }}>
      {/* Stepper */}
      <div style={{ display: "flex", gap: 0, marginBottom: 24, background: T.surface, borderRadius: 8, padding: 4, width: "fit-content" }}>
        {steps.map((s, i) => (
          <div key={s} style={{
            padding: "6px 16px", borderRadius: 6, fontSize: 12, fontWeight: 500,
            background: i === step ? T.amber : "transparent",
            color: i === step ? T.bg : i < step ? T.teal : T.muted,
            cursor: i < step ? "pointer" : "default",
            transition: "all 0.15s",
          }} onClick={() => i < step && setStep(i)}>{s}</div>
        ))}
      </div>

      {step === 0 && (
        <div>
          <Field label="Brand" id="brand" value={form.brand} onChange={v => set("brand", v)} placeholder="al-ai.ai" />
          <Field label="Product / service" id="product" value={form.product} onChange={v => set("product", v)} placeholder="AI Marketing Platform" error={errors.product} />
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 11, color: T.muted, marginBottom: 5, letterSpacing: "0.05em", textTransform: "uppercase" }}>Objective</label>
            <select data-testid="select-objective" value={form.objective} onChange={e => set("objective", e.target.value)}
              style={{ width: "100%", background: T.surface, border: `0.5px solid ${T.border}`, borderRadius: 6, padding: "9px 12px", fontSize: 13, color: T.text, outline: "none" }}>
              <option value="OUTCOME_LEADS">Lead generation</option>
              <option value="OUTCOME_SALES">Sales / conversions</option>
              <option value="OUTCOME_TRAFFIC">Traffic</option>
              <option value="OUTCOME_AWARENESS">Brand awareness</option>
            </select>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <Field label="Daily budget (USD)" id="dailyBudget" type="number" value={form.dailyBudget} onChange={v => set("dailyBudget", v)} error={errors.dailyBudget} style={{ flex: 1 }} />
            <Field label="Start date" id="startDate" type="date" value={form.startDate} onChange={v => set("startDate", v)} error={errors.startDate} style={{ flex: 1 }} />
          </div>
          <button onClick={() => { if (form.product && parseFloat(form.dailyBudget) >= 5 && form.startDate) setStep(1); else validate(); }}
            style={{ background: T.amber, color: T.bg, border: "none", borderRadius: 6, padding: "10px 24px", fontSize: 13, fontWeight: 600, cursor: "pointer", marginTop: 4 }}>
            Next: Targeting →
          </button>
        </div>
      )}

      {step === 1 && (
        <div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: T.muted, marginBottom: 8, letterSpacing: "0.05em", textTransform: "uppercase" }}>Target markets</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {countries.map(({ code, label }) => (
                <label key={code} data-testid={`country-${code}`} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  background: form.countries.includes(code) ? T.amberDim : T.surface,
                  border: `0.5px solid ${form.countries.includes(code) ? T.amber : T.border}`,
                  borderRadius: 8, padding: "10px 14px", cursor: "pointer", transition: "all 0.15s",
                }}>
                  <input type="checkbox" checked={form.countries.includes(code)} onChange={() => toggleCountry(code)} style={{ accentColor: T.amber }} />
                  <div>
                    <div style={{ fontSize: 13, color: T.text, fontWeight: 500 }}>{label}</div>
                    <div style={{ fontSize: 10, color: T.muted }}>{code}</div>
                  </div>
                </label>
              ))}
            </div>
            {errors.countries && <div data-testid="error-countries" style={{ fontSize: 11, color: T.red, marginTop: 6 }}>{errors.countries}</div>}
          </div>
          <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: 11, color: T.muted, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>Age range</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input data-testid="field-ageMin" aria-label="Min age" type="number" value={form.ageMin} onChange={e => set("ageMin", e.target.value)}
                  style={{ flex: 1, background: T.surface, border: `0.5px solid ${T.border}`, borderRadius: 6, padding: "9px 12px", fontSize: 13, color: T.text, outline: "none" }} />
                <span style={{ display: "flex", alignItems: "center", color: T.muted, fontSize: 13 }}>–</span>
                <input data-testid="field-ageMax" aria-label="Max age" type="number" value={form.ageMax} onChange={e => set("ageMax", e.target.value)}
                  style={{ flex: 1, background: T.surface, border: `0.5px solid ${T.border}`, borderRadius: 6, padding: "9px 12px", fontSize: 13, color: T.text, outline: "none" }} />
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: 11, color: T.muted, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>Language</label>
              <select value={form.language} onChange={e => set("language", e.target.value)}
                style={{ width: "100%", background: T.surface, border: `0.5px solid ${T.border}`, borderRadius: 6, padding: "9px 12px", fontSize: 13, color: T.text, outline: "none" }}>
                <option value="both">Arabic + English</option>
                <option value="ar">Arabic only</option>
                <option value="en">English only</option>
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setStep(0)} style={{ background: "transparent", border: `0.5px solid ${T.border}`, borderRadius: 6, padding: "10px 20px", fontSize: 13, color: T.muted, cursor: "pointer" }}>← Back</button>
            <button onClick={() => { if (form.countries.length) setStep(2); else validate(); }}
              style={{ background: T.amber, color: T.bg, border: "none", borderRadius: 6, padding: "10px 24px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Review →
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <div style={{ background: T.surface, border: `0.5px solid ${T.border}`, borderRadius: 10, padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>Campaign summary</div>
            {[
              ["Brand", form.brand], ["Product", form.product],
              ["Objective", form.objective], ["Daily budget", `$${form.dailyBudget}`],
              ["Markets", form.countries.join(", ") || "—"], ["Age", `${form.ageMin}–${form.ageMax}`],
              ["Language", form.language], ["Start", form.startDate],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `0.5px solid ${T.border}` }}>
                <span style={{ fontSize: 12, color: T.muted }}>{k}</span>
                <span style={{ fontSize: 12, color: T.text, fontFamily: "'JetBrains Mono', monospace" }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ background: T.amberDim, border: `0.5px solid ${T.amber}40`, borderRadius: 8, padding: "10px 14px", fontSize: 12, color: T.amber, marginBottom: 16 }}>
            Campaign will be created as <strong>PAUSED</strong>. Review creatives in Meta Ads Manager before activating.
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setStep(1)} style={{ background: "transparent", border: `0.5px solid ${T.border}`, borderRadius: 6, padding: "10px 20px", fontSize: 13, color: T.muted, cursor: "pointer" }}>← Back</button>
            <button data-testid="btn-launch-campaign" onClick={launch} disabled={loading}
              style={{ background: loading ? T.hint : T.amber, color: T.bg, border: "none", borderRadius: 6, padding: "10px 28px", fontSize: 13, fontWeight: 600, cursor: loading ? "wait" : "pointer", transition: "all 0.15s" }}>
              {loading ? "Generating with Claude…" : "Launch campaign"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Copy Generator ───────────────────────────────────────────────────────────
function CopyGenerator() {
  const [form, setForm] = useState({ brand: "al-ai.ai", product: "", usp: "", market: "KSA", goal: "Generate qualified leads", tone: "professional", numVariants: 5 });
  const [loading, setLoading] = useState(false);
  const [variants, setVariants] = useState([]);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const generate = async () => {
    if (!form.product) return;
    setLoading(true);
    setError("");
    setVariants([]);

    // Call real Claude API
    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          system: `You are a bilingual Gulf market ad copywriter (Arabic/English). Return ONLY valid JSON, no markdown.`,
          messages: [{
            role: "user",
            content: `Write ${form.numVariants} Meta ad copy variants for:
Brand: ${form.brand}
Product: ${form.product}
USPs: ${form.usp}
Market: ${form.market} (Gulf)
Goal: ${form.goal}
Tone: ${form.tone}

Return JSON: {"variants":[{"lang":"ar"|"en","headline":"≤40 chars","primaryText":"≤125 chars","description":"≤30 chars","cta":"LEARN_MORE"|"SHOP_NOW"|"SIGN_UP"|"GET_QUOTE"|"CONTACT_US","angle":"creative angle"}]}

Mix Arabic and English. Arabic must be natural Gulf dialect.`,
          }],
        }),
      });
      const data = await resp.json();
      const text = data.content?.[0]?.text ?? "";
      const clean = text.replace(/```(?:json)?\n?/g, "").trim();
      const parsed = JSON.parse(clean);
      setVariants(parsed.variants ?? []);
    } catch (e) {
      setError("Claude API error — check your connection. Showing demo variants.");
      // Fallback demo
      setVariants([
        { lang: "ar", headline: "حلول التسويق بالذكاء الاصطناعي", primaryText: "منصة al-ai.ai تحوّل استراتيجيتك التسويقية بتقنية الذكاء الاصطناعي المتطورة. جرّبها مجاناً اليوم.", description: "للسوق الخليجي", cta: "LEARN_MORE", angle: "Benefit-led (Arabic)" },
        { lang: "ar", headline: "ضاعف عائد إعلاناتك 3 أضعاف", primaryText: "أكثر من 200 علامة تجارية في الخليج تثق بـ al-ai.ai لإدارة حملاتها على ميتا.", description: "ابدأ الآن", cta: "GET_QUOTE", angle: "Social proof (Arabic)" },
        { lang: "en", headline: "Gulf-first AI ad management", primaryText: "al-ai.ai is built for KSA, Kuwait, Qatar & Jordan — bilingual copy, local benchmarks, zero guesswork.", description: "Start free today", cta: "SIGN_UP", angle: "Market-specific (English)" },
        { lang: "en", headline: "Stop guessing. Start scaling.", primaryText: "See exactly why your Meta campaigns underperform — and let Claude fix them automatically.", description: "Try for free", cta: "LEARN_MORE", angle: "Problem-aware (English)" },
        { lang: "en", headline: "4.2x ROAS. Not a fluke.", primaryText: "Our AI optimizer watches your campaigns 24/7 and adjusts budgets before you lose a dirham.", description: "Book a demo", cta: "GET_QUOTE", angle: "Results-led (English)" },
      ]);
    }
    setLoading(false);
  };

  const copyText = (text, id) => {
    navigator.clipboard?.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(""), 1500);
  };

  const arVariants = variants.filter(v => v.lang === "ar");
  const enVariants = variants.filter(v => v.lang === "en");

  return (
    <div>
      {/* Form */}
      <div style={{ background: T.card, border: `0.5px solid ${T.border}`, borderRadius: 10, padding: 20, marginBottom: 16, maxWidth: 640 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 11, color: T.muted, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>Product</label>
            <input data-testid="field-copy-product" aria-label="Product" value={form.product} onChange={e => set("product", e.target.value)} placeholder="AI Marketing Platform"
              style={{ width: "100%", background: T.surface, border: `0.5px solid ${T.border}`, borderRadius: 6, padding: "9px 12px", fontSize: 13, color: T.text, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11, color: T.muted, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>Market</label>
            <select data-testid="select-copy-market" value={form.market} onChange={e => set("market", e.target.value)}
              style={{ width: "100%", background: T.surface, border: `0.5px solid ${T.border}`, borderRadius: 6, padding: "9px 12px", fontSize: 13, color: T.text, outline: "none" }}>
              {["KSA", "Kuwait", "Qatar", "Jordan", "Gulf"].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 11, color: T.muted, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>Key benefits (USPs)</label>
          <input data-testid="field-copy-usp" aria-label="USPs" value={form.usp} onChange={e => set("usp", e.target.value)} placeholder="AI-powered, bilingual, Gulf benchmarks, real-time optimization"
            style={{ width: "100%", background: T.surface, border: `0.5px solid ${T.border}`, borderRadius: 6, padding: "9px 12px", fontSize: 13, color: T.text, outline: "none", boxSizing: "border-box" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 11, color: T.muted, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>Campaign goal</label>
            <input data-testid="field-copy-goal" aria-label="Campaign goal" value={form.goal} onChange={e => set("goal", e.target.value)} placeholder="Generate qualified leads"
              style={{ width: "100%", background: T.surface, border: `0.5px solid ${T.border}`, borderRadius: 6, padding: "9px 12px", fontSize: 13, color: T.text, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11, color: T.muted, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>Tone</label>
            <select value={form.tone} onChange={e => set("tone", e.target.value)}
              style={{ width: "100%", background: T.surface, border: `0.5px solid ${T.border}`, borderRadius: 6, padding: "9px 12px", fontSize: 13, color: T.text, outline: "none" }}>
              {["professional", "luxury", "urgent", "friendly", "playful"].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <button data-testid="btn-generate-copy" onClick={generate} disabled={loading || !form.product}
          style={{ background: loading ? T.hint : T.amber, color: T.bg, border: "none", borderRadius: 6, padding: "10px 24px", fontSize: 13, fontWeight: 600, cursor: loading ? "wait" : "pointer" }}>
          {loading ? "Claude is writing…" : "Generate copy →"}
        </button>
      </div>

      {loading && <div data-testid="copy-loading" style={{ fontSize: 13, color: T.amber, marginBottom: 16 }}>Generating bilingual variants…</div>}
      {error && <div data-testid="copy-error" style={{ fontSize: 12, color: T.amber, marginBottom: 12, background: T.amberDim, padding: "8px 12px", borderRadius: 6 }}>{error}</div>}

      {variants.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: T.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Arabic — {arVariants.length} variants</div>
            {arVariants.map((v, i) => (
              <div key={i} data-testid={`copy-variant-ar`} style={{ background: T.card, border: `0.5px solid ${T.border}`, borderRadius: 8, padding: 14, marginBottom: 10, direction: "rtl" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, direction: "ltr" }}>
                  <Badge color={T.purple}>{v.cta}</Badge>
                  <button onClick={() => copyText(`${v.headline}\n${v.primaryText}`, `ar-${i}`)}
                    style={{ background: "transparent", border: "none", color: copied === `ar-${i}` ? T.teal : T.muted, cursor: "pointer", fontSize: 11, padding: 0 }}>
                    {copied === `ar-${i}` ? "Copied" : "Copy"}
                  </button>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 6, textAlign: "right" }}>{v.headline}</div>
                <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.6, textAlign: "right" }}>{v.primaryText}</div>
                <div style={{ fontSize: 10, color: T.hint, marginTop: 8, direction: "ltr" }}>{v.angle}</div>
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 11, color: T.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>English — {enVariants.length} variants</div>
            {enVariants.map((v, i) => (
              <div key={i} data-testid={`copy-variant-en`} style={{ background: T.card, border: `0.5px solid ${T.border}`, borderRadius: 8, padding: 14, marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <Badge color={T.blue}>{v.cta}</Badge>
                  <button onClick={() => copyText(`${v.headline}\n${v.primaryText}`, `en-${i}`)}
                    style={{ background: "transparent", border: "none", color: copied === `en-${i}` ? T.teal : T.muted, cursor: "pointer", fontSize: 11, padding: 0 }}>
                    {copied === `en-${i}` ? "Copied" : "Copy"}
                  </button>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 6 }}>{v.headline}</div>
                <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.6 }}>{v.primaryText}</div>
                <div style={{ fontSize: 10, color: T.hint, marginTop: 8 }}>{v.angle}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Budget Alerts ────────────────────────────────────────────────────────────
function BudgetAlerts() {
  const [alerts] = useState(ALERT_DATA);
  const total = alerts.reduce((s, a) => s + a.budget, 0);
  const spent = alerts.reduce((s, a) => s + a.spent, 0);
  const critCount = alerts.filter(a => a.severity === "critical").length;
  const warnCount = alerts.filter(a => a.severity === "warning").length;

  const SevColor = { ok: T.teal, warning: T.amber, critical: T.red };
  const SevBg = { ok: T.tealDim, warning: T.amberDim, critical: T.redDim };

  return (
    <div>
      {/* Summary */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1, background: T.card, border: `0.5px solid ${T.border}`, borderRadius: 10, padding: "14px 18px" }}>
          <div style={{ fontSize: 11, color: T.muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Daily budget</div>
          <div style={{ fontSize: 22, fontWeight: 600, color: T.text, fontFamily: "'JetBrains Mono', monospace" }}>${total}</div>
        </div>
        <div style={{ flex: 1, background: T.card, border: `0.5px solid ${T.border}`, borderRadius: 10, padding: "14px 18px" }}>
          <div style={{ fontSize: 11, color: T.muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Spent today</div>
          <div style={{ fontSize: 22, fontWeight: 600, color: T.text, fontFamily: "'JetBrains Mono', monospace" }}>${spent.toFixed(0)} <span style={{ fontSize: 12, color: T.muted }}>/ ${total}</span></div>
        </div>
        <div style={{ flex: 1, background: critCount > 0 ? T.redDim : T.tealDim, border: `0.5px solid ${critCount > 0 ? T.red : T.teal}`, borderRadius: 10, padding: "14px 18px" }}>
          <div style={{ fontSize: 11, color: T.muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Alerts</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: T.text, fontFamily: "'JetBrains Mono', monospace" }}>
            <span style={{ color: T.red }}>{critCount} critical</span>
            <span style={{ color: T.muted, margin: "0 6px" }}>·</span>
            <span style={{ color: T.amber }}>{warnCount} warning</span>
          </div>
        </div>
      </div>

      {/* Alert rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {alerts.map(a => (
          <div key={a.id} data-testid={`alert-${a.id}`} style={{
            background: T.card, border: `0.5px solid ${a.severity !== "ok" ? SevColor[a.severity] + "40" : T.border}`,
            borderRadius: 10, padding: 16,
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: T.text, marginBottom: 2 }}>{a.name}</div>
                <div style={{ fontSize: 11, color: T.muted }}>{a.campaign}</div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <Badge color={SevColor[a.severity]} bg={SevBg[a.severity]}>{a.severity.toUpperCase()}</Badge>
                {a.severity !== "ok" && (
                  <span data-testid={`badge-${a.severity}`} style={{ fontSize: 10, color: SevColor[a.severity] }}>●</span>
                )}
              </div>
            </div>

            {/* Pacing bar */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: T.muted }}>Pacing</span>
                <span style={{ fontSize: 11, color: T.text, fontFamily: "'JetBrains Mono', monospace" }}>
                  ${a.spent} / ${a.budget} ({a.pacing}%)
                </span>
              </div>
              <div style={{ height: 6, background: T.surface, borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", background: SevColor[a.severity], borderRadius: 3, transition: "width 0.5s ease",
                  width: `${Math.min(a.pacing, 100)}%` }} data-testid={`pacing-bar-${a.id}`} />
              </div>
              {/* Expected marker */}
              <div style={{ position: "relative", height: 4 }}>
                <div style={{ position: "absolute", left: `${a.expected}%`, top: 0, width: 1, height: 8, background: T.muted, marginTop: -4 }} />
              </div>
              <div style={{ fontSize: 10, color: T.muted, marginTop: 6 }}>
                Expected at this hour: {a.expected}%
              </div>
            </div>

            <div style={{ fontSize: 12, color: SevColor[a.severity], fontWeight: 500 }}>{a.msg}</div>
            {a.severity !== "ok" && (
              <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>
                Recommendation: {ALERT_DATA.find(x => x.id === a.id)?.severity === "critical" ? "Increase daily budget or pause until tomorrow" : "Check targeting size, bid strategy, or creative quality"}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("performance");

  const NAV = [
    { id: "performance", label: "Performance" },
    { id: "launch",      label: "Launch" },
    { id: "copy",        label: "Copy Gen" },
    { id: "alerts",      label: "Alerts" },
  ];

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Syne:wght@500;700&display=swap";
    document.head.appendChild(link);
  }, []);

  return (
    <div style={{ background: T.bg, minHeight: "100vh", display: "flex", fontFamily: "'Syne', sans-serif", color: T.text }}>
      {/* Sidebar */}
      <div style={{ width: 200, background: T.surface, borderRight: `0.5px solid ${T.border}`, padding: "20px 0", flexShrink: 0, display: "flex", flexDirection: "column" }}>
        {/* Logo */}
        <div style={{ padding: "0 20px 20px", borderBottom: `0.5px solid ${T.border}`, marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.amber, letterSpacing: "-0.02em" }}>al-ai.ai</div>
          <div style={{ fontSize: 10, color: T.muted, marginTop: 2, letterSpacing: "0.08em", textTransform: "uppercase" }}>Meta Ads Platform</div>
        </div>

        <nav style={{ flex: 1 }}>
          {NAV.map(n => (
            <button key={n.id} data-testid={`nav-${n.id}`} onClick={() => setTab(n.id)} style={{
              display: "block", width: "100%", textAlign: "left",
              padding: "10px 20px", fontSize: 13, fontWeight: tab === n.id ? 600 : 400,
              background: tab === n.id ? T.amber + "15" : "transparent",
              color: tab === n.id ? T.amber : T.muted,
              border: "none", borderLeft: `2px solid ${tab === n.id ? T.amber : "transparent"}`,
              cursor: "pointer", transition: "all 0.12s",
            }}>{n.label}</button>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ padding: "16px 20px", borderTop: `0.5px solid ${T.border}` }}>
          <div style={{ fontSize: 10, color: T.hint, lineHeight: 1.5 }}>
            Attribution: 7d click / 1d view<br />
            Rate limit: 200/hr
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, padding: 24, overflow: "auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: T.text }}>
              {{ performance: "Performance dashboard", launch: "Campaign launcher", copy: "Copy generator", alerts: "Budget alerts" }[tab]}
            </div>
            <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
              Gulf markets · SA · KW · QA · JO
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.teal }} />
            <span style={{ fontSize: 11, color: T.muted }}>Meta API connected</span>
          </div>
        </div>

        {/* Content */}
        {tab === "performance" && <PerformanceDashboard />}
        {tab === "launch"      && <CampaignLauncher />}
        {tab === "copy"        && <CopyGenerator />}
        {tab === "alerts"      && <BudgetAlerts />}
      </div>
    </div>
  );
}
