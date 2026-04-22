import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import {
  BarChart2, Fish, AlertTriangle, CheckCircle2, Activity,
  TrendingUp, TrendingDown, Minus, ShieldAlert, Droplets,
  Lightbulb, Droplet, Utensils, ShieldCheck,
} from 'lucide-react';
import { useSystem } from '../context/SystemContext';

/* ── Colour maps ─────────────────────────────────────────────────── */
const DISEASE_COLORS = {
  Healthy: '#22c55e', Aeromoniasis: '#ef4444', 'Gill Disease': '#f97316',
  'Red Disease': '#ec4899', 'Fungal (Saprolegniasis)': '#a855f7',
  Parasitic: '#14b8a6', 'Viral (White Tail Disease)': '#6366f1', Uncertain: '#94a3b8',
};
const barColor = (n) => DISEASE_COLORS[n] || '#3b82f6';

/* ── Health score ring ───────────────────────────────────────────── */
const ScoreRing = ({ score, label }) => {
  const R = 52; const C = 2 * Math.PI * R;
  const dash = (score / 100) * C;
  const color = score >= 70 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <svg width={130} height={130} viewBox="0 0 130 130">
        <circle cx={65} cy={65} r={R} fill="none" stroke="#f1f5f9" strokeWidth={10}/>
        <circle cx={65} cy={65} r={R} fill="none" stroke={color} strokeWidth={10}
          strokeDasharray={`${dash} ${C}`} strokeLinecap="round"
          transform="rotate(-90 65 65)" style={{ transition: 'stroke-dasharray .8s ease' }}/>
        <text x={65} y={60} textAnchor="middle" fontSize={28} fontWeight={800} fill={color}>{score}</text>
        <text x={65} y={78} textAnchor="middle" fontSize={11} fill="#94a3b8">/ 100</text>
      </svg>
      <span style={{ fontWeight: 700, fontSize: '0.85rem',
        color: color, background: color + '18', padding: '3px 14px',
        borderRadius: 20, letterSpacing: '0.04em' }}>{label}</span>
    </div>
  );
};

/* ── Trend chip ─────────────────────────────────────────────────── */
const TrendChip = ({ trend }) => {
  const cfg = {
    increasing: { icon: <TrendingUp  size={13}/>, label: 'Increasing', color: '#dc2626', bg: '#fee2e2' },
    decreasing: { icon: <TrendingDown size={13}/>, label: 'Improving',  color: '#16a34a', bg: '#dcfce7' },
    stable:     { icon: <Minus       size={13}/>, label: 'Stable',     color: '#d97706', bg: '#fef3c7' },
  }[trend] || { icon: <Minus size={13}/>, label: 'Stable', color: '#d97706', bg: '#fef3c7' };
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5,
      background: cfg.bg, color: cfg.color, borderRadius: 20,
      padding: '3px 10px', fontSize: '0.75rem', fontWeight: 700 }}>
      {cfg.icon}{cfg.label}
    </span>
  );
};

/* ── Risk banner ─────────────────────────────────────────────────── */
const RISK_CFG = {
  low:    { color:'#16a34a', bg:'#dcfce7', border:'#86efac', emoji:'🟢', label:'Low Risk' },
  medium: { color:'#d97706', bg:'#fef3c7', border:'#fcd34d', emoji:'🟡', label:'Medium Risk' },
  high:   { color:'#dc2626', bg:'#fee2e2', border:'#fca5a5', emoji:'🔴', label:'High Risk' },
};

/* ── Mini KPI card ───────────────────────────────────────────────── */
const KpiCard = ({ icon: Icon, label, value, sub, color='#2563eb' }) => (
  <motion.div initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }}
    style={{ background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:14,
      padding:'16px 18px', display:'flex', flexDirection:'column', gap:6 }}>
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
      <span style={{ fontSize:'0.72rem', color:'#64748b', fontWeight:600,
        textTransform:'uppercase', letterSpacing:'0.05em' }}>{label}</span>
      <span style={{ background:color+'18', color, borderRadius:8, padding:'4px 6px', display:'flex' }}>
        <Icon size={14}/>
      </span>
    </div>
    <div style={{ fontSize:'1.75rem', fontWeight:800, color:'#0f172a', lineHeight:1 }}>{value}</div>
    {sub && <div style={{ fontSize:'0.75rem', color:'#94a3b8' }}>{sub}</div>}
  </motion.div>
);

