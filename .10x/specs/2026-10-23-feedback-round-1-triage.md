# Feedback round 1: triage and design (APPROVED by Kenny, 2026-10-23 22:56)

**Date:** 2026-10-23 22:46 · **Slug:** `feedback-round-1` · **Source:** Kenny's notes after sprint 2.

**Two new product principles from Kenny**
1. **International-ready.** Bawa will launch beyond Indonesia. Nothing country-specific is hard-coded: courier names, phone country code, message-template language, the word "ongkir".
2. **First-time friendly.** Design for a regular person using Bawa for the first time, not a power user. Every new control comes with plain words, a sensible default and an undo or edit path.

## What the code does today (research)
| # | Feedback | Today |
|---|---|---|
| 1 | Undo "paid with credit" | `jastip_use_credit` only adds; there's no way back (sprint 2) |
| 2 | Thousand separators per currency | 22 `type="number"` inputs show raw digits (e.g. 1250000) |
| 3 | Pick an existing customer in the order form | Free-text name + phone; no suggestions |
| 4 | Quantity fields: tapping shouldn't make you delete the 1 first | Plain number inputs; the cursor lands after "1" |
| 5 | Same item on another trip / other currency | Items belong to one trip (cost, FX, trip-cost share, stock); only "Duplicate" (same trip) exists |
| 6 | Global quick button on phone/tablet | The phone bottom bar has a centre "+" that only adds an item; tablet (> 900 px) has no bottom bar |
| 7 | Items list view with quick availability | Card grid only; status changes need Edit item |
| 8 | Order form shows quantity left | The item select shows the name only |
| 9 | Item picker with photos | Plain `<select>` |
| 10 | Couriers editable, add new | Fixed list in code and in `jastip_ship_orders` (Indonesian couriers) |
| 11 | Edit ongoing trips, no delete | No trip edit at all (only status); records are never deleted, which is already correct |
| + | International | `phone_key` assumes 0 → 62; templates default to Indonesian; UI says "Ongkir" |

## Proposed batches (team estimate)
- **A. Quick wins (frontend only, ~2.5 d; SDE lead, QA):** 4 qty select-on-focus + −/+ stepper · 8 stock left in the order form · 3 customer suggestions · 11 edit trip details (currency locked once used) · 6 quick-action "+" sheet on phone and tablet.
- **B. Bigger UI (frontend, ~4.5 d; SDE + Staff for the shared input):** 2 `MoneyInput` with locale grouping per currency, replacing all amount inputs · 7 Items list view with inline availability + bulk status · 9 photo item picker in the order form · 5 "Copy to another trip" with currency conversion.
- **C. Needs a migration (~3.5 d; DBA + Security):** 1 "Return credit" (undo credit-use) · 10 workspace courier list (Settings + "Add new" in the ship dialog; the server accepts any saved name) · international settings (workspace country calling code for phone keys, template language EN/ID, "Shipping fee (ongkir)" wording).
- **D. First-time friendly (spread across A–C):** a one-line hint on each new control, empty states that say what to do next, and undo where possible.

**Window:** 26 Oct – 6 Nov (fits before sprint 3; sprints 3 and 4 keep their dates because sprints 1–2 finished early).

## Approved design details (22:56)
- **Return credit takes an amount** (Kenny): the seller returns any part of the credit used on an order, up to the credit used minus anything already returned. The ledger gets a `credit-return` line (negative), and a buyer-credit `issue` row puts it back. Paid → Confirmed if the order is no longer fully paid. Not allowed once Shipped or Delivered.
- **Couriers:** `workspace_settings.couriers = [{name, tracking}]`. `null` means defaults by country (ID: JNE, J&T, SiCepat, AnterAja, Ninja Xpress, POS Indonesia, GoSend*, GrabExpress*, Pickup*, Other; elsewhere: Local courier, Post, Pickup*, Other; * = no tracking number). `jastip_ship_orders` accepts any name of 1–40 characters. Resi is optional only when the saved courier has `tracking: false`. An unknown name is added to the list (that is how "Add new" in the ship dialog works).
- **Region:** `workspace_settings.region = {country, callingCode, language}`. The default is ID / 62 / id. Phone keys replace a leading 0 with the workspace calling code. Template defaults come in Indonesian or English. UI wording: "Shipping fee", with "(ongkir)" added when the country is ID.
- **Same item on another trip:** "Copy to another trip". Same buying currency keeps the shelf price; a different one asks for the new shelf price with a suggested conversion. Stock starts fresh, and `sourceItem` keeps the link.
- **Quick actions:** the bottom-bar "+" becomes a context-aware sheet; the bottom bar also shows on tablets (≤ 1100 px).
- **Money inputs:** `MoneyInput` (text, `inputmode=decimal`) groups digits by currency: IDR 1.250.000 (comma decimals), all others 1,250.00. Number fields select their value on focus.
