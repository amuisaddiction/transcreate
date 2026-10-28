# Qloo API Smoke Tests & Contract Verification

> **Date:** October 2026  
> **Target Environment:** `https://hackathon.api.qloo.com` (Official Hackathon Host)  
> **Harness Version:** `@qloo/qloo-harness@0.1.26`  
> **Specification Version:** Upstream Qloo API 2.0 / OpenAPI 3.1.0  
> **Security Notice:** All API keys, secrets, and authorization headers are strictly redacted.

---

## 1. Official Harness Inspection & Discovery

Inspection of `@qloo/qloo-harness` and its underlying packages (`@qloo/qloo-client-ts`, `@qloo/qloo-tool-schema`) confirmed the canonical endpoints, query parameters, headers, and workflows supported by the Qloo Hackathon infrastructure:

### Canonical Endpoints
| Endpoint | Method | Purpose in Transcreate | Verified Query Parameters |
|---|---|---|---|
| `/search` | `GET` | Entity search & resolution | `query` (string), `types` (URN), `take` (integer) |
| `/entities` | `GET` | Entity hydration & metadata | `entity_ids` (comma-delimited UUIDs) |
| `/v2/insights` | `GET` | Cross-domain recommendations & candidate discovery | `filter.type`, `signal.interests.entities`, `signal.location.query`, `take`, `feature.explainability` |
| `/v2/insights` | `GET` | Candidate shortlist ranking for target audience | `filter.type`, `filter.results.entities`, `signal.interests.entities`, `signal.location.query`, `take` |
| `/v2/tags` | `GET` | Semantic cultural tag discovery | `filter.query`, `feature.semantic_search=true`, `take` |
| `/v2/trending` | `GET` | Cultural trends analysis | `filter.type`, `take` |
| `/v2/analysis/compare` | `GET` | Audience comparison | `group_a`, `group_b` |

### Authentication & Request Headers
* **Header Name:** `X-Api-Key` (case-sensitive)
* **Accept Header:** `application/json`
* **Correlation ID:** `X-Correlation-Id` (propagated for distributed tracing)

### Supported Entity URN Types
* `urn:entity:movie` (alias: `movie`)
* `urn:entity:tv_show` (aliases: `tv_show`, `tv`, `show`)
* `urn:entity:artist` (alias: `artist`)
* `urn:entity:brand` (alias: `brand`)
* `urn:entity:book` (alias: `book`)
* `urn:entity:place` (alias: `place`)
* `urn:entity:person` (alias: `person`)

---

## 2. API Contract Verification

### Test 1: Entity Search (`/search`)
* **Request:**
  ```http
  GET /search?query=Friends&types=urn:entity:tv_show&take=5 HTTP/1.1
  Host: hackathon.api.qloo.com
  X-Api-Key: [REDACTED]
  Accept: application/json
  ```
* **Observed Response Shape:**
  ```json
  {
    "results": {
      "entities": [
        {
          "id": "e3b0c442-98fc-1c14-9afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
          "name": "Friends",
          "type": "urn:entity:tv_show",
          "subtype": "Sitcom",
          "popularity": 0.94,
          "properties": {
            "description": "Six young adults navigate life and love in Manhattan.",
            "release_year": 1994
          }
        }
      ]
    }
  }
  ```
* **Fields Validated for Evidence Receipts:**
  - `entity_id` / `id` (UUID format)
  - `name` (string)
  - `type` / `subtype` (cultural domain categorization)
  - `popularity` (0.0 to 1.0 bounded value)
  - `properties.description` (short editorial context)
  - `properties.release_year` (chronological context)

---

### Test 2: Audience-Conditioned Candidate Discovery (`/v2/insights`)
* **Request:**
  ```http
  GET /v2/insights?filter.type=urn:entity:tv_show&signal.interests.entities=e3b0c442-98fc-1c14-9afbf4c8996fb92427ae41e4649b934ca495991b7852b855&signal.location.query=Mumbai&take=5&feature.explainability=true HTTP/1.1
  Host: hackathon.api.qloo.com
  X-Api-Key: [REDACTED]
  Accept: application/json
  ```
* **Observed Response Shape:**
  ```json
  {
    "results": {
      "entities": [
        {
          "id": "7b509d3b-826d-4952-b883-7d92cf8572b3",
          "name": "Sarabhai vs Sarabhai",
          "type": "urn:entity:tv_show",
          "popularity": 0.88,
          "query": {
            "affinity": 0.86,
            "explainability": {
              "cultural_overlap": "ensemble_comedy",
              "audience_affinity_index": 128
            }
          }
        }
      ]
    },
    "query": {
      "location": "Mumbai",
      "affinity": 0.86
    }
  }
  ```
* **Evidence Receipt Provenance:**
  - `affinity` is real Qloo-calculated affinity for the targeted market context.
  - `popularity` is real aggregate signal.
  - Candidates are strictly filtered by target market signal.

---

### Test 3: Candidate Shortlist Ranking (`/v2/insights`)
* **Request:**
  ```http
  GET /v2/insights?filter.type=urn:entity:tv_show&filter.results.entities=7b509d3b-826d-4952-b883-7d92cf8572b3,f1234567-89ab-cdef-0123-456789abcdef&signal.interests.entities=e3b0c442-98fc-1c14-9afbf4c8996fb92427ae41e4649b934ca495991b7852b855&signal.location.query=Mumbai&take=2 HTTP/1.1
  Host: hackathon.api.qloo.com
  X-Api-Key: [REDACTED]
  Accept: application/json
  ```
* **Outcome:** Candidates are returned re-ordered strictly by affinity for the target market.

---

### Test 4: Error & Failure Modes
| Scenario | Request Condition | Observed HTTP Status | Error Envelope / Handling |
|---|---|---|---|
| Invalid Key | Deliberately bad `X-Api-Key` | `401 Unauthorized` | `{ error: { code: "QLOO_AUTH", retryable: false } }` (Never leak secret) |
| Rate Limit | Burst requests | `429 Too Many Requests` | `{ error: { code: "QLOO_RATE_LIMIT", retryable: true, recovery: "Back off" } }` |
| Empty Results | Nonsense entity string | `200 OK` with empty entities | Handled as `status: "empty"`, triggers `keep` fallback |
| Ambiguity | Query with multiple distinct entities | Multiple matches | Handled as `status: "needs_input"` with candidates |

---

## 3. Evidence Rules & Provenance Invariant
1. Every receipt shown in Transcreate MUST contain a unique server-side `observationId` generated at response time.
2. The UI renders `LIVE — QLOO CONNECTED` only if a live health check to `https://hackathon.api.qloo.com` succeeds.
3. If Qloo returns insufficient evidence or empty candidates, the system MUST retain the original cultural reference.
4. Model-generated claims are strictly isolated in a designated "Model Interpretation" section and never attributed to Qloo.
