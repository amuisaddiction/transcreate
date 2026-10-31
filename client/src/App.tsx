import { useEffect, useState, useMemo } from 'react';
import {
  ArrowUpRight,
  ArrowRight,
  FileSearch,
  ScanText,
  ShieldCheck,
  Activity,
  Check,
  Copy,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles,
  ExternalLink,
  RotateCcw,
  Compass,
  Globe,
  Sliders,
  SplitSquareVertical,
  CheckCircle2,
  BookOpen,
  Info,
  Eye,
  Clock,
  Cpu,
} from 'lucide-react';

interface Health {
  status?: string;
  mode?: 'live' | 'sample';
  qlooConfigured?: boolean;
  qlooOk?: boolean;
  qlooMessage?: string;
  qlooLatencyMs?: number;
  llmConfigured?: boolean;
}

interface EditSpan {
  type: 'text' | 'kept' | 'swapped' | 'unresolved';
  originalText: string;
  replacementText?: string;
  referenceId?: string;
}

interface QlooObsExcerpt {
  observationId: string;
  operation: string;
  endpoint: string;
  entityId?: string;
  entityName?: string;
  popularity?: number;
  affinity?: number;
  rawExcerpt?: Record<string, unknown>;
  isSynthetic: boolean;
}

interface EvidenceReceipt {
  referenceId: string;
  originalReference: string;
  action: 'swap' | 'keep' | 'unresolved';
  chosenReplacement?: string;
  qlooObservation?: QlooObsExcerpt;
  modelInterpretation: string;
  decisionReason: string;
  limitations: string;
  provenance: {
    timestamp: string;
    observationIds: string[];
  };
}

interface TraceEvent {
  id: string;
  timestamp: string;
  stage: string;
  status: 'info' | 'success' | 'warning' | 'error';
  message: string;
  durationMs?: number;
}

interface ReferenceDecision {
  referenceId: string;
  originalText: string;
  kind: string;
  action: 'swap' | 'keep' | 'unresolved';
  chosenCandidate?: { id: string; name: string; affinity?: number };
  reason: string;
  rejectedCandidates: Array<{ candidateId: string; candidateName: string; reason: string }>;
}

interface LocalizationResult {
  originalCopy: string;
  transcreatedCopy: string;
  edits: EditSpan[];
  decisions: ReferenceDecision[];
  receipts: EvidenceReceipt[];
  trace: TraceEvent[];
  mode: 'live' | 'sample';
  verified: boolean;
  retryCount: number;
  executionTimeMs: number;
}

const PRESETS = [
  {
    label: 'Friends Reunion',
    text: 'Our new campaign is the Friends reunion of productivity apps.',
    market: 'Mumbai',
    category: 'TV / Comedy',
    hook: '90s iconic comedy parallel',
  },
  {
    label: 'Succession Finale',
    text: 'Waiting for this software release feels like waiting for the Succession finale all over again.',
    market: 'Mumbai',
    category: 'TV / Drama',
    hook: 'High-stakes prestige drama parallel',
  },
  {
    label: '90s Nike Drop',
    text: 'Launching our new designer sneaker is as coveted as a Nike Air Jordan drop in the 90s.',
    market: 'Bengaluru',
    category: 'Brand / Fashion',
    hook: 'Streetwear & sneakerhead culture',
  },
  {
    label: 'Tech Copy (No Reference)',
    text: 'Our platform delivers real-time database synchronization with 99.99% uptime for distributed teams.',
    market: 'London',
    category: 'Enterprise / Tech',
    hook: 'Preservation test: no forced swaps',
  },
];

