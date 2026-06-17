# VentureAI — Development Plan

## Project Overview

VentureAI is a multi-agent AI investment committee built for a hackathon. A FastAPI backend coordinates 6 specialized AI agents through Band (band.ai) to evaluate startups and produce structured investment memos. Each agent calls the AIML API (Llama 3.1 70B) for inference and publishes/subscribes via a shared Band room.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python + FastAPI |
| Agent coordination | Band API (band.ai) |
| LLM inference | AIML API — `meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo` |
| Frontend | React + 21st.dev (teammate handles this) |

---

## Project Structure (target)

```
ventureai/
└── backend/
    ├── main.py                  ← FastAPI server
    ├── band_client.py           ← Band connection + messaging
    ├── mock_data.py             ← Airbnb mock outputs (dev fallback)
    ├── models.py                ← Pydantic data models
    ├── requirements.txt
    └── agents/
        ├── __init__.py
        ├── base_agent.py        ← Abstract base all agents inherit
        ├── sourcing.py          ← Agent 1: Sourcing
        ├── market.py            ← Agent 2: Market Research
        ├── founder.py           ← Agent 3: Founder Research
        ├── financial.py         ← Agent 4: Financial Analysis
        ├── devil.py             ← Agent 5: Devil's Advocate
        └── committee.py         ← Agent 6: Investment Committee
```

---

## What Is Already Built

| File | Status | Notes |
|---|---|---|
| `models.py` | ✅ Complete | All 6 Pydantic models defined with validation |
| `agents/base_agent.py` | ✅ Complete (1 bug) | Full base class — see bug note below |
| `agents/sourcing.py` | ✅ Complete | Agent 1 fully working |
| `band_client.py` | ✅ Complete | InMemoryBandClient ready; HttpPollingBandClient is a skeleton |
| `main.py` | ⚠️ Partial | REST + WebSocket endpoints exist but only SourcingAgent is wired |
| `mock_data.py` | ❌ Missing | — |
| `agents/market.py` | ❌ Missing | — |
| `agents/founder.py` | ❌ Missing | — |
| `agents/financial.py` | ❌ Missing | — |
| `agents/devil.py` | ❌ Missing | — |
| `agents/committee.py` | ❌ Missing | — |
| `requirements.txt` | ❌ Missing | — |

---

## Critical Bug — `call_llm` in `base_agent.py`

**Problem:** The AIML API returns responses in OpenAI chat completion format:
```json
{
  "choices": [
    { "message": { "content": "{ ...actual JSON from LLM... }" } }
  ]
}
```
The current `call_llm` does `json.loads(raw_http_body)` and returns the full envelope to the caller. SourcingAgent (and all future agents) then try to parse that envelope as a `StartupProfile`, fail, and always fall back to the minimal fallback. **The LLM is never actually used right now.**

**Fix (base_agent.py lines 91–103):** After parsing the envelope, extract `choices[0]["message"]["content"]`, then parse *that* string as JSON. Apply the same JSON-substring fallback extraction on the content string rather than the raw body.

**Also fix:** Default model is currently `meta-llama/Meta-Llama-3.1-13B-Instruct` — change to `meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo` per spec.

---

## Agent Pipeline

```
User Input
    │
    ▼
[1] SourcingAgent ──────────────────────► startup_profile (Band)
                                               │
                          ┌────────────────────┼────────────────────┐
                          ▼                    ▼                    ▼
              [2] MarketResearch     [3] FounderResearch    [4] FinancialAgent
               market_analysis        founder_analysis       financial_analysis
                (Band)                    (Band)                  (Band)
                          └────────────────────┼────────────────────┘
                                               ▼
                                   [5] DevilsAdvocateAgent
                                        bear_case (Band)
                                               │
                                               ▼
                                   [6] InvestmentCommitteeAgent
                                      investment_memo (Band)
```

- Agents 2, 3, 4 run **in parallel** (all depend only on `startup_profile`)
- Agent 5 depends on outputs of 2, 3, 4
- Agent 6 depends on all outputs

---

## Data Models (already in `models.py`)

### `StartupProfile` — output of Agent 1
Fields: `company_name`, `one_liner`, `stage`, `industry`, `founders` (list), `funding_history` (list), `location`, `website`, `raw_description`, `score` (0–100), `summary`

### `MarketAnalysis` — output of Agent 2
Fields: `tam`, `market_growth`, `timing_verdict`, `competitors` (list), `differentiation`, `market_score` (0–100), `key_risks` (list), `summary`

