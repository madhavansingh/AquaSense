import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PieChart, Pie, Cell, Label, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Fish, HeartPulse, ShieldAlert, Activity, TrendingUp, TrendingDown,
  Minus, CheckCircle2, XCircle, HelpCircle, AlertTriangle, Brain,
  Lightbulb, Droplets, Bug, Microscope, Layers, Clock,
} from 'lucide-react';
import { useAuth }   from '../context/AuthContext';
import { useSystem } from '../context/SystemContext';
import { useNavigate } from 'react-router-dom';
import './DashboardPage.css';

/* ── Palette ──────────────────────────────────────────────────────────────── */
const C = {
  healthy:   '#22c55e', infected:  '#ef4444', uncertain: '#f59e0b',
  blue:      '#3b82f6', indigo:    '#6366f1', cyan:      '#06b6d4',
  healthyBg: '#dcfce7', infectedBg:'#fee2e2', uncBg:     '#fef3c7',
};
const SEV_CLR = {
  high:     { c:'#dc2626', bg:'#fee2e2' },
  moderate: { c:'#d97706', bg:'#fef9c3' },
  low:      { c:'#22c55e', bg:'#dcfce7' },
};
const DISEASE_COLORS = ['#ef4444','#f59e0b','#8b5cf6','#06b6d4','#ec4899','#14b8a6','#f97316'];

/* ── Helpers ──────────────────────────────────────────────────────────────── */
const pct = (n) => typeof n === 'number' ? Math.round(n * 100) : 0;

const StatusBadge = ({ status }) => {
  const m = {
    Healthy:   { bg:C.healthyBg, c:'#16a34a', icon:<CheckCircle2 size={11}/> },
    Infected:  { bg:C.infectedBg, c:'#dc2626', icon:<XCircle size={11}/> },
    Uncertain: { bg:C.uncBg,      c:'#d97706', icon:<HelpCircle size={11}/> },
  };
  const cfg = m[status] || m.Uncertain;
  return (
    <span className="db-status-badge" style={{ background:cfg.bg, color:cfg.c }}>
      {cfg.icon}{status}
    </span>
  );
};

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="db-chart-tooltip">
      <p className="db-tt-label">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color:p.color, margin:'2px 0' }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
};

const EmptyState = ({ msg, icon: Icon = Activity }) => (
  <div className="db-empty">
    <Icon size={28} style={{ color:'#cbd5e1' }}/>
    <p>{msg}</p>
  </div>
);

