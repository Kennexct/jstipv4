# ADR-001: Flexible orders — no-limit stock, down payments, buy before payment

**Status:** Accepted
**Date:** 2026-10-21
**Feature:** flexible-orders
**Author:** 10x-Team (Architect + Staff Engineer)

## Context
Jastipers often buy items before customers pay, ask for a down payment (DP) on expensive items or custom requests, and sell items without a fixed stock count. The previous rules required full payment before `Purchased` and always reserved stock.

## Decision
Keep the single linear status list and treat payment as a separate state. Server rules in `jastip.validate_record`: `Purchased` needs `paid ≥ deposit`; `Paid`/`Shipped`/`Delivered` need `paid = total`. Items gain `unlimited`, `depositMode`, `depositValue`; orders gain a frozen `deposit` computed on the server for item orders. Public orders of unlimited items are capped at 20. Item-linked orders freeze `itemId`/`qty`. Delivered as a new additive migration that only replaces function bodies.

## Alternatives Considered
| Alternative | Pros | Cons | Why Not |
|---|---|---|---|
| Separate `paymentStatus` column/field with new order statuses | Cleaner model | Breaks existing records, filters, reports and tests | Too invasive for the benefit |
| Client-only rules | Fast | Bypassable; breaks the money-integrity invariant | Server must enforce |
| Use qty 999999 for "no limit" | No schema/rule change | Fake numbers on the storefront, stock still decremented | Dishonest UI |

## Consequences
Positive: matches real jastip workflow; rules enforced on the server; no data migration.
Negative: status `Paid` is now optional, so the timeline hides it and a payment badge shows payment state.
Risks: the frontend must not be deployed before the migration (old server rejects buy-before-payment). Mitigation: apply SQL first.

## Dependencies
Builds on 202610100001_operations.sql. Future per-record locking (review #4) is independent.