### `FounderAnalysis` — output of Agent 3
Fields: `founders` (list of dicts: name/background/domain_expertise/red_flags), `team_completeness`, `prior_exits` (bool), `founder_score` (0–100), `summary`

### `FinancialAnalysis` — output of Agent 4
Fields: `revenue_model`, `unit_economics` (dict), `raise_amount`, `burn_assessment`, `path_to_profitability`, `financial_score` (0–100), `red_flags` (list), `summary`

### `BearCase` — output of Agent 5
Fields: `market_challenges` (list), `founder_challenges` (list), `financial_challenges` (list), `failure_modes` (list), `bear_case_score` (0–100), `summary`

### `InvestmentMemo` — output of Agent 6
Fields: `verdict` (PASS/INVEST/WATCH), `confidence_score`, `executive_summary`, `market_score`, `founder_score`, `financial_score`, `bear_case_score`, `overall_score`, `recommendation`, `due_diligence_questions` (list), `suggested_valuation_range`, `summary`

---

## Build Steps

### Step 0 — Fix `base_agent.py`

**File:** `ventureai/backend/agents/base_agent.py`

1. In `call_llm`, after `json.loads(text)` (the raw HTTP body), extract the LLM content string from `envelope["choices"][0]["message"]["content"]`
2. Parse *that content string* as JSON — return the result
3. If content string isn't valid JSON, apply the `text.find("{")` / `text.rfind("}")` extraction on the content string
4. Change the default model string from `meta-llama/Meta-Llama-3.1-13B-Instruct` → `meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo`

No other changes to base_agent.py needed.

---

### Step 1 — `mock_data.py`

**File:** `ventureai/backend/mock_data.py`

Create hardcoded Airbnb-based instances of `MarketAnalysis`, `FounderAnalysis`, and `FinancialAnalysis`. These serve as fallback data when an agent's LLM call fails, and also let devil.py and committee.py be developed/tested independently.

```python
from ventureai.backend.models import MarketAnalysis, FounderAnalysis, FinancialAnalysis

MOCK_MARKET_ANALYSIS = MarketAnalysis(
    tam="$1.2T global travel and accommodation market",
    market_growth="~7% CAGR through 2030",
    timing_verdict="Strong — post-pandemic travel rebound, remote work driving longer stays",
    competitors=["Hotels.com", "VRBO", "Booking.com", "traditional hotels"],
    differentiation="Peer-to-peer marketplace with trust/review layer; unique inventory unavailable elsewhere",
    market_score=85,
    key_risks=["Regulatory backlash in major cities", "Host supply concentration risk", "Commoditization pressure"],
    summary="Large and growing market with Airbnb commanding significant mindshare. Regulatory headwinds are real but manageable."
)

MOCK_FOUNDER_ANALYSIS = FounderAnalysis(
    founders=[
        {"name": "Brian Chesky", "background": "Industrial design, RISD grad", "domain_expertise": "Product design, brand building", "red_flags": "No prior hospitality or marketplace experience at founding"},
        {"name": "Joe Gebbia", "background": "Graphic design, RISD grad", "domain_expertise": "Design, growth hacking", "red_flags": "None significant"},
        {"name": "Nathan Blecharczyk", "background": "Computer science, Harvard", "domain_expertise": "Engineering, technical architecture", "red_flags": "None significant"},
    ],
    team_completeness="Strong — design + technical + hustle covered from day one",
    prior_exits=False,
    founder_score=88,
    summary="Scrappy, design-led founding team with complementary skills. No prior exits but demonstrated extreme resilience (Obama O's/Cap'n McCain's)."
)

MOCK_FINANCIAL_ANALYSIS = FinancialAnalysis(
    revenue_model="Commission — ~3% from hosts, ~14.2% from guests on each booking",
    unit_economics={"take_rate": "17%", "cac": "low (organic/viral growth)", "ltv": "high (repeat bookings)", "gross_margin": "~75%"},
    raise_amount="$600K seed (Y Combinator + angels)",
    burn_assessment="Lean — founders deferred salaries, creative bootstrapping tactics",
    path_to_profitability="Clear — marketplace model scales with minimal incremental cost per transaction",
    financial_score=82,
    red_flags=["Heavy dependence on Stripe for payments", "Trust/safety incidents could spike cost of insurance"],
    summary="Strong unit economics with high gross margins and viral acquisition. Classic marketplace flywheel with a credible path to profitability."
)
```

---

### Step 2 — `agents/market.py` — MarketResearchAgent

**File:** `ventureai/backend/agents/market.py`

Pattern: identical to `sourcing.py` — inherit `BaseAgent`, implement `process(profile: StartupProfile, session_id: str) -> MarketAnalysis`.

