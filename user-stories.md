# User stories — AI winemaking consulting app

**Project:** ai-winemaking-consultant  
**Authors:** Steve Burch & Michael Chupp  
**AVAs covered:** Lodi · Livermore · Russian River Valley  
**Last updated:** May 2026

---

## How to read these stories

Each story follows the standard format:

> As a **[role]**, I want **[capability]**, so that **[benefit]**.

Stories are grouped by epic and include acceptance criteria. Tags indicate relevant AVAs, months, and feature areas.

---

## Epic 1 — Seasonal scheduling

*The AI agent generates and manages a full-year operations calendar tailored to each AVA and vineyard block.*

---

### US-01 · AVA-specific operations calendar

**As a** vineyard manager, **I want** the AI to automatically generate a month-by-month operations calendar tailored to my AVA (Lodi, Livermore, or Russian River Valley), **so that** I never miss a critical seasonal task.

**Tags:** `Lodi` `Livermore` `Russian River Valley` `calendar` `agent`

**Acceptance criteria:**
- Calendar populates within 5 seconds of selecting an AVA
- Each month shows at least pruning, canopy, pest, harvest, soil, and water tasks where applicable
- Tasks are color-coded by category matching the operations legend
- Calendar updates if AVA is changed mid-season

---

### US-02 · Multi-block dashboard

**As a** vineyard owner, **I want** to manage multiple vineyard blocks across different AVAs from a single dashboard, **so that** I can coordinate operations across properties without switching between systems.

**Tags:** `multi-block` `dashboard` `cross-AVA`

**Acceptance criteria:**
- Dashboard shows all blocks with their AVA, current month tasks, and status
- User can filter view by AVA or operation type
- Conflicting task dates across blocks are flagged visually

---

### US-03 · AI-recommended pruning windows

**As a** vineyard manager, **I want** the AI agent to suggest optimal pruning windows based on historical bud break data and current weather forecasts, **so that** I can time dormant pruning to protect against frost damage.

**Tags:** `pruning` `frost` `weather` `Jan–Feb` `agent`

**Acceptance criteria:**
- Agent pulls 10-day forecast from weather API for vineyard location
- Pruning window recommendation includes frost risk score
- Manager can accept, defer, or override the recommendation with a note
- Deferral triggers a follow-up reminder 3 days later

---

### US-04 · Daily crew task lists

**As a** crew supervisor, **I want** the app to generate daily task lists for field crews based on the seasonal calendar and current vineyard conditions, **so that** crews arrive on site knowing exactly what needs to be done.

**Tags:** `crew` `daily tasks` `field ops`

**Acceptance criteria:**
- Daily task list is available by 6am for the current day
- Tasks include block location, estimated hours, and required equipment
- Completed tasks can be marked done from a mobile-friendly view

---

## Epic 2 — Proactive alerts

*The AI agent monitors conditions and proactively notifies managers before problems become costly.*

---

### US-05 · Powdery mildew spray interval alerts

**As a** vineyard manager, **I want** to receive an automated alert when powdery mildew spray interval thresholds are approaching, **so that** I never miss a spray window during the critical March–July period.

**Tags:** `mildew` `alerts` `spray` `Mar–Jul`

**Acceptance criteria:**
- Alert fires 48 hours before spray interval expires
- Alert includes temperature and humidity conditions affecting risk
- Manager can snooze alert for 24 hours with a required reason
- Alert escalates to vineyard owner if snoozed more than once

---

### US-06 · Botrytis risk alerts (Russian River Valley)

**As a** vineyard manager in Russian River Valley, **I want** the AI to send fog-driven botrytis risk alerts based on overnight temperature and humidity data, **so that** I can tighten spray intervals before infection pressure peaks.

**Tags:** `botrytis` `RRV` `fog` `alert` `Apr–Sep`

**Acceptance criteria:**
- Risk model uses relative humidity > 85% and temps 59–77°F as trigger conditions
- Alert distinguishes between low, moderate, and high botrytis risk
- High-risk alert recommends specific fungicide options with PHI days
- Alerts are suppressed post-harvest for the current block

