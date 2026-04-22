/**
 * AquaGuard — Batch Scan Page
 * POST /api/aquaguard/bulk-predict
 * Supports up to 30 images with hybrid AI + filename-hint classification.
 */

import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSystem } from '../context/SystemContext';
import {
  Fish, Upload, X, AlertTriangle, CheckCircle2, ShieldAlert,
  Layers, BarChart2, Activity, AlertCircle, Info,
  TrendingUp, Zap, Eye, Trash2, RotateCcw, FileImage,
  ChevronDown, ChevronUp, Loader2, ClipboardList,
} from 'lucide-react';
import './BatchScanPage.css';

const API_BASE = '/api';
const MAX_FILES = 30;
const ACCEPTED = ['image/jpeg', 'image/jpg', 'image/png'];
const ACCEPTED_EXT = ['.jpg', '.jpeg', '.png'];

/* ── Severity config (matches InspectPage) ─────────────────────────── */
const SEV = {
  low:      { color: '#16a34a', bg: '#dcfce7', border: '#86efac', label: 'LOW',      icon: <CheckCircle2 size={12}/> },
  moderate: { color: '#d97706', bg: '#fef3c7', border: '#fcd34d', label: 'MODERATE', icon: <ShieldAlert  size={12}/> },
  high:     { color: '#dc2626', bg: '#fee2e2', border: '#fca5a5', label: 'HIGH',     icon: <AlertTriangle size={12}/> },
};

const SOURCE_CFG = {
  model:         { label: 'AI Model',      color: '#2563eb', bg: '#eff6ff' },
  filename_hint: { label: 'Filename Hint', color: '#7c3aed', bg: '#f5f3ff' },
  hybrid:        { label: 'Hybrid',        color: '#0891b2', bg: '#ecfeff' },
};

/* ── Sub-components ─────────────────────────────────────────────────── */
const SeverityBadge = ({ severity }) => {
  const cfg = SEV[severity?.toLowerCase()] || SEV.low;
  return (
    <span className="bsp-badge" style={{ background: cfg.bg, color: cfg.color, border: `1.5px solid ${cfg.border}` }}>
      {cfg.icon} {cfg.label}
    </span>
  );
};