**System prompt:**
> "You are a senior market research analyst at a top-tier VC firm. Analyze the startup's market opportunity. Research TAM, market growth rate, competitive landscape, timing, and differentiation. Be precise and cite specific numbers where possible."

**User prompt:** Inject `profile.dict()` as JSON, then instruct the model to return only valid JSON matching `MarketAnalysis` fields: `tam`, `market_growth`, `timing_verdict`, `competitors` (list), `differentiation`, `market_score` (0–100), `key_risks` (list), `summary`.

**On success:** Publish to Band with `message_type="market_analysis"`, include `session_id` in payload.

**On failure:** Log exception, publish `mock_data.MOCK_MARKET_ANALYSIS` (with session_id injected) and return it.

---

### Step 3 — `agents/founder.py` — FounderResearchAgent

**File:** `ventureai/backend/agents/founder.py`

Same pattern as market.py.

**System prompt:**
> "You are a VC partner specializing in founder diligence. Evaluate the founding team based on the startup profile. Assess backgrounds, domain expertise, team completeness, and any red flags. Each founder should be analyzed individually."

**User prompt:** Inject `profile.dict()` as JSON, instruct to return only valid JSON matching `FounderAnalysis` fields: `founders` (list of dicts with name/background/domain_expertise/red_flags), `team_completeness`, `prior_exits` (bool), `founder_score` (0–100), `summary`.

**On failure:** Fall back to `mock_data.MOCK_FOUNDER_ANALYSIS`.

Publishes `message_type="founder_analysis"`.

---

### Step 4 — `agents/financial.py` — FinancialAgent

**File:** `ventureai/backend/agents/financial.py`

Same pattern.

**System prompt:**
> "You are a VC financial analyst. Evaluate this startup's business model and financial prospects. Assess revenue model viability, unit economics, funding needs, burn rate, and path to profitability. Identify any financial red flags."

**User prompt:** Inject `profile.dict()` as JSON, instruct to return only valid JSON matching `FinancialAnalysis` fields: `revenue_model`, `unit_economics` (dict), `raise_amount`, `burn_assessment`, `path_to_profitability`, `financial_score` (0–100), `red_flags` (list), `summary`.

**On failure:** Fall back to `mock_data.MOCK_FINANCIAL_ANALYSIS`.

Publishes `message_type="financial_analysis"`.

---

### Step 5 — `agents/devil.py` — DevilsAdvocateAgent

**File:** `ventureai/backend/agents/devil.py`

**Input:** `market: MarketAnalysis`, `founders: FounderAnalysis`, `financial: FinancialAnalysis`, `session_id: str`

**System prompt:**
> "You are a skeptical VC partner. Your job is to challenge every positive finding and steelman the bear case. Be specific and harsh. Find the real risks that the other analysts missed or downplayed."

**User prompt:** Serialize all three inputs to JSON, inject into prompt. Instruct to return only valid JSON matching `BearCase` fields: `market_challenges` (list), `founder_challenges` (list), `financial_challenges` (list), `failure_modes` (list), `bear_case_score` (0–100, where 100 = company definitely fails), `summary`.

**On failure:** Return a minimal `BearCase` with generic risk language and `bear_case_score=50`.

Publishes `message_type="bear_case"`.

---

### Step 6 — `agents/committee.py` — InvestmentCommitteeAgent

**File:** `ventureai/backend/agents/committee.py`

**Input:** `profile: StartupProfile`, `market: MarketAnalysis`, `founders: FounderAnalysis`, `financial: FinancialAnalysis`, `bear_case: BearCase`, `session_id: str`

**System prompt:**
> "You are a senior VC investment committee member. You have received research from four specialist analysts. Synthesize all findings and produce a final, structured investment recommendation. Be decisive. Your verdict must be one of: INVEST, WATCH, or PASS."

**User prompt:** Serialize all 5 inputs to JSON, inject into prompt. Instruct to return only valid JSON matching `InvestmentMemo` fields: `verdict` (PASS/INVEST/WATCH), `confidence_score` (0–100), `executive_summary`, `market_score`, `founder_score`, `financial_score`, `bear_case_score`, `overall_score`, `recommendation`, `due_diligence_questions` (list), `suggested_valuation_range`, `summary`.

**On failure:** Return a minimal `InvestmentMemo(verdict="WATCH", confidence_score=0, ...)`.

Publishes `message_type="investment_memo"`. This is the final output stored in `MEMOS[session_id]`.

---

### Step 7 — Update `main.py`