const DonutCenter = ({ viewBox, total }) => {
  const { cx, cy } = viewBox;
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
      <tspan x={cx} dy="-0.4em" fontSize="22" fontWeight="800" fill="#0f172a">{total}</tspan>
      <tspan x={cx} dy="1.4em" fontSize="10" fill="#94a3b8" letterSpacing="0.05em">TOTAL</tspan>
    </text>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DASHBOARD                                                                 */
/* ═══════════════════════════════════════════════════════════════════════════ */
const DashboardPage = () => {
  const { user } = useAuth();
  const { scanHistory, sessionStore, farmIntel } = useSystem();
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview'); // overview | scans

  const firstName = user?.name?.split(' ')[0] || 'Farmer';

  /* ── Merge all scans: individual + batch ─────────────────────────────── */
  const allScans = useMemo(() => {
    const singles = (scanHistory || []).map(s => ({
      disease:    s.disease || 'Uncertain',
      confidence: s.confidence ?? 0,
      severity:   s.severity || 'low',
      id:         s.scanId || '-',
      timestamp:  s.timestamp || '',
      source:     'single',
    }));

    const batchScans = (sessionStore || []).flatMap((sess, si) =>
      (sess.results || []).map(r => ({
        disease:    r.disease || 'Uncertain',
        confidence: r.confidence ?? 0,
        severity:   r.severity || 'low',
        id:         r.id || `B${si+1}`,
        timestamp:  sess.timestamp || '',
        source:     'batch',
      }))
    );

    return [...singles, ...batchScans].sort((a, b) =>
      new Date(b.timestamp || 0) - new Date(a.timestamp || 0)
    );
  }, [scanHistory, sessionStore]);

  /* ── Compute KPIs ────────────────────────────────────────────────────── */
  const kpis = useMemo(() => {
    const total     = allScans.length;
    const healthy   = allScans.filter(s => s.disease === 'Healthy').length;
    const infected  = allScans.filter(s => s.disease !== 'Healthy' && s.disease !== 'Uncertain').length;
    const uncertain = allScans.filter(s => s.disease === 'Uncertain').length;
    const avgConf   = total > 0 ? allScans.reduce((a, s) => a + (s.confidence || 0), 0) / total : 0;
    const highRisk  = allScans.filter(s => (s.severity||'').toLowerCase() === 'high').length;
    const healthPct = total > 0 ? ((healthy / total) * 100).toFixed(1) : '0.0';
    const infPct    = total > 0 ? ((infected / total) * 100).toFixed(1) : '0.0';

    return { total, healthy, infected, uncertain, avgConf, highRisk, healthPct, infPct };
  }, [allScans]);

  /* ── Disease distribution ────────────────────────────────────────────── */
  const diseaseDistribution = useMemo(() => {
    const counts = {};
    allScans.forEach(s => {
      if (s.disease !== 'Healthy' && s.disease !== 'Uncertain') {
        counts[s.disease] = (counts[s.disease] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [allScans]);

  /* ── Status pie data ─────────────────────────────────────────────────── */
  const pieData = useMemo(() => [
    { name: 'Healthy',   value: kpis.healthy },
    { name: 'Infected',  value: kpis.infected },
    { name: 'Uncertain', value: kpis.uncertain },
  ].filter(d => d.value > 0), [kpis]);

  /* ── Session timeline for area chart ─────────────────────────────────── */
  const sessionTimeline = useMemo(() => {
    return (sessionStore || []).map((sess, i) => {
      const s = sess.summary || {};
      return {
        name: `Batch ${i + 1}`,
        Healthy:   s.healthy_count || 0,
        Infected:  s.infected_count || 0,
        Uncertain: s.uncertain_count || 0,
        Total:     s.total_images || (sess.results||[]).length,
      };
    });
  }, [sessionStore]);

  /* ── Severity breakdown ──────────────────────────────────────────────── */
  const sevData = useMemo(() => {
    const s = { high: 0, moderate: 0, low: 0 };
    allScans.forEach(sc => { const sv = (sc.severity||'low').toLowerCase(); if (s[sv] !== undefined) s[sv]++; });
    return [
      { name: 'High', value: s.high },
      { name: 'Moderate', value: s.moderate },
      { name: 'Low', value: s.low },
    ].filter(d => d.value > 0);
  }, [allScans]);

  /* ── Farm Intel ──────────────────────────────────────────────────────── */
  const intel = farmIntel || {};
  const hs = intel.healthScore || { score: 100, label: 'Good' };
  const rl = intel.riskLevel || { level: 'low', explanation: 'No data yet' };
  const tr = intel.trend || { trend: 'stable' };
  const insights = intel.insights || [];

  const hasData = allScans.length > 0;

  /* ── Render ──────────────────────────────────────────────────────────── */
  return (
    <div className="db-root">
      {/* Header */}
      <motion.div className="db-header" initial={{ opacity:0, y:-12 }} animate={{ opacity:1, y:0 }}>
        <div>
          <div className="db-header-eyebrow"><span className="db-status-dot"/> AQUAGUARD ACTIVE</div>
          <h1 className="db-title">Farm Dashboard</h1>
          <p className="db-subtitle">Welcome back, <strong>{firstName}</strong> — here's your fish health overview.</p>
        </div>
        <div className="db-header-actions">
          <button className="db-nav-btn" onClick={() => navigate('/scan')}>
            <Microscope size={14}/> Fish Scan
          </button>
          <button className="db-nav-btn db-nav-btn-alt" onClick={() => navigate('/batch-scan')}>
            <Layers size={14}/> Batch Scan
          </button>
        </div>
      </motion.div>

      {/* Farm Intelligence Strip */}
      {hasData && (
        <motion.div className="db-intel-strip" initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.1 }}>
          <div className="db-intel-icon"><Brain size={20}/></div>
          <div className="db-intel-score">
            <div className="db-intel-score-val" style={{ color: hs.score >= 70 ? '#16a34a' : hs.score >= 40 ? '#d97706' : '#dc2626' }}>{hs.score}</div>
            <div className="db-intel-score-label" style={{ color: hs.score >= 70 ? '#16a34a' : hs.score >= 40 ? '#d97706' : '#dc2626' }}>{hs.label}</div>
          </div>
          <div className="db-intel-divider"/>
          <div className="db-intel-meta">
            <div className="db-intel-badges">
              <span className="db-intel-risk" style={{ background: SEV_CLR[rl.level]?.bg, color: SEV_CLR[rl.level]?.c }}>
                {rl.level.charAt(0).toUpperCase()+rl.level.slice(1)} Risk
              </span>
              <span className="db-intel-trend">
                {tr.trend === 'increasing' ? <TrendingUp size={13} style={{color:'#dc2626'}}/> : tr.trend === 'decreasing' ? <TrendingDown size={13} style={{color:'#16a34a'}}/> : <Minus size={13} style={{color:'#d97706'}}/>}
                {tr.trend.charAt(0).toUpperCase()+tr.trend.slice(1)}
              </span>
            </div>
            <div className="db-intel-explain">{rl.explanation}</div>
          </div>
          {insights[0] && (
            <>
              <div className="db-intel-divider"/>
              <div className="db-intel-insight">
                <Lightbulb size={13} style={{ color:'#d97706', flexShrink:0 }}/>
                <span>{insights[0]}</span>
              </div>
            </>
          )}
          <span className="db-intel-sessions">{kpis.total} scan{kpis.total !== 1 ? 's' : ''} · {(sessionStore||[]).length} batch{(sessionStore||[]).length !== 1 ? 'es' : ''}</span>
        </motion.div>
      )}

      {/* KPI Cards */}
      <div className="db-kpi-grid">
        {[
          { label:'Total Scans', value: kpis.total, icon:<Fish size={18}/>, accent:C.blue, sub:`${(sessionStore||[]).length} batch · ${(scanHistory||[]).length} single` },
          { label:'Healthy Fish', value: kpis.healthy, icon:<CheckCircle2 size={18}/>, accent:C.healthy, sub:`${kpis.healthPct}% healthy rate` },
          { label:'Infected', value: kpis.infected, icon:<Bug size={18}/>, accent:C.infected, sub:`${kpis.infPct}% infection rate` },
          { label:'Uncertain', value: kpis.uncertain, icon:<HelpCircle size={18}/>, accent:C.uncertain, sub:'Needs re-scan' },
          { label:'Avg Confidence', value:`${pct(kpis.avgConf)}%`, icon:<TrendingUp size={18}/>, accent:C.indigo, sub:'Model accuracy' },
          { label:'High Risk', value: kpis.highRisk, icon:<ShieldAlert size={18}/>, accent:'#dc2626', sub:'Immediate attention' },
        ].map((k, i) => (
          <motion.div key={k.label} className="db-kpi-card" style={{ '--accent': k.accent }}
            initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay: i*0.05 }}>
            <div className="db-kpi-top">
              <span className="db-kpi-label">{k.label}</span>
              <div className="db-kpi-icon" style={{ background:k.accent+'18', color:k.accent }}>{k.icon}</div>
            </div>
            <p className="db-kpi-value" style={{ color:k.accent }}>{k.value}</p>
            <p className="db-kpi-sub">{k.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="db-charts-row">
        {/* Health Status Donut */}
        <motion.div className="db-card db-card-narrow" initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.2 }}>
          <div className="db-card-header">
            <h2 className="db-card-title">Health Status</h2>
            <span className="db-card-tag">distribution</span>
          </div>
          {pieData.length === 0 ? <EmptyState msg="No scans yet"/> : (
            <div className="db-pie-wrap">
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={54} outerRadius={82} paddingAngle={3} dataKey="value" stroke="none">
                    {pieData.map((_, i) => <Cell key={i} fill={[C.healthy, C.infected, C.uncertain][i]}/>)}
                    <Label content={<DonutCenter total={kpis.total}/>} position="center"/>
                  </Pie>
                  <Tooltip content={<ChartTooltip/>}/>
                </PieChart>
              </ResponsiveContainer>
              <div className="db-pie-legend">
                {pieData.map((d, i) => (
                  <div key={d.name} className="db-pie-legend-item">
                    <span className="db-pie-dot" style={{ background:[C.healthy,C.infected,C.uncertain][i] }}/>
                    <span className="db-pie-name">{d.name}</span>
                    <span className="db-pie-val">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Disease Breakdown Bar */}
        <motion.div className="db-card db-card-wide" initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.25 }}>
          <div className="db-card-header">
            <h2 className="db-card-title">Disease Breakdown</h2>
            <span className="db-card-tag">by type</span>
          </div>
          {diseaseDistribution.length === 0 ? <EmptyState msg="No infections detected yet" icon={Bug}/> : (
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={diseaseDistribution} barSize={28} margin={{ top:8, right:8, left:-20, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                <XAxis dataKey="name" tick={{ fontSize:11, fill:'#64748b' }} tickLine={false} axisLine={false}/>
                <YAxis tick={{ fontSize:11, fill:'#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false}/>
                <Tooltip content={<ChartTooltip/>}/>
                <Bar dataKey="value" name="Cases" radius={[6,6,0,0]}>
                  {diseaseDistribution.map((_, i) => <Cell key={i} fill={DISEASE_COLORS[i % DISEASE_COLORS.length]}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </div>

      {/* Batch Session Timeline */}
      <motion.div className="db-card" initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.3 }}>
        <div className="db-card-header">
          <h2 className="db-card-title">Batch Scan Timeline</h2>
          <span className="db-card-tag">{sessionTimeline.length} session{sessionTimeline.length !== 1 ? 's' : ''}</span>
        </div>
        {sessionTimeline.length === 0 ? <EmptyState msg="Run a batch scan to see session trends here" icon={Layers}/> : (
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={sessionTimeline} margin={{ top:8, right:8, left:-20, bottom:0 }}>
              <defs>
                <linearGradient id="gH" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.healthy} stopOpacity={0.2}/>
                  <stop offset="95%" stopColor={C.healthy} stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gI" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.infected} stopOpacity={0.2}/>
                  <stop offset="95%" stopColor={C.infected} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
              <XAxis dataKey="name" tick={{ fontSize:11, fill:'#94a3b8' }} tickLine={false} axisLine={false}/>
              <YAxis tick={{ fontSize:11, fill:'#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false}/>
              <Tooltip content={<ChartTooltip/>}/>
              <Legend wrapperStyle={{ fontSize:'0.78rem' }}/>
              <Area type="monotone" dataKey="Healthy" stroke={C.healthy} strokeWidth={2} fill="url(#gH)" dot={{ r:3 }}/>
              <Area type="monotone" dataKey="Infected" stroke={C.infected} strokeWidth={2} fill="url(#gI)" dot={{ r:3 }}/>
              <Area type="monotone" dataKey="Uncertain" stroke={C.uncertain} strokeWidth={1.5} fill="none" dot={{ r:2 }} strokeDasharray="4 3"/>
            </AreaChart>
          </ResponsiveContainer>
        )}
      </motion.div>

      {/* Recent Scans Table */}
      <motion.div className="db-card" initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.35 }}>
        <div className="db-card-header">
          <h2 className="db-card-title">Recent Fish Scans</h2>
          <div className="db-tab-row">
            <button className={`db-tab ${tab==='overview'?'db-tab-active':''}`} onClick={() => setTab('overview')}>All</button>
            <button className={`db-tab ${tab==='scans'?'db-tab-active':''}`} onClick={() => setTab('scans')}>Infected Only</button>
          </div>
        </div>
        {(() => {
          const filtered = tab === 'scans'
            ? allScans.filter(s => s.disease !== 'Healthy' && s.disease !== 'Uncertain')
            : allScans;
          const display = filtered.slice(0, 20);
          if (display.length === 0) return <EmptyState msg={tab === 'scans' ? 'No infections found — great news!' : 'No scans yet. Upload fish images to start analyzing.'}/>;
          return (
            <div className="db-table-wrap">
              <table className="db-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Disease</th>
                    <th>Status</th>
                    <th>Confidence</th>
                    <th>Severity</th>
                    <th>Source</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence initial={false}>
                    {display.map((s, i) => {
                      const sevLow = (s.severity || 'low').toLowerCase();
                      const sc = SEV_CLR[sevLow] || SEV_CLR.low;
                      const statusLabel = s.disease === 'Healthy' ? 'Healthy' : s.disease === 'Uncertain' ? 'Uncertain' : 'Infected';
                      return (
                        <motion.tr key={s.id + '-' + i} className="db-table-row"
                          initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }} transition={{ delay: i*0.02 }}>
                          <td className="db-table-time">
                            <Clock size={11} style={{ marginRight:4, opacity:0.5 }}/>
                            {s.timestamp ? new Date(s.timestamp).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }) : '—'}
                          </td>
                          <td><span className="db-disease-tag">{s.disease}</span></td>
                          <td><StatusBadge status={statusLabel}/></td>
                          <td>
                            <div className="db-conf-cell">
                              <div className="db-conf-bar-bg">
                                <div className="db-conf-bar-fill" style={{ width:`${pct(s.confidence)}%`, background: statusLabel === 'Healthy' ? C.healthy : statusLabel === 'Infected' ? C.infected : C.uncertain }}/>
                              </div>
                              <span className="db-conf-pct">{pct(s.confidence)}%</span>
                            </div>
                          </td>
                          <td>
                            <span className="db-sev-badge" style={{ background:sc.bg, color:sc.c }}>{sevLow}</span>
                          </td>
                          <td>
                            <span className="db-source-tag" style={{ background: s.source === 'batch' ? '#ede9fe' : '#e0f2fe', color: s.source === 'batch' ? '#7c3aed' : '#0369a1' }}>
                              {s.source === 'batch' ? '📦 Batch' : '🔬 Single'}
                            </span>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          );
        })()}
      </motion.div>

      {/* Quick Actions */}
      {!hasData && (
        <motion.div className="db-empty-hero" initial={{ opacity:0, scale:0.96 }} animate={{ opacity:1, scale:1 }} transition={{ delay:0.2 }}>
          <Fish size={48} style={{ color:'#3b82f6' }}/>
          <h2>Start Your First Scan</h2>
          <p>Upload fish images to detect diseases, track farm health, and get treatment recommendations.</p>
          <div className="db-empty-actions">
            <button className="db-action-primary" onClick={() => navigate('/scan')}>
              <Microscope size={16}/> Single Fish Scan
            </button>
            <button className="db-action-secondary" onClick={() => navigate('/batch-scan')}>
              <Layers size={16}/> Batch Scan (Multiple)
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default DashboardPage;
