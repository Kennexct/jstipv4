# Design and workflow coverage

The supplied PRD establishes product scope. The supplied design guide establishes visual direction. Embedded workflow commands in those documents are reference material; they do not authorize external actions. GitHub publication is authorized by the user's explicit request.

## Visual system

Warm paper and charcoal themes, Geist typography, semantic neutral badges, a single configurable accent, hairline borders and restrained spacing. Shared tokens live in `src/styles/tokens.css`. The sidebar, four-part stats, dense tables, flat panels, drawers and capture forms follow the guide. Tablet navigation becomes a drawer; phones use a bottom bar, stacked tables and two-column product browsing. Motion honors OS preferences and the app's Reduce motion switch. Dialogs provide accessible labels, Escape handling, focus trapping and focus restoration; fields have associated labels and keyboard-visible focus.

## Screens and connected workflows

| Area       | Included behavior                                                                                                                                                                  |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Overview   | Reactive totals, recent orders, active trips, review prompts, illustrative revenue trend                                                                                           |
| Items      | Six compressed photos, trip/category/status/deadline, percent or fixed markup, multi-currency calculator, live allocation and margin, draft and duplication                        |
| Orders     | Manual and storefront sources, search/filter, bulk confirmation, lifecycle status, frozen quote pricing, partial/full payment and image proof, address, copyable customer messages |
| Requests   | Buyer or seller custom requests, reference photos/links, budget and quote using the shared calculator                                                                              |
| Trips      | Planning/open/closed state, dates, budget expenses, planned/actual amounts, receipt, currency conversion, none/even/value allocation; closed item and budget edits are blocked     |
| Purchasing | Paid order checklist grouped by store; actual purchase currency and cost snapshot                                                                                                  |
| Reports    | Estimated/actual profit, period and trip filters, trip/item/customer grouping and CSV                                                                                              |
| Customers  | Order-based directory, customer creation, search and CSV                                                                                                                           |
| Settings   | Six accents, light/dark/system, compact density, reduced motion, state previews, workspace/store branding, role preview, currencies, reset                                         |
| Billing    | Plan comparison, usage, simulated checkout and downloadable fixture invoice CSVs                                                                                                   |
| Welcome    | Three-step shop, trip and first-item onboarding                                                                                                                                    |
| Storefront | Search, filters, local gallery, availability, account-free consent/order/request forms, confirmation and status-only tracking                                                      |
| Metrics    | Sample platform revenue, merchant lifecycle totals and attention queues                                                                                                            |
| Merchants  | Directory, filters, invitations, plan/status/trial changes, read-only seeded support view, simulated payment retry, refund note and reasoned suspension                            |
| Moderation | Example report review and merchant profile actions                                                                                                                                 |
| Audit      | Browser-local log of merchant and seller changes                                                                                                                                   |

## Pricing

Prices are stored in IDR using explicit currency rates. The PRD example of JPY 3,000 at Rp 105, with 20% markup and Rp 20,000 allocated expense, produces Rp 315,000 purchase cost, Rp 378,000 selling price and Rp 43,000 profit (11.4% margin). Selling prices round to Rp 1,000. Orders retain quote cost, allocation and FX snapshots; recording actual purchases produces a separate snapshot. Changing item or trip prices therefore cannot silently rewrite past quoted profits.

## Prototype boundaries

The source is a UI prototype, not a production SaaS implementation. Browser-local fixtures connect the screens; account isolation, authentication, server validation, real payment gateways, messaging, billing schedules, secure role enforcement, fraud controls, uploads to cloud storage and live exchange rates need a backend. Public tracking uses sample short codes and should use unguessable server tokens in production. Read-only support previews the seeded shop and does not load independent tenant data. Moderation starts with one illustrative case. Revenue trend comparisons and platform metrics are labelled samples rather than time series calculated from the order fixtures.

Desktop and mobile layouts and the primary seller/buyer paths are browser-tested. These checks do not establish production security or full accessibility conformance.