/* ── Prevention section ─────────────────────────────────────────── */
const PreventionSection = ({ recs }) => {
  const sections = [
    { icon: Droplet,    label: 'Water Quality', items: recs.waterQuality },
    { icon: Utensils,   label: 'Feeding',       items: recs.feeding },
    { icon: ShieldCheck,label: 'Hygiene',       items: recs.hygiene },
  ];
  return (
    <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.22 }}
      style={{ background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:16, padding:'20px 22px' }}>
      <p style={{ fontWeight:700, color:'#0f172a', margin:'0 0 4px', fontSize:'0.95rem' }}>
        Prevention &amp; Management — <span style={{ color:'#7c3aed' }}>{recs.disease}</span>
      </p>
      <p style={{ fontSize:'0.77rem', color:'#94a3b8', margin:'0 0 16px' }}>
        Protocol recommendations based on the dominant disease detected
      </p>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:12 }}>
        {sections.map(({ icon: Icon, label, items }) => (
          items?.length > 0 && (
            <div key={label} style={{ background:'#f8fafc', borderRadius:12, padding:'14px 16px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:10 }}>
                <span style={{ background:'#eff6ff', color:'#2563eb', borderRadius:7,
                  padding:'4px 5px', display:'flex' }}><Icon size={13}/></span>
                <span style={{ fontWeight:700, fontSize:'0.78rem', color:'#0f172a',
                  textTransform:'uppercase', letterSpacing:'0.05em' }}>{label}</span>
              </div>
              <ul style={{ margin:0, paddingLeft:16, display:'flex', flexDirection:'column', gap:5 }}>
                {items.map((item, i) => (
                  <li key={i} style={{ fontSize:'0.78rem', color:'#475569', lineHeight:1.5 }}>{item}</li>
                ))}
              </ul>
            </div>
          )
        ))}
      </div>
    </motion.div>
  );
};

/* ── Custom tooltip ─────────────────────────────────────────────── */
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:10,
      padding:'8px 14px', fontSize:'0.82rem', boxShadow:'0 4px 16px #0001' }}>
      <div style={{ fontWeight:700, color:'#0f172a', marginBottom:2 }}>{label}</div>
      <div style={{ color:'#2563eb' }}>{payload[0].value} detection{payload[0].value!==1?'s':''}</div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════ */
