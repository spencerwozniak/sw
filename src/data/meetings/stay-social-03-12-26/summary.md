### Action Items

- Spencer to add smart list feature for emailing event staff
- Spencer to investigate why QuickBooks notes aren't syncing to CRM
- Spencer to continue work on displaying clubs on the website (already on to-do list)

### Issues Resolved

- **Duplicate User Error**: Resolved issue where Cathy couldn't create a user for Tori Kofler because the email already existed in the system. The problem was caused by a leading space in the search field. Cathy successfully sent a registration invite.
- **3-Token Event Testing**: Successfully tested the 3-token event pricing system using the test client account (username: testclient, password: testclient1). Confirmed that tokens are properly deducted for non-gold members.
- **Client Merge**: Successfully merged duplicate client records for Oliver/Ollie into a single record, consolidating contact information, tokens, and caregiver relationships. Removed duplicate caregiver Michelle.
- **Invoice Token Allocation**: Verified that QuickBooks invoices properly trigger token additions in the CRM. Tested with Jason's account and confirmed 10 tokens were added.

### New Features Demonstrated

- **AI Assistant (Ctrl+J)**: New AI-powered help system integrated into the CRM that can answer questions about platform features and workflows. The assistant has access to all help documentation and can provide guidance on tasks like merging clients, creating smart lists, and other system functions.
- **Conditional Questions**: Event registration now supports conditional questions that appear based on responses. These questions are displayed to users during registration and saved to their records.
- **Client Merge Functionality**: New merge button in client records allows combining duplicate client profiles. The merge retains contact information from the target record and appends QuickBooks notes to document the changes.

### QuickBooks Integration Clarifications

**Recognized Products/Services** (automatically add tokens):

- Funding fees
- Self-determination funding
- Gold membership (1 month, 3 months, 6 months)
- 10 class pass (adds 10 tokens)

**Not Recognized** (do not automatically add tokens):

- Sales
- Silver membership
- Premium event
- Bowling club (paid via tokens through portal)
- Any other club activities (users register using tokens)

**Important**: Only tokens and gold memberships need to be invoiced through QuickBooks. Individual events should not be separately invoiced - clients use their tokens through the portal.

### Invoice & Token Management

- Invoice creation in QuickBooks automatically triggers token additions in the CRM
- Self-determination funding: Number of units in QuickBooks invoice = number of tokens added
- When tokens are added, email notifications are sent to both the client and caregiver (if profiles exist in the system)
- Token balance adjustments can be made manually through the "Manage Balance" feature in client profiles

### System Synchronization

- **CRM ↔ QuickBooks**: Bidirectional sync working properly. Changes in either system update the other.
- **Eventbrite**: One-way sync only (Eventbrite to CRM, not vice versa)
- **Notes Sync Issue**: QuickBooks notes are not currently syncing to the CRM. Spencer will investigate.

### User vs. Client Architecture

- **Client**: A record in the system (may or may not have login access)
- **User**: Someone who can log into the system
- Users can be staff members without client records (Cathy, Melanie, etc.)
- Client records can exist without associated users
- Current limitation: Users can only be linked to one client record

### Multi-Client Caregiver View Discussion

Cathy inquired about allowing caregivers or facility managers to manage multiple clients. This would require creating a new view type and is estimated at 4-8 hours of development work. Current workaround: Caregivers can register their clients individually using the portal.

### Recurring Invoice Configuration

Discussed QuickBooks recurring invoice settings. Documentation indicates that service dates should automatically roll forward each month when configured properly, though Cathy experienced issues with dates not updating automatically.

### Outstanding Items (Spencer Working On)

- Clubs displaying on the website (next priority for Spencer)
- QuickBooks notes synchronization issue

### Email Notifications

- Token request emails go to [admin@staysocial.com](mailto:admin@staysocial.com) with a one-week cooldown to prevent spam
- When tokens are added via QuickBooks invoice, notifications are sent to client and caregiver emails (if they exist in the system)
- New users receive registration emails with login instructions when their user account is created

### AI & Automation Opportunities

Spencer suggested exploring additional AI integrations for the platform, including automated email drafting, smart list creation, and other workflow automations. The platform has reached a solid foundation stage where advanced automation features could be implemented.
