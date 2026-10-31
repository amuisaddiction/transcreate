import { useEffect, useState, useMemo } from 'react';
import {
  ArrowUpRight,
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
  },
  {
    label: 'Succession Finale',
    text: 'Waiting for this software release feels like waiting for the Succession finale all over again.',
    market: 'Mumbai',
    category: 'TV / Drama',
  },
  {
    label: '90s Nike Drop',
    text: 'Launching our new designer sneaker is as coveted as a Nike Air Jordan drop in the 90s.',
    market: 'Bengaluru',
    category: 'Brand / Fashion',
  },
  {
    label: 'Tech Copy (No Reference)',
    text: 'Our platform delivers real-time database synchronization with 99.99% uptime for distributed teams.',
    market: 'London',
    category: 'Enterprise / Tech',
  },
];

const MARKETS = [
  { id: 'Mumbai', label: 'Mumbai, India', desc: 'Commercial capital; high affinity for Bollywood & classic Hindi sitcoms' },
  { id: 'Bengaluru', label: 'Bengaluru, India', desc: 'Tech hub; strong bilingual youth culture & indie entertainment' },
  { id: 'London', label: 'London, UK', desc: 'Metropolitan UK; dry British satire, classic sitcoms, and indie music' },
  { id: 'New York', label: 'New York, USA', desc: 'High-density urban market; American sitcoms & fast-paced lifestyle' },
];

