## Stay Social Portal – Combined Project Notes

#### 1. Project Overview

- Building a **client portal** for adults with disabilities and their caregivers to:
  - Submit an **interest/intake form**
  - Complete a **waiver**
  - Handle **Regional Center** vs **Self-Determination** funding paths
  - Streamline **approvals** and **invoicing**
- Goal: replace a manual, time-intensive registration process (emails, paper waivers, tracking) with an integrated, automated system.
- Long-term vision:
  - Clients/caregivers can log in to:
    - Register for sessions (e.g., **Session 1** and **Session 2**)
    - View how many classes they have left
    - Manage their own budget (especially self-determination clients)
  - Organizer saves **hours** of manual admin work.

#### 2. Login & Access

- **All clients must log in** to access the portal.
- Login should be **simple**, ideally:
  - Email address as username.
  - Very simple credential flow (but still requires login; not open to anyone).
- Primary users:
  - Client (participant)
  - Caregiver/parent/house staff (best point of contact)
  - Regional Center Service Coordinator **or** Independent Facilitator (self-determination path)

#### 3. Interest / Intake Form Requirements

The **front portal/first step** is the interest/intake form + waiver.

##### 3.1 Core Personal Information

Collect:

- Participant details:
  - Name
  - Preferred name
  - Date of birth
  - Email
  - Phone number
  - Address
- Emergency contact:
  - Name
  - Relationship
  - Phone number
  - (Email if desired)

##### 3.2 Conservation & Responsible Party

- Question: **“Is the participant conserved?”** (Yes/No)
  - If **Yes**:
    - Collect **name of conservator/responsible party**
    - This determines who must sign the waiver.
- Separate from conservation:
  - **Best point of contact / caregiver** section:
    - Name
    - Email
    - Phone number
    - Clarify this is the person who receives communications and brings the client to events.
    - Allow option like **“same as above”** if the participant is their own best contact.

##### 3.3 Funding & Program Path

- Key question: **“Are you enrolled in the Self-Determination Program?”** (Yes/No)
- Logic:
  - If **Yes** (Self-Determination path):
    - Collect **Independent Facilitator** info:
      - Name
      - Email
      - Phone
    - Later in the self-determination flow:
      - UCI number
      - Financial Management Service (FMS) name
      - “Who approves your purchases in your budget?” (Budget manager)
      - Email of the person who approves invoices
  - If **No** (Traditional/Regional Center path):
    - Collect **Regional Center Service Coordinator** info:
      - Name
      - Email
      - Phone

> The email logic for next steps depends on this Self-Determination vs Regional Center answer.

##### 3.4 Session Preferences

- Question: **“Which sessions are you interested in?”**
  - Checkboxes for:
    - Session 1
    - Session 2
  - Both can be selected.
- The selected sessions should be included in the email sent to the coordinator/independent facilitator.

##### 3.5 Preferences & Interests

- Section for **preferences/interests** (e.g., Pickleball, etc.):
  - Used for marketing and filtering in the future:
    - Example: filter all clients interested in Pickleball and email them.

#### 4. Waiver Process

- **Waiver must be part of the initial portal/form**, not a separate later step.
- Conservation logic:
  - If **not conserved** → participant signs the waiver.
  - If **conserved** → responsible party (conservator) signs the waiver.
- Email text should clearly instruct:
  - “If the attendee is not conserved, they sign the waiver.”
  - “If conserved, the responsible party signs the waiver.”

#### 5. Email & Notification System

##### 5.1 On Interest Form Submission

When the interest/intake form (with waiver) is submitted:

- Automatically send an email to:

  1. **Best point of contact/caregiver** (always)
  2. **Either**:
     - Regional Center Service Coordinator **or**
     - Independent Facilitator  
       depending on the Self-Determination answer.

- The email should include:
  - Confirmation/thank you for interest
  - Next steps for registration
  - **Link to waiver** (if needed for review or re-access)
  - For Regional Center path:
    - Mention the need to complete the **screening tool** (they already know what it is).
  - For Self-Determination:
    - Mention **service code 331 (social recreation)**.
    - Instructions about how to proceed with budgeting/approval.

> For Self-Determination, the email content may be different from the Regional Center version.

##### 5.2 Coordinator / Independent Facilitator Portal Link

- Email includes a **unique link back to the portal** where:
  - Regional Center coordinators can upload proof of approval.
  - Independent facilitators can enter necessary budget & FMS info.

#### 6. Approval & Documentation Upload

##### 6.1 Regional Center Path

