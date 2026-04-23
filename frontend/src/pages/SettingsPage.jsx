import { motion } from 'framer-motion';
import { Settings2, Camera, Volume2, ShieldCheck, RotateCcw, Leaf, Bell } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import './SettingsPage.css';

/* ── Reusable sub-components ───────────────────────────────── */

const Toggle = ({ checked, onChange, id }) => (
  <label className="sett-toggle" htmlFor={id}>
    <input id={id} type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
    <span className="sett-toggle-track">
      <span className="sett-toggle-thumb" />
    </span>
  </label>
);

const Slider = ({ value, onChange, min = 0, max = 100, step = 1, label }) => (
  <div className="sett-slider-wrap">
    <input
      type="range" min={min} max={max} step={step}
      value={value}
      onChange={e => onChange(Number(e.target.value))}
      className="sett-slider"
    />
    <span className="sett-slider-val">{label ? label(value) : value}</span>
  </div>
);

const Row = ({ label, sub, children }) => (
  <div className="sett-row">
    <div className="sett-row-left">
      <p className="sett-row-label">{label}</p>
      {sub && <p className="sett-row-sub">{sub}</p>}
    </div>
    <div className="sett-row-right">{children}</div>
  </div>
);

const Section = ({ icon: Icon, title, color, children }) => (
  <motion.div
    className="sett-card"
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.25 }}
  >
    <div className="sett-card-header">
      <div className="sett-card-icon" style={{ background: color + '18', color }}>
        <Icon size={16}/>
      </div>
      <h3 className="sett-card-title">{title}</h3>
    </div>
    <div className="sett-card-body">{children}</div>
  </motion.div>
);

const Select = ({ value, onChange, options }) => (
  <select className="sett-select" value={value} onChange={e => onChange(e.target.value)}>
    {options.map(o => (
      <option key={o.value} value={o.value}>{o.label}</option>
    ))}
  </select>
);

/* ── Page ──────────────────────────────────────────────────── */

const SettingsPage = () => {
  const { settings, update, reset } = useSettings();

  return (
    <div className="sett-root">

      {/* Header */}
      <motion.div
        className="sett-page-header"
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="sett-page-title">Settings</h1>
          <p className="sett-page-sub">Configure your AquaSense farm environment</p>
        </div>
        <button className="sett-reset-btn" onClick={reset} title="Reset all to defaults">
          <RotateCcw size={14}/> Reset to defaults
        </button>
      </motion.div>

      {/* Farm Profile */}
      <Section icon={Leaf} title="Farm Profile" color="#16a34a">
        <Row
          label="Farm Name"
          sub="Displayed on your dashboard and scan reports"
        >
          <input
            type="text"
            className="sett-select"
            placeholder="e.g. Blue River Aqua Farm"
            value={settings.farmName || ''}
            onChange={e => update('farmName', e.target.value)}
            style={{ minWidth: 200 }}
          />
        </Row>
        <Row
          label="Pond / Tank ID"
          sub="Optional — label your monitoring unit"
        >
          <input
            type="text"
            className="sett-select"
            placeholder="e.g. Pond-A1"
            value={settings.pondId || ''}
            onChange={e => update('pondId', e.target.value)}
            style={{ minWidth: 160 }}
          />
        </Row>
        <Row
          label="Reset scan history"
          sub="Clears all session scan records (page reload required)"
        >
          <button
            onClick={() => { if (window.confirm('Reset all scan history?')) reset(); }}
            style={{
              background: '#fee2e2', color: '#dc2626', border: '1.5px solid #fecaca',
              borderRadius: 8, padding: '6px 14px', cursor: 'pointer',
              fontSize: '0.82rem', fontWeight: 600,
            }}
          >
            Reset History
          </button>
        </Row>
      </Section>

      {/* Notifications */}
      <Section icon={Bell} title="Notifications" color="#d97706">
        <Row label="Infection alerts" sub="Show a red banner when high-severity disease is detected">
          <Toggle
            id="infect-alerts"
            checked={settings.alertsEnabled}
            onChange={v => update('alertsEnabled', v)}
          />
        </Row>
        <Row label="Voice feedback" sub="Speak results aloud after each scan">
          <Toggle
            id="voice-feedback-notif"
            checked={settings.voiceFeedback}
            onChange={v => update('voiceFeedback', v)}
          />
        </Row>
      </Section>

      {/* General */}
      <Section icon={Settings2} title="General" color="#2563eb">
        <Row
          label="Default product type"
          sub="Pre-selected product when you open the Inspect page"
        >
          <Select
            value={settings.defaultProduct}
            onChange={v => update('defaultProduct', v)}
            options={[
              { value: 'PCB',        label: 'PCB' },
              { value: 'BISCUIT',    label: 'Biscuit' },
              { value: 'AUTOMOTIVE', label: 'Automotive' },
            ]}
          />
        </Row>

        <Row
          label="Auto-scan interval"
          sub="How often the camera sends a frame for analysis in Live mode"
        >
          <Select
            value={String(settings.autoScanInterval)}
            onChange={v => update('autoScanInterval', Number(v))}
            options={[
              { value: '2', label: 'Every 2 seconds' },
              { value: '3', label: 'Every 3 seconds' },
              { value: '5', label: 'Every 5 seconds' },
            ]}
          />
        </Row>
      </Section>

      {/* Camera */}
      <Section icon={Camera} title="Camera" color="#0891b2">
        <Row
          label="Enable live scan"
          sub="Allow the camera to continuously analyse frames"
        >
          <Toggle
            id="live-scan"
            checked={settings.liveScanEnabled}
            onChange={v => update('liveScanEnabled', v)}
          />
        </Row>

        <Row
          label="Camera resolution"
          sub="Higher resolution gives better accuracy but uses more CPU"
        >
          <Select
            value={settings.resolution}
            onChange={v => update('resolution', v)}
            options={[
              { value: 'low',    label: 'Low (640×480)' },
              { value: 'medium', label: 'Medium (1280×720)' },
              { value: 'high',   label: 'High (1920×1080)' },
            ]}
          />
        </Row>
      </Section>

      {/* Voice */}
      <Section icon={Volume2} title="Voice" color="#7c3aed">
        <Row
          label="Voice feedback"
          sub="Speak results aloud after each scan"
        >
          <Toggle
            id="voice-feedback"
            checked={settings.voiceFeedback}
            onChange={v => update('voiceFeedback', v)}
          />
        </Row>

        <Row
          label="Volume"
          sub={`${settings.voiceVolume}% — adjust how loud the assistant speaks`}
        >
          <Slider
            value={settings.voiceVolume}
            onChange={v => update('voiceVolume', v)}
            label={v => `${v}%`}
          />
        </Row>
      </Section>

      {/* System */}
      <Section icon={ShieldCheck} title="System" color="#16a34a">
        <Row
          label="Confidence threshold"
          sub={`${settings.confidenceThreshold}% — scans below this are flagged as UNCERTAIN`}
        >
          <Slider
            value={settings.confidenceThreshold}
            min={40} max={95} step={5}
            onChange={v => update('confidenceThreshold', v)}
            label={v => `${v}%`}
          />
        </Row>

        <Row
          label="Enable alerts"
          sub="Show a notification when a FAIL result is detected"
        >
          <Toggle
            id="alerts"
            checked={settings.alertsEnabled}
            onChange={v => update('alertsEnabled', v)}
          />
        </Row>
      </Section>

      {/* Saved note */}
      <p className="sett-save-note">
        ✓ Settings are saved automatically to your browser
      </p>

    </div>
  );
};

export default SettingsPage;