**File:** `ventureai/backend/main.py`

#### 7a — Add agent imports
Import all 6 agent classes at the top alongside `SourcingAgent`.

#### 7b — Instantiate agents at startup
In the `startup_event` handler (or as module-level globals), create one shared instance of each agent. They are stateless per `process()` call so sharing is safe:

```python
sourcing_agent = SourcingAgent(name="sourcing", role="sourcing", api_key=..., band_api_key=...)
market_agent   = MarketResearchAgent(name="market", role="market_research", ...)
founder_agent  = FounderResearchAgent(name="founder", role="founder_research", ...)
financial_agent = FinancialAgent(name="financial", role="financial_analysis", ...)
devil_agent    = DevilsAdvocateAgent(name="devil", role="devils_advocate", ...)
committee_agent = InvestmentCommitteeAgent(name="committee", role="investment_committee", ...)
```

Connect each to `band_client` in `startup_event`.

#### 7c — Add `run_pipeline()` coroutine

```python
async def run_pipeline(raw_input: str, session_id: str):
    try:
        # Stage 1
        profile = await sourcing_agent.process(raw_input, session_id=session_id)

        # Stage 2 — parallel
        market, founders, financial = await asyncio.gather(
            market_agent.process(profile, session_id=session_id),
            founder_agent.process(profile, session_id=session_id),
            financial_agent.process(profile, session_id=session_id),
        )

        # Stage 3
        bear_case = await devil_agent.process(market, founders, financial, session_id=session_id)

        # Stage 4
        await committee_agent.process(profile, market, founders, financial, bear_case, session_id=session_id)

    except Exception:
        logger.exception("Pipeline failed for session %s", session_id)
```

#### 7d — Update `/evaluate` endpoint

Replace the current `asyncio.create_task(agent.process(...))` (sourcing-only) with:

```python
asyncio.create_task(run_pipeline(raw_input, session_id))
```

Remove the per-request agent instantiation — use the shared startup instances instead.

The waiter/timeout logic (5s wait for first message) can stay as-is.

---

### Step 8 — `requirements.txt`

**File:** `ventureai/backend/requirements.txt`

```
fastapi
uvicorn[standard]
aiohttp
pydantic
certifi
python-dotenv
```

---

## API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/evaluate` | POST | Start pipeline. Body: `{"input": "..."}`. Returns `{"session_id": "..."}` |
| `/status/{session_id}` | GET | All Band messages so far for this session |
| `/memo/{session_id}` | GET | Final `InvestmentMemo` or 404 if not ready |
| `/ws/{session_id}` | WebSocket | Streams live agent messages to frontend |

---

## Environment Variables

| Variable | Default | Required |
|---|---|---|
| `AIML_API_KEY` | — | ✅ Yes |
| `AIML_API_URL` | `https://api.aimlapi.com/v1/chat/completions` | No |
| `AIML_MODEL` | `meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo` | No |
| `BAND_API_KEY` | — | For real Band; not needed for InMemoryBandClient |
| `ROOM_ID` | `default` | No |

---

## Important Implementation Notes

1. **All LLM responses must be pure JSON** — every system prompt must end with "Return ONLY valid JSON. No markdown, no preamble, no explanation."
2. **Every agent must have a fallback** — if LLM call or JSON parsing fails, publish mock data and return it. Pipeline must not crash.
3. **session_id must flow through everything** — every payload published to Band must include `session_id` so `_on_band_message` can route it to the right session store and WebSocket clients.
4. **Use `async/await` throughout** — all FastAPI endpoints and agent methods are async for compatibility.
5. **Agents 2/3/4 run in parallel via `asyncio.gather`** — this cuts wall-clock time roughly 3x for the research stage.
6. **The WebSocket is critical for the demo** — every `publish_to_band` call already triggers `_on_band_message` → WebSocket broadcast. No extra wiring needed as long as `session_id` is in every payload.

---

## Verification Checklist

- [ ] `uvicorn ventureai.backend.main:app --reload` starts without errors
- [ ] `POST /evaluate` with `{"input": "Airbnb is a peer-to-peer home rental marketplace..."}` returns a `session_id`
- [ ] `GET /status/{session_id}` shows 6 agent messages (startup_profile, market_analysis, founder_analysis, financial_analysis, bear_case, investment_memo)
- [ ] `GET /memo/{session_id}` returns a valid `InvestmentMemo` with a non-null `verdict`
- [ ] WebSocket `/ws/{session_id}` receives all 6 messages as they stream in
- [ ] If `AIML_API_KEY` is invalid, pipeline still completes using mock_data fallbacks
