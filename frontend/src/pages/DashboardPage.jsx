import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, Label,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Minus, CheckCircle2, XCircle, HelpCircle,
  Fish, RefreshCw, Activity, AlertOctagon, Bell, X, HeartPulse, ShieldAlert,
  Lightbulb, Brain,
} from 'lucide-react';
import { useAuth }   from '../context/AuthContext';
import { useSystem } from '../context/SystemContext';
import './DashboardPage.css';

const API = '/api';

// ─── Colour palette ───────────────────────────────────────────────────────────
const C = {
  pass:      '#22c55e',
  fail:      '#ef4444',
  uncertain: '#f59e0b',
  blue:      '#3b82f6',
  blue2:     '#6366f1',
  grid:      '#f1f5f9',
  passLight: '#dcfce7',
  failLight: '#fee2e2',
  uncLight:  '#fef3c7',
};

const STATUS_COLOR = { PASS: C.pass, FAIL: C.fail, UNCERTAIN: C.uncertain };
const PIE_COLORS   = [C.pass, C.fail, C.uncertain];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n, d = 1) => (typeof n === 'number' ? n.toFixed(d) : '—');

const StatusBadge = ({ status }) => {
  const cfg = {
    PASS:      { bg: '#dcfce7', color: '#16a34a', icon: <CheckCircle2 size={12}/> },
    FAIL:      { bg: '#fee2e2', color: '#dc2626', icon: <XCircle size={12}/> },
    UNCERTAIN: { bg: '#fef3c7', color: '#d97706', icon: <HelpCircle size={12}/> },
  }[status] || { bg: '#f1f5f9', color: '#64748b', icon: null };

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: cfg.bg, color: cfg.color,
      padding: '2px 8px', borderRadius: 20,
      fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.02em',
    }}>
      {cfg.icon}{status}
    </span>
  );
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 14px', boxShadow: '0 4px 16px rgba(15,23,42,.1)', fontSize: '0.8rem' }}>
      <p style={{ color: '#64748b', marginBottom: 6, fontWeight: 600 }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color, margin: '2px 0' }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
};

// ─── Mini Sparkline (no axes, no tooltip) ────────────────────────────────────
const Sparkline = ({ data, color }) => {
  const pts = data || [0,0,0,0,0,0,0];
  return (
    <div className="db-kpi-sparkline">
      <ResponsiveContainer width="100%" height={40}>
        <AreaChart data={pts.map((v, i) => ({ i, v }))} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`sp-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={color} stopOpacity={0.25}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <Area
            type="monotone" dataKey="v" stroke={color} strokeWidth={1.5}
            fill={`url(#sp-${color.replace('#', '')})`} dot={false} isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────
const KpiCard = ({ label, value, sub, icon, accent, delay = 0, loading, sparkData }) => (
  <motion.div
    className="db-kpi-card"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4, ease: [0.22,1,0.36,1] }}
    style={{ '--accent': accent }}
  >
    <div className="db-kpi-top">
      <span className="db-kpi-label">{label}</span>
      <div className="db-kpi-icon" style={{ background: accent + '18', color: accent }}>{icon}</div>
    </div>
    {loading ? (
      <div className="db-shimmer" style={{ height: 36, width: 100, marginTop: 6 }}/>
    ) : (
      <p className="db-kpi-value" style={{ color: accent }}>{value}</p>
    )}
    {sub && <p className="db-kpi-sub">{sub}</p>}
    {sparkData && !loading && <Sparkline data={sparkData} color={accent}/>}
  </motion.div>
);

// ─── Donut center label ───────────────────────────────────────────────────────
const DonutCenterLabel = ({ viewBox, total }) => {
  const { cx, cy } = viewBox;
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
      <tspan x={cx} dy="-0.4em" fontSize="22" fontWeight="800" fill="#0f172a">{total}</tspan>
      <tspan x={cx} dy="1.4em" fontSize="10" fill="#94a3b8" letterSpacing="0.05em">TOTAL</tspan>
    </text>
  );
};