---

### US-07 · Heat stress alerts (Lodi)

**As a** vineyard owner, **I want** heat stress alerts triggered when forecast temps exceed 100°F in Lodi, **so that** I can activate shade netting and adjust irrigation scheduling before vine damage occurs.

**Tags:** `heat stress` `Lodi` `irrigation` `Jul–Aug` `alert`

**Acceptance criteria:**
- Alert fires when 3-day forecast shows any day above 100°F
- Alert includes recommended irrigation adjustments in acre-feet
- Agent auto-drafts a task to deploy shade netting for crew review

---

### US-08 · Spotted wing drosophila alerts

**As a** vineyard manager, **I want** to receive spotted wing drosophila (SWD) alerts starting in August when trap counts exceed threshold, **so that** I can act before fruit damage becomes economically significant.

**Tags:** `SWD` `pest` `Aug–Sep` `alert`

**Acceptance criteria:**
- Trap count input is available in the mobile app
- Alert fires when weekly trap count exceeds 5 adults per trap
- Alert links to approved treatment options with days-to-harvest restrictions

---

## Epic 3 — Harvest management

*The AI agent helps predict, plan, and coordinate harvest across multiple blocks and AVAs.*

---

### US-09 · Berry sampling and harvest date prediction

**As a** winemaker, **I want** to log berry sample data (Brix, pH, TA) directly in the app and have the AI predict optimal harvest date, **so that** I can plan harvest crews and winery receiving schedules weeks in advance.

**Tags:** `Brix` `pH` `TA` `sampling` `harvest prediction`

**Acceptance criteria:**
- Sample entry form accepts Brix, pH, TA, and berry condition notes
- AI model predicts harvest date with ±3 day confidence interval
- Prediction updates each time new sample data is entered
- Historical sample curves are displayed alongside current season data

---

### US-10 · Cross-AVA harvest scheduling

**As a** vineyard manager, **I want** the AI to compare harvest timing across my Lodi, Livermore, and RRV blocks and flag conflicts in crew scheduling, **so that** I can coordinate labor across regions without overbooking.

**Tags:** `multi-AVA` `crew scheduling` `harvest conflict`

**Acceptance criteria:**
- Harvest windows for all blocks are visualized on a shared calendar
- Overlapping harvest windows are highlighted with crew demand totals
- Manager can drag-adjust harvest windows and see ripeness impact warning

---

### US-11 · Weather-driven harvest timing alerts

**As a** winemaker, **I want** the AI agent to monitor post-veraison weather and alert me if a heat event or rain event could accelerate or compromise harvest timing, **so that** I can make informed pick decisions in real time.

**Tags:** `veraison` `weather` `harvest timing` `Aug–Oct`

**Acceptance criteria:**
- Agent monitors daily weather for registered vineyard GPS coordinates
- Rain event > 0.5 inches triggers botrytis risk escalation for susceptible varieties
- Heat event > 95°F triggers accelerated ripening warning with updated harvest estimate

---

## Epic 4 — Pest & disease management

*The AI agent maintains spray program calendars and adjusts recommendations based on AVA, variety, and real-time conditions.*

---

### US-12 · AVA-specific spray program calendar

**As a** vineyard manager, **I want** a pest and disease calendar that automatically adjusts spray program recommendations based on my AVA, variety, and current season conditions, **so that** I apply the right product at the right time.

**Tags:** `spray program` `pest` `disease` `AVA-specific`

**Acceptance criteria:**
- Spray recommendations are variety-aware (e.g., Pinot Noir vs Zinfandel)
- PHI (pre-harvest interval) days are automatically calculated per product
- Organic vs conventional spray options are clearly distinguished
- Agent flags any schedule conflict between spray PHI and predicted harvest date

---

### US-13 · Spider mite risk alerts (Livermore)

**As a** vineyard manager in Livermore, **I want** the AI to flag elevated spider mite risk during July–August heat events and recommend treatment thresholds, **so that** I can intervene before economic damage threshold is crossed.

**Tags:** `spider mites` `Livermore` `heat` `Jul–Aug`

