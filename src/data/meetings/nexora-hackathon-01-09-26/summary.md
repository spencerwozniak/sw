# Nexora Hackathon Brainstorming

**Date:** Jan 9, 2026  
**Participants:** Luis Cisneros, JT Sohlot, Spencer Wozniak

---

[**Hackathon Link**](https://nexora-hacks-2026.devpost.com/)

---

## Core Idea

Build a **patient-owned, explainable care journey** for dialysis patients that:

- Lets patients upload and carry their own kidney-related data
- Transparently evaluates **kidney transplant eligibility**
- Detects **missed dialysis sessions**
- Creates **explainable, low-noise alerts** for patients and clinicians
- Records everything in an **append-only decision ledger**

---

## MVP Scope (3 Days)

**In scope**

- Patient data upload (labs, basic docs, questionnaire)
- Kidney-specific data model (fixed, bounded scope)
- Rule-based eligibility checks (labs, vitals, questionnaire; imaging mocked)
- Patient journey timeline (what happened, when, why)
- Explainable alerts (rare, gated)
- Patient + clinician views
- REST backend + mobile frontend

**Out of scope**

- Real EHR integrations
- Full transplant criteria coverage
- Advanced imaging ML
- Production auth / HIPAA hardening

---

## Architecture

Patient uploads data
↓
Patient Data Vault (canonical, patient-owned)
↓
Eligibility + Orchestration Engine (rules-based)
↓
Decision Ledger (append-only)
↓
Patient Alerts (why) Clinician Alerts (why + when)

---

## Team Roles & Immediate Next Steps

### Backend (PHP)

- Define kidney-specific schemas (labs, sessions, questionnaire, docs)
- Implement eligibility rules (deterministic, explainable)
- Implement missed-session detection
- Build append-only decision ledger
- Expose REST endpoints for frontend

### Frontend ([Expo React Native](https://expo.dev/go))

- Build patient journey timeline (core UI)
- Implement data upload + consent toggles
- Display eligibility explanations and alerts
- Create simple clinician alert view
- Keep UX calm, clear, and explainable
- Look into [Vessel](https://www.vesselpartners.com/)

### CEO / Product / Sales

- Deliver research report (by ~10–11 AM next day)
- Frame product narrative:
  - “We don’t decide who gets a kidney — we ensure patients are told”
- Define demo script and judge story
- Act as scope police (keep MVP tight)
- Coordinate communication (Teams + group text)

---

## Timeline / Coordination

- **Luis**: Send research report by ~10–11 AM tomorrow
- **Spencer + JT**: Start building immediately after report
- Async progress during the day
- Regroup later same time for check-in and alignment

---

## Demo Goal

Show one patient:

1. Uploads data
2. Eligibility threshold is crossed (silently logged)
3. No action occurs
4. Patient is informed
5. Clinician receives a clear, explainable alert
6. Judges are asked: _“If this were your parent, would you want to know?”_

---

\*Do you not know that the runners in the stadium all run in the race, but only one wins the prize? **Run so as to win.\***
— 1 Corinthians 9:24

---
