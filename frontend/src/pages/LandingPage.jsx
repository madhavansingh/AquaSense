import { useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion';
import {
  Fish, Camera, BarChart2, MessageCircle, ShieldCheck, Zap, Video, Activity,
  ChevronRight, ArrowRight, Check, Play, Upload,
  CheckCircle2, AlertCircle, HelpCircle, Menu, X, User, LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './LandingPage.css';

/* ─── Nav links ──────────────────────────────────────────────────────────── */
const NAV_LINKS = [
  { label: 'Features',  href: '#features' },
  { label: 'How It Works', href: '#workflow' },
  { label: 'Fish Scan', href: '/inspect',   isRoute: true },
  { label: 'Dashboard', href: '/dashboard', isRoute: true },
];

/* ─── Feature data ───────────────────────────────────────────────────────── */
const FEATURES = [
  { icon: Camera,       title: 'Instant Image Detection',    desc: 'Upload a fish photo and get an AI diagnosis with disease class, confidence score, and severity in seconds.', tag: 'CORE' },
  { icon: Video,        title: 'Video Frame Analysis',       desc: 'Submit a short video clip — AquaSense extracts 5 key frames and aggregates disease findings automatically.', tag: 'VIDEO' },
  { icon: BarChart2,    title: 'Farm Health Dashboard',      desc: 'Track fish health scores, infection alerts, disease trends, and confidence metrics across your farm.', tag: 'ANALYTICS' },
  { icon: MessageCircle,title: 'AI Farmer Chatbot',          desc: 'Ask questions in plain language — powered by Gemini AI with deep aquaculture knowledge for instant answers.', tag: 'CHAT' },
  { icon: ShieldCheck,  title: 'Treatment Recommendations',  desc: 'Every diagnosis comes with actionable treatment plans, medication advice, and water management tips.', tag: 'ACTIONABLE' },
  { icon: Zap,          title: 'MobileNetV2 Classifier',     desc: 'Trained on South Asian freshwater fish disease datasets with 7 disease classes and confidence scoring.', tag: 'AI MODEL' },
  { icon: Activity,     title: 'Severity Estimation',        desc: 'Disease severity is classified as Low, Moderate, or High based on model confidence, guiding urgency of response.', tag: 'SEVERITY' },
  { icon: Upload,       title: 'Camera + Upload Modes',      desc: 'Scan fish with your phone camera in live mode or upload batch images — both feed the same disease pipeline.', tag: 'FLEXIBLE' },
];

/* ─── Disease types ──────────────────────────────────────────────────────── */
const DISEASE_TYPES = [
  {
    icon: '🦠',
    label: 'AEROMONIASIS',
    title: 'Aeromonas Bacterial Infection',
    detects: 'Hemorrhagic skin lesions, ulcers, fin rot, abdominal swelling',
    why: 'Aeromoniasis spreads rapidly in overcrowded tanks. Early detection allows prompt antibiotic treatment before mass mortality.',
    result: 'Disease name · Confidence % · Severity badge · Antibiotic & water management advice.',
    color: '#ef4444',
  },
  {
    icon: '🍄',
    label: 'FUNGAL (SAPROLEGNIA)',
    title: 'Saprolegnia Fungal Infection',
    detects: 'White/grey cotton-like growth on body, fins, eggs',
    why: 'Fungal outbreaks are highly contagious. Quick identification stops pond-wide spread before losses mount.',
    result: 'Disease name · Confidence % · Severity badge · Antifungal & salt treatment advice.',
    color: '#f59e0b',
  },
  {
    icon: '✅',
    label: 'HEALTHY',
    title: 'Healthy Fish',
    detects: 'Normal scales, fins, and coloration — no lesions or abnormalities',
    why: 'Confirm that your fish are thriving and document baseline health for ongoing monitoring.',
    result: 'Healthy classification · High confidence · Continued care tips.',
    color: '#22c55e',
  },
];

/* ─── Workflow steps ─────────────────────────────────────────────────────── */
const WORKFLOW_STEPS = [
  { n: '01', title: 'Upload Image or Video', desc: 'Drag-and-drop a fish photo or short video clip into the Fish Scan page.' },
  { n: '02', title: 'AI Disease Detection',  desc: 'MobileNetV2 classifier preprocesses and predicts from 7 disease categories.' },
  { n: '03', title: 'Severity Assessment',   desc: 'Model confidence maps to Low / Moderate / High severity automatically.' },
  { n: '04', title: 'Treatment Plan',        desc: 'Get disease-specific medication, water management, and feeding advice instantly.' },
  { n: '05', title: 'Dashboard Record',      desc: 'Every scan is logged to your farm health dashboard for trend tracking.' },
];

/* ─── Benefits ───────────────────────────────────────────────────────────── */
const BENEFITS = [
  { label: 'Detect fish diseases early — before they spread across the entire pond.' },
  { label: 'Replace slow manual inspection with instant AI-powered diagnosis.' },
  { label: 'Get farmer-friendly treatment advice without needing a specialist.' },
  { label: 'Monitor disease trends and health scores across your whole farm.' },
  { label: 'Support for image uploads, live camera scans, and batch video analysis.' },
  { label: 'Powered by transfer learning trained on South Asian freshwater fish diseases.' },
];

/* ─── Animation helpers ──────────────────────────────────────────────────── */
const fadeUp = (delay = 0) => ({
  initial:   { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport:  { once: true, amount: 0.2 },
  transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] },
});
const stagger = (i, base = 0.1) => fadeUp(i * base);

/* ════════════════════════════════════════════════════════════════════════════
   Navbar
   ════════════════════════════════════════════════════════════════════════════ */
const Navbar = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen]  = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => scrollY.on('change', v => setScrolled(v > 30)), [scrollY]);

  const scrollTo = (href) => {
    setMenuOpen(false);
    if (href.startsWith('/')) { navigate(href); return; }
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <motion.nav
      className={`lp-nav ${scrolled ? 'lp-nav-scrolled' : ''}`}
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="lp-nav-inner">
        {/* Logo */}
        <button className="lp-nav-logo" onClick={() => scrollTo('#top')}>
          <div className="lp-nav-logo-icon"><Fish size={18} /></div>
          <span className="lp-nav-logo-text">AquaSense<span>AI</span></span>
        </button>

        {/* Desktop links */}
        <div className="lp-nav-links">
          {NAV_LINKS.map(l => (
            <button key={l.label} className="lp-nav-link" onClick={() => scrollTo(l.href)}>
              {l.label}
            </button>
          ))}
        </div>

        {/* Desktop CTAs */}
        <div className="lp-nav-ctas">
          {user ? (
            <>
              <div className="lp-nav-user">
                {user.picture && !avatarError ? (
                  <img src={user.picture} alt={user.name} className="lp-nav-avatar"
                    onError={() => setAvatarError(true)} referrerPolicy="no-referrer" />
                ) : (
                  <div className="lp-nav-avatar-fallback">{user.name?.[0] || <User size={14}/>}</div>
                )}
                <span className="lp-nav-username">{user.name?.split(' ')[0]}</span>
              </div>
              <button className="lp-btn-ghost" onClick={() => navigate('/dashboard')}>Dashboard</button>
              <button className="lp-btn-primary" onClick={() => navigate('/inspect')}>
                Scan Fish <ArrowRight size={14}/>
              </button>
              <button className="lp-nav-logout" onClick={async () => { await logout(); }} title="Sign out">
                <LogOut size={15}/>
              </button>
            </>
          ) : (
            <>
              <button className="lp-btn-ghost" onClick={() => navigate('/login')}>Login</button>
              <button className="lp-btn-primary" onClick={() => navigate('/inspect')}>
                Scan Fish <ArrowRight size={14}/>
              </button>
            </>
          )}
        </div>

        {/* Hamburger */}
        <button className="lp-hamburger" onClick={() => setMenuOpen(v => !v)}>
          {menuOpen ? <X size={20}/> : <Menu size={20}/>}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="lp-mobile-menu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
          >
            {NAV_LINKS.map(l => (
              <button key={l.label} className="lp-mobile-link" onClick={() => scrollTo(l.href)}>
                {l.label}
              </button>
            ))}
            <button className="lp-btn-primary lp-mobile-cta" onClick={() => { navigate('/inspect'); setMenuOpen(false); }}>
              Scan Fish <ArrowRight size={14}/>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

/* ════════════════════════════════════════════════════════════════════════════
   Hero Section
   ════════════════════════════════════════════════════════════════════════════ */
const HeroSection = () => {
  const navigate = useNavigate();
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '18%']);

  return (
    <section className="lp-hero" id="top" ref={ref}>
      <motion.div className="lp-hero-blob lp-hero-blob1" style={{ y }} />
      <motion.div className="lp-hero-blob lp-hero-blob2" style={{ y }} />
      <div className="lp-hero-grid-overlay" />

      <div className="lp-container lp-hero-inner">
        {/* Left: copy */}
        <div className="lp-hero-copy">
          <motion.div className="lp-hero-badge" {...fadeUp(0.1)}>
            <span className="lp-hero-badge-dot" />
            AI Detection · Fish Health · Real-Time
          </motion.div>

          <motion.h1 className="lp-hero-h1" {...fadeUp(0.2)}>
            AI Fish Disease<br />
            <span className="lp-gradient-text">Detection & Monitoring</span>
          </motion.h1>

          <motion.p className="lp-hero-sub" {...fadeUp(0.3)}>
            AquaSense uses transfer learning to detect freshwater fish diseases from images and videos,
            providing instant diagnoses, severity scores, and treatment recommendations for fish farmers.
          </motion.p>

          <motion.div className="lp-hero-ctas" {...fadeUp(0.4)}>
            <button className="lp-btn-primary lp-btn-lg" onClick={() => navigate('/inspect')}>
              Scan Fish Now <ArrowRight size={16}/>
            </button>
            <button className="lp-btn-outline lp-btn-lg" onClick={() => document.querySelector('#workflow')?.scrollIntoView({ behavior: 'smooth' })}>
              <Play size={15}/> See How It Works
            </button>
          </motion.div>

          <motion.p className="lp-hero-trust" {...fadeUp(0.5)}>
            <CheckCircle2 size={14}/> Built for small fish farmers and large aquaculture operations.
          </motion.p>
        </div>

        {/* Right: visual mockup */}
        <motion.div
          className="lp-hero-visual"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Main glass card — disease result */}
          <div className="lp-hero-card lp-hero-card-main">
            <div className="lp-hero-card-header">
              <div className="lp-hc-dot lp-hc-dot-r"/><div className="lp-hc-dot lp-hc-dot-y"/><div className="lp-hc-dot lp-hc-dot-g"/>
              <span className="lp-hc-title">DISEASE ANALYSIS RESULT</span>
            </div>
            <div className="lp-hc-body">
              <div className="lp-hc-status lp-hc-pass">
                <CheckCircle2 size={32}/>
                <span>HEALTHY</span>
              </div>
              <div className="lp-hc-meta">
                <div className="lp-hc-row"><span>Disease</span><span>No Infection Found</span></div>
                <div className="lp-hc-row"><span>Confidence</span><span className="lp-hc-conf">94.2%</span></div>
                <div className="lp-hc-row"><span>Severity</span><span style={{ color:'#16a34a', fontWeight:700 }}>LOW</span></div>
              </div>
              <div className="lp-hc-bar-wrap">
                <div className="lp-hc-bar-track"><div className="lp-hc-bar-fill" style={{ width: '94%' }}/></div>
              </div>
            </div>
          </div>

          {/* Floating chips */}
          <motion.div className="lp-hero-card lp-hero-chip lp-chip-top"
            animate={{ y: [0, -7, 0] }} transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}>
            <Activity size={14}/> <strong>247</strong> fish scanned today
          </motion.div>
          <motion.div className="lp-hero-card lp-hero-chip lp-chip-bottom"
            animate={{ y: [0, 7, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}>
            <CheckCircle2 size={14}/> <strong>96.1%</strong> healthy rate
          </motion.div>
          <motion.div className="lp-hero-card lp-hero-chip lp-chip-left"
            animate={{ x: [0, -5, 0] }} transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }}>
            <Fish size={14}/> 7 disease classes
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

