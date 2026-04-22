import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Fish, Camera, Upload, Video, AlertTriangle, Activity,
  CheckCircle2, History, Clock, Fingerprint, Trash2,
  X, Zap, WifiOff, Radio, Pill, Droplets,
  ThumbsUp, HeartPulse, ShieldAlert, Info, AlertOctagon,
  Brain, Zap as ZapIcon, ShieldCheck, Leaf, RotateCcw, AlertCircle,
} from 'lucide-react';
import { useSystem } from '../context/SystemContext';
import { useAuth }   from '../context/AuthContext';
import './InspectPage.css';

const API_BASE = '/api';
const ACCEPTED_VIDEO = ['video/mp4','video/webm','video/quicktime','video/x-msvideo'];

/* ── Severity helpers ────────────────────────────────────────────── */
const SEVERITY_CFG = {
  low:      { color: '#16a34a', bg: '#dcfce7', border: '#86efac', label: 'LOW',      icon: <CheckCircle2 size={14}/> },
  moderate: { color: '#d97706', bg: '#fef3c7', border: '#fcd34d', label: 'MODERATE', icon: <ShieldAlert size={14}/> },
  high:     { color: '#dc2626', bg: '#fee2e2', border: '#fca5a5', label: 'HIGH',     icon: <AlertTriangle size={14}/> },
};

const SeverityBadge = ({ severity }) => {
  const cfg = SEVERITY_CFG[severity?.toLowerCase()] || SEVERITY_CFG.low;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: cfg.bg, color: cfg.color, border: `1.5px solid ${cfg.border}`,
      padding: '4px 12px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 700,
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
};

