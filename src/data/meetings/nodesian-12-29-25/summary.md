# Nodesian Strategy & Equity Discussion — Meeting Summary (Revised for Accuracy)

**Date:** December 29, 2025  
**Participants:** Luis Cisneros, Spencer Wozniak  
**Context:** Pre-seed company evaluating technical direction, enterprise readiness, and Spencer's potential equity-based role.

---

## I. Technical Vision

### 1. Core Architectural Thesis

- **Nodesian is not positioning itself as a full EHR**, nor as a traditional EHR integrator.
- Instead, Nodesian is building a **Patient Knowledge Graph (PKG) as the authoritative source of truth**, while delivering value to clinicians through **extensions / co-pilots embedded in existing EHRs**.
- Rationale:
  - Avoids regulatory, security, and certification burdens of being an EHR.
  - Avoids brittle, one-off integrations with thousands of EHR vendors.
  - Aligns with enterprise IT reality and VC feedback: _integration at the interface, independence at the data layer_.

### 2. Proprietary Knowledge Graph (PKG)

- The **PKG is the core asset**, implemented in Neo4j as a temporal, multi-layered graph.
- Represents:
  - Clinical events
  - Medications and their clinical intent
  - Financial transactions and coverage
  - Source documents with provenance
- Serves as a **longitudinal, causally ordered record** rather than a static chart.
- Key clarification:
  - Neo4j is the **system of record** for relationships and temporal structure.
  - ML models (e.g., MRFs, DAG-based inference) **operate on the graph**, but are not the graph itself.
- Central claim (unchanged but sharpened):  
  _Whoever controls the patient-level longitudinal graph controls the supply chain for downstream reasoning._

### 3. Strategic Partner Roles (Clear Separation of Concerns)

**Input / Processing**

- **Arimedes Medical (Dr. Christopher Wixon):**  
  Clinical NLP / NER for extracting structured entities from notes and documents. Strong influence on avoiding EHR positioning.

- **Actton Group:**  
  Risk stratification models operating on structured clinical features.

**Output / Reasoning**

- **EvidenceMD:**  
  LLM-based clinical and financial reasoning layer, consuming context supplied by the PKG.

**Financial Layer**

- **GoodBill:**  
  Billing transparency, cash receipt tracing, and cost optimization inputs linked back to clinical events.

Nodesian's role:

- **Own the PKG** and orchestrate partner tools against it.
- Maintain provenance, temporal causality, and cross-domain linkage (clinical ↔ financial).

### 4. Action Graphs (Key Differentiator)

- Current AI systems are largely **linear**: one prompt → one response.
- Nodesian is building toward **action graphs**:
  - When an answer is incomplete or uncertain, the system triggers a task.
  - Tasks may include eligibility checks, risk stratification, billing analysis, or document parsing.
- This enables:
  - Self-correcting workflows
  - Explicit next steps for clinicians
  - Transition from "answering" to "acting"
- Longer-term R&D (acknowledged, not required for MVP):
  - DAG-based causal reasoning
  - Markov Random Fields for probabilistic inference across the graph
  - Graph-based population analysis

### 5. Product Direction (Near-Term)

- **Dashboard is explicitly not the product.**
  - It exists only as a vision demo and pilot scaffold.
- **MVP focus:**
  - EHR extensions / integrations that surface PKG-powered reasoning inside existing workflows.
  - Core features demanded by buyers:
    - Cross-system querying (labs, coverage, billing)
    - Risk stratification
    - Cash payment and cost visibility
- Goal:
  - Enterprise installability
  - Clear path to network effects for VCs

### 6. Spencer's Technical Role

- Own the **extension / integration layer**, not the entire system.
- Translate PKG outputs and partner APIs into:
  - EHR-embedded workflows
  - Action-triggering interfaces
- This role directly unlocks:
  - Enterprise contracts
  - Network effects
  - VC re-engagement

---

## II. Practical Business & Equity Considerations

### 1. Current Company Status

- **Stage:** Pre-seed.
- **Annual revenue:** ~$10k/year.
- **Lost contract:** $71k (conflict of interest).
- **Existing traction:**
  - 4 pilots / LOIs.
  - Paying small-practice users (dashboard-based).
  - Enterprise interest currently blocked by lack of integration.

### 2. Client & Pipeline Signals

- **Texas:** DPC clinic with ~$10k–$50k contract potential.
- **Michigan:** ~10-office group exploring AI query tools.
- **Alaska:** Grant-funded engagement.
- **California:** Polyclinics targeted next (large EHR environments).
- **VC feedback (Glasswing):**
  - Strong vision and tech depth.
  - Missing network effect → must be demonstrated via integrations.

### 3. Why Spencer Is Critical

- Buyers do **not** want new dashboards.
- They want:
  - Installable extensions
  - Minimal workflow disruption
  - Clinical + financial reasoning embedded where they already work
- Spencer's work directly:
  - Converts pilots into enterprise contracts
  - Makes the PKG visible and valuable
  - Creates the missing VC narrative

### 4. Compensation Reality (Near-Term)

