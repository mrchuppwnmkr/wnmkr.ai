# Site Architecture — Winemaking Consultant

**Version:** 2.0 · **Date:** Sep 4, 2026
**Status:** Auth and Oak Calculator code-complete on branches. Blocked on Clerk/Supabase dashboard
configuration — no `.env.local` exists, so the app cannot run locally on any machine.

**Changed since v1.7:** the Oak Calculator section was rewritten (it described a feature that no
longer matches what was built), Phase 1/2 boundaries moved, build status added per slice, and the
AI Consultant section now records open questions rather than implying the slice is fully specced.

---

## Build status

| Slice | Branch | State |
|---|---|---|
| **001 — Auth & user model** | merged to `main` | Code complete, 9 unit tests pass. **Never run** — no credentials. |
| **002 — Oak Calculator** | `002-oak-calculator` | Code complete, 45 unit tests pass, adversarial review done, 5 defects fixed. 18/21 tasks — T017, T018, T021 blocked on credentials. |
| **003 — AI Consultant** | not started | Delivery mechanics resolved; **product not yet specced.** See open questions below. |
| 004 — FAQ | not started | Deferred — content-driven, will be seeded from real subscriber questions. |
| 005 — Stripe | not started | — |
| 006 — Vercel cutover | not started | `docs/vercel-cutover.md`. `main` no longer serves the static site. |

### The blocker

Steps 1–3 of `specs/001-auth-user-model/quickstart.md` — Supabase Third-Party Auth, Clerk
integration and webhook, `.env.local`. Roughly an hour of dashboard work, cannot be scripted.
Until it's done: no browser testing, no end-to-end tests, no gate latency measurement, and both
completed slices stay unverified.

---

## Pages

| Page | URL | Access | Phase |
|---|---|---|---|
| Landing Page | `/` | Free | 1 ✅ |
| About Us | `/about` | Free | 1 ✅ |
| Pricing & Subscribe | `/pricing` | Free | 1 ✅ (single tier) / 2 (all tiers) |
| Login / Sign Up | `/auth` | Utility | 1 ✅ |
| **Admin Panel** | `/admin/users` | **Mike only** | 1 ✅ |
| **Oak Addition Calculator** | `/oak-calculator` | **Vintner tier and above** | 1 ✅ |
| **AI Winemaking Consultant** | `/consultant` | **3 free teaser questions; full access for subscribers** | 1 |
| FAQ | `/faq` | Free to read; subscriber submissions | 1 (read-only) / 2 (full) |
| Admin FAQ authoring | `/admin/faq` | Mike only | 1 |
| Blog Post Detail | `/blog/:slug` | Free | 2 |
| Chemical Additions Calculator | `/calculator` | Free | 2 |
| Wine Supply (Drop Ship) | `/supply` | Free | 2 |
| **Professional Services** | `/services` | Free to view & book | 2 |

---

## Tech Stack

**Production-lite MVP** — real deployed app, not a prototype.

| Layer | Technology | Cost |
|---|---|---|
| Frontend + API routes | Next.js 16 | — |
| Hosting + deploys | Vercel | Free → $20/mo |
| Database | Supabase (Postgres) | Free → $25/mo |
| Auth + subscription status | Clerk | Free → $25/mo |
| Payments | Stripe | 2.9% + $0.30/txn |
| AI | Anthropic API — Claude Sonnet 5 + prompt caching | Pay as you go |
| Service bookings | Calendly | Free → $12–16/mo |

**Two patterns that are load-bearing, established in 001:**

- **Route protection lives in `requireRole()`**, called by layouts, pages, route handlers, and
  server actions. Not middleware — Clerk deprecated `createRouteMatcher()`, and a matcher list
  fails open. A new route is denied until it declares what it needs.
- **Entitlement is read from Postgres on every gated request.** The Clerk session token carries a
  `role`/`tier` claim, but it is a debugging mirror only and is never trusted.

---

## Build scope

### Phase 1 — ship to 1–2 Founders

| Item | Status |
|---|---|
| Landing, About, Pricing (single tier + Founder path) | ✅ |
| Auth — Clerk login, signup, verification, password reset | ✅ |
| Six-role model, RLS, audit trail, `/admin/users` grant/revoke | ✅ |
| Oak Addition Calculator — multi-line worksheet + print | ✅ code, ⬜ verified |
| AI Consultant — chat, 3-question teaser, quota, caching, summarization | ⬜ |
| FAQ — read-only, Mike seeds entries | ⬜ |
| Admin FAQ authoring | ⬜ |
| Stripe checkout for Vintner | ⬜ |
| Vercel cutover | ⬜ |

### Phase 2 — public launch