export default function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [copy, setCopy] = useState(PRESETS[0].text);
  const [market, setMarket] = useState('Mumbai');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LocalizationResult | null>(null);
  const [selectedRefId, setSelectedRefId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [traceExpanded, setTraceExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<'proof' | 'receipts' | 'trace'>('proof');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Health check failed'))))
      .then((data: Health) => setHealth(data))
      .catch(() => setHealth({ mode: 'sample', qlooOk: false }));
  }, []);

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
        <aside className="error-banner" style={{ margin: '16px 32px 0', maxWidth: '1280px' }} role="alert">
          <AlertTriangle size={15} />
          <span>
            <strong>QLOO API CONNECTION ISSUE:</strong> {health?.qlooMessage || 'Qloo API credentials could not be verified.'} Server is operating in protected fallback mode. Check server <code>QLOO_API_KEY</code>.
          </span>
        </aside>
      )}

      {/* Hero Section */}
      <section className="hero">
        <div className="eyebrow">
          <span>THE CULTURAL COPY DESK</span>
          <span>AGENTIC PROVENANCE SYSTEM</span>
        </div>
        <h1>
          Make the<br />
          <em>reference</em> land.
        </h1>
        <div className="hero-bottom">
          <p>
            Adapt existing English copy to your target audience without losing its original meaning.
            Powered by real Qloo cultural affinity data and a self-checking verification agent.
          </p>
          <div className="hero-actions">
            <a className="text-link" href="#studio">
              OPEN THE STUDIO <ArrowUpRight size={17} />
            </a>
          </div>
        </div>
        <div className="trust-strip">
          <span>✓ NO FORCED SWAPS</span>
          <span>✓ NO INVENTED EVIDENCE</span>
          <span>✓ FULL EXECUTION TRACE</span>
          <span>✓ AUDIENCE-CONDITIONED RANKING</span>
        </div>
        <div className="hero-mark" aria-hidden="true">
          T<span>.</span>
        </div>
      </section>

      {/* Main Studio Workspace */}
      <section className="studio" id="studio">
        <div className="section-head">
          <div>
            <p className="eyebrow">WORKSPACE / 001</p>
            <h2>The Proof Sheet</h2>
          </div>
          <div className="step-label">
            <ScanText size={16} />
            <span>EDITORIAL PROOF DESK</span>
          </div>
        </div>

        {/* Preset Chips */}
        <div className="preset-bar">
          <span className="preset-label">EXAMPLE RUNS:</span>
          <div className="preset-chips">
            {PRESETS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                className={`preset-chip ${copy === p.text && market === p.market ? 'active' : ''}`}
                onClick={() => {
                  setCopy(p.text);
                  setMarket(p.market);
                }}
              >
                <strong>{p.label}</strong>
                <span>({p.market})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Controls Ribbon */}
        <div className="controls">
          <div className="control-group">
            <label htmlFor="market-select">TARGET MARKET</label>
            <select
              id="market-select"
              value={market}
              onChange={(e) => setMarket(e.target.value)}
              disabled={loading}
            >
              {MARKETS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <span className="controls-note">
            Targeted via Qloo location intelligence signals to discover and rank affinity-matched alternatives.
          </span>
        </div>

        {/* Mobile View Switcher */}
        <div className="mobile-tabs">
          <button
            type="button"
            className={activeTab === 'proof' ? 'active' : ''}
            onClick={() => setActiveTab('proof')}
          >
            01 / Copy & Proof
          </button>
          <button
            type="button"
            className={activeTab === 'receipts' ? 'active' : ''}
            onClick={() => setActiveTab('receipts')}
          >
            02 / Evidence Ledger ({result?.receipts.length || 0})
          </button>
          <button
            type="button"
            className={activeTab === 'trace' ? 'active' : ''}
            onClick={() => setActiveTab('trace')}
          >
            03 / Trace ({result?.trace.length || 0})
          </button>
        </div>

        {/* 3-Column Proof Sheet Grid */}
        <div className="work-grid">
          {/* Column 1: Source Copy Pane */}
          <div className={`pane source-pane ${activeTab === 'proof' ? 'mobile-visible' : 'mobile-hidden'}`}>
            <div className="pane-head">
              <span>01 / SOURCE COPY</span>
              <span className={copy.length > 900 ? 'counter-danger' : 'counter-normal'}>
                EN · {copy.length}/900
              </span>
            </div>
            <label className="sr-only" htmlFor="source-copy-input">
              Original English copy to adapt
            </label>
            <textarea
              id="source-copy-input"
              maxLength={900}
              value={copy}
              onChange={(e) => setCopy(e.target.value)}
              placeholder="Paste or write English copy containing a cultural reference..."
              disabled={loading}
            />

            {errorMessage && (
              <div className="error-banner" role="alert">
                <AlertTriangle size={15} />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="button"
              className="run-button"
              onClick={handleTranscreate}
              disabled={loading || !copy.trim()}
            >
              {loading ? (
                <>
                  <Activity size={17} className="spin" />
                  <span>ANALYZING WITH QLOO...</span>
                </>
              ) : (
                <>
                  <span className="button-label">
                    <FileSearch size={17} /> TRANSCREATE COPY
                  </span>
                  <ArrowUpRight size={17} />
                </>
              )}
            </button>
          </div>

          {/* Column 2: Proof Pane */}
          <div className={`pane proof-pane ${activeTab === 'proof' ? 'mobile-visible' : 'mobile-hidden'}`}>
            <div className="pane-head">
              <span>02 / EDITORIAL PROOF SHEET</span>
              {result && (
                <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                  <span className={`status-tag ${result.mode === 'live' ? 'status-live' : 'status-sample'}`}>
                    {result.mode === 'live' ? 'LIVE QLOO' : 'SAMPLE DATA'}
                  </span>
                  <span className={`status-tag ${result.verified ? 'status-verified' : 'status-unverified'}`}>
                    {result.verified ? '✓ VERIFIED REWRITE' : 'UNVERIFIED'}
                  </span>
                </div>
              )}
            </div>

            <div className="proof-content">
              {!result && !loading && (
                <div className="proof-empty">
                  <p className="proof-placeholder">
                    Your edited copy will appear here with active proof marks.
                    Swapped references will be struck through in red, with verified replacements underlined in evidence green.
                  </p>
                  <p className="note">Select a preset above and click "TRANSCREATE COPY" to begin.</p>
                </div>
              )}

              {loading && (
                <div className="proof-loading">
                  <Activity size={24} className="spin" />
                  <p>Resolving cultural references against Qloo cultural intelligence graph...</p>
                </div>
              )}

              {result && !loading && (
                <>
                  <div className="proof-copy-view">
                    {result.edits.map((span, idx) => {
                      if (span.type === 'swapped') {
                        const isSelected = selectedRefId === span.referenceId;
                        return (
                          <span
                            key={idx}
                            className={`mark-swap ${isSelected ? 'selected' : ''}`}
                            onClick={() => {
                              if (span.referenceId) setSelectedRefId(span.referenceId);
                            }}
                            title="Click to view Qloo evidence receipt"
                          >
                            <del>{span.originalText}</del>
                            <ins>{span.replacementText}</ins>
                            <span className="stamp">SWAPPED</span>
                          </span>
                        );
                      }
                      if (span.type === 'kept') {
                        const isSelected = selectedRefId === span.referenceId;
                        return (
                          <span
                            key={idx}
                            className={`mark-kept ${isSelected ? 'selected' : ''}`}
                            onClick={() => {
                              if (span.referenceId) setSelectedRefId(span.referenceId);
                            }}
                            title="Click to view keep-original rationale"
                          >
                            <strong>{span.originalText}</strong>
                            <span className="stamp-kept">KEPT</span>
                          </span>
                        );
                      }
                      if (span.type === 'unresolved') {
                        return (
                          <span key={idx} className="mark-unresolved">
                            <em>{span.originalText}</em>
                            <span className="stamp-unresolved">UNRESOLVED</span>
                          </span>
                        );
                      }
                      return <span key={idx}>{span.originalText}</span>;
                    })}
                  </div>

                  <div className="proof-footer">
                    <button type="button" className="copy-button" onClick={handleCopyFinal}>
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      <span>{copied ? 'COPIED TO CLIPBOARD' : 'COPY FINAL TEXT'}</span>
                    </button>
                    <span className="latency-label">
                      Executed in {result.executionTimeMs}ms · {result.retryCount} retries
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Column 3: Evidence Ledger */}
          <aside className={`pane ledger-pane ${activeTab === 'receipts' ? 'mobile-visible' : 'mobile-hidden'}`}>
            <div className="pane-head">
              <span>03 / EVIDENCE LEDGER</span>
              <ShieldCheck size={16} />
            </div>

            {!result && (
              <div className="empty-ledger">
                <FileSearch size={28} />
                <strong>No receipts yet.</strong>
                <p>
                  Every proposed edit produces an immutable evidence receipt linking server observations,
                  Qloo affinity scores, and agent reasoning.
                </p>
              </div>
            )}

            {result && result.receipts.length === 0 && (
              <div className="empty-ledger">
                <ShieldCheck size={28} />
                <strong>Original copy retained.</strong>
                <p>No supported cultural references were found in the text, so no changes were made.</p>
              </div>
            )}

            {result && result.receipts.length > 0 && activeReceipt && (
              <div className="receipt-view">
                {/* Reference Picker if multiple references */}
                {result.receipts.length > 1 && (
                  <div className="receipt-picker">
                    {result.receipts.map((r, i) => (
                      <button
                        key={i}
                        type="button"
                        className={`receipt-tab ${r.referenceId === activeReceipt.referenceId ? 'active' : ''}`}
                        onClick={() => setSelectedRefId(r.referenceId)}
                      >
                        {r.originalReference}
                      </button>
                    ))}
                  </div>
                )}

                {/* Receipt Card */}
                <div className="receipt-card">
                  <div className="receipt-header">
                    <div>
                      <span className="receipt-ref-label">TARGET REFERENCE</span>
                      <h3>{activeReceipt.originalReference}</h3>
                    </div>
                    <span className={`decision-badge badge-${activeReceipt.action}`}>
                      {activeReceipt.action.toUpperCase()}
                    </span>
                  </div>

                  {activeReceipt.chosenReplacement && (
                    <div className="replacement-box">
                      <span className="subhead">PROPOSED REPLACEMENT</span>
                      <h4>{activeReceipt.chosenReplacement}</h4>
                    </div>
                  )}

                  {/* Block 1: Qloo Observation */}
                  <div className="receipt-section observation-section">
                    <div className="section-title">
                      <Layers size={14} />
                      <span>QLOO CULTURAL INTELLIGENCE OBSERVATION</span>
                    </div>

                    {activeReceipt.qlooObservation ? (
                      <div className="obs-details">
                        <div className="obs-meta-row">
                          <span>Observation ID:</span>
                          <code>{activeReceipt.qlooObservation.observationId}</code>
                        </div>
                        <div className="obs-meta-row">
                          <span>Endpoint:</span>
                          <code>{activeReceipt.qlooObservation.endpoint}</code>
                        </div>
                        {activeReceipt.qlooObservation.affinity !== undefined && (
                          <div className="obs-metric">
                            <div className="metric-header">
                              <span>Audience Affinity Index:</span>
                              <strong>{(activeReceipt.qlooObservation.affinity * 100).toFixed(0)}%</strong>
                            </div>
                            <div className="metric-bar-bg">
                              <div
                                className="metric-bar-fill"
                                style={{ width: `${Math.round(activeReceipt.qlooObservation.affinity * 100)}%` }}
                              />
                            </div>
                          </div>
                        )}
                        <span className={`provenance-tag ${activeReceipt.qlooObservation.isSynthetic ? 'tag-synthetic' : 'tag-live'}`}>
                          {activeReceipt.qlooObservation.isSynthetic
                            ? 'SYNTHETIC FIXTURE — OFFLINE MODE'
                            : 'LIVE QLOO API DATA'}
                        </span>
                      </div>
                    ) : (
                      <p className="no-obs-note">No server-side observation linked.</p>
                    )}
                  </div>

                  {/* Block 2: Model Interpretation */}
                  <div className="receipt-section model-section">
                    <div className="section-title">
                      <Sparkles size={14} />
                      <span>MODEL INTERPRETATION (NON-API)</span>
                    </div>
                    <p className="interpretation-text">{activeReceipt.modelInterpretation}</p>
                  </div>

                  {/* Block 3: Decision & Limits */}
                  <div className="receipt-section decision-section">
                    <div className="section-title">
                      <ShieldCheck size={14} />
                      <span>EDITORIAL REASON & POLICY</span>
                    </div>
                    <p className="reason-text">{activeReceipt.decisionReason}</p>
                    <p className="limits-text">{activeReceipt.limitations}</p>
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div>

        {/* Execution Trace Drawer */}
        <section className={`trace-section ${traceExpanded ? 'expanded' : 'collapsed'}`}>
          <div
            className="trace-header"
            onClick={() => setTraceExpanded(!traceExpanded)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') setTraceExpanded(!traceExpanded);
            }}
          >
            <div className="trace-header-left">
              <Activity size={16} />
              <span>EXECUTION TRACE</span>
              <span className="trace-count">{result ? `${result.trace.length} EVENTS` : '0 EVENTS'}</span>
            </div>
            <button
              type="button"
              className="trace-toggle-btn"
              aria-label={traceExpanded ? 'Collapse trace' : 'Expand trace'}
            >
              {traceExpanded ? <ChevronDown size={17} /> : <ChevronUp size={17} />}
            </button>
          </div>

          {traceExpanded && (
            <div className="trace-body">
              {!result && <p className="trace-idle">No events recorded yet. Run a transcreation to inspect the agent pipeline.</p>}

              {result && (
                <ol className="trace-timeline">
                  {result.trace.map((evt) => (
                    <li key={evt.id} className={`trace-event status-${evt.status}`}>
                      <div className="event-meta">
                        <span className="event-stage">{evt.stage.toUpperCase()}</span>
                        <span className="event-time">{evt.timestamp.slice(11, 19)}</span>
                        {evt.durationMs !== undefined && (
                          <span className="event-duration">+{evt.durationMs}ms</span>
                        )}
                      </div>
                      <p className="event-message">{evt.message}</p>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
        </section>
      </section>

      {/* Footer */}
      <footer>
        <div className="footer-left">
          <span>TRANSCREATE / CULTURAL COPY EDITING STUDIO</span>
          <span>BUILT FOR QLOO AGENTIC HACKATHON 2026</span>
        </div>
        <div className="footer-right">
          <span>NO FORCED SWAPS. NO INVENTED EVIDENCE.</span>
          <span>OPEN-SOURCE MIT LICENSE</span>
        </div>
      </footer>
    </main>
  );
}