- **No guaranteed salary** pre-funding.
- Luis can:
  - Cover tooling and infrastructure (AWS, Neo4j, Gemini, Health Universe).
  - Pay contract fees once partial client payments land.
  - Support basic living expenses.
- Interim structure discussed:
  - **10–15% of contracted revenue** tied to Spencer-built features.
  - Royalty-style upside vs. one-off contracting.

### 5. Equity Structure (Current Cap Table)

- CTO: **35%**
- Luis (CEO): **~50%**
- Dr. Rincón (Investor): **10%**
- JT (Early): **5%**

Key clarification:

- CTO equity is acknowledged internally as historical/political rather than proportional to current technical contribution.
- Cap table is **not treated as immutable**.
- Spencer was explicitly invited to:
  - Propose his percentage.
  - Help restructure if necessary.

### 6. Equity Options for Spencer

- Initial suggestion: **10%**.
- **Stock classes:**
  - **Class A:** Economic upside.
  - **Class B:** Enhanced voting power.
- Strategic tradeoff:
  - Influence vs. dilution protection vs. upside.

### 7. Timeline Commitments

- **Next 2 weeks:**
  - Spencer sends cost-of-operations quote.
  - Proposes equity / royalty structure.
- **By Feb 15:**
  - 2–3 enterprise leads ready.
  - Integration MVP development begins.
- **Feb–March:**
  - Re-engage VCs with enterprise + network-effect story.

---

## III. Key Decision Factors for Spencer

**In favor of a higher equity ask:**

- PKG value is unlocked only through integration.
- Revenue is currently low → equity is inexpensive now.
- Integration layer is the bottleneck.
- Spencer's contribution will directly affect fundability.

**Risks to price in:**

- Pre-seed volatility.
- Delayed cash flow.
- Execution risk on sales (mitigated by Luis retaining sales focus).

---

## IV. Immediate Next Steps

- **Spencer**
  - Define integration scope.
  - Quote ops + labor.
  - Propose equity / royalty structure.
- **Luis**
  - Close near-term clients.
  - Prepare enterprise introductions (TX, CA).
  - Share technical papers on agentic and graph-based systems.

---

## V. Companies, Businesses, and Tools to Look Into

This list captures **explicitly named companies** and **critical platforms** referenced in the meeting and clarified by the company's stated vision.

### A. Current Strategic Partners

- **Arimedes Medical**: Clinical NLP / NER provider. Key influence in steering Nodesian away from being positioned as a full EHR and toward an extension / co-pilot model.
- **Actton Group**: Provides risk stratification models. One of the core enterprise features requested by clinics.
- **EvidenceMD**: LLM-based clinical and financial reasoning engine (similar to Open Evidence). Primary output layer for structured queries.
- **GoodBill**: Billing and cost-transparency platform. Enables cash receipt tracing and financial reasoning, which clinics value alongside clinical insight.

### B. Infrastructure & Platform Dependencies

- **Neo4j**: Graph database used for the Proprietary Knowledge Graph (PKG). Credits already secured; core to Nodesian's moat.
- **AWS**: Primary cloud infrastructure (preferred over Azure). Credits expected; aligns with current technical roadmap.
- **Health Universe**: Healthcare integration platform that may be needed for EHR connectivity and faster enterprise integrations.

### C. Reference & Comparable Products

- **ContrastAI**: Lightweight UI wrapper on top of EHRs (~$300/month). Validates demand for extensions rather than full dashboards.
- **Open Evidence**: Mentioned as a large incumbent comparison point for EvidenceMD-style reasoning tools.
- **HINT Health**: Referenced as an example of PBM / billing API integration relevant to financial workflows.

### D. Customers, Pilots, and Early Adopters

- **Plum Health DPC**: Provided clear feedback that DPCs want integrations/extensions, not standalone dashboards.
- **Texas DPC Clinics (Dr. Goyle)**: Active interest with potential contracts ranging from ~$10k–$50k+. Near-term revenue validation.
- **Michigan Multi-Office Clinics**: Exploring AI-based clinical and financial querying across ~10 offices.
- **California Polyclinics**: Target segment for enterprise rollout; heavy EHR usage makes integration quality critical.

### E. Venture, Validation, and Media

- **Glasswing Ventures**: Gave soft interest but flagged lack of network effect—explicitly tied to need for integrations.
- **Horetto Health Podcast**: Distribution and thought-leadership channel for reaching providers.
- **Hackathons**: Mayo Clinic Hackathons, American Heart Association (AHA) Hackathons, University of Illinois Chicago (UIC) Hackathons

### Why This Matters

- Nodesian's **technical moat is the PKG**, not the UI.
- Nodesian's **commercial bottleneck is integration**, not modeling.
- Equity discussions should reflect ownership of the layer that turns the PKG into revenue.

---

_For which of you, intending to build a tower, does not first sit down and count the cost, whether he has enough to complete it?_
— Luke 14:28

This meeting clarified both the **tower** (a patient-centric knowledge graph surfaced through integrations) and the **cost** (equity, time, and risk).

---
