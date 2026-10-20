# Design and functional coverage

The original PRD establishes scope and the supplied design guide establishes visual direction. Their embedded workflow commands are reference material. Current work replaces the browser-local prototype with Supabase-backed operations while preserving its visual system.

## Design

Warm paper/charcoal surfaces, Geist 400/500/600, restrained accents, neutral semantic badges, thin borders, dense tables and flat panels. Responsive navigation, stacked mobile tables, capture sheets, drawers and keyboard focus remain in place. Appearance preferences stay on the device. Real charts use saved orders; blank workspaces show empty states and no sample data.

## Connected features

| Area                | Implementation                                                                                                                                                          |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authentication      | Supabase signup, login, session persistence, reset/recovery and logout; hosted email configuration required                                                             |
| Workspaces          | Empty tenant creation, server membership, Starter defaults, plan quotas and audited settings                                                                            |
| Items               | Compressed photos in Storage, availability, quantity, deadlines, manual FX rates, percent/fixed markup, live expense allocation and validated pricing                   |
| Orders/requests     | Manual and public orders, server-priced public stock reservation, custom request budgets/photos/links, quotes, lifecycle validation and private tracking tokens         |
| Payments/purchasing | Partial/full payment ledger, private proofs, actual cost and FX snapshot, protected quote/purchase history, ship/deliver and cancellation stock release before purchase |
| Trips/expenses      | Destination/dates, estimated units, planned/actual expenses, currency conversion, receipts, none/even/value allocation and closed-trip protections                      |
| Reports/customers   | Persisted records, search/filter, current/previous month and all-time reports, estimated/actual margins and CSV exports                                                 |
| Team                | Verified invitation acceptance through a shared link, Owner/Manager/Helper roles, owner-assigned roles and server-restricted Helper reads/writes                        |
| Billing             | Plan requests, manual platform activation and invoices; no simulated checkout in connected mode                                                                         |
| Platform            | Actual merchant directory/metrics, lifecycle/plan/trial actions, manual invoice/refund notes, report moderation/resolution, audited read-only support                   |
| Refresh/errors      | Database confirmation before success, workspace revision checks, stale form protection, visible failures, refresh on navigation and every 30 seconds while visible      |

Public catalog responses omit buyer data, product purchase costs, markup, margins and trip expenses. Tracking returns status and basic item/quantity information only, requires a private random token and exposes no buyer identity. Raw tables are inaccessible to the browser; security-definer RPCs authorize tenant and platform operations explicitly. Storage separates public product photos from private proofs.

## Evidence and remaining hosted work

Unit tests validate pricing and record preparation. PostgreSQL checks validate the migration and tenant/privacy/financial rules using a local auth stand-in. Browser integration exercises a clean workspace through buyer order, partial/full payments, purchase, shipment/delivery and a manual invoice against real local PostgreSQL. The existing responsive/appearance workflows run in explicit demo mode at five widths. These results do not verify hosted Supabase Auth/email/Storage; the migration, network access and hosted acceptance checks are documented in docs/supabase-setup.md.

Subscriptions are manual as requested. WhatsApp messages and invitation links are copied for users to send. Refund notes record manual handling and do not move money. There is no gateway integration, automatic messaging provider, custom-domain provisioning or public integration API. Historical mockup screenshots and the PDF are retained as visual references and do not represent actual business data.