const AnalyticsPage = () => {
  const { scanHistory, sessionStore, farmIntel } = useSystem();

  /* ── Derived session-level stats ─────────────────────────────── */
  const stats = useMemo(() => {
    const total = scanHistory.length;
    if (!total) return { total:0, healthy:0, infected:0, avgConf:0, topDisease:'—', infectionPct:0, chartData:[] };
    const counts = {}; let confSum = 0;
    for (const s of scanHistory) {
      const name = s.disease || s.status || 'Unknown';
      counts[name] = (counts[name] || 0) + 1;
      confSum += (s.confidence || 0);
    }
    const healthy      = counts['Healthy'] || 0;
    const infected     = total - healthy;
    const infectionPct = Math.round((infected / total) * 100);
    const avgConf      = Math.round((confSum / total) * 100);
    const topDisease   = Object.entries(counts).filter(([n]) => n !== 'Healthy')
      .sort((a,b) => b[1]-a[1])[0]?.[0] ?? '—';
    const chartData    = Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([name,count])=>({name,count}));
    return { total, healthy, infected, avgConf, topDisease, infectionPct, chartData };
  }, [scanHistory]);

  /* ── Unpack farmIntel ────────────────────────────────────────── */
  const {
    healthScore    = { score:100, label:'Good' },
    riskLevel      = { level:'low', explanation:'' },
    trend          = { trend:'stable', infectionRates:[], mostCommonDiseaseOverTime:null },
    insights       = [],
    preventionRecs = { disease:'Healthy', waterQuality:[], feeding:[], hygiene:[] },
  } = farmIntel || {};

  const riskCfg = RISK_CFG[riskLevel.level] || RISK_CFG.low;
  const hasSessions = sessionStore.length >= 2;

  /* ── Empty state ─────────────────────────────────────────────── */
  if (stats.total === 0 && sessionStore.length === 0) {
    return (
      <div style={{ padding:'2.5rem', display:'flex', flexDirection:'column', gap:'1.5rem' }}>
        <div>
          <h1 style={{ fontSize:'1.5rem', fontWeight:800, color:'#0f172a', margin:0 }}>Farm Analytics</h1>
          <p style={{ color:'#64748b', marginTop:4, fontSize:'0.9rem' }}>Aquaculture health insights from your scan sessions</p>
        </div>
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
          style={{ background:'#f8fafc', border:'1.5px dashed #cbd5e1', borderRadius:16,
            padding:'3rem', textAlign:'center' }}>
          <Fish size={40} style={{ color:'#94a3b8', marginBottom:12 }}/>
          <p style={{ fontSize:'1rem', fontWeight:600, color:'#475569', margin:0 }}>No scans yet.</p>
          <p style={{ fontSize:'0.85rem', color:'#94a3b8', marginTop:6 }}>
            Upload fish images on the <strong>Batch Scan</strong> page to unlock AI farm intelligence.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{ padding:'2rem 2.5rem', display:'flex', flexDirection:'column', gap:'1.5rem' }}>

      {/* Header */}
      <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}>
        <h1 style={{ fontSize:'1.5rem', fontWeight:800, color:'#0f172a', margin:0 }}>Farm Analytics</h1>
        <p style={{ color:'#64748b', marginTop:4, fontSize:'0.9rem' }}>
          AI-powered aquaculture intelligence · {stats.total} scan{stats.total!==1?'s':''} · {sessionStore.length} batch session{sessionStore.length!==1?'s':''}
        </p>
      </motion.div>

      {/* ── HERO: Health Score + Risk + Trend ─────────────────────── */}
      <motion.div initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.04 }}
        style={{ background:'linear-gradient(135deg,#f0f9ff,#e0f2fe)', border:'1.5px solid #bae6fd',
          borderRadius:20, padding:'24px 28px', display:'flex', flexWrap:'wrap',
          alignItems:'center', gap:28 }}>

        <ScoreRing score={healthScore.score} label={healthScore.label} />

        <div style={{ flex:1, minWidth:180, display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <div style={{ fontSize:'0.7rem', fontWeight:700, color:'#0369a1',
              textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>Farm Health Score</div>
            <div style={{ fontSize:'0.88rem', color:'#0f172a', fontWeight:500, lineHeight:1.5 }}>
              {riskLevel.explanation || 'Based on most recent batch scan results.'}
            </div>
          </div>

          <div style={{ display:'flex', flexWrap:'wrap', gap:8, alignItems:'center' }}>
            <span style={{ display:'inline-flex', alignItems:'center', gap:5,
              background: riskCfg.bg, color: riskCfg.color,
              border:`1px solid ${riskCfg.border}`,
              borderRadius:20, padding:'3px 12px', fontSize:'0.78rem', fontWeight:700 }}>
              {riskCfg.emoji} {riskCfg.label}
            </span>
            {hasSessions && <TrendChip trend={trend.trend}/>}
            {trend.mostCommonDiseaseOverTime && (
              <span style={{ fontSize:'0.75rem', color:'#64748b' }}>
                Most common: <strong style={{ color:'#0f172a' }}>{trend.mostCommonDiseaseOverTime}</strong>
              </span>
            )}
          </div>

          {/* Infection rate history mini-bars */}
          {trend.infectionRates?.length > 1 && (
            <div>
              <div style={{ fontSize:'0.7rem', color:'#94a3b8', marginBottom:5,
                textTransform:'uppercase', letterSpacing:'0.05em' }}>Infection rate — last sessions</div>
              <div style={{ display:'flex', gap:6, alignItems:'flex-end', height:36 }}>
                {trend.infectionRates.map((r,i) => (
                  <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
                    <div style={{ width:22, background: r>50?'#ef4444':r>25?'#f59e0b':'#22c55e',
                      borderRadius:'4px 4px 0 0', opacity:0.8,
                      height: Math.max(4, (r/100)*32) }}/>
                    <span style={{ fontSize:'0.6rem', color:'#94a3b8' }}>{r}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Smart Insights ────────────────────────────────────────── */}
      {insights.length > 0 && (
        <motion.div initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.08 }}
          style={{ background:'#fffbeb', border:'1.5px solid #fde68a', borderRadius:16, padding:'18px 22px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
            <Lightbulb size={16} style={{ color:'#d97706' }}/>
            <span style={{ fontWeight:700, fontSize:'0.8rem', color:'#92400e',
              textTransform:'uppercase', letterSpacing:'0.07em' }}>Smart Insights</span>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {insights.map((msg, i) => (
              <div key={i} style={{ background:'#fff', border:'1px solid #fde68a',
                borderRadius:10, padding:'10px 14px', fontSize:'0.85rem', color:'#0f172a', lineHeight:1.5 }}>
                {msg}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── KPI cards ─────────────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(175px,1fr))', gap:12 }}>
        <KpiCard icon={BarChart2}    label="Total Scans"    value={stats.total}           color="#2563eb"/>
        <KpiCard icon={CheckCircle2} label="Healthy"        value={stats.healthy}
          sub={`${Math.round((stats.healthy/(stats.total||1))*100)}% of scans`}  color="#16a34a"/>
        <KpiCard icon={AlertTriangle} label="Infected"      value={stats.infected}
          sub={`${stats.infectionPct}% infection rate`}                          color="#dc2626"/>
        <KpiCard icon={Activity}     label="Avg Confidence" value={`${stats.avgConf}%`}   color="#7c3aed"/>
        <KpiCard icon={ShieldAlert}  label="Sessions Stored" value={sessionStore.length}
          sub="batch snapshots"                                                   color="#0891b2"/>
      </div>

      {/* ── Disease breakdown chart ───────────────────────────────── */}
      {stats.chartData.length > 0 && (
        <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.12 }}
          style={{ background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:16, padding:'20px 22px' }}>
          <p style={{ fontWeight:700, color:'#0f172a', margin:'0 0 4px', fontSize:'0.95rem' }}>
            Disease Detection Breakdown
          </p>
          <p style={{ fontSize:'0.77rem', color:'#94a3b8', margin:'0 0 16px' }}>
            Detection count per class — this session
          </p>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={stats.chartData} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
              <XAxis dataKey="name" tick={{ fontSize:11, fill:'#64748b' }} axisLine={false} tickLine={false}/>
              <YAxis allowDecimals={false} tick={{ fontSize:11, fill:'#94a3b8' }} axisLine={false} tickLine={false}/>
              <Tooltip content={<CustomTooltip/>} cursor={{ fill:'#f8fafc' }}/>
              <Bar dataKey="count" radius={[6,6,0,0]}>
                {stats.chartData.map(e => <Cell key={e.name} fill={barColor(e.name)}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* ── Prevention recommendations ────────────────────────────── */}
      {(preventionRecs.waterQuality?.length > 0 || preventionRecs.feeding?.length > 0) && (
        <PreventionSection recs={preventionRecs}/>
      )}

      {/* ── Scan history table ────────────────────────────────────── */}
      {scanHistory.length > 0 && (
        <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.25 }}
          style={{ background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:16, padding:'20px 22px' }}>
          <p style={{ fontWeight:700, color:'#0f172a', margin:'0 0 14px', fontSize:'0.95rem' }}>
            Fish Health Records <span style={{ fontWeight:400, color:'#94a3b8', fontSize:'0.8rem' }}>— last 15 scans</span>
          </p>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.82rem' }}>
              <thead>
                <tr style={{ color:'#94a3b8', textTransform:'uppercase', fontSize:'0.68rem', letterSpacing:'0.05em' }}>
                  {['Scan ID','Disease / Status','Severity','Confidence','Time'].map(h => (
                    <th key={h} style={{ textAlign: h==='Confidence'||h==='Time' ? 'right':'left',
                      padding:'6px 10px', fontWeight:600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scanHistory.slice(0,15).map((s,i) => {
                  const sev = s.severity?.toLowerCase();
                  const sevColor = sev==='high'?'#dc2626':sev==='moderate'?'#d97706':'#16a34a';
                  const sevBg    = sev==='high'?'#fee2e2':sev==='moderate'?'#fef3c7':'#dcfce7';
                  return (
                    <tr key={i} style={{ borderTop:'1px solid #f1f5f9' }}>
                      <td style={{ padding:'8px 10px', color:'#94a3b8', fontFamily:'monospace', fontSize:'0.7rem' }}>
                        {s.scanId||`#${i+1}`}
                      </td>
                      <td style={{ padding:'8px 10px', fontWeight:600, color:'#0f172a' }}>
                        {s.disease||s.status||'—'}
                      </td>
                      <td style={{ padding:'8px 10px' }}>
                        {sev ? <span style={{ background:sevBg, color:sevColor, padding:'2px 8px',
                          borderRadius:20, fontSize:'0.68rem', fontWeight:700 }}>{sev.toUpperCase()}</span> : '—'}
                      </td>
                      <td style={{ padding:'8px 10px', textAlign:'right', color:'#475569' }}>
                        {s.confidence!=null ? `${Math.round(s.confidence*100)}%` : '—'}
                      </td>
                      <td style={{ padding:'8px 10px', textAlign:'right', color:'#94a3b8',
                        fontFamily:'monospace', fontSize:'0.7rem' }}>{s.timestamp||'—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

    </div>
  );
};

export default AnalyticsPage;
