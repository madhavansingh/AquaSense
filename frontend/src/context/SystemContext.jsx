import { createContext, useState, useContext, useMemo } from 'react';
import { computeFarmIntel } from '../utils/farmIntelligence';

const SystemContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useSystem = () => useContext(SystemContext);

const MAX_SESSIONS = 10;

export const SystemProvider = ({ children }) => {
  const [totalScans, setTotalScans] = useState(0);
  const [defectsDetected, setDefectsDetected] = useState(0);
  const [latestScan, setLatestScan] = useState(null);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [systemActive] = useState(true);

  // Production features
  const [isOperatorMode, setIsOperatorMode] = useState(false);
  const [currentBatchId, setCurrentBatchId] = useState(null);
  const [batches, setBatches] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [scanHistory, setScanHistory] = useState([]);
  const [lastSeverity, setLastSeverity] = useState(null);
  const [lastDisease, setLastDisease]   = useState(null);

  // ── SESSION STORE: persists last MAX_SESSIONS batch snapshots ───────────
  // Each entry: { timestamp: string, results: [], summary: {} }
  const [sessionStore, setSessionStore] = useState([]);

  const generateId = (prefix) => `${prefix}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  const getTimestamp = () => new Date().toLocaleString();

  const addAuditLog = (type, details) => {
    setAuditLogs(prev => [{
      id: generateId('LOG'),
      timestamp: getTimestamp(),
      type,
      details
    }, ...prev]);
  };

  const startBatch = (customId = null) => {
    const newBatchId = customId || generateId('BCH');
    setCurrentBatchId(newBatchId);
    setBatches(prev => [...prev, { id: newBatchId, startTime: getTimestamp(), endTime: null, totalScans: 0, defects: 0, scans: [] }]);
    addAuditLog('BATCH_STARTED', `Batch ${newBatchId} initialized`);
  };

  const endBatch = () => {
    if (currentBatchId) {
      setBatches(prev => prev.map(b => b.id === currentBatchId ? { ...b, endTime: getTimestamp() } : b));
      addAuditLog('BATCH_ENDED', `Batch ${currentBatchId} completed`);
      setCurrentBatchId(null);
    }
  };

  const addScan = (result) => {
    const isFail = result.status === 'FAIL';

    setTotalScans(prev => prev + 1);
    if (isFail) setDefectsDetected(prev => prev + 1);
    setLatestScan(result);
    setScanHistory(prev => [result, ...prev]);
    if (result.severity) setLastSeverity(result.severity?.toLowerCase());
    if (result.disease)  setLastDisease(result.disease);

    if (currentBatchId) {
      setBatches(prev => prev.map(b => {
        if (b.id === currentBatchId) {
          return { ...b, totalScans: b.totalScans + 1, defects: b.defects + (isFail ? 1 : 0), scans: [result, ...b.scans] };
        }
        return b;
      }));
    }

    addAuditLog('SCAN_COMPLETED', `Scan ${result.scanId} completed. Status: ${result.status}`);
    if (isFail && result.defects?.some(d => d.confidence > 0.85)) {
      addAuditLog('CRITICAL_ALERT', `Critical defect detected in ${result.scanId}`);
    }

    fetch('/api/report-scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timestamp:    result.timestamp,
        product_type: result.productType || result.product_type || 'Unknown',
        status:       result.status,
        confidence:   result.confidence ?? 0,
        reason:       result.reason || result.message || '',
        scanId:       result.scanId || '',
        source:       result.source || 'camera',
      }),
    }).catch(() => {});
  };

  // ── ADD SESSION: called after each batch scan completes ──────────────────
  const addSession = (results, summary) => {
    const entry = {
      timestamp: new Date().toISOString(),
      results: results || [],
      summary: summary || {},
    };

    setSessionStore(prev => {
      const updated = [...prev, entry];
      // Keep only the most recent MAX_SESSIONS
      return updated.length > MAX_SESSIONS ? updated.slice(-MAX_SESSIONS) : updated;
    });

    // Push to backend for server-side farm-insights endpoint
    fetch('/api/aquasense/session-store', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(entry),
    }).catch(() => {});
  };

  // ── FARM INTELLIGENCE: recomputed whenever sessionStore or scanHistory changes ─
  const farmIntel = useMemo(() => {
    // Current results = most recent session OR last 20 individual scans
    const currentResults =
      sessionStore.length > 0
        ? sessionStore[sessionStore.length - 1].results
        : scanHistory.slice(0, 20).map(s => ({
            disease:    s.disease || (s.status === 'PASS' ? 'Healthy' : 'Uncertain'),
            confidence: s.confidence ?? 0,
            severity:   s.severity || 'low',
            id:         s.scanId || 'scan',
          }));

    return computeFarmIntel(currentResults, sessionStore);
  }, [sessionStore, scanHistory]);

  const defectRate = totalScans > 0 ? ((defectsDetected / totalScans) * 100).toFixed(1) : 0;
  const yieldRate  = totalScans > 0 ? (100 - defectRate).toFixed(1) : 100;

  const systemConfidence = scanHistory.length > 0
    ? (scanHistory.slice(0, 20).reduce((acc, scan) => acc + (scan.status === 'PASS' ? 99 : (100 - (scan.defects?.[0]?.confidence || 0.8) * 100)), 0) / Math.min(scanHistory.length, 20)).toFixed(1)
    : 99.5;

  return (
    <SystemContext.Provider value={{
      totalScans,
      defectsDetected,
      defectRate,
      yieldRate,
      latestScan,
      addScan,
      isLiveMode,
      setIsLiveMode,
      systemActive,
      isOperatorMode,
      setIsOperatorMode,
      currentBatchId,
      batches,
      startBatch,
      endBatch,
      auditLogs,
      addAuditLog,
      scanHistory,
      systemConfidence,
      lastSeverity,
      lastDisease,
      // New: farm intelligence
      sessionStore,
      addSession,
      farmIntel,
    }}>
      {children}
    </SystemContext.Provider>
  );
};