Blog · Chemical Additions Calculator · Wine Supply · Professional Services booking · FAQ
submission queue and moderation · Winemaker and Cellar Master tiers · annual pricing · consultant
conversation search and PDF export · Oak Calculator expert mode, saved batches, cost model, and
product catalog.

---

## User roles

| Role | How assigned | Access | Billing |
|---|---|---|---|
| Anonymous | Not logged in | Free pages + 3 AI teaser questions | None |
| Registered (Free) | Self-signup | Free pages + 3 AI teaser questions | None |
| Vintner / Winemaker / Cellar Master | Self-subscribe via Stripe | Tier-specific access | Stripe auto-renewal |
| **Founder** | **Mike assigns via `/admin/users`** | **Cellar Master by default** | **No charge — bypasses Stripe** |
| Admin | `ADMIN_CLERK_USER_ID` env var | Full access + `/admin` | None |

Admin is configuration, not a database value. There is deliberately no in-product way to grant it
and no way to accidentally remove it from yourself.

Tier hierarchy is ordinal: `free → vintner → winemaker → cellar_master`. Gates specify a minimum
tier, so a Cellar Master passes a `vintner` gate. Deactivated accounts fail closed regardless of
tier.

---

## Subscription tiers

| Tier | Monthly | Annual | AI queries/mo | AI queries/day | Other |
|---|---|---|---|---|---|
| **Vintner** | $25 | $200 | 100 | 15 | Oak Calculator, 30-day history |
| **Winemaker** | $49 | $420 | 400 | 30 | Unlimited history, PDF export, priority queue |
| **Cellar Master** | $99 | $850 | 1,500 | — | Multi-batch tracking, Calculator API access |

**Cost protection:** prompt caching + 100-query soft cap + 15/day rate limit + context
summarization after 10 turns.

---

## Oak Calculator — as built (`002-oak-calculator`)

Full reference: `claude/oak-calculator-reference.md`, rewritten 2026-09-04 directly from
`2010_Oak_Alt_Projection_102510.xlsx`. **The v1.7 description of this feature was wrong on three
counts** — see corrections below.

It is a **multi-line worksheet**, not a single-value calculator.

**Header:** volume in gallons (1–1,000,000, decimals allowed, comma-formatted display) · wine
varietal (free text, required) · target % new oak equivalent (whole number).

**Line items:** flat list, each carrying format · toast · oak type · supplier (free text,
required) · share %.

**Calculation:**

```
gallons_to_treat = volume × (target_pct / 100)
line_gallons     = gallons_to_treat × (line_share / 100)
line_quantity    = line_gallons × (format_rate / 1000)
```

Line shares must total exactly 100%. Running total shows three states — under, exact, over — with
colour *and* a text label. No results and no print until valid.

**Addition rates:** Chips/Beans 25 lb · Dominoes 60 lb · Mini Staves 135.59 staves · Tank Staves
390 sq ft, all per 1,000 gallons. All outputs ceiling-rounded to whole numbers, because the output
is a purchase quantity.

**Toast codes:** `UT` · `LT` · `M` · `M+` · `H` · `CON` · `EXT`. Codes match Mike's workbook
catalog so work orders cross-reference against real orders. No filtering by format — advisory
shown instead.

**Oak type:** American · French · East European · Other.

**Print:** browser print stylesheet. Output is a cellar work order carrying varietal and batch
details.

**Out of scope, deliberately:** cost and pricing, product catalog and SKU lookup, inventory
reconciliation, saved batches, API access. All present in the source workbook and recorded in
Part 2 of the reference doc.

### Corrections to v1.7

| v1.7 said | Actually |
|---|---|
| Mini staves 36 per 1,000 gal | **135.59 per 1,000 gal.** 36 is staves per *set*, a pack size. v1.7 understated the dose by ~3.8×. |
| Chips 22–25 lb | **25 lb.** Single catalog rate. |
| Intensity tiers Subtle/Moderate/Full drive the calculation | **Removed.** User enters the percentage directly. The tiers were a UI invention with no basis in the workbook. |
| Print deferred to Phase 2 | **Pulled into Phase 1.** |
| Single addition | **Multi-line worksheet.** |

**Unverified value:** the 135.59 mini stave rate comes from catalog product `OC1`, the only mini
stave product in the workbook, and no blend sheet allocated to mini staves. Confirm with Mike.

---

## AI Consultant — resolved and open

### Resolved (Decision #8)

- Anonymous and free registered users get **3 free questions**
- Count tracked in `localStorage` — no account required
- Response always completes before the paywall appears
- Same model and quality as the subscriber experience
- After 3: full-screen subscribe prompt, response still visible behind it
- Teaser queries don't offset subscriber quota — quota starts fresh
- Cost exposure ~$0.02 per visitor

### Open — must be resolved before `/speckit-specify`