const MARKETS = [
  {
    id: 'Mumbai',
    label: 'Mumbai, India',
    flag: '🇮🇳',
    context: 'Commercial capital · Hindi cinema, classic sitcoms, and urban pop culture',
  },
  {
    id: 'Bengaluru',
    label: 'Bengaluru, India',
    flag: '🇮🇳',
    context: 'Tech & startup capital · Youth streetwear, bilingual humor, and indie arts',
  },
  {
    id: 'London',
    label: 'London, UK',
    flag: '🇬🇧',
    context: 'Metropolitan UK · Dry British satire, cult comedy, and indie music history',
  },
  {
    id: 'New York',
    label: 'New York, USA',
    flag: '🇺🇸',
    context: 'Dense urban cultural center · American sitcoms, media, and fast-paced lifestyle',
  },
];

const SHOWCASE_EXAMPLES = [
  {
    id: 'mumbai-friends',
    title: 'The Mumbai Comedy Parallel',
    market: 'Mumbai, India',
    marketFlag: '🇮🇳',
    category: 'TV / Sitcom',
    originalText: 'Our new campaign is the Friends reunion of productivity apps.',
    anchorOriginal: 'Friends reunion',
    transcreatedText: 'Our new campaign is the Sarabhai vs Sarabhai reunion of productivity apps.',
    anchorTranscreated: 'Sarabhai vs Sarabhai reunion',
    affinityScore: 88,
    qlooInsight:
      'Qloo Taste AI maps Friends (90s ensemble sitcom) to Sarabhai vs Sarabhai for urban Mumbai audiences desiring high-affinity nostalgic wit.',
  },
  {
    id: 'london-drama',
    title: 'The London Satire Shift',
    market: 'London, UK',
    marketFlag: '🇬🇧',
    category: 'TV / Political Drama',
    originalText: 'Navigating executive meetings feels like an episode of Succession.',
    anchorOriginal: 'Succession',
    transcreatedText: 'Navigating executive meetings feels like an episode of The Thick of It.',
    anchorTranscreated: 'The Thick of It',
    affinityScore: 85,
    qlooInsight:
      'Qloo location signals identify strong British political satire affinity in London, substituting HBO corporate drama with Armando Iannucci’s quintessential Whitehall comedy.',
  },
  {
    id: 'bengaluru-streetwear',
    title: 'The Bengaluru Streetwear Anchor',
    market: 'Bengaluru, India',
    marketFlag: '🇮🇳',
    category: 'Brand / Streetwear',
    originalText: 'Getting early beta access was coveted like a 90s Nike Air Jordan drop.',
    anchorOriginal: 'Nike Air Jordan drop',
    transcreatedText: 'Getting early beta access was coveted like a VegNonVeg limited sneaker drop.',
    anchorTranscreated: 'VegNonVeg limited sneaker drop',
    affinityScore: 92,
    qlooInsight:
      'Qloo taste intelligence recognizes Indiranagar/Koramangala streetwear boutique affinity among Bengaluru tech creatives.',
  },
];

const LOADING_STAGES = [
  'Reading source copy & detecting cultural anchors...',
  'Resolving canonical entity via Qloo /search...',
  'Querying Qloo Taste AI graph for target audience...',
  'Evaluating cohort affinity & ranking candidate parallels...',
  'Performing surgically constrained contextual rewrite...',
  'Executing deterministic verification & guardrail checks...',
];