/* ════════════════════════════════════════════════════════════════════════════
   Features Section
   ════════════════════════════════════════════════════════════════════════════ */
const FeaturesSection = () => (
  <section className="lp-section lp-features-section" id="features">
    <div className="lp-container">
      <motion.div className="lp-section-header" {...fadeUp()}>
        <span className="lp-section-eyebrow">CAPABILITIES</span>
        <h2 className="lp-section-h2">Everything a fish farmer needs</h2>
        <p className="lp-section-sub">
          From instant disease detection to AI-powered treatment guidance — AquaSense is a complete fish health platform.
        </p>
      </motion.div>
      <div className="lp-features-grid">
        {FEATURES.map((f, i) => (
          <motion.div key={f.title} className="lp-feature-card" {...stagger(i, 0.07)}>
            <div className="lp-fc-icon-wrap"><f.icon size={20}/></div>
            <span className="lp-fc-tag">{f.tag}</span>
            <h3 className="lp-fc-title">{f.title}</h3>
            <p className="lp-fc-desc">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

/* ════════════════════════════════════════════════════════════════════════════
   Disease Types Section
   ════════════════════════════════════════════════════════════════════════════ */
const DiseaseTypesSection = () => (
  <section className="lp-section lp-types-section">
    <div className="lp-container">
      <motion.div className="lp-section-header" {...fadeUp()}>
        <span className="lp-section-eyebrow">DISEASE DETECTION</span>
        <h2 className="lp-section-h2">7 disease classes. One platform.</h2>
        <p className="lp-section-sub">
          AquaSense detects Aeromoniasis, Gill Disease, Red Disease, Fungal, Parasitic, Viral infections, and Healthy fish.
        </p>
      </motion.div>
      <div className="lp-types-grid">
        {DISEASE_TYPES.map((t, i) => (
          <motion.div key={t.label} className="lp-type-card" {...stagger(i, 0.12)} style={{ '--tc': t.color }}>
            <div className="lp-type-emoji">{t.icon}</div>
            <span className="lp-type-tag" style={{ color: t.color, borderColor: `${t.color}40`, background: `${t.color}10` }}>
              {t.label}
            </span>
            <h3 className="lp-type-title">{t.title}</h3>
            <dl className="lp-type-dl">
              <dt>DETECTS</dt><dd>{t.detects}</dd>
              <dt>WHY IT MATTERS</dt><dd>{t.why}</dd>
              <dt>RESULT</dt><dd>{t.result}</dd>
            </dl>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

/* ════════════════════════════════════════════════════════════════════════════
   Workflow Timeline
   ════════════════════════════════════════════════════════════════════════════ */
const WorkflowSection = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });
  return (
    <section className="lp-section lp-workflow-section" id="workflow" ref={ref}>
      <div className="lp-container">
        <motion.div className="lp-section-header" {...fadeUp()}>
          <span className="lp-section-eyebrow">WORKFLOW</span>
          <h2 className="lp-section-h2">From image to diagnosis in five steps</h2>
        </motion.div>
        <div className="lp-timeline">
          {WORKFLOW_STEPS.map((s, i) => (
            <motion.div key={s.n} className="lp-tl-item"
              initial={{ opacity: 0, x: -24 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.55, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}>
              <div className="lp-tl-line">
                <div className="lp-tl-dot"/>
                {i < WORKFLOW_STEPS.length - 1 && <div className="lp-tl-connector"/>}
              </div>
              <div className="lp-tl-body">
                <span className="lp-tl-num">{s.n}</span>
                <h4 className="lp-tl-title">{s.title}</h4>
                <p className="lp-tl-desc">{s.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ════════════════════════════════════════════════════════════════════════════
   Benefits section
   ════════════════════════════════════════════════════════════════════════════ */
const BenefitsSection = () => (
  <section className="lp-section lp-benefits-section">
    <div className="lp-container lp-benefits-inner">
      <motion.div className="lp-benefits-copy" {...fadeUp()}>
        <span className="lp-section-eyebrow">BENEFITS</span>
        <h2 className="lp-section-h2" style={{ textAlign: 'left' }}>
          Built for aquaculture<br/>farmers and businesses
        </h2>
        <p className="lp-section-sub" style={{ textAlign: 'left', maxWidth: '400px' }}>
          AquaSense replaces slow manual inspection with a fast, AI-powered fish health monitoring pipeline.
        </p>
      </motion.div>
      <div className="lp-benefits-list">
        {BENEFITS.map((b, i) => (
          <motion.div key={i} className="lp-benefit-item" {...stagger(i, 0.08)}>
            <div className="lp-benefit-check"><Check size={14}/></div>
            <p>{b.label}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

/* ════════════════════════════════════════════════════════════════════════════
   CTA Section
   ════════════════════════════════════════════════════════════════════════════ */
const CTASection = () => {
  const navigate = useNavigate();
  return (
    <section className="lp-section lp-cta-section">
      <div className="lp-container">
        <motion.div className="lp-cta-card" {...fadeUp()}>
          <div className="lp-cta-blob"/>
          <span className="lp-section-eyebrow" style={{ color: '#93c5fd' }}>GET STARTED</span>
          <h2 className="lp-cta-h2">Ready to protect your fish?</h2>
          <p className="lp-cta-sub">
            Upload a fish image and get your first AI diagnosis in under 10 seconds — no setup required.
          </p>
          <div className="lp-cta-btns">
            <button className="lp-cta-btn-primary" onClick={() => navigate('/inspect')}>
              Scan Fish Now <ArrowRight size={16}/>
            </button>
            <button className="lp-cta-btn-ghost" onClick={() => navigate('/dashboard')}>
              View Dashboard
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

/* ════════════════════════════════════════════════════════════════════════════
   Footer
   ════════════════════════════════════════════════════════════════════════════ */
const Footer = () => {
  const navigate = useNavigate();
  return (
    <footer className="lp-footer">
      <div className="lp-container lp-footer-inner">
        <div className="lp-footer-brand">
          <div className="lp-footer-logo">
            <Fish size={18}/> AquaSense<span>AI</span>
          </div>
          <p className="lp-footer-tagline">
            AI-powered fish disease detection for aquaculture farmers — faster diagnosis, healthier fish.
          </p>
        </div>
        <div className="lp-footer-links">
          <span className="lp-footer-col-label">PLATFORM</span>
          <button onClick={() => navigate('/dashboard')}>Dashboard</button>
          <button onClick={() => navigate('/inspect')}>Fish Scan</button>
          <button onClick={() => navigate('/reports')}>Reports</button>
        </div>
        <div className="lp-footer-links">
          <span className="lp-footer-col-label">DETECTION</span>
          <button>Aeromoniasis</button>
          <button>Fungal Disease</button>
          <button>Viral Infections</button>
        </div>
      </div>
      <div className="lp-footer-bar">
        <span>© 2026 AquaSense AI. Built for aquaculture health monitoring.</span>
      </div>
    </footer>
  );
};

/* ════════════════════════════════════════════════════════════════════════════
   Page Root
   ════════════════════════════════════════════════════════════════════════════ */
const LandingPage = () => (
  <div className="lp-root">
    <Navbar />
    <HeroSection />
    <FeaturesSection />
    <DiseaseTypesSection />
    <WorkflowSection />
    <BenefitsSection />
    <CTASection />
    <Footer />
  </div>
);

export default LandingPage;