// ─── Empty state ──────────────────────────────────────────────────────────────
const EmptyChart = ({ msg = 'No scan data yet. Run your first fish health scan.' }) => (
  <div className="db-empty">
    <Activity size={28} style={{ color: '#cbd5e1' }}/>
    <p>{msg}</p>
  </div>
);

// ═════════════════════════════════════════════════════════════════════════════
// Main DashboardPage
// ═════════════════════════════════════════════════════════════════════════════
// ── Farm Intel helpers ───────────────────────────────────────────────────────
const RISK_COLORS = {
  low:    { color:'#16a34a', bg:'#dcfce7', border:'#86efac' },
  medium: { color:'#d97706', bg:'#fef3c7', border:'#fcd34d' },
  high:   { color:'#dc2626', bg:'#fee2e2', border:'#fca5a5' },
};
const ScoreMini = ({ score, label }) => {
  const color = score>=70?'#16a34a':score>=40?'#d97706':'#dc2626';
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
      <div style={{ fontSize:'2rem', fontWeight:900, color, lineHeight:1 }}>{score}</div>
      <div style={{ fontSize:'0.65rem', fontWeight:700, color, background:color+'18',
        padding:'1px 8px', borderRadius:20, letterSpacing:'0.04em' }}>{label}</div>
    </div>
  );
};
const TrendIcon = ({ trend }) =>
  trend==='increasing' ? <TrendingUp size={14} style={{color:'#dc2626'}}/>
  : trend==='decreasing' ? <TrendingDown size={14} style={{color:'#16a34a'}}/>
  : <Minus size={14} style={{color:'#d97706'}}/>;

