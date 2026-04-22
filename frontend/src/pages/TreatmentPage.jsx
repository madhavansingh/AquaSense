/**
 * AquaGuard — Treatment & Action Page
 * Reads plan from localStorage (set by BatchScanPage after /treatment-plan call).
 * Shows: Farm Risk Panel → Farm Action Plan → Per-Fish Treatment Cards
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList, AlertTriangle, CheckCircle2, ShieldAlert,
  Droplets, Pill, ShieldCheck, Activity, ChevronDown, ChevronUp,
  ArrowLeft, RefreshCw, AlertCircle, Layers, Heart,
  Eye, Zap, Fish,
} from 'lucide-react';
import './TreatmentPage.css';

/* ── Risk level config ──────────────────────────────────────────── */
const RISK_CFG = {
  high:   { color: '#dc2626', bg: '#fee2e2', border: '#fca5a5', label: 'HIGH RISK',   icon: <AlertTriangle size={18}/> },
  medium: { color: '#d97706', bg: '#fef3c7', border: '#fcd34d', label: 'MEDIUM RISK', icon: <ShieldAlert size={18}/> },
  low:    { color: '#16a34a', bg: '#dcfce7', border: '#86efac', label: 'LOW RISK',    icon: <CheckCircle2 size={18}/> },
};

/* ── Severity badge ─────────────────────────────────────────────── */
const SEV_CFG = {
  high:     { color: '#dc2626', bg: '#fee2e2', border: '#fca5a5', label: 'HIGH' },
  moderate: { color: '#d97706', bg: '#fef3c7', border: '#fcd34d', label: 'MODERATE' },
  low:      { color: '#16a34a', bg: '#dcfce7', border: '#86efac', label: 'LOW' },
};
const SeverityBadge = ({ severity }) => {
  const cfg = SEV_CFG[severity?.toLowerCase()] || SEV_CFG.low;
  return (
    <span className="tp-badge" style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}>
      {cfg.label}
    </span>
  );
};