const SourceBadge = ({ source }) => {
  const cfg = SOURCE_CFG[source] || SOURCE_CFG.model;
  return (
    <span className="bsp-badge bsp-source-badge" style={{ background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  );
};

const ConfBar = ({ value, severity }) => {
  const pct   = Math.min(100, Math.round((value || 0) * 100));
  const color = severity === 'high' ? '#ef4444' : severity === 'moderate' ? '#f59e0b' : '#22c55e';
  const grad  = severity === 'high'
    ? 'linear-gradient(90deg,#ef4444,#dc2626)'
    : severity === 'moderate'
    ? 'linear-gradient(90deg,#f59e0b,#d97706)'
    : 'linear-gradient(90deg,#22c55e,#16a34a)';
  return (
    <div className="bsp-conf-bar">
      <div className="bsp-conf-track">
        <motion.div
          className="bsp-conf-fill"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          style={{ background: grad }}
        />
      </div>
      <span className="bsp-conf-label" style={{ color }}>{pct}%</span>
    </div>
  );
};

/* ── Disease color coding ───────────────────────────────────────────── */
const DISEASE_COLORS = {
  'Healthy':                   { dot: '#22c55e', text: '#166534' },
  'Aeromoniasis':              { dot: '#ef4444', text: '#991b1b' },
  'Gill Disease':              { dot: '#f97316', text: '#9a3412' },
  'Red Disease':               { dot: '#dc2626', text: '#7f1d1d' },
  'Fungal (Saprolegniasis)':   { dot: '#a855f7', text: '#6b21a8' },
  'Parasitic':                 { dot: '#f59e0b', text: '#78350f' },
  'Viral (White Tail Disease)': { dot: '#0ea5e9', text: '#0c4a6e' },
  'Uncertain':                 { dot: '#94a3b8', text: '#475569' },
};

/* ═══════════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════════ */
export default function BatchScanPage() {
  const navigate = useNavigate();
  const { addSession } = useSystem();
  const [files,          setFiles]          = useState([]);    // {file, preview, id}
  const [loading,        setLoading]        = useState(false);
  const [treatLoading,   setTreatLoading]   = useState(false);
  const [results,        setResults]        = useState(null);  // {results[], summary{}, errors[]}
  const [error,          setError]          = useState('');
  const [expanded,       setExpanded]       = useState({});    // row id → bool
  const [dragActive,     setDragActive]     = useState(false);
  const fileInputRef = useRef();

  /* ── File handling ──────────────────────────────────────────────── */
  const addFiles = useCallback((incoming) => {
    const valid = Array.from(incoming).filter(f => ACCEPTED.includes(f.type));
    const invalid = Array.from(incoming).length - valid.length;

    setFiles(prev => {
      const combined = [...prev];
      let added = 0;
      for (const f of valid) {
        if (combined.length >= MAX_FILES) break;
        const id = `${f.name}-${f.size}-${f.lastModified}`;
        if (!combined.find(x => x.id === id)) {
          combined.push({ file: f, preview: URL.createObjectURL(f), id });
          added++;
        }
      }
      if (combined.length >= MAX_FILES) {
        setError(`Maximum ${MAX_FILES} images allowed. Some files were not added.`);
      } else if (invalid > 0) {
        setError(`${invalid} file(s) skipped — only JPG/PNG accepted.`);
      } else {
        setError('');
      }
      return combined;
    });
  }, []);

  const removeFile = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    setError('');
  };

  const clearAll = () => {
    files.forEach(f => URL.revokeObjectURL(f.preview));
    setFiles([]);
    setResults(null);
    setError('');
    setExpanded({});
  };

  /* ── Drag-drop ──────────────────────────────────────────────────── */
  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragActive(false);
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const onDragOver = (e) => { e.preventDefault(); setDragActive(true); };
  const onDragLeave = () => setDragActive(false);

  /* ── Submit ─────────────────────────────────────────────────────── */
  const handleScan = async () => {
    if (!files.length) return;
    setLoading(true);
    setError('');
    setResults(null);

    const form = new FormData();
    files.forEach(({ file }) => form.append('files', file));

    try {
      const res = await fetch(`${API_BASE}/aquaguard/bulk-predict`, {
        method: 'POST',
        body: form,
      });

      if (!res.ok) {
        let detail = `Server error ${res.status}`;
        try {
          const j = await res.json();
          detail = j.detail?.message || j.detail || detail;
        } catch {}
        throw new Error(detail);
      }

      const data = await res.json();
      setResults(data);
      // Save to localStorage so TreatmentPage can read it
      localStorage.setItem('aq_bulk_results', JSON.stringify(data));
      localStorage.removeItem('aq_treatment_plan');
      // ── Persist to session store for farm intelligence ───────────────────
      if (data.results?.length) {
        addSession(data.results, data.summary || {});
      }
    } catch (err) {
      setError(err.message || 'Unable to analyse. Please check the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Generate Treatment Plan ────────────────────────────────────── */
  const handleTreatmentPlan = async () => {
    if (!results?.results?.length) return;
    setTreatLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/aquaguard/treatment-plan`, {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ results: results.results }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const plan = await res.json();
      localStorage.setItem('aq_treatment_plan', JSON.stringify(plan));
      navigate('/treatment');
    } catch (err) {
      setError('Unable to generate treatment plan. ' + (err.message || ''));
    } finally {
      setTreatLoading(false);
    }
  };

  /* ── Summary card data ──────────────────────────────────────────── */
  const summary = results?.summary || {};
  const summaryCards = results ? [
    { label: 'Total Scanned',    value: summary.total_images   || 0, icon: <Fish size={18}/>,       color: '#2563eb' },
    { label: 'Infected',         value: summary.infected_count || 0, icon: <AlertTriangle size={18}/>, color: '#ef4444' },
    { label: 'Healthy',          value: summary.healthy_count  || 0, icon: <CheckCircle2 size={18}/>,  color: '#22c55e' },
    { label: 'High Risk',        value: summary.high_risk_count || 0, icon: <ShieldAlert size={18}/>, color: '#f59e0b' },
  ] : [];

  /* ── Render ─────────────────────────────────────────────────────── */
  return (
    <div className="bsp-root">

      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="bsp-header">
        <div className="bsp-header-left">
          <div className="bsp-header-icon"><Layers size={22}/></div>
          <div>
            <h1 className="bsp-title">Batch Fish Scan</h1>
            <p className="bsp-subtitle">Upload up to {MAX_FILES} images for simultaneous AI disease classification</p>
          </div>
        </div>
        {files.length > 0 && !loading && (
          <button className="bsp-btn-ghost" onClick={clearAll}>
            <RotateCcw size={14}/> Reset
          </button>
        )}
      </div>

      {/* ── Upload Zone ─────────────────────────────────────────────── */}
      {!results && (
        <div
          className={`bsp-dropzone ${dragActive ? 'bsp-dropzone--active' : ''} ${files.length > 0 ? 'bsp-dropzone--compact' : ''}`}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED_EXT.join(',')}
            style={{ display: 'none' }}
            onChange={e => addFiles(e.target.files)}
          />
          <div className="bsp-dropzone-inner">
            <div className="bsp-upload-icon">
              <Upload size={28}/>
            </div>
            <p className="bsp-dropzone-title">
              {files.length > 0 ? 'Add more images' : 'Drop fish images here'}
            </p>
            <p className="bsp-dropzone-sub">
              JPG, PNG · Up to {MAX_FILES} images · Max 15 MB each
            </p>
          </div>
        </div>
      )}

      {/* ── Error banner ────────────────────────────────────────────── */}
      <AnimatePresence>
        {error && (
          <motion.div
            className="bsp-error"
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          >
            <AlertCircle size={16}/> {error}
            <button className="bsp-error-close" onClick={() => setError('')}><X size={14}/></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── File Queue ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {files.length > 0 && !results && (
          <motion.div
            className="bsp-queue"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          >
            <div className="bsp-queue-header">
              <span className="bsp-queue-count">
                <FileImage size={15}/> {files.length} image{files.length !== 1 ? 's' : ''} queued
                <span className="bsp-queue-limit"> · {MAX_FILES - files.length} remaining</span>
              </span>
              <div className="bsp-queue-actions">
                <button
                  className="bsp-btn-ghost bsp-btn-sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={files.length >= MAX_FILES}
                >
                  <Upload size={13}/> Add more
                </button>
              </div>
            </div>

            <div className="bsp-thumb-grid">
              {files.map(({ file, preview, id }, idx) => (
                <motion.div
                  key={id}
                  className="bsp-thumb"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ delay: idx * 0.02 }}
                >
                  <img src={preview} alt={file.name} className="bsp-thumb-img"/>
                  <div className="bsp-thumb-overlay">
                    <span className="bsp-thumb-name">{file.name.split('.')[0].slice(0,18)}</span>
                    <button className="bsp-thumb-remove" onClick={() => removeFile(id)}>
                      <X size={12}/>
                    </button>
                  </div>
                  <div className="bsp-thumb-index">Fish {idx + 1}</div>
                </motion.div>
              ))}
            </div>

            {/* Scan CTA */}
            <div className="bsp-scan-cta">
              <button
                className="bsp-btn-primary"
                onClick={handleScan}
                disabled={loading}
              >
                {loading ? (
                  <><Loader2 size={16} className="bsp-spin"/> Analysing {files.length} images…</>
                ) : (
                  <><Zap size={16}/> Run Batch Scan ({files.length} image{files.length !== 1 ? 's' : ''})</>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Loading state ────────────────────────────────────────────── */}
      <AnimatePresence>
        {loading && (
          <motion.div
            className="bsp-loading"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div className="bsp-loading-inner">
              <div className="bsp-loading-ring"/>
              <p className="bsp-loading-text">AI is analysing {files.length} fish images…</p>
              <p className="bsp-loading-sub">Applying hybrid disease classification</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════
          RESULTS
      ═══════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {results && !loading && (
          <motion.div
            className="bsp-results"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          >

            {/* Summary Cards */}
            <div className="bsp-summary-grid">
              {summaryCards.map(({ label, value, icon, color }) => (
                <motion.div
                  key={label}
                  className="bsp-summary-card"
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  style={{ '--card-accent': color }}
                >
                  <div className="bsp-summary-icon" style={{ background: color + '18', color }}>
                    {icon}
                  </div>
                  <div className="bsp-summary-body">
                    <span className="bsp-summary-value" style={{ color }}>{value}</span>
                    <span className="bsp-summary-label">{label}</span>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Most common disease banner */}
            {summary.most_common_disease && (
              <div className="bsp-dominant-banner">
                <Activity size={16}/>
                <span>Most common condition: <strong>{summary.most_common_disease}</strong></span>
                {summary.average_confidence && (
                  <span className="bsp-dominant-conf">
                    avg. confidence {Math.round(summary.average_confidence * 100)}%
                  </span>
                )}
              </div>
            )}

            {/* Disease distribution pills */}
            {summary.disease_distribution && Object.keys(summary.disease_distribution).length > 0 && (
              <div className="bsp-dist-pills">
                {Object.entries(summary.disease_distribution)
                  .sort((a, b) => b[1] - a[1])
                  .map(([disease, count]) => {
                    const dc = DISEASE_COLORS[disease] || { dot: '#64748b', text: '#334155' };
                    return (
                      <span key={disease} className="bsp-dist-pill" style={{ background: dc.dot + '15', color: dc.text }}>
                        <span className="bsp-dist-dot" style={{ background: dc.dot }}/>
                        {disease} <strong>{count}</strong>
                      </span>
                    );
                  })
                }
              </div>
            )}

            {/* Source breakdown */}
            {summary.source_breakdown && (
              <div className="bsp-source-row">
                <span className="bsp-source-label"><Info size={13}/> Classification source:</span>
                {Object.entries(summary.source_breakdown).map(([src, n]) => {
                  const cfg = SOURCE_CFG[src] || SOURCE_CFG.model;
                  return (
                    <span key={src} className="bsp-badge bsp-source-badge" style={{ background: cfg.bg, color: cfg.color }}>
                      {cfg.label} ({n})
                    </span>
                  );
                })}
              </div>
            )}

            {/* Per-image table */}
            <div className="bsp-table-wrap">
              <div className="bsp-table-header">
                <h3 className="bsp-table-title"><BarChart2 size={16}/> Per-Image Results</h3>
                <span className="bsp-table-count">{results.results.length} fish</span>
              </div>

              <div className="bsp-table">
                {/* Column headers */}
                <div className="bsp-row bsp-row--head">
                  <span>ID</span>
                  <span>Disease</span>
                  <span>Confidence</span>
                  <span>Severity</span>
                  <span>Source</span>
                  <span/>
                </div>

                {results.results.map((row, idx) => {
                  const dc  = DISEASE_COLORS[row.disease] || { dot: '#64748b', text: '#334155' };
                  const exp = expanded[row.id];
                  return (
                    <motion.div
                      key={row.id}
                      className="bsp-row-wrap"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                    >
                      <div
                        className={`bsp-row ${exp ? 'bsp-row--expanded' : ''}`}
                        onClick={() => setExpanded(p => ({ ...p, [row.id]: !exp }))}
                      >
                        <span className="bsp-cell-id">
                          <span className="bsp-id-dot" style={{ background: dc.dot }}/>
                          {row.id}
                        </span>
                        <span className="bsp-cell-disease" style={{ color: dc.text }}>
                          {row.disease}
                        </span>
                        <span className="bsp-cell-conf">
                          <ConfBar value={row.confidence} severity={row.severity}/>
                        </span>
                        <span className="bsp-cell-sev">
                          <SeverityBadge severity={row.severity}/>
                        </span>
                        <span className="bsp-cell-src">
                          <SourceBadge source={row.source}/>
                        </span>
                        <span className="bsp-cell-expand">
                          {exp ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                        </span>
                      </div>

                      {/* Expanded detail */}
                      <AnimatePresence>
                        {exp && (
                          <motion.div
                            className="bsp-expand-panel"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.22 }}
                          >
                            <div className="bsp-expand-inner">
                              {row.top_predictions?.length > 0 && (
                                <div className="bsp-detail-item">
                                  <span className="bsp-detail-key"><TrendingUp size={12}/> Top Predictions</span>
                                  <span className="bsp-detail-val">{row.top_predictions.join(' · ')}</span>
                                </div>
                              )}
                              {row.filename_hint && (
                                <div className="bsp-detail-item">
                                  <span className="bsp-detail-key"><Eye size={12}/> Filename Hint</span>
                                  <span className="bsp-detail-val">{row.filename_hint}</span>
                                </div>
                              )}
                              <div className="bsp-detail-item">
                                <span className="bsp-detail-key"><Activity size={12}/> Decision Source</span>
                                <span className="bsp-detail-val">
                                  <SourceBadge source={row.source}/>
                                  {row.source === 'filename_hint' && ' — model confidence below threshold; filename keyword used.'}
                                  {row.source === 'hybrid' && ' — model confident but conflicts with filename; model result kept.'}
                                  {row.source === 'model' && ' — model prediction accepted.'}
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Errors section */}
            {results.errors?.length > 0 && (
              <div className="bsp-errors-panel">
                <h4><AlertCircle size={14}/> Skipped Files ({results.errors.length})</h4>
                {results.errors.map((e, i) => (
                  <div key={i} className="bsp-error-row">
                    <span className="bsp-error-id">{e.id || e.filename}</span>
                    <span className="bsp-error-reason">{e.reason}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Action CTAs */}
            <div className="bsp-new-scan">
              <button className="bsp-btn-ghost" onClick={clearAll}>
                <RotateCcw size={14}/> Start New Batch
              </button>
              {results?.results?.length > 0 && (
                <button
                  className="bsp-btn-treat"
                  onClick={handleTreatmentPlan}
                  disabled={treatLoading}
                >
                  {treatLoading ? (
                    <><Loader2 size={15} className="bsp-spin"/> Generating plan…</>
                  ) : (
                    <><ClipboardList size={15}/> Generate Treatment Plan</>
                  )}
                </button>
              )}
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
