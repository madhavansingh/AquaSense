/**
 * AquaGuard — Farm Intelligence Engine (Client-Side)
 * ====================================================
 * Pure JS mirror of backend/services/farm_intelligence.py
 * Runs client-side for instant updates after every scan — no round-trip needed.
 *
 * All functions are pure (no state, no API calls).
 *
 * Schema:
 *   result   = { disease, confidence (0–1), severity, id }
 *   session  = { timestamp, results: result[], summary: {} }
 */

// ─────────────────────────────────────────────────────────────────────────────
// DISEASE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const HEALTHY_LABELS = new Set(['healthy', 'uncertain', '']);

const DISEASE_CATEGORY_MAP = {
  'fungal (saprolegniasis)': 'Fungal',
  'fungal':                  'Fungal',
  'saprolegniasis':          'Fungal',
  'viral (white tail disease)': 'Viral',
  'viral':                   'Viral',
  'white tail disease':      'Viral',
  'aeromoniasis':            'Bacterial',
  'red disease':             'Bacterial',
  'gill disease':            'Bacterial',
  'gill':                    'Bacterial',
  'parasitic':               'Parasitic',
  'healthy':                 'Healthy',
  'uncertain':               'Healthy',
};

export function isHealthy(disease = '') {
  return HEALTHY_LABELS.has(disease.trim().toLowerCase());
}