**The system prompt is the product.** No document yet describes the consultant's persona, scope,
or knowledge. A subscriber isn't paying for access to Claude; they're paying for Mike's judgment
encoded into it. This also has a mechanical consequence: prompt caching needs a substantial system
prompt to be worth anything, so a thin one forfeits the cost protection the pricing model assumes.

| # | Question |
|---|---|
| C-1 | Persona, scope, and refusal boundaries. Does it carry Mike's reference data — oak rates, addition practices, process preferences? |
| C-2 | Voice — speaks as Mike, as Mike's assistant, or as a neutral tool? Legal as well as product implications. |
| C-3 | Liability. Bad advice can cost a vintage; sanitation and SO2 advice can hurt someone. What does it refuse, what does it hedge, what disclaimer appears where? |
| C-4 | **Is a follow-up a new question?** "3 questions" implies discrete Q&A; "summarization after 10 turns" implies continuous conversation. This decision shapes the entire data model. |
| C-5 | What counts against quota — errored queries, stopped generations, regenerations? Monthly reset on the calendar or rolling from signup? |
| C-6 | "Soft cap" — warn and allow, or block with Mike able to override? |
| C-7 | Does a summarization call consume a query? Someone pays for it. |
| C-8 | `localStorage` is trivially bypassable — clear it or open incognito for three more. Fine for honest users at $0.02 each; a script in a loop is not. Need IP-level rate limiting on the teaser endpoint? |

Run `/speckit-clarify` on this slice before planning. It has more product ambiguity than the
calculator did.

---

## FAQ

- Anyone reads; **subscribers** submit; Mike approves everything
- Submissions → moderation queue → Mike writes the answer → publishes or discards
- Mike authors entries directly at `/admin/faq` anytime
- Email notification to Mike on each new submission

**Sequencing note:** the FAQ is content-driven and can't meaningfully be built before there are
real subscriber questions to answer. Deprioritised behind the consultant and Stripe.

---

## Professional Services (Phase 2)

| Service | Rate | Notes |
|---|---|---|
| **Phone / Video Consultation** | $100/hr | 15-min increments ($25). Pre-pay 1-hr block; overages auto-charged. |
| **Virtual Wine Tasting** | $400 (up to 8 wines) | $25/additional sample. Client ships samples 5–7 days ahead. |
| **On-Site Consulting** | $750/day | Travel days free unless negotiated. Client covers airfare and lodging. |

**Cancellation:** free ≥24hrs · 50% same-day · full charge no-show · tasting samples
non-refundable after deadline · travel deposits non-refundable within 14 days.

---

## Startup costs (estimates — consult an attorney and an insurance broker)

| Path | One-time | Annual |
|---|---|---|
| Minimal (sole prop, E&O only, free tech) | ~$400–900 | ~$1,000–1,200 |
| Moderate (LLC, BOP bundle, legal ToS, free tech) | ~$470–970 | ~$1,900–2,200 |
| Scaled (LLC, BOP, legal, paid tech at modest growth) | ~$470–970 | ~$2,900–3,600 |

**Legal:** no CA statewide licence. Local city/county $50–150/yr. LLC $70 + $800/yr franchise tax.
ToS and client agreement $400–900 one-time.
**Insurance:** E&O ~$888/yr. Bundle with General Liability (BOP) for ~$400–600 more — essential
for on-site consulting.

---

## Decision log

| # | Decision | Status |
|---|---|---|
| 1 | Subscription model, tiers, professional services | ✓ Resolved |
| 2 | Chemical Calculator modules | Deferred to Phase 2 |
| 3 | Oak Calculator reference values | ✓ Resolved — **revised 2026-09-04**, see corrections |
| 4 | URL namespace | Deferred to Phase 2 |
| 5 | Wine Supply monetization | Deferred to Phase 2 |
| 6 | FAQ submissions — subscriber-only, moderation queue | ✓ Resolved |
| 7 | Tech stack — production-lite MVP | ✓ Resolved |
| 8 | AI Consultant freemium teaser — 3 free questions | ✓ Resolved (delivery only) |
| 9 | Oak Calculator is a multi-line worksheet, print in Phase 1 | ✓ Resolved 2026-09-04 |
| 10 | AI Consultant system prompt, liability, quota semantics | **Open — C-1 to C-8** |

---

## Working notes

**Update source docs before regenerating, not after.** The mini stave correction cost an extra
cycle because `oak-calculator-reference.md` was replaced *after* `/speckit-plan` had already read
the old version. Regeneration doesn't re-read a file that changed in the meantime.

**Late scope additions get the least spec attention.** Print was pulled into 002 near the end and
produced four of the five defects found in adversarial review.

**Run the adversarial review every time.** 001 found seven defects, 002 found five. Both after
lint, typecheck, build, and the full test suite were already green.
