import { useEffect, useState } from 'react';
import { ArrowUpRight, FileSearch, ScanText, ShieldCheck, Activity } from 'lucide-react';

type Health = { mode?: string; qlooOk?: boolean; llmOk?: boolean };

export default function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [copy, setCopy] = useState('Our new campaign is the Friends reunion of productivity apps.');
  const [market, setMarket] = useState('Mumbai');
  const [status, setStatus] = useState('Starter scaffold — live workflow not implemented yet.');

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.ok ? r.json() : Promise.reject(new Error('Health endpoint unavailable')))
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  const mode = health?.mode === 'live' && health.qlooOk ? 'LIVE CHECKED' : 'SAMPLE / NOT VERIFIED';

  return (
    <main className="shell">
      <nav className="topbar">
        <a className="wordmark" href="/" aria-label="Transcreate home">TRANSCREATE<span>®</span></a>
        <div className="topbar-right"><span className="mode"><i />{mode}</span><span className="issue">ISSUE 001 / CULTURAL EDITING</span></div>
      </nav>

      <section className="hero">
        <p className="eyebrow"><span>THE CULTURAL COPY DESK</span><span>01 — 04</span></p>
        <h1>Make the<br /><em>reference</em> land.</h1>
        <div className="hero-bottom">
          <p>Adapt existing copy to a new cultural context—with evidence behind every edit.</p>
          <a className="text-link" href="#studio">OPEN THE STUDIO <ArrowUpRight size={17} /></a>
        </div>
        <div className="hero-mark" aria-hidden="true">T<span>.</span></div>
      </section>

      <section className="studio" id="studio">
        <div className="section-head">
          <div><p className="eyebrow">WORKSPACE / 001</p><h2>The proof sheet</h2></div>
          <span className="step-label"><ScanText size={15} /> EDITORIAL MODE</span>
        </div>

        <div className="controls">
          <label htmlFor="market">TARGET MARKET</label>
          <select id="market" value={market} onChange={(e) => setMarket(e.target.value)}>
            <option>Mumbai</option><option>Bengaluru</option><option>New York</option>
          </select>
          <span className="controls-note">Presets are illustrative until verified against live Qloo operations.</span>
        </div>

        <div className="work-grid">
          <div className="pane source-pane">
            <div className="pane-head"><span>01 / SOURCE</span><span>EN · {copy.length}/900</span></div>
            <label className="sr-only" htmlFor="source-copy">Original copy</label>
            <textarea id="source-copy" maxLength={900} value={copy} onChange={(e) => setCopy(e.target.value)} />
            <button className="run-button" onClick={() => setStatus('This scaffold does not run localization yet. Implement and verify the server-side Qloo adapter first.')}><FileSearch size={17} /> TRANSCREATE <ArrowUpRight size={17} /></button>
          </div>
          <div className="pane proof-pane">
            <div className="pane-head"><span>02 / PROOF</span><span>NOT YET RUN</span></div>
            <p className="proof-copy">Your edited copy will appear here, with clear marks for <del>references to change</del> <ins>verified replacements</ins>.</p>
            <p className="note">Illustrative styling only. No recommendation has been generated.</p>
          </div>
          <aside className="ledger">
            <div className="pane-head"><span>03 / EVIDENCE LEDGER</span><ShieldCheck size={16} /></div>
            <div className="empty-ledger"><FileSearch size={24} /><strong>No receipts yet.</strong><p>Qloo observations will appear here only after a real API response.</p></div>
          </aside>
        </div>

        <div className="trace">
          <div className="trace-title"><Activity size={16} /><span>EXECUTION TRACE</span><span className="trace-count">0 EVENTS</span></div>
          <p>{status}</p>
        </div>
      </section>

      <footer><span>TRANSCREATE / BUILT FOR CULTURAL CONTEXT</span><span>NO FORCED SWAPS. NO INVENTED EVIDENCE.</span></footer>
    </main>
  );
}