**Acceptance criteria:**
- Mite risk score is calculated using temp, humidity, and spray history
- Threshold recommendation is expressed as mites-per-leaf count
- Treatment options include both miticide and biological control options

---

## Epic 5 — Water management

*The AI agent generates irrigation schedules based on ET data, soil conditions, and vine growth stage.*

---

### US-14 · ET-based irrigation scheduling

**As a** vineyard manager, **I want** the AI to generate an irrigation schedule based on evapotranspiration (ET) data, soil moisture readings, and vine growth stage, **so that** I apply the right amount of water at each phenological stage.

**Tags:** `irrigation` `ET` `soil moisture` `water management`

**Acceptance criteria:**
- ET data is pulled automatically from CIMIS or equivalent weather station API
- Schedule distinguishes between establishment, canopy growth, and deficit irrigation phases
- Irrigation events are logged and compared to recommendation
- Water use summary is available in acre-feet per month and season

---

### US-15 · Wind-adjusted irrigation (Livermore)

**As a** vineyard manager in Livermore, **I want** wind-adjusted irrigation recommendations that account for elevated evapotranspiration from Altamont Pass winds, **so that** my vines are never stressed by under-irrigation on high-wind days.

**Tags:** `Livermore` `wind` `ET` `irrigation` `Apr–Sep`

**Acceptance criteria:**
- Wind speed data from nearest CIMIS station adjusts ET calculation
- Recommendation increases irrigation runtime when sustained wind > 15 mph
- Alert fires when wind-adjusted ET exceeds irrigation system capacity

---

### US-16 · Regulated deficit irrigation protocol

**As a** vineyard manager, **I want** the AI to recommend regulated deficit irrigation (RDI) protocols starting at veraison, **so that** I can concentrate flavors without pushing vines into severe water stress.

**Tags:** `RDI` `deficit irrigation` `veraison` `Aug–Sep`

**Acceptance criteria:**
- RDI protocol is triggered automatically at confirmed veraison date
- Deficit level is expressed as % of full ET replacement (e.g., 50% ET)
- Stem water potential targets are shown alongside irrigation recommendations
- Agent warns if water stress indicators exceed safe RDI thresholds

---

## Epic 6 — Reporting & insights

*The AI agent generates season-end reports, vintage comparisons, and performance benchmarks.*

---

### US-17 · Season-end operations report

**As a** vineyard owner, **I want** a season-end report summarizing operations, water use, pest pressures, and harvest outcomes by block and AVA, **so that** I can benchmark performance and plan improvements for next year.

**Tags:** `season report` `benchmarking` `analytics` `post-harvest`

**Acceptance criteria:**
- Report is auto-generated within 7 days of final harvest date
- Report includes block-level yield, Brix at harvest, and water use totals
- Pest pressure summary shows spray events and costs per acre
- Report is exportable as PDF and shareable via link

---

### US-18 · Vintage-over-vintage berry sample comparison

**As a** winemaker, **I want** to compare this season's berry sample progression to the previous 3 vintages, **so that** I can contextualize ripening speed and make better harvest timing decisions.

**Tags:** `vintage comparison` `Brix` `sampling` `analytics`

**Acceptance criteria:**
- Vintage comparison chart shows Brix, pH, and TA curves overlaid by year
- Current season is highlighted; prior vintages shown in muted colors
- User can toggle individual vintages on/off
- Harvest date for each vintage is marked on the chart

---

## Story summary

| Epic | Stories | Key roles |
|---|---|---|
| Seasonal scheduling | US-01 – US-04 | Vineyard manager, owner, crew supervisor |
| Proactive alerts | US-05 – US-08 | Vineyard manager, owner |
| Harvest management | US-09 – US-11 | Winemaker, vineyard manager |
| Pest & disease | US-12 – US-13 | Vineyard manager |
| Water management | US-14 – US-16 | Vineyard manager |
| Reporting & insights | US-17 – US-18 | Vineyard owner, winemaker |

**Total: 18 user stories across 6 epics**

---

*Next steps: MoSCoW prioritization · Sprint planning · Gherkin acceptance criteria · Data model design*