/* ── Spread risk pill ───────────────────────────────────────────── */
const SPREAD_CFG = {
  high:   { color: '#dc2626', bg: '#fee2e2', label: '⚠ High Spread Risk' },
  medium: { color: '#d97706', bg: '#fef3c7', label: '⚡ Medium Spread Risk' },
  low:    { color: '#16a34a', bg: '#dcfce7', label: '✓ Low Spread Risk' },
};
const SpreadPill = ({ risk }) => {
  const cfg = SPREAD_CFG[risk?.toLowerCase()] || SPREAD_CFG.low;
  return (
    <span className="tp-spread-pill" style={{ background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  );
};

/* ── Farm action section ────────────────────────────────────────── */
const FarmSection = ({ icon: Icon, iconColor, title, items }) => {
  if (!items?.length) return null;
  return (
    <div className="tp-farm-section">
      <div className="tp-farm-section-head">
        <span className="tp-farm-section-icon" style={{ background: iconColor + '18', color: iconColor }}>
          <Icon size={15}/>
        </span>
        <h3 className="tp-farm-section-title">{title}</h3>
      </div>
      <ul className="tp-bullet-list">
        {items.map((item, i) => (
          <li key={i} className="tp-bullet-item">{item}</li>
        ))}
      </ul>
    </div>
  );
};

/* ── Per-fish treatment card ────────────────────────────────────── */
const FishCard = ({ fish, index }) => {
  const [open, setOpen] = useState(index < 3); // First 3 open by default
  const ap = fish.action_plan || {};

  const DISEASE_COLORS = {
    'Healthy':                   '#16a34a',
    'Aeromoniasis':              '#ef4444',
    'Gill Disease':              '#f97316',
    'Red Disease':               '#dc2626',
    'Fungal (Saprolegniasis)':   '#a855f7',
    'Parasitic':                 '#f59e0b',
    'Viral (White Tail Disease)':'#0ea5e9',
    'Uncertain':                 '#94a3b8',
  };
  const diseaseColor = DISEASE_COLORS[fish.disease] || '#2563eb';

  return (
    <motion.div
      className="tp-fish-card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      {/* Card header — always visible */}
      <div
        className="tp-fish-card-head"
        onClick={() => setOpen(o => !o)}
        style={{ borderLeft: `4px solid ${diseaseColor}` }}
      >
        <div className="tp-fish-card-meta">
          <span className="tp-fish-id">
            <Fish size={14} style={{ color: diseaseColor }}/>
            {fish.id}
          </span>
          <span className="tp-fish-disease" style={{ color: diseaseColor }}>
            {fish.disease}
          </span>
          <SeverityBadge severity={fish.severity}/>
          <SpreadPill risk={fish.spread_risk}/>
          {fish.verify_first && (
            <span className="tp-verify-warn">
              <Eye size={12}/> Verify visually first
            </span>
          )}
        </div>
        <button className="tp-toggle-btn">
          {open ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
        </button>
      </div>

      {/* Expandable body */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="tp-fish-card-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            <div className="tp-fish-card-inner">
              {/* Immediate */}
              {ap.immediate?.length > 0 && (
                <div className="tp-action-col">
                  <div className="tp-action-col-head" style={{ color: '#dc2626' }}>
                    <Zap size={13}/> Immediate Actions
                  </div>
                  <ul className="tp-bullet-list">
                    {ap.immediate.map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                </div>
              )}

              {/* Treatment */}
              {ap.treatment?.length > 0 && (
                <div className="tp-action-col">
                  <div className="tp-action-col-head" style={{ color: '#2563eb' }}>
                    <Pill size={13}/> Treatment Steps
                  </div>
                  <ul className="tp-bullet-list">
                    {ap.treatment.map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                </div>
              )}

              {/* Medications */}
              {ap.medications?.length > 0 && (
                <div className="tp-action-col tp-action-col--wide">
                  <div className="tp-action-col-head" style={{ color: '#7c3aed' }}>
                    <Pill size={13}/> Medications
                  </div>
                  <div className="tp-med-list">
                    {ap.medications.map((med, i) => (
                      <div key={i} className="tp-med-item">
                        <span className="tp-med-name">{med.name}</span>
                        {med.usage && <span className="tp-med-usage">{med.usage}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Care tips */}
              {ap.care_tips?.length > 0 && (
                <div className="tp-action-col">
                  <div className="tp-action-col-head" style={{ color: '#0891b2' }}>
                    <Heart size={13}/> Care Tips
                  </div>
                  <ul className="tp-bullet-list">
                    {ap.care_tips.map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                </div>
              )}

              {/* Follow-up */}
              {ap.follow_up?.length > 0 && (
                <div className="tp-action-col">
                  <div className="tp-action-col-head" style={{ color: '#16a34a' }}>
                    <Activity size={13}/> Follow-Up
                  </div>
                  <ul className="tp-bullet-list">
                    {ap.follow_up.map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                </div>
              )}

              {/* Spread note */}
              {fish.spread_note && (
                <div className="tp-spread-note">
                  <AlertCircle size={13}/> {fish.spread_note}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

/* ══════════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════════ */
export default function TreatmentPage() {
  const navigate = useNavigate();
  const [plan, setPlan]   = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('aq_treatment_plan');
      if (!raw) {
        setError('No treatment plan found. Run a Batch Scan first.');
        return;
      }
      setPlan(JSON.parse(raw));
    } catch {
      setError('Failed to load treatment plan. Please run a new scan.');
    }
  }, []);

  /* ── Empty / error state ─────────────────────────────────────── */
  if (error || !plan) {
    return (
      <div className="tp-root">
        <div className="tp-empty">
          <div className="tp-empty-icon"><ClipboardList size={32}/></div>
          <h2 className="tp-empty-title">
            {error ? 'No Plan Available' : 'Loading…'}
          </h2>
          <p className="tp-empty-sub">
            {error || 'Reading treatment plan…'}
          </p>
          <button className="tp-btn-primary" onClick={() => navigate('/batch-scan')}>
            <Layers size={15}/> Go to Batch Scan
          </button>
        </div>
      </div>
    );
  }

  const fp = plan.farm_plan || {};
  const riskCfg = RISK_CFG[fp.risk_level?.toLowerCase()] || RISK_CFG.low;

  return (
    <div className="tp-root">

      {/* ── Page header ───────────────────────────────────────────── */}
      <div className="tp-header">
        <div className="tp-header-left">
          <div className="tp-header-icon"><ClipboardList size={22}/></div>
          <div>
            <h1 className="tp-title">Treatment & Action Plan</h1>
            <p className="tp-subtitle">
              Farm-level strategy + per-fish action plan based on AI diagnosis
            </p>
          </div>
        </div>
        <div className="tp-header-actions">
          <button className="tp-btn-ghost" onClick={() => navigate('/batch-scan')}>
            <ArrowLeft size={14}/> Back to Scan
          </button>
          <button
            className="tp-btn-ghost"
            onClick={() => {
              localStorage.removeItem('aq_treatment_plan');
              localStorage.removeItem('aq_bulk_results');
              navigate('/batch-scan');
            }}
          >
            <RefreshCw size={14}/> New Scan
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          FARM RISK PANEL
      ═══════════════════════════════════════════════════════════ */}
      <motion.div
        className="tp-risk-panel"
        style={{ background: riskCfg.bg, borderColor: riskCfg.border }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="tp-risk-left">
          <div className="tp-risk-badge" style={{ background: riskCfg.color + '22', color: riskCfg.color }}>
            {riskCfg.icon}
            <span>{riskCfg.label}</span>
          </div>
          <p className="tp-risk-summary" style={{ color: riskCfg.color }}>
            {fp.summary}
          </p>
        </div>
        <div className="tp-risk-stats">
          <div className="tp-risk-stat">
            <span className="tp-risk-stat-val" style={{ color: '#ef4444' }}>{fp.infected_count ?? '—'}</span>
            <span className="tp-risk-stat-label">Infected</span>
          </div>
          <div className="tp-risk-stat">
            <span className="tp-risk-stat-val" style={{ color: '#16a34a' }}>{fp.healthy_count ?? '—'}</span>
            <span className="tp-risk-stat-label">Healthy</span>
          </div>
          <div className="tp-risk-stat">
            <span className="tp-risk-stat-val" style={{ color: '#2563eb' }}>{fp.total_scanned ?? '—'}</span>
            <span className="tp-risk-stat-label">Total</span>
          </div>
          {fp.dominant_disease && (
            <div className="tp-risk-stat">
              <span className="tp-risk-stat-val tp-risk-stat-val--sm">{fp.dominant_disease}</span>
              <span className="tp-risk-stat-label">Dominant</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════
          FARM ACTION PLAN
      ═══════════════════════════════════════════════════════════ */}
      <motion.div
        className="tp-card"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
      >
        <div className="tp-card-header">
          <ShieldCheck size={18} style={{ color: '#2563eb' }}/>
          <h2 className="tp-card-title">Farm Action Plan</h2>
          {fp.spread_risk && (
            <SpreadPill risk={fp.spread_risk}/>
          )}
        </div>

        <div className="tp-farm-sections">
          <FarmSection
            icon={Zap}
            iconColor="#dc2626"
            title="Immediate Actions"
            items={fp.immediate_actions}
          />
          <FarmSection
            icon={Droplets}
            iconColor="#0891b2"
            title="Water Management"
            items={fp.water_management}
          />
          <FarmSection
            icon={Pill}
            iconColor="#7c3aed"
            title="Medication Strategy"
            items={fp.medication_strategy}
          />
          <FarmSection
            icon={ShieldCheck}
            iconColor="#0d9488"
            title="Biosecurity"
            items={fp.biosecurity}
          />
          <FarmSection
            icon={Heart}
            iconColor="#f59e0b"
            title="Feeding Adjustments"
            items={fp.feeding_adjustments}
          />
          <FarmSection
            icon={Activity}
            iconColor="#16a34a"
            title="Monitoring Plan"
            items={fp.monitoring_plan}
          />
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════
          PER-FISH TREATMENT
      ═══════════════════════════════════════════════════════════ */}
      {plan.per_fish?.length > 0 && (
        <motion.div
          className="tp-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
        >
          <div className="tp-card-header">
            <Fish size={18} style={{ color: '#2563eb' }}/>
            <h2 className="tp-card-title">Per-Fish Treatment</h2>
            <span className="tp-count-pill">{plan.per_fish.length} fish</span>
          </div>

          <div className="tp-fish-list">
            {plan.per_fish.map((fish, idx) => (
              <FishCard key={fish.id} fish={fish} index={idx}/>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Bottom CTA ────────────────────────────────────────────── */}
      <div className="tp-bottom-cta">
        <button className="tp-btn-ghost" onClick={() => navigate('/batch-scan')}>
          <ArrowLeft size={14}/> Back to Batch Scan
        </button>
        <button
          className="tp-btn-primary"
          onClick={() => {
            localStorage.removeItem('aq_treatment_plan');
            localStorage.removeItem('aq_bulk_results');
            navigate('/batch-scan');
          }}
        >
          <RefreshCw size={14}/> Start New Analysis
        </button>
      </div>

    </div>
  );
}