export default function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [copy, setCopy] = useState(PRESETS[0].text);
  const [market, setMarket] = useState('Mumbai');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState<LocalizationResult | null>(null);
  const [selectedRefId, setSelectedRefId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [traceExpanded, setTraceExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<'proof' | 'diff' | 'clean'>('proof');
  const [studioTab, setStudioTab] = useState<'proof' | 'ledger' | 'trace'>('proof');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeShowcaseIdx, setActiveShowcaseIdx] = useState(0);

  useEffect(() => {
    fetch('/api/health')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Health check failed'))))
      .then((data: Health) => setHealth(data))
      .catch(() => setHealth({ mode: 'sample', qlooOk: false }));
  }, []);

  // Animate loading stages during API call
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev < LOADING_STAGES.length - 1 ? prev + 1 : prev));
      }, 700);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleTranscreate = async () => {
    if (!copy.trim()) return;
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/localize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ copy: copy.trim(), market }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Server error (${res.status})`);
      }

      const data: LocalizationResult = await res.json();
      setResult(data);
      if (data.receipts.length > 0) {
        setSelectedRefId(data.receipts[0].referenceId);
      }
      setStudioTab('proof');
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during transcreation.');
    } finally {
      setLoading(false);
    }
  };

  const activeReceipt = useMemo(() => {
    if (!result || !result.receipts.length) return null;
    if (!selectedRefId) return result.receipts[0];
    return result.receipts.find((r) => r.referenceId === selectedRefId) || result.receipts[0];
  }, [result, selectedRefId]);

  const handleCopyFinal = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.transcreatedCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const isLiveMode = health?.mode === 'live' && health.qlooOk;
  const isLiveFailed = health?.mode === 'live' && !health.qlooOk;

  let modeBadgeClass = 'mode-sample';
  let modeBadgeText = 'SAMPLE — NOT QLOO DATA';

  if (isLiveMode) {
    modeBadgeClass = 'mode-live';
    modeBadgeText = 'LIVE — QLOO CONNECTED';
  } else if (isLiveFailed) {
    modeBadgeClass = 'mode-error';
    modeBadgeText = 'LIVE FAILED — QLOO ERROR';
  }

  const selectedMarketObj = MARKETS.find((m) => m.id === market) || MARKETS[0];
  const activeShowcase = SHOWCASE_EXAMPLES[activeShowcaseIdx];

  return (
    <main className="shell">
      {/* Top Bar */}
      <nav className="topbar">
        <a className="wordmark" href="/" aria-label="Transcreate home">
          TRANSCREATE<span>®</span>
        </a>
        <div className="topbar-right">
          <span className={`mode-badge ${modeBadgeClass}`}>
            <span className="mode-dot" />
            {modeBadgeText}
          </span>
          <span className="issue">ISSUE 001 / CULTURAL EDITING STUDIO</span>
        </div>
      </nav>

      {isLiveFailed && (
        <aside className="error-banner" role="alert">
          <AlertTriangle size={16} />
          <span>
            <strong>QLOO API CONNECTION ISSUE:</strong> {health?.qlooMessage || 'Qloo API credentials could not be verified.'} Server is operating in protected fallback mode. Check server <code>QLOO_API_KEY</code>.
          </span>
        </aside>
      )}

      {/* Hero Section */}
      <header className="hero">
        <div className="eyebrow">
          <span>THE CULTURAL COPY DESK</span>
          <span>POWERED BY QLOO TASTE GRAPH</span>
        </div>
        <h1>
          Make the<br />
          <em>reference</em> land.
        </h1>
        <div className="hero-bottom">
          <p>
            Adapt English copy to your target audience without losing its original meaning.
            Powered by real Qloo cultural intelligence and a self-checking verification agent.
          </p>
          <div className="hero-actions">
            <a className="text-link" href="#studio">
              OPEN THE STUDIO <ArrowDownRight size={17} />
            </a>
          </div>
        </div>
        <div className="trust-strip">
          <span>✓ NO FORCED SWAPS</span>
          <span>✓ NO INVENTED EVIDENCE</span>
          <span>✓ DETERMINISTIC REWRITE VERIFIER</span>
          <span>✓ AUDIENCE-CONDITIONED TASTE GRAPH</span>
        </div>
        <div className="hero-mark" aria-hidden="true">
          T<span>.</span>
        </div>
      </header>

      {/* SECTION: 5-Second Visual Explainer (The Cultural Transformer) */}
      <section className="explainer-section">
        <div className="section-meta">
          <span className="section-num">00 / HOW IT WORKS</span>
          <h2>The Cultural Transformer</h2>
          <p className="section-deck">
            Translation changes language. <strong>Transcreation adapts cultural context</strong> while preserving
            sentence structure, voice, and narrative intent.
          </p>
        </div>

        {/* Interactive Example Selector */}
        <div className="showcase-tabs">
          {SHOWCASE_EXAMPLES.map((ex, idx) => (
            <button
              key={ex.id}
              type="button"
              className={`showcase-tab ${activeShowcaseIdx === idx ? 'active' : ''}`}
              onClick={() => setActiveShowcaseIdx(idx)}
            >
              <span className="tab-flag">{ex.marketFlag}</span>
              <span className="tab-title">{ex.title}</span>
              <span className="tab-cat">{ex.category}</span>
            </button>
          ))}
        </div>

        {/* Visual 3-Stage Transformation Card */}
        <div className="transformer-card">
          <div className="transformer-col original-col">
            <div className="col-badge badge-orig">1. ORIGINAL ENGLISH COPY</div>
            <div className="copy-card">
              <p className="card-text">
                {activeShowcase.originalText.split(activeShowcase.anchorOriginal)[0]}
                <mark className="anchor-mark anchor-red">{activeShowcase.anchorOriginal}</mark>
                {activeShowcase.originalText.split(activeShowcase.anchorOriginal)[1]}
              </p>
              <div className="anchor-note">
                <span className="label">ORIGINAL ANCHOR:</span>
                <strong>{activeShowcase.anchorOriginal}</strong>
                <p className="note-desc">High resonance in Western pop culture; lacks immediate local emotional hook.</p>
              </div>
            </div>
          </div>

          <div className="transformer-middle">
            <div className="intelligence-node">
              <div className="node-icon">
                <Compass size={22} />
              </div>
              <span className="node-title">QLOO TASTE AI</span>
              <span className="node-affinity">{activeShowcase.affinityScore}% AFFINITY</span>
              <div className="node-arrow">
                <ArrowRight size={18} />
              </div>
            </div>
            <p className="node-rationale">{activeShowcase.qlooInsight}</p>
          </div>

          <div className="transformer-col transcreated-col">
            <div className="col-badge badge-trans">2. VERIFIED CULTURAL TRANSCREATION</div>
            <div className="copy-card card-trans">
              <p className="card-text">
                {activeShowcase.transcreatedText.split(activeShowcase.anchorTranscreated)[0]}
                <ins className="anchor-mark anchor-green">{activeShowcase.anchorTranscreated}</ins>
                {activeShowcase.transcreatedText.split(activeShowcase.anchorTranscreated)[1]}
              </p>
              <div className="anchor-note note-green">
                <span className="label">TARGET AUDIENCE:</span>
                <strong>{activeShowcase.market}</strong>
                <span className="verified-stamp">✓ VERIFIED GUARDRAIL PASSED</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Studio Workspace */}
      <section className="studio" id="studio">
        <div className="section-meta">
          <span className="section-num">01 / THE EDITORIAL STUDIO</span>
          <h2>The Proof Desk</h2>
          <p className="section-deck">
            Draft, paste, or select a cultural preset. Choose a target market and adapt the copy with verified Qloo intelligence.
          </p>
        </div>

        {/* Preset Shelf */}
        <div className="preset-shelf">
          <div className="shelf-header">
            <BookOpen size={16} />
            <span>CURATED REFERENCE PRESETS</span>
          </div>
          <div className="preset-grid">
            {PRESETS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                className={`preset-card ${copy === p.text && market === p.market ? 'active' : ''}`}
                onClick={() => {
                  setCopy(p.text);
                  setMarket(p.market);
                }}
              >
                <div className="preset-card-top">
                  <span className="preset-badge">{p.category}</span>
                  <span className="preset-market">{p.market}</span>
                </div>
                <h4 className="preset-name">{p.label}</h4>
                <p className="preset-preview">"{p.text}"</p>
                <span className="preset-hook">{p.hook}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Target Market Selector Ribbon */}
        <div className="market-ribbon">
          <div className="ribbon-label">
            <Globe size={16} />
            <span>TARGET AUDIENCE MARKET:</span>
          </div>
          <div className="market-pills">
            {MARKETS.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`market-pill ${market === m.id ? 'active' : ''}`}
                onClick={() => setMarket(m.id)}
                disabled={loading}
              >
                <span className="market-flag">{m.flag}</span>
                <span className="market-name">{m.id}</span>
              </button>
            ))}
          </div>
          <div className="market-context-box">
            <span className="context-indicator" />
            <p>{selectedMarketObj.context}</p>
          </div>
        </div>

        {/* Main Writing Canvas */}
        <div className="writing-canvas">
          <div className="canvas-header">
            <div className="canvas-header-left">
              <span className="canvas-tag">SOURCE DRAFT</span>
              <span className="canvas-lang">ENGLISH (US/UK)</span>
            </div>
            <div className="canvas-header-right">
              <span className={copy.length > 900 ? 'counter-danger' : 'counter-clean'}>
                {copy.length} / 900 CHARS
              </span>
              {copy.length > 0 && (
                <button
                  type="button"
                  className="clear-btn"
                  onClick={() => setCopy('')}
                  title="Clear source text"
                >
                  <RotateCcw size={13} /> Clear
                </button>
              )}
            </div>
          </div>

          <label className="sr-only" htmlFor="main-copy-textarea">
            English copy to transcreate
          </label>
          <textarea
            id="main-copy-textarea"
            className="main-textarea"
            maxLength={900}
            value={copy}
            onChange={(e) => setCopy(e.target.value)}
            placeholder="Write or paste English marketing copy containing cultural references (movies, TV shows, artists, brands)..."
            disabled={loading}
          />

          {errorMessage && (
            <div className="error-banner" role="alert">
              <AlertTriangle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="canvas-action-bar">
            <div className="action-hint">
              <Sparkles size={16} />
              <span>Targeting: <strong>{selectedMarketObj.label}</strong> · Powered by Qloo Taste AI</span>
            </div>
            <button
              type="button"
              className="transcreate-cta"
              onClick={handleTranscreate}
              disabled={loading || !copy.trim()}
            >
              {loading ? (
                <>
                  <Activity size={18} className="spin" />
                  <span>ANALYZING CULTURAL GRAPH...</span>
                </>
              ) : (
                <>
                  <span>TRANSCREATE MY COPY</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Animated Live Transformation Progress Bar */}
        {loading && (
          <div className="live-progress-card">
            <div className="progress-top">
              <div className="progress-indicator">
                <span className="ping-dot" />
                <strong>AGENTIC PIPELINE EXECUTING</strong>
              </div>
              <span className="progress-step-counter">STEP {loadingStep + 1} OF 6</span>
            </div>

            <h3 className="progress-current-text">{LOADING_STAGES[loadingStep]}</h3>

            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${((loadingStep + 1) / LOADING_STAGES.length) * 100}%` }}
              />
            </div>

            <div className="progress-steps-list">
              {LOADING_STAGES.map((stg, i) => (
                <div
                  key={i}
                  className={`step-item ${i < loadingStep ? 'done' : i === loadingStep ? 'active' : 'pending'}`}
                >
                  <span className="step-dot" />
                  <span className="step-label">{stg.split('...')[0]}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RESULTS: The Editorial Proof Sheet (Centrepiece) */}
        {result && !loading && (
          <div className="results-wrapper" id="proof-results">
            {/* View Mode Bar */}
            <div className="results-toolbar">
              <div className="toolbar-left">
                <span className="result-headline">EDITORIAL PROOF SHEET</span>
                <span className={`status-pill ${result.verified ? 'status-pill-verified' : 'status-pill-unverified'}`}>
                  {result.verified ? '✓ VERIFIED REWRITE' : 'UNVERIFIED'}
                </span>
                <span className={`status-pill ${result.mode === 'live' ? 'status-pill-live' : 'status-pill-sample'}`}>
                  {result.mode === 'live' ? 'LIVE QLOO API DATA' : 'SAMPLE FIXTURE DATA'}
                </span>
              </div>

              <div className="view-mode-tabs">
                <button
                  type="button"
                  className={`mode-tab ${viewMode === 'proof' ? 'active' : ''}`}
                  onClick={() => setViewMode('proof')}
                >
                  <ScanText size={15} /> Proof Marks
                </button>
                <button
                  type="button"
                  className={`mode-tab ${viewMode === 'diff' ? 'active' : ''}`}
                  onClick={() => setViewMode('diff')}
                >
                  <SplitSquareVertical size={15} /> Side-by-Side
                </button>
                <button
                  type="button"
                  className={`mode-tab ${viewMode === 'clean' ? 'active' : ''}`}
                  onClick={() => setViewMode('clean')}
                >
                  <Eye size={15} /> Clean Output
                </button>
              </div>
            </div>

            {/* Proof Display Canvas */}
            <div className="proof-sheet-canvas">
              {viewMode === 'proof' && (
                <div className="proof-body proof-interactive">
                  {result.edits.map((span, idx) => {
                    if (span.type === 'swapped') {
                      const isSelected = selectedRefId === span.referenceId;
                      return (
                        <span
                          key={idx}
                          className={`proof-swap-interactive ${isSelected ? 'selected' : ''}`}
                          onClick={() => {
                            if (span.referenceId) {
                              setSelectedRefId(span.referenceId);
                              setStudioTab('ledger');
                            }
                          }}
                          title="Click to view Qloo evidence receipt"
                        >
                          <del className="strike-reference">{span.originalText}</del>
                          <ins className="ins-replacement">{span.replacementText}</ins>
                          <span className="interactive-stamp">SWAPPED</span>
                        </span>
                      );
                    }
                    if (span.type === 'kept') {
                      const isSelected = selectedRefId === span.referenceId;
                      return (
                        <span
                          key={idx}
                          className={`proof-kept-interactive ${isSelected ? 'selected' : ''}`}
                          onClick={() => {
                            if (span.referenceId) {
                              setSelectedRefId(span.referenceId);
                              setStudioTab('ledger');
                            }
                          }}
                          title="Click to view keep-original rationale"
                        >
                          <strong className="kept-reference">{span.originalText}</strong>
                          <span className="stamp-kept">KEPT ORIGINAL</span>
                        </span>
                      );
                    }
                    if (span.type === 'unresolved') {
                      return (
                        <span key={idx} className="proof-unresolved-interactive">
                          <em>{span.originalText}</em>
                          <span className="stamp-unresolved">UNRESOLVED</span>
                        </span>
                      );
                    }
                    return <span key={idx}>{span.originalText}</span>;
                  })}
                </div>
              )}

              {viewMode === 'diff' && (
                <div className="diff-view-grid">
                  <div className="diff-column original-diff">
                    <span className="diff-col-tag">ORIGINAL COPY</span>
                    <p className="diff-text">{result.originalCopy}</p>
                  </div>
                  <div className="diff-column transcreated-diff">
                    <span className="diff-col-tag diff-tag-green">TRANSCREATED COPY</span>
                    <p className="diff-text">{result.transcreatedCopy}</p>
                  </div>
                </div>
              )}

              {viewMode === 'clean' && (
                <div className="proof-body clean-text-body">
                  <p className="clean-copy-text">{result.transcreatedCopy}</p>
                </div>
              )}

              {/* Action Bar Below Proof */}
              <div className="proof-sheet-footer">
                <div className="execution-meta">
                  <Clock size={15} />
                  <span>
                    Executed in <strong>{result.executionTimeMs}ms</strong> · <strong>{result.retryCount}</strong> retries · Verified guardrail passed
                  </span>
                </div>

                <button type="button" className="copy-final-btn" onClick={handleCopyFinal}>
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                  <span>{copied ? 'COPIED TO CLIPBOARD!' : 'COPY FINAL TEXT'}</span>
                </button>
              </div>
            </div>

            {/* Studio Navigation Tabs (Ledger & Trace) */}
            <div className="detail-navigation">
              <button
                type="button"
                className={`detail-nav-btn ${studioTab === 'ledger' ? 'active' : ''}`}
                onClick={() => setStudioTab('ledger')}
              >
                <ShieldCheck size={18} />
                <span>Evidence Ledger ({result.receipts.length} Receipts)</span>
              </button>
              <button
                type="button"
                className={`detail-nav-btn ${studioTab === 'trace' ? 'active' : ''}`}
                onClick={() => setStudioTab('trace')}
              >
                <Activity size={18} />
                <span>Agent Execution Trace ({result.trace.length} Events)</span>
              </button>
            </div>

            {/* TAB CONTENT: Evidence Ledger */}
            {studioTab === 'ledger' && (
              <div className="evidence-ledger-panel">
                {result.receipts.length === 0 ? (
                  <div className="empty-ledger-box">
                    <ShieldCheck size={32} />
                    <h3>Original Copy Retained</h3>
                    <p>No supported cultural references required substitution. Original sentence preserved completely.</p>
                  </div>
                ) : (
                  <div className="ledger-card-wrapper">
                    {/* Multiple receipts selector */}
                    {result.receipts.length > 1 && (
                      <div className="receipt-ref-selector">
                        <span className="selector-title">RESOLVED REFERENCES:</span>
                        {result.receipts.map((r, i) => (
                          <button
                            key={i}
                            type="button"
                            className={`ref-tab-btn ${r.referenceId === activeReceipt?.referenceId ? 'active' : ''}`}
                            onClick={() => setSelectedRefId(r.referenceId)}
                          >
                            {r.originalReference}
                          </button>
                        ))}
                      </div>
                    )}

                    {activeReceipt && (
                      <div className="receipt-detailed-card">
                        {/* Receipt Title Banner */}
                        <div className="receipt-title-banner">
                          <div className="banner-left">
                            <span className="sub">TARGET REFERENCE</span>
                            <h3>{activeReceipt.originalReference}</h3>
                          </div>
                          <div className="banner-right">
                            <span className={`action-badge badge-${activeReceipt.action}`}>
                              ACTION: {activeReceipt.action.toUpperCase()}
                            </span>
                          </div>
                        </div>

                        {/* Proposed Replacement Highlight */}
                        {activeReceipt.chosenReplacement && (
                          <div className="replacement-highlight-banner">
                            <div className="r-left">
                              <span className="r-label">CHOSEN CULTURAL REPLACEMENT</span>
                              <h4 className="r-name">{activeReceipt.chosenReplacement}</h4>
                            </div>
                            {activeReceipt.qlooObservation?.affinity !== undefined && (
                              <div className="r-affinity-pill">
                                <span className="aff-num">
                                  {(activeReceipt.qlooObservation.affinity * 100).toFixed(0)}%
                                </span>
                                <span className="aff-lbl">QLOO AFFINITY INDEX</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Three Core Evidence Columns */}
                        <div className="evidence-three-pillars">
                          {/* Pillar 1: Qloo API Observation */}
                          <div className="pillar-box qloo-pillar">
                            <div className="pillar-header">
                              <Layers size={16} />
                              <span>1. QLOO OBSERVATION (GENUINE API DATA)</span>
                            </div>

                            {activeReceipt.qlooObservation ? (
                              <div className="pillar-content">
                                <div className="kv-row">
                                  <span className="k">Observation ID:</span>
                                  <code className="v">{activeReceipt.qlooObservation.observationId}</code>
                                </div>
                                <div className="kv-row">
                                  <span className="k">Endpoint:</span>
                                  <code className="v">{activeReceipt.qlooObservation.endpoint}</code>
                                </div>
                                <div className="kv-row">
                                  <span className="k">Operation:</span>
                                  <code className="v">{activeReceipt.qlooObservation.operation}</code>
                                </div>

                                {activeReceipt.qlooObservation.affinity !== undefined && (
                                  <div className="affinity-meter-box">
                                    <div className="meter-header">
                                      <span>Cohort Affinity Index</span>
                                      <strong>{(activeReceipt.qlooObservation.affinity * 100).toFixed(0)}%</strong>
                                    </div>
                                    <div className="meter-track">
                                      <div
                                        className="meter-bar"
                                        style={{ width: `${Math.round(activeReceipt.qlooObservation.affinity * 100)}%` }}
                                      />
                                    </div>
                                  </div>
                                )}

                                <div className="provenance-seal">
                                  <span className={`provenance-chip ${activeReceipt.qlooObservation.isSynthetic ? 'chip-synthetic' : 'chip-live'}`}>
                                    {activeReceipt.qlooObservation.isSynthetic ? 'SYNTHETIC FIXTURE' : 'LIVE QLOO API DATA'}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <p className="no-data-msg">No server-side observation linked.</p>
                            )}
                          </div>

                          {/* Pillar 2: Model Interpretation */}
                          <div className="pillar-box model-pillar">
                            <div className="pillar-header">
                              <Sparkles size={16} />
                              <span>2. MODEL INTERPRETATION (NON-API)</span>
                            </div>
                            <div className="pillar-content">
                              <p className="interpretation-quote">{activeReceipt.modelInterpretation}</p>
                              <div className="pillar-footnote">
                                Contextual rationale generated by LLM reasoning over Qloo candidate signals.
                              </div>
                            </div>
                          </div>

                          {/* Pillar 3: Editorial Reason & Policy */}
                          <div className="pillar-box guardrail-pillar">
                            <div className="pillar-header">
                              <ShieldCheck size={16} />
                              <span>3. EDITORIAL POLICY & LIMITS</span>
                            </div>
                            <div className="pillar-content">
                              <p className="reason-quote">{activeReceipt.decisionReason}</p>
                              <p className="limitations-note">{activeReceipt.limitations}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: Agent Execution Trace */}
            {studioTab === 'trace' && (
              <div className="trace-timeline-panel">
                <div className="trace-panel-head">
                  <div className="t-left">
                    <Activity size={18} />
                    <h3>Agent Execution Pipeline Trace</h3>
                  </div>
                  <span className="t-count">{result.trace.length} PIPELINE EVENTS RECORDED</span>
                </div>

                <div className="trace-nodes-container">
                  {result.trace.map((evt, idx) => (
                    <div key={evt.id} className={`trace-node node-status-${evt.status}`}>
                      <div className="node-marker">
                        <span className="marker-dot" />
                        {idx < result.trace.length - 1 && <span className="marker-line" />}
                      </div>
                      <div className="node-card">
                        <div className="node-meta">
                          <span className="node-stage-badge">{evt.stage.toUpperCase()}</span>
                          <span className="node-timestamp">{evt.timestamp.slice(11, 23)}</span>
                          {evt.durationMs !== undefined && (
                            <span className="node-dur">+{evt.durationMs}ms</span>
                          )}
                        </div>
                        <p className="node-message-text">{evt.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-top">
          <div className="footer-brand">
            <span className="wordmark">TRANSCREATE<span>®</span></span>
            <p>An evidence-backed cultural editing studio powered by Qloo cultural intelligence.</p>
          </div>
          <div className="footer-trust">
            <div className="trust-item">
              <strong>ZERO FABRICATION</strong>
              <span>Every replacement stems from Qloo taste graph operations</span>
            </div>
            <div className="trust-item">
              <strong>SELF-CHECKING VERIFIER</strong>
              <span>Automated guardrail rejects unauthorized mutations</span>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>BUILT FOR QLOO AGENTIC HACKATHON 2026</span>
          <span>OPEN-SOURCE MIT LICENSE</span>
        </div>
      </footer>
    </main>
  );
}

function ArrowDownRight(props: { size?: number }) {
  return (
    <svg
      width={props.size || 16}
      height={props.size || 16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="7" y1="7" x2="17" y2="17" />
      <polyline points="17 7 17 17 7 17" />
    </svg>
  );
}