- After the **screening tool** is approved by Regional Center:
  - Service Coordinator must **upload a screenshot/photo of the approval** via the portal.
- The portal needs:
  - An upload area for the coordinator to attach the proof of funding/approval.

##### 6.2 Self-Determination Path

- For self-determination clients:
  - Gather:
    - UCI number
    - Independent Facilitator name/email
    - Financial Management Service (FMS)
    - Person in charge of approving budget purchases
    - Email of the person who approves invoices
  - This supports invoicing and ensures the ARC can bill the correct FMS once the budget is approved.

#### 7. Events & Client Portal View

- Once the initial intake + waiver + approvals are complete, clients/caregivers can access an **events view** in the portal:
  - Shows upcoming events/sessions (e.g., Session 1, Session 2), with dates and themes.
  - Allows them to **register/sign up** for specific sessions.
  - Long-term:
    - The portal should show:
      - How many **classes/passes** they have left
      - Their **remaining budget** (especially for self-determination clients)
      - Possibly pricing tiers (10-class pack, gold membership, etc.) for self-determination purchases.

#### 8. Billing & QuickBooks Integration

- For **Self-Determination** clients:
  - Goal is to integrate with **QuickBooks** so that an invoice can be **automatically generated and sent**.
  - Example flow:
    - Client in self-determination selects what they want to buy (10-class pack, membership, etc.).
    - System uses service code 331 and stored FMS/budget-approver info.
    - **Automatic QuickBooks invoice** is generated and sent to the correct email.
- Longer-term vision:
  - Self-determination clients have their own **personal portal** where they:
    - Select what they want to purchase.
    - See invoice history.
    - Track remaining budget and passes.
- For **Regional Center** clients:
  - Process revolves around uploaded approval screenshot and billing the Regional Center per their existing process (but portal could still support invoice generation if needed).

#### 9. Status, Timeline, and Meetings

- **Current status:**
  - Portal exists as a **local mockup** on Spencer’s machine (not yet deployed to the live website).
  - Basic intake form structure with many of the requested fields already mocked up.
- **Contract:**
  - Contract for **two more program sessions in the spring** has been signed.
  - Sessions planned:
    - **January–March**
    - **April–June**
- **Deadlines:**
  - By **end of next week**, marketing needs a **live place to send the interest form**.
- **Upcoming meetings:**
  - **Monday** meeting with **Melanie (the ARC)** to review the updated mockup.
  - Possible future call with:
    - **John** (website manager) to integrate the portal into the website.
    - A Catholic programmer friend (Notre Dame grad, works at a startup) for networking/brainstorming.

#### 10. Business & Expansion Considerations

- Cathy emphasized:
  - This portal will save **many hours** of manual admin (emails, copy-paste, tracking, chasing waivers).
  - Previous systems at the ARC were **paper-based and archaic**.
- There is likely **broader demand**:
  - Other organizations like ARC may need:
    - Digital registration systems
    - Portal-based waivers and approvals
    - Funding/invoice integrations
  - This project can act as a **template** or **productized solution** for:
    - Social rec programs
    - Agencies serving disabled adults
    - Organizations dealing with Regional Center and Self-Determination funding.
- Pricing:
  - Spencer to **revisit the proposal**:
    - Scope has shifted from original estimate.
    - Hourly rates remain the same.
    - Terms and total may need to reflect the expanded workflow and integration.
  - Cathy is open to a revised proposal and wants Spencer to **send an updated proposal and invoice**.

#### 11. Action Items

- Spencer: **Finalize updated mockup** incorporating:
  - Conservation & responsible party logic
  - Best point of contact section
  - Self-determination vs Regional Center branching
  - Session selection (Session 1 / Session 2)
  - Waiver embedded in initial flow
  - Email automation triggers & upload areas
- Spencer: **Prepare for Monday meeting** with Melanie (ARC) to walk through the mockup.
- Spencer: **Draft and send revised proposal** and **invoice** for portal development work.
- Spencer & Cathy: **Clarify exact email wording**, especially:
  - Regional Center vs Self-Determination versions
  - Waiver instructions
  - Screening tool instructions
  - Code 331 and self-determination guidance.
- Spencer: Explore **QuickBooks integration** for automatic invoice generation.
- Spencer & Cathy/John: Plan next steps for **hosting/integrating the portal** on the Stay Social website.
- Cathy: Send email about **Friendsgiving** and upcoming sessions (Jan–Mar and Apr–Jun), including reference to future portal use once live.
- Longer-term: Consider how this portal could be adapted as a **product for other organizations** and identify potential warm intros (ARC, contacts, etc.).
