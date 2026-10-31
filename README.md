# TRANSCREATE®

**An evidence-backed cultural editing studio powered by Qloo cultural intelligence and a self-checking verification agent.**

> *Make the reference land.*

---

## 1. What is Transcreate?

When marketing campaigns, startup launches, or creative copy expand into new markets, cultural references (such as movies, TV shows, artists, and brands) often lose their resonance or confuse local audiences. 

Traditional AI tools often either:
- Rewrite the entire text from scratch, losing voice and tone, or
- Hallucinate arbitrary cultural stereotypes without evidence.

**Transcreate** introduces an editorial approach called **The Proof Sheet**:
1. **Identifies** cultural references in existing English copy.
2. **Resolves** canonical entities against Qloo's cultural intelligence graph (`/search`).
3. **Discovers & Ranks** audience-conditioned alternatives using Qloo's Taste AI API (`/v2/insights`), filtering strictly by the target market.
4. **Constrains** agent decisions strictly to candidate IDs returned by Qloo—preventing fabricated replacements.
5. **Rewrites** only the necessary reference phrase while preserving original message and sentence structure.
6. **Verifies** the final rewrite with a self-checking guardrail that rejects unauthorized entities and retries within strict bounds.
7. **Issues Evidence Receipts** for every decision, strictly separating Qloo observation data from model interpretation.

---

## 2. Core Differentiators

* **Edits Existing Copy:** Preserves your brand voice, tone, and sentence structure rather than generating generic copy from scratch.
* **Separation of Evidence & Interpretation:** Qloo observations (affinity scores, popularity, endpoint requests) are isolated from AI-generated rationales.
* **Real "Keep Original" Path:** If Qloo returns weak or insufficient evidence (< 0.70 affinity), the original cultural reference is preserved.
* **Self-Checking Verification Loop:** Rewritten copy is deterministically checked against decisions. Hallucinated or rejected entities are automatically caught and retried.
* **Audience-Conditioned Taste Graph:** Queries Qloo `/v2/insights` with location queries (e.g. Mumbai, Bengaluru, London, New York) to rank culturally resonant alternatives.
* **Honest Operating Modes:**
  - `LIVE — QLOO CONNECTED`: Active only when a verified server-side check to `https://hackathon.api.qloo.com` succeeds.
  - `SAMPLE — NOT QLOO DATA`: Clear label and synthetic provenance tags when operating in offline/development mode.

---

## 3. End-to-End Walkthrough Example

### Input Copy
```text
"Our new campaign is the Friends reunion of productivity apps."
Target Market: Mumbai
```

### Agent Pipeline & Trace
1. **Reference Extraction:** Extracts `"Friends"` (Type: `tv`).
2. **Entity Resolution:** Resolves to Qloo entity `Friends` (`urn:entity:tv_show`, Popularity: 0.94).
3. **Qloo Candidate Discovery (`/v2/insights`):**  
   Target: `urn:entity:tv_show` | Signal: `Friends` | Location: `Mumbai`  
   - `Sarabhai vs Sarabhai` (Affinity: 88%, Popularity: 85%)
   - `Taarak Mehta Ka Ooltah Chashmah` (Affinity: 81%, Popularity: 92%)
   - `Office Office` (Affinity: 74%, Popularity: 79%)
4. **Decision:** `SWAP` to `Sarabhai vs Sarabhai` (88% affinity in Mumbai; iconic urban ensemble comedy parallel).
5. **Rewrite:** `"Our new campaign is the Sarabhai vs Sarabhai reunion of productivity apps."`
6. **Verification:** Verified that `Sarabhai vs Sarabhai` is present, `Friends` was removed, and no rejected alternatives leaked.
7. **Evidence Receipt:** Generated with immutable server `observationId`, endpoint provenance, and affinity ledger.

---

## 4. Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                      React / Vite Client                    │
│      The Proof Sheet (Source Pane · Proof View · Ledger)     │
└──────────────────────────────┬──────────────────────────────┘
                               │ POST /api/localize
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Node.js / Express Server                    │
│   ├── Input Validation (Zod, <= 900 chars)                  │
│   ├── Provider LLM Adapter (Gemini / Structured JSON)       │
│   ├── Qloo Adapter (HttpQlooClient -> hackathon.api.qloo.com)│
│   ├── Deterministic Verification Engine (verifyRewrite)     │
│   └── Provenance Ledger Builder (server observation IDs)    │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Quick Start & Setup

### Prerequisites
- Node.js 20+ (tested on Node v20.11.0)
- npm

### Installation
```bash
# Clone the repository
git clone https://github.com/amuisaddiction/transcreate.git
cd transcreate

# Install dependencies
npm install

# Configure environment variables
cp server/.env.example server/.env
```

### Configuration (`server/.env`)
Edit `server/.env` to configure your keys (never commit this file):
```env
QLOO_API_KEY=your_qloo_hackathon_key_here
QLOO_BASE_URL=https://hackathon.api.qloo.com
LLM_PROVIDER=gemini
LLM_API_KEY=your_gemini_key_here
MODE=live
PORT=3001
```

> **Note:** If no `QLOO_API_KEY` is provided, Transcreate runs automatically in `SAMPLE` mode with built-in realistic fixtures, allowing developers and judges to test the complete workflow offline.

### Running Locally
```bash
# Start both client and server concurrently
npm run dev
```
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3001`

### Running Automated Tests
```bash
# Run all 14 automated unit and integration tests
npm test
```

### Production Build
```bash
npm run build
```

### Single-Service Production Deployment (e.g. Render, Railway)
Transcreate is configured as a unified single-service full-stack Node deployment. The Express backend serves the precompiled Vite React client from `client/dist`:

* **Build Command:** `npm install --include=dev && npm run build`
* **Start Command:** `npm start`
* **Root Directory on Render:** Leave blank (root-level monorepo)
* **Environment Variables:**
  - `PORT`: (Provided automatically by hosting provider; defaults to `3001` locally)
  - `QLOO_API_KEY`: Your official Qloo API key
  - `QLOO_BASE_URL`: `https://hackathon.api.qloo.com` (default)
  - `MODE`: `live` (or `sample` for offline judging demo)
  - `LLM_PROVIDER`: `gemini`
  - `LLM_API_KEY`: (Optional, when live LLM provider is enabled)

---

## 6. Security & Safe Data Handling

- **Server-Side API Key Storage:** `QLOO_API_KEY` is strictly held on the server and never exposed to the browser or prefixed with `VITE_`.
- **Git Protection:** `.env` and `server/.env` are ignored by `.gitignore`.
- **Secret Redaction:** All error handlers and trace logs redact authorization credentials and tokens.
- **Privacy First:** User copy is never sent in bulk to third-party scrapers. Only resolved entity strings and target locations are queried against Qloo.
- **No Individual Profiling:** Qloo affinity scores reflect aggregate cohort affinities, not personal surveillance data or individual claims.

---

## 7. Submission Checklist Verification

- [x] Functional web application with real Qloo API adapter.
- [x] Agentic workflow (Extraction → Resolution → Discovery → Ranking → Rewrite → Verification → Evidence).
- [x] Verifiable evidence provenance (server-issued observation IDs).
- [x] Automated test suite passing (14/14 tests pass).
- [x] MIT Open Source License included.
- [x] Responsive editorial design ("The Proof Sheet") with keyboard accessibility and reduced-motion support.
- [x] Clear documentation and smoke test reports.

---

## 8. License

Distributed under the **MIT License**. See `LICENSE` for details.