/* ── Confidence bar ──────────────────────────────────────────────── */
const ConfBar = ({ value, severity }) => {
  const raw    = (value || 0) * 100;
  const pct    = Number.isInteger(raw) ? raw.toFixed(0) : raw.toFixed(1);
  const pctNum = Math.round(raw);
  const color  = severity === 'high' ? '#ef4444' : severity === 'moderate' ? '#f59e0b' : '#22c55e';
  const grad   = severity === 'high'
    ? 'linear-gradient(90deg,#ef4444,#dc2626)'
    : severity === 'moderate'
    ? 'linear-gradient(90deg,#f59e0b,#d97706)'
    : 'linear-gradient(90deg,#22c55e,#16a34a)';
  return (
    <div style={{ width: '100%' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
        <span style={{ fontSize:'0.73rem', color:'#64748b', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em' }}>AI Confidence</span>
        <span style={{ fontSize:'1rem', fontWeight:800, color, background: color + '18', padding:'1px 10px', borderRadius:20 }}>{pct}%</span>
      </div>
      <div style={{ height:10, background:'#f1f5f9', borderRadius:6, overflow:'hidden', position:'relative' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pctNum}%` }}
          transition={{ duration: 1.1, ease: [0.22,1,0.36,1] }}
          style={{ height: '100%', background: grad, borderRadius: 6, position:'relative' }}
        >
          <motion.div
            animate={{ x: ['-100%','200%'] }}
            transition={{ duration: 1.4, ease:'easeInOut', delay: 0.8, repeat: 0 }}
            style={{ position:'absolute', top:0, left:0, width:'40%', height:'100%', background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.35),transparent)' }}
          />
        </motion.div>
      </div>
    </div>
  );
};

/* ── Result card ─────────────────────────────────────────────────── */
const ResultCard = ({ result, preview, onClear }) => {
  const isUncertain = result.uncertain === true;
  const sev  = isUncertain ? 'low' : (result.severity?.toLowerCase() || 'low');
  const cfg  = SEVERITY_CFG[sev] || SEVERITY_CFG.low;
  // Treat "Uncertain" disease as a special state — not healthy, not confirmed disease
  const isHealthy = !isUncertain && (result.disease?.toLowerCase() === 'healthy');

  // Split treatment into lines for structured display
  const treatmentLines = result.treatment
    ? result.treatment.split(/[.;\\n]+/).map(s => s.trim()).filter(Boolean)
    : [];
  const tipLines = result.tips
    ? result.tips.split(/[.;\\n]+/).map(s => s.trim()).filter(Boolean)
    : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background: '#fff',
        border: `2px solid ${isUncertain ? '#fbbf24' : cfg.border}`,
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
      }}
    >
      {/* Header stripe */}
      <div style={{
        background: isUncertain
          ? 'linear-gradient(135deg,#fffbeb,#fef3c7)'
          : `linear-gradient(135deg, ${cfg.bg}, ${cfg.bg}cc)`,
        padding: '18px 20px',
        borderBottom: `1.5px solid ${isUncertain ? '#fbbf24' : cfg.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          {isUncertain
            ? <AlertOctagon size={26} style={{ color: '#d97706', flexShrink:0 }}/>
            : isHealthy
            ? <HeartPulse size={26} style={{ color: cfg.color, flexShrink:0 }}/>
            : <Fish size={26} style={{ color: cfg.color, flexShrink:0 }}/>
          }
          <div>
            <div style={{
              fontSize:'1.45rem', fontWeight:800,
              color: isUncertain ? '#92400e' : '#0f172a',
              letterSpacing:'-0.025em', lineHeight:1.15,
              background: (!isUncertain && !isHealthy)
                ? 'linear-gradient(135deg,#1e3a8a,#2563eb)' : 'none',
              WebkitBackgroundClip: (!isUncertain && !isHealthy) ? 'text' : 'unset',
              WebkitTextFillColor: (!isUncertain && !isHealthy) ? 'transparent' : 'unset',
            }}>
              {isUncertain ? 'Uncertain Detection' : (result.disease || 'Unknown')}
            </div>
            <div style={{ fontSize:'0.7rem', color: isUncertain ? '#b45309' : '#64748b',
              fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase', marginTop:3 }}>
              {isUncertain ? 'Low confidence — review recommended' : 'Disease Classification'}
            </div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <SeverityBadge severity={sev} />
          <button
            onClick={onClear}
            style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', padding:4 }}
          >
            <X size={16}/>
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding:'20px', display:'flex', flexDirection:'column', gap:14 }}>

        {/* Uncertain — top-2 candidate banner */}
        {isUncertain && result.top_predictions?.length > 0 && (
          <div style={{
            background:'#fffbeb', border:'1.5px solid #fbbf24',
            borderRadius:12, padding:'14px 16px',
          }}>
            <div style={{
              display:'flex', alignItems:'center', gap:6,
              fontSize:'0.7rem', fontWeight:700, color:'#b45309',
              letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:8,
            }}>
              <Info size={12}/> Possible Conditions
            </div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {result.top_predictions.map((name, i) => (
                <span key={i} style={{
                  background: i === 0 ? '#fef3c7' : '#fff7ed',
                  color: i === 0 ? '#92400e' : '#c2410c',
                  border: `1px solid ${i === 0 ? '#fbbf24' : '#fb923c'}`,
                  padding:'4px 12px', borderRadius:20,
                  fontSize:'0.78rem', fontWeight:700,
                }}>
                  {i + 1}. {name}
                </span>
              ))}
            </div>
            <p style={{ fontSize:'0.76rem', color:'#78350f', margin:'8px 0 0', lineHeight:1.5 }}>
              The AI model was not confident enough to make a definitive diagnosis.
              Consider rescanning with a clearer, well-lit image.
            </p>
          </div>
        )}

        {/* Preview + confidence */}
        <div style={{ display:'flex', gap:16, alignItems:'flex-start' }}>
          {preview && (
            <div style={{
              width:100, height:80, flexShrink:0,
              borderRadius:10, overflow:'hidden',
              border:'1.5px solid #e2e8f0',
              boxShadow:'0 2px 8px rgba(0,0,0,0.06)',
            }}>
              <img src={preview} alt="fish" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
            </div>
          )}
          <div style={{ flex:1 }}>
            <ConfBar value={result.confidence} severity={isUncertain ? 'low' : sev} />
            <div style={{ marginTop:10, display:'flex', gap:8, flexWrap:'wrap' }}>
              <span style={{
                background:'#eff6ff', color:'#1d4ed8', border:'1px solid #bfdbfe',
                padding:'3px 10px', borderRadius:20, fontSize:'0.72rem', fontWeight:600,
              }}>
                <Fingerprint size={11} style={{marginRight:4, verticalAlign:'middle'}}/>{result.scanId || 'AQ-SCAN'}
              </span>
              <span style={{
                background:'#f8fafc', color:'#64748b', border:'1px solid #e2e8f0',
                padding:'3px 10px', borderRadius:20, fontSize:'0.72rem', fontWeight:500,
              }}>
                <Clock size={11} style={{marginRight:4, verticalAlign:'middle'}}/>{result.timestamp || '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Disease explanation */}
        {result.explanation && (
          <div style={{
            background:'#f8fafc', border:'1.5px solid #e2e8f0',
            borderRadius:12, padding:'14px 16px',
          }}>
            <div style={{
              display:'flex', alignItems:'center', gap:6,
              fontSize:'0.7rem', fontWeight:700, color:'#475569',
              letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:8,
            }}>
              <Info size={12}/> About This Disease
            </div>
            <p style={{ fontSize:'0.83rem', color:'#334155', lineHeight:1.6, margin:0 }}>
              {result.explanation}
            </p>
          </div>
        )}

        {/* Treatment section — structured */}
        {result.medication && result.disease !== 'Healthy' && (
          <div style={{
            background:'#f0f9ff', border:'1.5px solid #bae6fd',
            borderRadius:12, padding:'14px 16px',
          }}>
            <div style={{
              display:'flex', alignItems:'center', gap:6,
              fontSize:'0.7rem', fontWeight:700, color:'#0369a1',
              letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:10,
            }}>
              <Pill size={12}/> Medication
            </div>
            <p style={{ fontSize:'0.83rem', color:'#0f172a', lineHeight:1.55, margin:0 }}>
              {result.medication}
            </p>
          </div>
        )}

        {/* Healthy message */}
        {isHealthy && (
          <div style={{
            background:'linear-gradient(135deg,#f0fdf4,#dcfce7)',
            border:'1.5px solid #86efac', borderRadius:12, padding:'14px 16px',
            display:'flex', alignItems:'center', gap:10,
          }}>
            <ThumbsUp size={20} style={{ color:'#16a34a', flexShrink:0 }}/>
            <p style={{ fontSize:'0.84rem', color:'#14532d', fontWeight:500, margin:0 }}>
              Great news — your fish appear healthy! Continue regular water quality monitoring
              and maintain good feeding practices to keep them thriving.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

/* ── Spread Risk badge ───────────────────────────────────────────── */
const SPREAD_CFG = {
  high:   { color:'#dc2626', bg:'#fee2e2', border:'#fca5a5', label:'HIGH SPREAD RISK',   icon:<AlertTriangle size={13}/> },
  medium: { color:'#d97706', bg:'#fef3c7', border:'#fcd34d', label:'MEDIUM SPREAD RISK', icon:<ShieldAlert size={13}/> },
  low:    { color:'#16a34a', bg:'#dcfce7', border:'#86efac', label:'LOW SPREAD RISK',    icon:<ShieldCheck size={13}/> },
};

const SpreadBadge = ({ level }) => {
  const cfg = SPREAD_CFG[level?.toLowerCase()] || SPREAD_CFG.medium;
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:5,
      background:cfg.bg, color:cfg.color, border:`1.5px solid ${cfg.border}`,
      padding:'4px 12px', borderRadius:20, fontSize:'0.76rem', fontWeight:700,
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
};

/* ── Bullet list helper ──────────────────────────────────────────── */
const BulletList = ({ items, color = '#0f172a' }) => (
  <ul style={{ margin:0, padding:'0 0 0 0', listStyle:'none', display:'flex', flexDirection:'column', gap:6 }}>
    {items.map((item, i) => (
      <li key={i} style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
        <span style={{
          flexShrink:0, marginTop:4, width:6, height:6,
          borderRadius:'50%', background:'#3b82f6',
        }}/>
        <span style={{ fontSize:'0.83rem', color, lineHeight:1.55 }}>{item}</span>
      </li>
    ))}
  </ul>
);

/* ── AI Action Plan Card ─────────────────────────────────────────── */
const ActionPlanCard = ({ result }) => {
  const isHealthy   = result.disease?.toLowerCase() === 'healthy';
  const isUncertain = result.uncertain === true;

  const immediate   = result.immediate_action  || [];
  const medSteps    = result.medication_steps  || [];
  const farmTips    = result.farm_improvement  || [];
  const followup    = result.followup          || [];
  const spreadRisk  = result.spread_risk       || 'medium';

  if (!immediate.length && !medSteps.length && !farmTips.length && !followup.length) return null;

  const Section = ({ icon, title, bg, border, labelColor, children }) => (
    <motion.div
      initial={{ opacity:0, y:12 }}
      animate={{ opacity:1, y:0 }}
      transition={{ duration:0.35, ease:[0.22,1,0.36,1] }}
      style={{ background:bg, border:`1.5px solid ${border}`, borderRadius:12, padding:'16px 18px' }}
    >
      <div style={{
        display:'flex', alignItems:'center', gap:7,
        fontSize:'0.7rem', fontWeight:700, color:labelColor,
        letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:12,
      }}>
        {icon} {title}
      </div>
      {children}
    </motion.div>
  );

  return (
    <motion.div
      initial={{ opacity:0, y:18 }}
      animate={{ opacity:1, y:0 }}
      transition={{ duration:0.5, ease:[0.22,1,0.36,1], delay:0.15 }}
      style={{
        background:'#fff',
        border:'2px solid #e0e7ff',
        borderRadius:16,
        overflow:'hidden',
        boxShadow:'0 8px 32px rgba(59,130,246,0.08)',
        marginTop:0,
      }}
    >
      {/* Plan header */}
      <div style={{
        background:'linear-gradient(135deg,#1e3a8a,#2563eb)',
        padding:'14px 20px',
        display:'flex', alignItems:'center', gap:12,
      }}>
        <Brain size={20} style={{ color:'#bfdbfe', flexShrink:0 }}/>
        <div>
          <div style={{ fontSize:'0.92rem', fontWeight:800, color:'#fff', letterSpacing:'-0.01em' }}>
            🧠 AI Recommended Action Plan
          </div>
          <div style={{ fontSize:'0.68rem', color:'#93c5fd', fontWeight:500, marginTop:2 }}>
            Specific guidance for {isUncertain ? 'uncertain detection' : (result.disease || 'this condition')}
          </div>
        </div>
      </div>

      <div style={{ padding:'18px 18px', display:'flex', flexDirection:'column', gap:12 }}>

        {/* 1 — Immediate Action */}
        {immediate.length > 0 && (
          <Section
            icon={<ZapIcon size={12}/>}
            title="Immediate Action — Do This Now"
            bg="#fff7ed" border="#fed7aa" labelColor="#c2410c"
          >
            <BulletList items={immediate} color="#7c2d12"/>
          </Section>
        )}

        {/* 2 — Treatment / Medication Steps */}
        {medSteps.length > 0 && (
          <Section
            icon={<Pill size={12}/>}
            title="Treatment & Medication"
            bg="#f0f9ff" border="#bae6fd" labelColor="#0369a1"
          >
            <BulletList items={medSteps} color="#0c4a6e"/>
          </Section>
        )}

        {/* 3 — Spread Risk to Other Fish */}
        <Section
          icon={<AlertCircle size={12}/>}
          title="Risk to Other Fish"
          bg={spreadRisk === 'high' ? '#fff1f2' : spreadRisk === 'medium' ? '#fffbeb' : '#f0fdf4'}
          border={spreadRisk === 'high' ? '#fecdd3' : spreadRisk === 'medium' ? '#fef08a' : '#bbf7d0'}
          labelColor={spreadRisk === 'high' ? '#be123c' : spreadRisk === 'medium' ? '#a16207' : '#15803d'}
        >
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            <SpreadBadge level={spreadRisk}/>
            {result.spread_explanation && (
              <p style={{ fontSize:'0.82rem', color:'#334155', lineHeight:1.55, margin:0 }}>
                {result.spread_explanation}
              </p>
            )}
          </div>
        </Section>

        {/* 4 — Farm Improvement Insight */}
        {farmTips.length > 0 && !isUncertain && (
          <Section
            icon={<Leaf size={12}/>}
            title="How to Prevent This in Your Farm"
            bg="#f0fdf4" border="#bbf7d0" labelColor="#15803d"
          >
            <BulletList items={farmTips} color="#14532d"/>
          </Section>
        )}

        {/* 5 — Follow-Up Action */}
        {followup.length > 0 && (
          <Section
            icon={<RotateCcw size={12}/>}
            title="Follow-Up Actions"
            bg="#f5f3ff" border="#ddd6fe" labelColor="#6d28d9"
          >
            <BulletList items={followup} color="#3b0764"/>
            {!isHealthy && (
              <div style={{
                marginTop:10, padding:'8px 12px',
                background:'#ede9fe', borderRadius:8,
                fontSize:'0.77rem', color:'#5b21b6', fontWeight:600,
              }}>
                📅 Re-scan recommended in 24–48 hours to confirm recovery
              </div>
            )}
          </Section>
        )}

        {/* Healthy special case */}
        {isHealthy && (
          <div style={{
            background:'linear-gradient(135deg,#f0fdf4,#dcfce7)',
            border:'1.5px solid #86efac', borderRadius:12, padding:'14px 16px',
            display:'flex', alignItems:'center', gap:10,
          }}>
            <ThumbsUp size={18} style={{ color:'#16a34a', flexShrink:0 }}/>
            <p style={{ fontSize:'0.83rem', color:'#14532d', fontWeight:500, margin:0, lineHeight:1.5 }}>
              Your farm looks healthy! Continue regular scanning every 7 days
              and maintain good water quality to stay ahead of any issues.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

/* ═════════════════════════════════════════════════════════════════ */
const genId = () => 'AQ-' + Math.random().toString(36).substr(2, 6).toUpperCase();
const nowTime = () => new Date().toTimeString().slice(0, 8);
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];

const InspectPage = () => {
  const { addScan } = useSystem();
  const { user } = useAuth();

  /* ── State ── */
  const [inputTab,      setInputTab]      = useState('upload');
  const [uploadFile,    setUploadFile]    = useState(null);
  const [uploadPreview, setUploadPreview] = useState(null);
  const [uploadError,   setUploadError]   = useState('');
  const [isDragging,    setIsDragging]    = useState(false);
  const [analyzing,     setAnalyzing]     = useState(false);
  const [result,        setResult]        = useState(null);
  const [history,       setHistory]       = useState([]);
  const [highAlert,     setHighAlert]     = useState(false);

  /* ── Video state ── */
  const [videoFile, setVideoFile]       = useState(null);
  const [videoAnalyzing, setVideoAnalyzing] = useState(false);
  const [videoResult, setVideoResult]   = useState(null);
  const [videoError, setVideoError]     = useState('');

  /* ── Camera state ── */
  const [isCamActive, setIsCamActive]   = useState(false);
  const [isLive, setIsLive]             = useState(false);
  const [stream, setStream]             = useState(null);

  const fileInputRef = useRef(null);
  const resultRef    = useRef(null);
  const videoRef     = useRef(null);
  const canvasRef    = useRef(null);
  const busyRef      = useRef(false);

  /* ── Upload helpers ── */
  const applyFile = (f) => {
    setUploadError('');
    if (!f) return;
    if (!ACCEPTED.includes(f.type)) {
      setUploadError('Please use JPG or PNG image.');
      return;
    }
    if (f.size > 12 * 1024 * 1024) {
      setUploadError('File too large (max 12 MB).');
      return;
    }
    if (uploadPreview) URL.revokeObjectURL(uploadPreview);
    setUploadFile(f);
    setUploadPreview(URL.createObjectURL(f));
    setResult(null);
  };

  const clearUpload = () => {
    if (uploadPreview) URL.revokeObjectURL(uploadPreview);
    setUploadFile(null);
    setUploadPreview(null);
    setUploadError('');
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /* ── Submit to real AquaGuard API ── */
  const analyseFile = async (fileToSend) => {
    if (!fileToSend) return;
    // Client-side validation
    if (!ACCEPTED.includes(fileToSend.type)) {
      setUploadError('Invalid file type. Please upload a JPG or PNG image.');
      return;
    }
    if (fileToSend.size === 0) {
      setUploadError('File appears to be empty. Please select a valid image.');
      return;
    }
    setAnalyzing(true);
    setResult(null);
    setUploadError('');
    try {
      const fd = new FormData();
      fd.append('file', fileToSend);
      const res  = await fetch(`${API_BASE}/aquaguard/predict`, { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.detail || '';
        if (msg.toLowerCase().includes('valid') || msg.toLowerCase().includes('fish') || msg.toLowerCase().includes('image')) {
          setUploadError('Invalid input — please upload a clear, close-up photo of fish.');
        } else {
          setUploadError('Unable to analyze. Please try again.');
        }
        return;
      }
      // Strict shape validation — only accept real model response
      if (!data.disease || data.confidence === undefined) {
        setUploadError('Unexpected response from server. Please try again.');
        return;
      }
      const r = {
        disease:    data.disease,
        confidence: data.confidence,
        severity:   data.severity,
        treatment:  data.treatment,
        tips:       data.tips,
        scanId:     genId(),
        timestamp:  nowTime(),
        source:     'upload',
      };
      setResult(r);
      setHistory(p => [r, ...p].slice(0, 10));
      if (r.severity?.toLowerCase() === 'high') setHighAlert(true);
      if (addScan) addScan({ status: r.disease, confidence: r.confidence, reason: r.treatment, severity: r.severity, disease: r.disease, scanId: r.scanId, timestamp: r.timestamp });
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 150);
    } catch {
      setUploadError('Server not responding. Check that the backend is running.');
    } finally {
      setAnalyzing(false);
    }
  };

  const analyseUpload = () => {
    if (!uploadFile || analyzing) return;
    analyseFile(uploadFile);
  };

  /* ── Video analysis ── */
  const analyseVideo = async () => {
    if (!videoFile || videoAnalyzing) return;
    // Validate video file
    if (!ACCEPTED_VIDEO.includes(videoFile.type)) {
      setVideoError('Invalid file type. Please upload an MP4, WebM, or MOV video.');
      return;
    }
    if (videoFile.size === 0) {
      setVideoError('Video file appears to be empty.');
      return;
    }
    setVideoAnalyzing(true);
    setVideoResult(null);
    setVideoError('');
    try {
      const fd = new FormData();
      fd.append('file', videoFile);
      const res  = await fetch(`${API_BASE}/aquaguard/video`, { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) {
        setVideoError(data.detail || 'Video analysis failed. Please try again.');
        return;
      }
      if (!data.dominant_disease) {
        setVideoError('Unexpected response from server. Please try again.');
        return;
      }
      setVideoResult(data);
      if (data.dominant_disease?.toLowerCase() !== 'healthy') setHighAlert(true);
    } catch {
      setVideoError('Server not responding. Check that the backend is running.');
    } finally {
      setVideoAnalyzing(false);
    }
  };

  /* ── Camera ── */
  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
      }).catch(() => navigator.mediaDevices.getUserMedia({ video: true }));
      setStream(s);
      setIsCamActive(true);
    } catch {
      alert('Camera access denied. Please allow camera permissions.');
    }
  };

  const stopCamera = useCallback(() => {
    if (stream) stream.getTracks().forEach(t => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setStream(null);
    setIsCamActive(false);
    setIsLive(false);
  }, [stream]);

  useEffect(() => {
    if (isCamActive && videoRef.current && stream && videoRef.current.srcObject !== stream) {
      videoRef.current.srcObject = stream;
    }
  });

  useEffect(() => () => { if (stream) stream.getTracks().forEach(t => t.stop()); }, [stream]);

  const captureAndAnalyse = useCallback(async () => {
    if (busyRef.current) return;
    const video = videoRef.current, canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    busyRef.current = true;
    const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.82));
    if (!blob) { busyRef.current = false; return; }
    const file = new File([blob], 'frame.jpg', { type: 'image/jpeg' });
    await analyseFile(file);
    busyRef.current = false;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isLive || !isCamActive) return;
    const id = setInterval(() => captureAndAnalyse(), 4000);
    return () => clearInterval(id);
  }, [isLive, isCamActive, captureAndAnalyse]);

  useEffect(() => () => { if (uploadPreview) URL.revokeObjectURL(uploadPreview); }, []);

  /* ── History severity helper ── */
  const sevColor = (s) => ({
    low:      '#16a34a',
    moderate: '#d97706',
    high:     '#dc2626',
  }[s?.toLowerCase()] || '#64748b');

  return (
    <div className="ip-root">

      {/* ── High-severity alert banner ── */}
      <AnimatePresence>
        {highAlert && (
          <motion.div
            key="high-alert"
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            style={{
              background: 'linear-gradient(135deg,#fef2f2,#fff1f2)',
              border: '1.5px solid #fecaca', borderRadius: 12,
              padding: '11px 18px', display: 'flex', alignItems: 'center',
              gap: 12, marginBottom: 8,
            }}
          >
            <AlertOctagon size={17} style={{ color: '#ef4444', flexShrink: 0 }}/>
            <span style={{ flex: 1, fontSize: '0.84rem', color: '#991b1b', fontWeight: 600 }}>
              ⚠ High Severity Infection Detected — Immediate treatment recommended.
            </span>
            <button
              onClick={() => setHighAlert(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 2 }}
            >
              <X size={15}/>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <header className="ip-header">
        <div className="ip-header-left">
          <h1 className="ip-title">Fish Scan</h1>
          <span className="ip-subtitle">AI-Powered Disease Detection · AquaGuard</span>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="ip-body">

        {/* ── Input Panel ── */}
        <div className="ip-cam-panel">

          {/* Tab strip */}
          <div className="ip-tab-strip">
            <button
              className={`ip-tab text-mono ${inputTab === 'upload' ? 'ip-tab-active' : ''}`}
              onClick={() => { setInputTab('upload'); if (isLive) setIsLive(false); }}
            >
              <Upload size={13}/> IMAGE
            </button>
            <button
              className={`ip-tab text-mono ${inputTab === 'video' ? 'ip-tab-active' : ''}`}
              onClick={() => { setInputTab('video'); if (isLive) setIsLive(false); }}
            >
              <Video size={13}/> VIDEO
            </button>
            <button
              className={`ip-tab text-mono ${inputTab === 'camera' ? 'ip-tab-active' : ''}`}
              onClick={() => setInputTab('camera')}
            >
              <Camera size={13}/> CAMERA
            </button>
          </div>

          {/* ── Upload tab ── */}
          {inputTab === 'upload' && (
            <div className="ip-upload-panel">

              {/* Dropzone */}
              <div
                className={`ip-dropzone${isDragging ? ' ip-dropzone-active' : ''}${uploadPreview ? ' ip-dropzone-has-file' : ''}`}
                onClick={() => !uploadPreview && fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={e => { e.preventDefault(); setIsDragging(false); applyFile(e.dataTransfer.files[0]); }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display:'none' }}
                  onChange={e => applyFile(e.target.files[0])}
                />

                {uploadPreview ? (
                  <img src={uploadPreview} alt="preview" className="ip-upload-preview" />
                ) : (
                  <div className="ip-dropzone-inner text-mono">
                    <Fish size={38} className="ip-dropzone-icon" style={{ color:'#3b82f6' }}/>
                    <span className="ip-dropzone-title">DROP FISH IMAGE HERE</span>
                    <span className="ip-dropzone-sub">or click to browse · JPG / PNG / WEBP</span>
                  </div>
                )}

                {analyzing && uploadPreview && <div className="ip-scan-line"/>}
              </div>

              {uploadError && (
                <div className="ip-upload-error text-mono">
                  <AlertTriangle size={13}/> {uploadError}
                </div>
              )}

              <div className="ip-upload-actions">
                <button className="ip-btn text-mono" onClick={() => fileInputRef.current?.click()}>
                  <Upload size={13}/> {uploadFile ? 'CHANGE FILE' : 'SELECT FILE'}
                </button>
                <button
                  className="ip-btn ip-btn-live text-mono"
                  onClick={analyseUpload}
                  disabled={!uploadFile || analyzing}
                >
                  {analyzing
                    ? <><div className="ip-pulse-sm"/> ANALYZING FISH...</>
                    : <><Fish size={13}/> ANALYZE FISH</>
                  }
                </button>
                {uploadFile && (
                  <button className="ip-btn ip-btn-sm text-mono" onClick={clearUpload}>
                    <Trash2 size={13}/>
                  </button>
                )}
              </div>

              {uploadFile && (
                <div className="ip-upload-meta text-mono">
                  <span>{uploadFile.name}</span>
                  <span>{(uploadFile.size / 1024).toFixed(0)} KB</span>
                </div>
              )}
            </div>
          )}

          {/* ── Video tab ── */}
          {inputTab === 'video' && (
            <div className="ip-upload-panel">
              <div
                className={`ip-dropzone${videoFile ? ' ip-dropzone-has-file' : ''}`}
                onClick={() => !videoFile && document.getElementById('vf-input')?.click()}
                style={{ cursor: videoFile ? 'default' : 'pointer' }}
              >
                <input
                  id="vf-input"
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
                  style={{ display: 'none' }}
                  onChange={e => { setVideoFile(e.target.files[0]); setVideoResult(null); setVideoError(''); }}
                />
                {videoFile ? (
                  <div className="ip-dropzone-inner text-mono">
                    <Video size={32} style={{ color: '#3b82f6' }}/>
                    <span className="ip-dropzone-title">{videoFile.name}</span>
                    <span className="ip-dropzone-sub">{(videoFile.size / 1024 / 1024).toFixed(1)} MB · Ready</span>
                  </div>
                ) : (
                  <div className="ip-dropzone-inner text-mono">
                    <Video size={38} className="ip-dropzone-icon" style={{ color: '#3b82f6' }}/>
                    <span className="ip-dropzone-title">DROP VIDEO HERE</span>
                    <span className="ip-dropzone-sub">MP4 / WebM / MOV · max 100 MB</span>
                  </div>
                )}
              </div>

              {videoError && (
                <div className="ip-upload-error text-mono">
                  <AlertTriangle size={13}/> {videoError}
                </div>
              )}

              <div className="ip-upload-actions">
                <button className="ip-btn text-mono" onClick={() => document.getElementById('vf-input')?.click()}>
                  <Video size={13}/> {videoFile ? 'CHANGE VIDEO' : 'SELECT VIDEO'}
                </button>
                <button
                  className="ip-btn ip-btn-live text-mono"
                  onClick={analyseVideo}
                  disabled={!videoFile || videoAnalyzing}
                >
                  {videoAnalyzing
                    ? <><div className="ip-pulse-sm"/> ANALYZING FRAMES...</>
                    : <><Fish size={13}/> ANALYZE VIDEO</>
                  }
                </button>
                {videoFile && (
                  <button className="ip-btn ip-btn-sm text-mono"
                    onClick={() => { setVideoFile(null); setVideoResult(null); setVideoError(''); }}>
                    <Trash2 size={13}/>
                  </button>
                )}
              </div>

              <AnimatePresence>
                {videoResult && (() => {
                  const hasInfection = (videoResult.infected_frames ?? 0) > 0;
                  const borderCol    = hasInfection ? '#fca5a5' : '#86efac';
                  const headerBg     = hasInfection ? '#fef2f2' : '#f0fdf4';
                  const infBadgeBg   = hasInfection ? '#fee2e2' : '#dcfce7';
                  const infBadgeFg   = hasInfection ? '#dc2626' : '#16a34a';
                  const infBadgeBdr  = hasInfection ? '#fca5a5' : '#86efac';
                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      style={{
                        marginTop: 12, background: '#fff',
                        border: `1.5px solid ${borderCol}`, borderRadius: 12,
                        overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                      }}
                    >
                      {/* Header */}
                      <div style={{
                        background: headerBg, padding: '10px 14px',
                        borderBottom: `1px solid ${borderCol}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <Video size={12} style={{ color: '#1d4ed8' }}/>
                          <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', fontWeight: 700,
                            color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            Video Analysis
                          </span>
                        </div>
                        <button
                          onClick={() => { setVideoResult(null); setVideoFile(null); }}
                          style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', padding:2 }}
                        >
                          <X size={14}/>
                        </button>
                      </div>
                      {/* Body */}
                      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
                          {videoResult.dominant_disease || 'Unknown'}
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{
                            background: infBadgeBg, color: infBadgeFg, border: `1px solid ${infBadgeBdr}`,
                            padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700,
                          }}>
                            {videoResult.infected_frames ?? 0} infected frame{(videoResult.infected_frames ?? 0) !== 1 ? 's' : ''}
                          </span>
                          <span style={{ background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd',
                            padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 600 }}>
                            {videoResult.total_frames ?? 0} frames analyzed
                          </span>
                        </div>
                        <p style={{ fontSize: '0.77rem', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                          AI sampled {videoResult.total_frames ?? 0} frames evenly across your video.
                          {hasInfection
                            ? ' Disease signs detected — review infected fish promptly.'
                            : ' No disease detected across sampled frames.'}
                        </p>
                      </div>
                    </motion.div>
                  );
                })()}
              </AnimatePresence>
            </div>
          )}

          {/* ── Camera tab ── */}
          {inputTab === 'camera' && (
            <>
              <div className="ip-cam-header">
                <div className="ip-cam-label text-mono">
                  {isLive && <span className="ip-live-dot"/>}
                  {isLive ? 'LIVE SCAN' : isCamActive ? 'CAMERA READY' : 'CAMERA OFF'}
                </div>
                <div className="ip-cam-actions">
                  {!isCamActive ? (
                    <button className="ip-btn text-mono" onClick={startCamera}>
                      <Camera size={14}/> ACTIVATE CAMERA
                    </button>
                  ) : (
                    <>
                      <button
                        className={`ip-btn ${isLive ? 'ip-btn-stop' : 'ip-btn-live'} text-mono`}
                        onClick={() => setIsLive(v => !v)}
                      >
                        <Radio size={14}/> {isLive ? 'STOP SCAN' : 'START LIVE SCAN'}
                      </button>
                      <button className="ip-btn ip-btn-sm text-mono" onClick={stopCamera}>
                        <X size={14}/>
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="ip-cam-viewport">
                {isCamActive ? (
                  <>
                    <video ref={videoRef} autoPlay playsInline muted className="ip-video" />
                    <canvas ref={canvasRef} style={{ display:'none' }} />
                    {isLive && (
                      <div className="ip-scan-overlay">
                        <div className="ip-corner ip-corner-tl"/><div className="ip-corner ip-corner-tr"/>
                        <div className="ip-corner ip-corner-bl"/><div className="ip-corner ip-corner-br"/>
                        {analyzing && <div className="ip-scan-line"/>}
                      </div>
                    )}
                    <div className="ip-cam-status-chip text-mono">
                      {analyzing
                        ? <><Activity size={12}/> ANALYZING...</>
                        : isLive
                          ? <><Radio size={12}/> SCANNING</>
                          : <><WifiOff size={12}/> STANDBY</>
                      }
                    </div>
                    {!isLive && (
                      <div className="ip-hints text-mono">
                        <span>POINT AT FISH</span>
                        <span>ENSURE CLEAR IMAGE</span>
                        <span>PRESS LIVE SCAN</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="ip-cam-empty text-mono">
                    <Camera size={40} className="ip-cam-empty-icon"/>
                    <span>CAMERA NOT ACTIVE</span>
                    <span className="ip-cam-empty-sub">Activate camera to scan fish live</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Result + History Panel ── */}
        <div className="ip-data-panel">

          {/* Result */}
          <div ref={resultRef} style={{ minHeight: 120 }}>
            <div className="ip-result-card-header text-mono" style={{ marginBottom:12 }}>
              <Fish size={14}/> DISEASE ANALYSIS RESULT
            </div>

            <AnimatePresence mode="wait">
              {analyzing && !result && (
                <motion.div
                  key="loading"
                  initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                  style={{
                    display:'flex', flexDirection:'column', alignItems:'center',
                    justifyContent:'center', gap:12, padding:'32px 0',
                    color:'#64748b', fontSize:'0.84rem', fontFamily:'var(--font-mono)',
                  }}
                >
                  <div className="ip-pulse" style={{ '--pulse-color':'#3b82f6' }}/>
                  <span>Analyzing fish health…</span>
                  <span style={{ fontSize:'0.72rem', color:'#94a3b8' }}>Running MobileNetV2 disease classifier</span>
                </motion.div>
              )}

              {!result && !analyzing && (
                <motion.div
                  key="empty"
                  initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                  className="ip-empty text-mono"
                >
                  <Fish size={32} className="ip-empty-icon" style={{ color:'#cbd5e1' }}/>
                  <span>AWAITING FISH SCAN</span>
                  <span className="ip-empty-sub">
                    {inputTab === 'upload'
                      ? 'Upload a fish image and press Analyze Fish'
                      : 'Activate camera and start live scan'
                    }
                  </span>
                </motion.div>
              )}

              {result && (
                <ResultCard
                  key={result.scanId}
                  result={result}
                  preview={uploadPreview}
                  onClear={() => setResult(null)}
                />
              )}
              {result && (
                <ActionPlanCard key={result.scanId + '-plan'} result={result} />
              )}
            </AnimatePresence>
          </div>

          {/* History */}
          <div className="ip-history" style={{ marginTop:16 }}>
            <div className="ip-history-header text-mono">
              <History size={14}/> SCAN HISTORY
            </div>
            <div className="ip-history-list">
              {history.length === 0 ? (
                <p className="ip-history-empty text-mono">No scans yet.</p>
              ) : (
                <AnimatePresence>
                  {history.map((item, i) => (
                    <motion.div
                      key={item.scanId + i}
                      initial={{ opacity:0, x:8 }} animate={{ opacity:1, x:0 }}
                      style={{
                        display:'flex', justifyContent:'space-between', alignItems:'center',
                        padding:'8px 10px', borderRadius:8, marginBottom:4,
                        background:'#f8fafc', border:'1px solid #e2e8f0',
                        fontSize:'0.75rem', fontFamily:'var(--font-mono)',
                      }}
                    >
                      <span style={{ color:'#0f172a', fontWeight:600 }}>{item.disease || '—'}</span>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{
                          background: SEVERITY_CFG[item.severity?.toLowerCase()]?.bg || '#f1f5f9',
                          color: sevColor(item.severity),
                          padding:'2px 8px', borderRadius:10, fontWeight:700, fontSize:'0.68rem',
                        }}>
                          {item.severity?.toUpperCase() || '—'}
                        </span>
                        <span style={{ color:'#94a3b8' }}>{item.timestamp}</span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </div>

          {/* Info tip */}
          <div style={{
            marginTop:12, padding:'10px 14px', borderRadius:10,
            background:'#eff6ff', border:'1px solid #bfdbfe',
            display:'flex', gap:8, alignItems:'flex-start', fontSize:'0.75rem', color:'#1d4ed8',
          }}>
            <Info size={13} style={{ flexShrink:0, marginTop:1 }}/>
            <span>For best results, use a clear, well-lit image of the fish showing the full body or the affected area.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InspectPage;