function diseaseCategory(disease = '') {
  return DISEASE_CATEGORY_MAP[disease.trim().toLowerCase()] ?? 'Unknown';
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. FARM HEALTH SCORE  (0–100)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute health score from an array of fish scan results.
 * @param {Array} results
 * @returns {{ score: number, label: 'Good'|'Moderate'|'Critical' }}
 */
export function computeHealthScore(results = []) {
  if (!results.length) return { score: 100, label: 'Good' };

  const total      = results.length;
  const infected   = results.filter(r => !isHealthy(r.disease));
  const highSevCt  = infected.filter(r => r.severity?.toLowerCase() === 'high').length;

  const diseaseTypes = new Set(
    infected.map(r => diseaseCategory(r.disease)).filter(c => c !== 'Healthy' && c !== 'Unknown')
  );
  const extraTypes = Math.max(0, diseaseTypes.size - 1);

  let score = 100;
  score -= Math.round((infected.length / total) * 50);  // infection ratio
  score -= highSevCt * 10;                               // severity penalty
  score -= Math.min(extraTypes * 5, 15);                 // diversity penalty

  score = Math.max(0, Math.min(100, score));

  const label = score >= 70 ? 'Good' : score >= 40 ? 'Moderate' : 'Critical';
  return { score, label };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. RISK LEVEL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {Array} results
 * @returns {{ level: 'low'|'medium'|'high', explanation: string }}
 */
export function computeRiskLevel(results = []) {
  if (!results.length) return { level: 'low', explanation: 'No scan data available yet.' };

  const total        = results.length;
  const infected     = results.filter(r => !isHealthy(r.disease));
  const infectionPct = (infected.length / total) * 100;
  const sevs         = infected.map(r => r.severity?.toLowerCase() ?? 'low');
  const hasHigh      = sevs.includes('high');
  const hasModerate  = sevs.includes('moderate');

  if (hasHigh || infectionPct > 60) {
    return {
      level: 'high',
      explanation:
        `${infected.length} of ${total} fish infected` +
        (hasHigh ? ' with high-severity disease' : '') +
        '. Immediate intervention required.',
    };
  }
  if (hasModerate || infectionPct > 25) {
    return {
      level: 'medium',
      explanation:
        `${infected.length} of ${total} fish show signs of disease. Monitor closely and begin treatment.`,
    };
  }
  return {
    level: 'low',
    explanation:
      infected.length > 0
        ? `${infected.length} of ${total} fish affected. Farm is mostly healthy — keep monitoring.`
        : 'All scanned fish appear healthy.',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. TREND ANALYSIS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {Array} sessions  — array of session objects (oldest first)
 * @returns {{ trend: string, infectionRates: number[], avgConfidenceTrend: number, mostCommonDiseaseOverTime: string|null }}
 */
export function computeTrend(sessions = []) {
  if (sessions.length < 2) {
    return {
      trend: 'stable',
      infectionRates: [],
      avgConfidenceTrend: 0,
      mostCommonDiseaseOverTime: null,
    };
  }

  const recent = sessions.slice(-3); // last 3 sessions
  const rates       = [];
  const confAvgs    = [];
  const allDiseases = [];

  for (const sess of recent) {
    const res = sess.results ?? [];
    if (!res.length) continue;
    const infected = res.filter(r => !isHealthy(r.disease));
    rates.push(infected.length / res.length);
    confAvgs.push(res.reduce((s, r) => s + (r.confidence ?? 0), 0) / res.length);
    infected.forEach(r => r.disease && allDiseases.push(r.disease));
  }

  let trend = 'stable';
  if (rates.length >= 2) {
    const delta = rates[rates.length - 1] - rates[rates.length - 2];
    if (delta > 0.08)       trend = 'increasing';
    else if (delta < -0.08) trend = 'decreasing';
  }

  const confDelta =
    confAvgs.length >= 2 ? confAvgs[confAvgs.length - 1] - confAvgs[confAvgs.length - 2] : 0;

  const counts = {};
  for (const d of allDiseases) counts[d] = (counts[d] ?? 0) + 1;
  const topDisease = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return {
    trend,
    infectionRates: rates.map(r => Math.round(r * 100)),  // as percentages
    avgConfidenceTrend: Math.round(confDelta * 100),
    mostCommonDiseaseOverTime: topDisease,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. SMART INSIGHTS  (max 3)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {Array}  sessions        — session history
 * @param {Array}  currentResults  — latest scan results
 * @returns {string[]}
 */
export function generateInsights(sessions = [], currentResults = []) {
  const insights = [];

  // ── Trend-based ────────────────────────────────────────────────────────────
  if (sessions.length >= 2) {
    const td = computeTrend(sessions);
    if (td.trend === 'increasing') {
      const msg = td.mostCommonDiseaseOverTime
        ? `⚠️ Infection rate increasing — ${td.mostCommonDiseaseOverTime} is the dominant condition.`
        : '⚠️ Infection rate is increasing across recent scans.';
      insights.push(msg);
    } else if (td.trend === 'decreasing') {
      insights.push('✅ Healthy ratio improving — treatment appears to be working.');
    }
    if (td.avgConfidenceTrend < -10) {
      insights.push('📉 Model confidence dropping — consider rescanning in better lighting.');
    }
  }

  // ── Current scan severity ─────────────────────────────────────────────────
  if (currentResults.length) {
    const highSev = currentResults.filter(r => r.severity?.toLowerCase() === 'high');
    if (highSev.length) {
      insights.push(`🚨 High severity detected in ${highSev.length} fish — immediate action required.`);
    }

    const cats = new Set(
      currentResults
        .filter(r => !isHealthy(r.disease))
        .map(r => diseaseCategory(r.disease))
        .filter(c => c !== 'Unknown')
    );
    if (cats.size > 1) {
      insights.push(
        `🔬 Multiple disease types detected (${[...cats].sort().join(', ')}) — isolate ponds to prevent cross-contamination.`
      );
    }

    const allHealthy = currentResults.every(r => isHealthy(r.disease));
    if (allHealthy && currentResults.length >= 3) {
      insights.push('✅ All scanned fish appear healthy — farm conditions look good.');
    }
  }

  // ── Fallback ──────────────────────────────────────────────────────────────
  if (!insights.length && sessions.length > 0) {
    insights.push('🐟 Scan more fish batches to unlock trend analysis and deeper insights.');
  }

  // Deduplicate and cap at 3
  return [...new Set(insights)].slice(0, 3);
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. PREVENTION RECOMMENDATIONS
// ─────────────────────────────────────────────────────────────────────────────

const PREVENTION_KB = {
  Aeromoniasis: {
    waterQuality: [
      'Maintain pH between 7.0–8.0',
      'Keep dissolved oxygen above 5 mg/L',
      'Change 25–30% water every 3 days during outbreak',
    ],
    feeding: [
      'Reduce feed by 50% during treatment period',
      'Add Vitamin C (100 mg/kg feed) daily to boost immunity',
      'Remove uneaten feed within 15 minutes',
    ],
    hygiene: [
      'Disinfect all nets and tools with 10% chlorine solution',
      'Quarantine new fish for 2 weeks before introducing to ponds',
      'Dispose of dead fish by deep burial — never into rivers',
    ],
  },
  'Gill Disease': {
    waterQuality: [
      'Test ammonia and nitrite daily — keep near zero',
      'Increase aeration — add extra aerators if possible',
      'Reduce stocking density to lower stress',
    ],
    feeding: [
      'Feed only high-quality, pathogen-free pellets',
      'Avoid overfeeding — reduces organic load in water',
    ],
    hygiene: [
      'Clean pond bottoms to remove decomposing organic matter',
      'Avoid sharing equipment between ponds',
    ],
  },
  'Red Disease': {
    waterQuality: [
      'Keep water temperature stable — avoid sudden drops',
      'Reduce stocking density to lower injury risk',
    ],
    feeding: [
      'Supplement feed with Vitamin E (100 mg/kg) for immunity',
      'Cut feeding rate in half during active outbreak',
    ],
    hygiene: ['Disinfect pond tools between uses', 'Remove dead and dying fish immediately'],
  },
  Fungal: {
    waterQuality: [
      'Keep water clean and well-oxygenated',
      'Reduce organic debris — fungus thrives in dirty water',
      'Use salt bath (1–3 g/L NaCl) as a mild antifungal preventive',
    ],
    feeding: [
      'Avoid overfeeding — excess feed promotes fungal growth',
      'Ensure feed is dry and mould-free before use',
    ],
    hygiene: [
      'Remove injured or dead fish immediately — fungus spreads from wounds',
      'Disinfect nets and tanks after handling infected fish',
    ],
  },
  Parasitic: {
    waterQuality: [
      'Maintain clean water — parasites thrive in poor conditions',
      'Formalin bath (25–50 ppm for 30 min) can reduce ectoparasites',
    ],
    feeding: ['Ensure balanced nutrition to maintain fish immune defence'],
    hygiene: [
      'Quarantine new fish strictly — parasites often enter via new stock',
      'Do not share nets between ponds during active infestation',
    ],
  },
  Viral: {
    waterQuality: [
      'No medication works — focus entirely on water quality and biosecurity',
      'Maximise aeration and reduce stocking density',
    ],
    feeding: [
      'Add Vitamin C and probiotics to feed to support immunity',
      'Reduce feeding — sick fish will not eat effectively',
    ],
    hygiene: [
      'Strictly quarantine affected ponds — stop all water flow in/out',
      'Disinfect all equipment with UV or 5% chlorine before use',
      'Never move fish from infected ponds to healthy ones',
    ],
  },
  Healthy: {
    waterQuality: [
      'Test pH (7.0–8.5), ammonia, and dissolved oxygen weekly',
      'Perform 20% water change every week as routine maintenance',
    ],
    feeding: [
      'Feed 2–3% of bodyweight daily at consistent times',
      'Mix probiotics into feed monthly for gut health',
    ],
    hygiene: [
      'Keep pond banks clean and free of vegetation',
      'Record a daily health log — note any unusual behaviour',
    ],
  },
};

const DISEASE_NORM = {
  'aeromoniasis':               'Aeromoniasis',
  'gill disease':               'Gill Disease',
  'gill':                       'Gill Disease',
  'red disease':                'Red Disease',
  'fungal (saprolegniasis)':   'Fungal',
  'fungal':                     'Fungal',
  'saprolegniasis':             'Fungal',
  'parasitic':                  'Parasitic',
  'viral (white tail disease)': 'Viral',
  'viral':                      'Viral',
  'white tail disease':         'Viral',
  'healthy':                    'Healthy',
  'uncertain':                  'Healthy',
};

/**
 * @param {string|null} dominantDisease
 * @returns {{ disease: string, waterQuality: string[], feeding: string[], hygiene: string[] }}
 */
export function getPreventionRecs(dominantDisease) {
  const key = DISEASE_NORM[dominantDisease?.toLowerCase()?.trim() ?? ''] ?? 'Healthy';
  const recs = PREVENTION_KB[key] ?? PREVENTION_KB.Healthy;
  return {
    disease:      key,
    waterQuality: recs.waterQuality ?? [],
    feeding:      recs.feeding ?? [],
    hygiene:      recs.hygiene ?? [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. AGGREGATE ENTRY POINT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute all farm intelligence from real scan data.
 *
 * @param {Array} currentResults   — latest scan batch results
 * @param {Array} sessions         — session history (oldest first)
 * @returns {{
 *   healthScore:    { score: number, label: string },
 *   riskLevel:      { level: string, explanation: string },
 *   trend:          object,
 *   insights:       string[],
 *   dominantDisease: string|null,
 *   preventionRecs: object,
 * }}
 */
export function computeFarmIntel(currentResults = [], sessions = []) {
  const healthScore     = computeHealthScore(currentResults);
  const riskLevel       = computeRiskLevel(currentResults);
  const trend           = computeTrend(sessions);
  const insights        = generateInsights(sessions, currentResults);

  // Dominant disease from current results, fallback to trend history
  const counts = {};
  for (const r of currentResults.filter(r => !isHealthy(r.disease))) {
    counts[r.disease] = (counts[r.disease] ?? 0) + 1;
  }
  const dominantDisease =
    Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ??
    trend.mostCommonDiseaseOverTime ??
    null;

  const preventionRecs = getPreventionRecs(dominantDisease);

  return { healthScore, riskLevel, trend, insights, dominantDisease, preventionRecs };
}