const DashboardPage = () => {
  const { user } = useAuth();
  const { scanHistory, sessionStore, farmIntel } = useSystem();
  const recentSession = (scanHistory || []).slice(0, 3);

  const [stats,   setStats]   = useState(null);
  const [scans,   setScans]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [lastRefreshed, setLastRefreshed] = useState('');

  // ── Alert state ─────────────────────────────────────────────────────────
  const [alerts,         setAlerts]         = useState([]);
  const [showAlertPanel, setShowAlertPanel] = useState(false);
  const [alertDismissed, setAlertDismissed] = useState(false);
  const seenAlertCount = useRef(0);

  // ── Fetch ───────────────────────────────────────────────────────────────
  const fetchData = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const [sr, sc] = await Promise.all([
        fetch(`${API}/stats`).then(r => r.json()),
        fetch(`${API}/scans?limit=20`).then(r => r.json()),
      ]);
      setStats(sr);
      setScans(Array.isArray(sc) ? sc : []);
      setLastRefreshed(new Date().toLocaleTimeString());
    } catch {/* backend offline — keep existing state */}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(true); }, [fetchData]);

  // Auto-refresh every 5 s — fast enough to show mobile results promptly
  useEffect(() => {
    const id = setInterval(() => fetchData(false), 5_000);
    return () => clearInterval(id);
  }, [fetchData, refresh]);

  // ── Poll alert status every 10 s ─────────────────────────────────────────
  useEffect(() => {
    const pollAlerts = async () => {
      try {
        const res  = await fetch(`${API}/alert-status`);
        const data = await res.json();
        const list = data.alerts || [];
        setAlerts(list);
        if (list.length > seenAlertCount.current) {
          setAlertDismissed(false);   // new alert — show banner again
        }
      } catch { /* backend offline */ }
    };
    pollAlerts();
    const id = setInterval(pollAlerts, 10_000);
    return () => clearInterval(id);
  }, []);

  // ── Derived data ─────────────────────────────────────────────────────────
  const pieData = stats ? [
    { name: 'Pass',      value: stats.pass      || 0 },
    { name: 'Fail',      value: stats.fail      || 0 },
    { name: 'Uncertain', value: stats.uncertain || 0 },
  ].filter(d => d.value > 0) : [];

  const barData = stats?.by_product
    ? Object.entries(stats.by_product).map(([name, v]) => ({
        name: name.length > 12 ? name.slice(0, 12) + '…' : name,
        Pass: v.pass || 0, Fail: v.fail || 0, Uncertain: v.uncertain || 0,
      }))
    : [];

  const timelineData = stats?.timeline || [];
  const sparkline    = stats?.sparkline || { total: [], pass: [], fail: [] };
  const totalScans   = stats?.total || 0;

  const firstNameDisplay = user?.name?.split(' ')[0] || 'Farmer';

  return (
    <div className="db-root">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <motion.div className="db-header"
        initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}>
        <div>
          <div className="db-header-eyebrow">
            <span className="db-status-dot"/> AQUAGUARD ACTIVE
          </div>
          <h1 className="db-title">Farm Dashboard</h1>
          <p className="db-subtitle">Welcome back, <strong>{firstNameDisplay}</strong> — here's your farm health overview.</p>
        </div>
        <div className="db-header-actions">
          {lastRefreshed && <span className="db-last-refresh">Updated {lastRefreshed}</span>}
          <button className="db-refresh-btn" onClick={() => { setRefresh(r => r+1); fetchData(true); }} title="Refresh">
            <RefreshCw size={15} className={loading ? 'db-spin' : ''}/>
            <span>Refresh</span>
          </button>
        </div>
      </motion.div>

      {/* ── Alert banner ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {alerts.length > 0 && !alertDismissed && (
          <motion.div
            key="alert-banner"
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            style={{
              background: 'linear-gradient(135deg,#fef2f2,#fff1f2)',
              border: '1.5px solid #fecaca', borderRadius: 12,
              padding: '12px 18px', display: 'flex', alignItems: 'center',
              gap: 12, marginBottom: 4,
            }}
          >
            <AlertOctagon size={18} style={{ color: '#ef4444', flexShrink: 0 }} />
            <div style={{ flex: 1, fontSize: '0.84rem', color: '#991b1b', fontWeight: 600 }}>
              ⚠ Infection Alert — {alerts[0].issue_count} infected fish detected
              <span style={{ fontWeight: 400, color: '#b91c1c', marginLeft: 10 }}>
                · Email sent to {alerts[0].user_email} · {alerts[0].triggered_at}
              </span>
            </div>
            <button
              onClick={() => { setShowAlertPanel(p => !p); seenAlertCount.current = alerts.length; }}
              style={{ background: '#fee2e2', border: 'none', borderRadius: 8,
                       padding: '5px 12px', color: '#dc2626', fontWeight: 700,
                       fontSize: '0.78rem', cursor: 'pointer' }}
            >
              {showAlertPanel ? 'Hide Log' : 'View Log'}
            </button>
            <button
              onClick={() => { setAlertDismissed(true); seenAlertCount.current = alerts.length; }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 2 }}
            >
              <X size={15} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Alert log panel ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {showAlertPanel && (
          <motion.div
            key="alert-panel"
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', marginBottom: 12 }}
          >
            <div style={{ background: '#fff', border: '1.5px solid #fecaca',
                          borderRadius: 12, padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Bell size={15} style={{ color: '#ef4444' }} />
                <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0f172a',
                               letterSpacing: '0.05em', textTransform: 'uppercase' }}>Alert History</span>
                <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#94a3b8' }}>
                  Last {alerts.length} alert{alerts.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {alerts.map((a, i) => (
                  <div key={i} style={{
                    display: 'grid', gridTemplateColumns: '1fr 0.7fr 1.2fr 1.4fr auto',
                    gap: '8px 14px', alignItems: 'center', padding: '10px 14px',
                    borderRadius: 8, background: i === 0 ? '#fff5f5' : '#fafafa',
                    border: '1px solid #f1f5f9', fontSize: '0.78rem',
                  }}>
                    <span style={{ color: '#0f172a', fontWeight: 600 }}>{a.triggered_at}</span>
                    <span style={{ color: '#64748b' }}>{a.product_type}</span>
                    <span>
                      <span style={{ color: '#ef4444', fontWeight: 700 }}>{a.fail_count} FAIL</span>
                      {' · '}
                      <span style={{ color: '#f59e0b', fontWeight: 700 }}>{a.uncertain_count} UNC</span>
                    </span>
                    <span style={{ color: '#64748b', fontSize: '0.73rem' }}>{a.user_email}</span>
                    <span style={{
                      padding: '2px 8px', borderRadius: 20, fontWeight: 700, fontSize: '0.71rem',
                      background: a.email_sent ? '#dcfce7' : '#fef9c3',
                      color: a.email_sent ? '#16a34a' : '#92400e',
                    }}>
                      {a.email_sent ? '✉ Sent' : '⏳ Pending'}
                    </span>
                  </div>
                ))}
                {alerts.length === 0 && (
                  <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: 0 }}>No alerts triggered yet.</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Farm Intelligence Strip ──────────────────────────────────────── */}
      {sessionStore?.length > 0 && farmIntel && (() => {
        const { healthScore={score:100,label:'Good'}, riskLevel={level:'low',explanation:''}, trend={trend:'stable'}, insights=[] } = farmIntel;
        const rc = RISK_COLORS[riskLevel.level] || RISK_COLORS.low;
        return (
          <motion.div
            initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }}
            style={{
              background: 'linear-gradient(135deg,#f0f9ff,#e0f2fe)',
              border: '1.5px solid #bae6fd', borderRadius: 16,
              padding: '16px 22px', display: 'flex', flexWrap:'wrap',
              alignItems: 'center', gap: 18, marginBottom: 4,
            }}
          >
            {/* icon */}
            <div style={{ background:'#0369a1', borderRadius:12, padding:'8px 10px',
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Brain size={20} style={{ color:'#fff' }}/>
            </div>

            {/* score */}
            <ScoreMini score={healthScore.score} label={healthScore.label}/>

            <div style={{ width:1, height:40, background:'#bae6fd' }}/>

            {/* risk + trend */}
            <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ background:rc.bg, color:rc.color, border:`1px solid ${rc.border}`,
                  borderRadius:20, padding:'2px 10px', fontSize:'0.72rem', fontWeight:700 }}>
                  {riskLevel.level.charAt(0).toUpperCase()+riskLevel.level.slice(1)} Risk
                </span>
                <span style={{ display:'flex', alignItems:'center', gap:4,
                  fontSize:'0.72rem', color:'#64748b', fontWeight:600 }}>
                  <TrendIcon trend={trend.trend}/>
                  {trend.trend.charAt(0).toUpperCase()+trend.trend.slice(1)}
                </span>
              </div>
              <div style={{ fontSize:'0.78rem', color:'#0f172a', maxWidth:320, lineHeight:1.4 }}>
                {riskLevel.explanation}
              </div>
            </div>

            {/* top insight */}
            {insights[0] && (
              <>
                <div style={{ width:1, height:40, background:'#bae6fd' }}/>
                <div style={{ display:'flex', alignItems:'flex-start', gap:7, flex:1, minWidth:200 }}>
                  <Lightbulb size={14} style={{ color:'#d97706', marginTop:2, flexShrink:0 }}/>
                  <span style={{ fontSize:'0.8rem', color:'#0f172a', lineHeight:1.5 }}>{insights[0]}</span>
                </div>
              </>
            )}

            <span style={{ marginLeft:'auto', fontSize:'0.68rem', color:'#64748b',
              whiteSpace:'nowrap' }}>
              {sessionStore.length} session{sessionStore.length!==1?'s':''} tracked
            </span>
          </motion.div>
        );
      })()}

      {/* ── KPI Cards ─ 6 cards ─────────────────────────────────────────── */}
      <div className="db-kpi-grid">
        <KpiCard label="Farm Health Score" value={stats ? `${Math.max(0,100 - (stats.fail_rate||0))}%` : '87%'} sub="Overall fish health"
          icon={<HeartPulse size={18}/>} accent="#2563eb" delay={0}    loading={loading}
          sparkData={sparkline.total}/>
        <KpiCard label="Total Fish Scans"  value={stats?.total ?? '—'} sub="All time"
          icon={<Fish size={18}/>} accent="#3b82f6" delay={0.05} loading={loading}
          sparkData={sparkline.total}/>
        <KpiCard label="Healthy"           value={stats ? `${stats.pass}` : '—'} sub={stats ? `${stats.pass_rate}% healthy` : ''}
          icon={<CheckCircle2 size={18}/>} accent="#22c55e" delay={0.10} loading={loading}
          sparkData={sparkline.pass}/>
        <KpiCard label="Infection Alerts"  value={stats ? `${stats.fail}` : '—'} sub={stats ? `${stats.fail_rate}% infected` : ''}
          icon={<ShieldAlert size={18}/>} accent="#ef4444" delay={0.15} loading={loading}
          sparkData={sparkline.fail}/>
        <KpiCard label="Avg Confidence"    value={stats ? `${stats.avg_conf}%` : '—'} sub="Model accuracy"
          icon={<TrendingUp size={18}/>} accent="#6366f1" delay={0.20} loading={loading}/>
        <KpiCard label="Disease Rate"      value={stats ? `${stats.defect_rate ?? 0}%` : '—'} sub="Last 24 hours"
          icon={<AlertOctagon size={18}/>} accent="#f59e0b" delay={0.25} loading={loading}/>
      </div>

      {/* ── Charts row ─────────────────────────────────────────────────── */}
      <div className="db-charts-row">

        {/* Area chart — scans over time with gradient fill */}
        <motion.div className="db-card db-card-wide"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28, duration: 0.4 }}>
          <div className="db-card-header">
            <h2 className="db-card-title">Fish Scan Activity</h2>
            <span className="db-card-tag">per minute</span>
          </div>
          {timelineData.length === 0 ? <EmptyChart/> : (
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={timelineData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad-pass" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.pass} stopOpacity={0.18}/>
                    <stop offset="95%" stopColor={C.pass} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="grad-fail" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.fail} stopOpacity={0.15}/>
                    <stop offset="95%" stopColor={C.fail} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false}/>
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Area type="monotone" dataKey="pass"      stroke={C.pass}      strokeWidth={2} fill="url(#grad-pass)" dot={false} name="Pass"/>
                <Area type="monotone" dataKey="fail"      stroke={C.fail}      strokeWidth={2} fill="url(#grad-fail)" dot={false} name="Fail"/>
                <Line type="monotone" dataKey="uncertain" stroke={C.uncertain} strokeWidth={1.5} dot={false} name="Uncertain" strokeDasharray="4 3"/>
              </AreaChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Donut chart — status distribution with center total */}
        <motion.div className="db-card db-card-narrow"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.34, duration: 0.4 }}>
          <div className="db-card-header">
            <h2 className="db-card-title">Health Status Mix</h2>
          </div>
          {pieData.length === 0 ? <EmptyChart/> : (
            <div className="db-pie-wrap">
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={54} outerRadius={82}
                    paddingAngle={3} dataKey="value" stroke="none">
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]}/>)}
                    <Label content={<DonutCenterLabel total={totalScans}/>} position="center"/>
                  </Pie>
                  <Tooltip content={<CustomTooltip/>}/>
                </PieChart>
              </ResponsiveContainer>
              <div className="db-pie-legend">
                {pieData.map((d, i) => (
                  <div key={d.name} className="db-pie-legend-item">
                    <span className="db-pie-dot" style={{ background: PIE_COLORS[i] }}/>
                    <span className="db-pie-name">{d.name}</span>
                    <span className="db-pie-val">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Bar chart — by product ──────────────────────────────────────── */}
      <motion.div className="db-card"
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.40, duration: 0.4 }}>
        <div className="db-card-header">
          <h2 className="db-card-title">Disease Breakdown</h2>
          <span className="db-card-tag">by category</span>
        </div>
        {barData.length === 0 ? <EmptyChart/> : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} barSize={22} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false}/>
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false}/>
              <Tooltip content={<CustomTooltip/>}/>
              <Legend wrapperStyle={{ fontSize: '0.78rem', color: '#64748b' }}/>
              <Bar dataKey="Pass"      fill={C.pass}      radius={[4,4,0,0]} name="Pass"/>
              <Bar dataKey="Fail"      fill={C.fail}      radius={[4,4,0,0]} name="Fail"/>
              <Bar dataKey="Uncertain" fill={C.uncertain} radius={[4,4,0,0]} name="Uncertain"/>
            </BarChart>
          </ResponsiveContainer>
        )}
      </motion.div>

      {/* ── Scan History Table ─────────────────────────────────────────── */}
      <motion.div className="db-card"
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.4 }}>
        <div className="db-card-header">
          <h2 className="db-card-title">Recent Fish Scans</h2>
          <span className="db-card-tag">latest 20</span>
        </div>

        {scans.length === 0 ? (
          loading ? (
            <div className="db-table-skeleton">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="db-shimmer" style={{ height: 44, borderRadius: 8, marginBottom: 6 }}/>

              ))}
            </div>
          ) : <EmptyChart msg="No fish scans yet — upload your first fish image to begin."/>
        ) : (
          <div className="db-table-wrap">
            <table className="db-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Disease</th>
                  <th>Status</th>
                  <th>Confidence</th>
                  <th>Treatment Note</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {scans.map((s, i) => (
                    <motion.tr key={s.scan_id || i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="db-table-row">
                      <td className="db-table-time">{s.timestamp?.slice(11, 16) || '—'}</td>
                      <td>
                        <span className="db-product-tag">{s.product_type || '—'}</span>
                      </td>
                      <td><StatusBadge status={s.status}/></td>
                      <td>
                        <div className="db-conf-cell">
                          <div className="db-conf-bar-bg">
                            <div className="db-conf-bar-fill"
                              style={{
                                width: `${Math.round((s.confidence || 0) * 100)}%`,
                                background: STATUS_COLOR[s.status] || C.blue,
                              }}/>
                          </div>
                          <span className="db-conf-pct">{Math.round((s.confidence || 0) * 100)}%</span>
                        </div>
                      </td>
                      <td className="db-table-note">{s.reason?.slice(0, 40) || '—'}</td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
      {/* ── Session Scans Strip ─────────────────────────────────── */}
      <motion.div className="db-card"
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.50, duration: 0.4 }}>
        <div className="db-card-header">
          <h2 className="db-card-title">Live Session Scans</h2>
          <span className="db-card-tag">this session · last 3</span>
        </div>
        {recentSession.length === 0 ? (
          <EmptyChart msg="No scans in this session yet. Go to Fish Scan to start analyzing." />
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:10, padding:'4px 0' }}>
            {recentSession.map((s, i) => {
              const sev = (s.severity || 'low').toLowerCase();
              const sevColor = sev === 'high' ? '#ef4444' : sev === 'moderate' ? '#f59e0b' : '#22c55e';
              const sevBg    = sev === 'high' ? '#fee2e2' : sev === 'moderate' ? '#fef9c3' : '#dcfce7';
              const pct = Math.round((s.confidence || 0) * 100);
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 }}
                  style={{
                    display:'grid',
                    gridTemplateColumns:'32px 1fr auto auto',
                    gap:12, alignItems:'center',
                    background: i === 0 ? '#f8faff' : '#fff',
                    border:'1.5px solid ' + (i === 0 ? '#bfdbfe' : '#f1f5f9'),
                    borderRadius:12, padding:'12px 16px',
                  }}
                >
                  {/* rank badge */}
                  <div style={{ width:32, height:32, borderRadius:8, background:'#eff6ff', color:'#2563eb', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:'0.85rem' }}>
                    {i + 1}
                  </div>
                  {/* disease + scan id */}
                  <div>
                    <div style={{ fontWeight:700, fontSize:'0.9rem', color:'#0f172a' }}>{s.disease || s.status || 'Unknown'}</div>
                    <div style={{ fontSize:'0.72rem', color:'#94a3b8', marginTop:2 }}>{s.scanId || '—'} &middot; {s.timestamp || '—'}</div>
                  </div>
                  {/* confidence */}
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontWeight:700, fontSize:'0.88rem', color:'#2563eb' }}>{pct}%</div>
                    <div style={{ fontSize:'0.68rem', color:'#94a3b8' }}>confidence</div>
                  </div>
                  {/* severity badge */}
                  <span style={{ background:sevBg, color:sevColor, fontWeight:700, fontSize:'0.72rem', padding:'3px 10px', borderRadius:20, letterSpacing:'0.04em', textTransform:'capitalize' }}>
                    {sev}
                  </span>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

    </div>
  );
};

export default DashboardPage;
