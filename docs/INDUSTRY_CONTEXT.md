# Industry context

Most engineering portfolios in dealer-tech don't show domain awareness. They
demonstrate that an engineer can build a CRUD app that touches inventory or
deals, but they don't read like the engineer has spent time on a showroom
floor or has any feel for how a deal actually moves from "fresh" to "sold."
This document is here to show that for the NH Chevy Showroom Kiosk, the
domain shaped the design.

In dealership terms, the kiosk is an unattended salesperson on the showroom
floor. Its job is to engage walk-in customers, surface the right vehicle from
real inventory, get a Digital Worksheet started, capture enough contact and
deal context that a human can pick up where the kiosk left off, and — when
the customer is ready — page the right team member by name. It does not
replace closers. It does multiply them.

The single most important design constraint is that **the customer is
already physically in the showroom**. They are not browsing from a couch.
They are standing three feet from the screen, possibly with a spouse, with
maybe twenty minutes of attention before they wander off or get pulled into a
test drive. Every UI affordance, every prompt, every notification routes
through that constraint.

## The DMS and inventory pipeline

### What a DMS is and why it matters

A Dealer Management System is the system of record for a rooftop. It owns
inventory, deals, F&I contracts, service repair orders, parts, accounting,
and payroll. The dealership's day fundamentally runs on its DMS — every
vehicle on the lot has a stock number assigned by the DMS, every deal that
closes is funded through the DMS's accounting module, every service RO
posts back to the DMS for warranty reimbursement.

The big four DMS vendors in North American auto retail are Reynolds &
Reynolds (ERA-IGNITE), CDK Global (CDK Drive), PBS Systems, and Dealertrack
DMS. Tekion is the modern entrant — born cloud-native, pitching a single
platform versus the others' integration-stack approach. The target rooftop
for this kiosk runs PBS, and PBS is the DMS this codebase integrates with.

### How inventory actually moves

PBS exports inventory nightly as an XLSX file dropped to a shared location
(typically an SFTP target or a network share that the dealership's website
provider also pulls from). The kiosk reads `backend/data/inventory.xlsx`
on startup via `backend/app/routers/inventory.py` and refreshes on a
configurable interval. Vehicle records flow through statuses (Available →
Sold → Delivered) which the loader filters down to currently-sellable units.

The kiosk does not write back to PBS. Inventory is read-only. Captured
leads, worksheets, and notifications travel through entirely separate
channels (Slack, SMS, email) so a kiosk bug cannot corrupt the dealer's
inventory database. This is a deliberate posture, not a missing feature.

### Vehicle keys and the GM model decoder

Every Chevrolet vehicle has a multi-character "model number" that encodes
body style, drivetrain, cab configuration, and bed length. PBS exports
those codes verbatim. For example, `CK10543` means a 1500-series Crew Cab
4WD pickup with a 147-inch bed; `CK10906` is a Suburban 4WD; `1MB48` is an
Equinox EV. The full decoder table lives in `backend/app/ai/helpers.py`
as `GM_MODEL_DECODER`, with a `decode_model_number()` helper that
translates codes to customer-facing names. The system prompt
(`backend/app/ai/prompts.py`) also embeds enough of the decoder that the AI
can reason about a vehicle's body style and drivetrain without an extra
tool call. Customers never see `CK10543`; they see "2025 Silverado 1500
Crew Cab 4WD." The decoder is the seam.

## Lead lifecycle and the language of selling cars

Selling cars has its own vocabulary, and the words matter — they encode
where a customer is in the funnel and which team owns the next move.

A "fresh" walks in unsolicited. They become an "up" the moment a
salesperson greets them ("I've got an up"). If the salesperson works them
seriously, the up generates an "opportunity" in the CRM. If contact data
gets captured, the opportunity becomes a "lead." Once a deal sheet is
written up, the lead becomes a "deal in process." When the customer signs
finance paperwork and takes delivery, it's a "sold" — or a "delivery,"
depending on the dealership. If they leave without paper, they are a
"be-back" if they said they'd return, or simply a "walk" if they didn't.

The kiosk's role is to capture as much of that progression as possible
without a salesperson present. Even an unsold customer who interacts with
the kiosk for ten minutes generates more structured follow-up data than a
classic walk: "older man, looked at a Silverado, didn't leave a number"
becomes "Mike, 555-0142, viewed three CK10743s, asked about $700/month
at $5K down, mentioned a 2018 F-150 trade with 80K miles."

### The four-square and why our Digital Worksheet deliberately isn't one

Walk into any traditional dealership and you will eventually see a sheet
of paper (or its tablet equivalent) divided into four quadrants: trade
allowance in one box, cash down in another, monthly payment in the third,
sale price in the fourth. This is the four-square, the dealership
industry's classic negotiation tool. When a customer pushes on payment,
the salesperson juggles the other three squares to land somewhere
acceptable; when they push on trade value, the same juggling happens. The
math is intentionally opaque — the four-square is a tool for the
salesperson, not the customer.

It has earned a reputation. A meaningful percentage of buyers walk in
already braced against being four-squared, because they have read about
it on Reddit or watched a YouTube video about car-buying tactics. The
trust cost is real.

The kiosk's `DigitalWorksheet.tsx` is structurally different by design.
Every line item is itemized — MSRP, dealer discount, manufacturer
rebates, doc fee, title fee, sales tax (zero in NH), trade equity
(positive or negative), down payment, financed amount, APR, term in
months, monthly payment. Every change recalculates everything else
visibly; there is nothing hidden behind a folded corner. We never call it
a four-square in copy, in code identifiers, in commit messages, or in
conversation with users. It is always the "Digital Worksheet" or just
"Worksheet." This is a deliberate trust signal, and it is enforced as a
codebase rule (`CLAUDE.md`).

### Lead scoring tiers

The kiosk scores every conversation in real time using
`backend/app/services/lead_scoring.py`, classifying leads into HOT (70+),
WARM (40–69), and COLD (0–39) on a 0–100 scale. Inputs include message
count, vehicles discussed, whether a budget was shared, whether a trade
was mentioned, whether contact info was captured, whether a worksheet
was generated, and the AI's own assessment of customer interest level.

The thresholds are not arbitrary — they map to the rough taxonomy floor
managers already use. A HOT lead is one a manager wants to know about
right now, and notifications for HOT leads use higher-urgency channels
(typically `SLACK_WEBHOOK_SALES` with immediate paging). WARM leads
route to the standard sales channel for follow-up within minutes. COLD
leads are logged silently for the BDC to work later when they have
bandwidth. Speaking the same dial as the floor managers makes the
kiosk's output legible to the people who already know how to triage on
those words.

## Department routing and notifications

A working dealership is not one team. The kiosk routes notifications by
department because the wrong page to the wrong team produces the wrong
action.

### Sales, F&I, Service, BDC, Internet — who handles what

- **Sales.** The floor team. Greets ups, handles vehicle selection,
  conducts test drives, walks trades, writes up the initial pencil
  (deal proposal). This is who answers a "show me trucks under $50k"
  conversation that ends with "I want to see one in person."
- **F&I (Finance & Insurance).** The back office. Customers go to F&I
  *after* they and Sales have agreed on a deal. F&I structures
  financing, runs credit, sells GAP insurance, sells extended service
  contracts, sells appearance protection, and produces the contracts
  the customer signs. F&I and Sales are different roles, often
  different physical desks, sometimes a strained partnership.
- **Service.** Mechanical and body shop. Mostly out of scope for the
  kiosk, except that a service customer waiting for an oil change is a
  reasonable kiosk audience — they're already on premises, they may be
  thinking about an upgrade, and they trust the brand enough to
  service there.
- **BDC (Business Development Center).** The phone team. They follow up
  on internet leads, on missed calls, on customers who left without
  buying. This is who works COLD leads, and who makes the second-day
  follow-up call to a be-back.
- **Internet.** Sometimes a separate team handling website-sourced
  leads, sometimes folded into BDC. For the kiosk's purposes, BDC and
  Internet are often the same routing target.

`backend/app/services/notifications.py` (NotificationService) routes
notifications to team-specific Slack webhooks (`SLACK_WEBHOOK_SALES`,
`SLACK_WEBHOOK_APPRAISAL`, `SLACK_WEBHOOK_FINANCE`, with a
`SLACK_WEBHOOK_DEFAULT` fallback) and to SMS via Twilio for higher-urgency
events. A trade-in appraisal request goes to the appraisal channel where
the used-car manager and a sales manager will see it; a finance question
goes to F&I; a "ready to talk numbers" event goes to Sales.

### The "be-back" problem

The dealership industry's worst-kept secret is that most be-backs don't
come back. A customer who says "I want to think about it" or "I'll be
back this weekend with my wife" has, statistically, a low probability of
returning. Floor managers know this. Salespeople know this. The
follow-up tools BDCs use exist largely because of this.

The kiosk's value proposition rests partly on capturing more contact
info, more vehicle preferences, and more deal context *before* the
customer leaves. A good BDC follow-up call needs ammunition: which
vehicle did they look at, what payment range did they discuss, what's
their trade situation. When a salesperson talks to a customer for fifteen
minutes and the customer walks, the BDC often has nothing more than a
first name. When the kiosk talks to a customer for fifteen minutes, the
BDC has a transcript, vehicle stock numbers, an approximate budget, and
sometimes a phone number.

## Showroom floor operational reality

The kiosk runs in a real environment, not a controlled one. This shapes
several engineering decisions in ways a pure-software portfolio piece
typically doesn't.

### Hours, traffic patterns, and idle time

Dealerships are busiest on Saturday afternoons and weekday evenings 5–7
PM. There are long stretches of low traffic — Tuesday morning, Wednesday
between lunch and the after-work rush. The kiosk runs unattended for
hours; if it crashes, nobody is actively monitoring the screen. The
`Screensaver.tsx` component at `frontend/src/components/Screensaver.tsx`
runs an attract loop during idle periods to draw walk-bys, and the
backend is built to recover from transient failures without manual
intervention.

### Hardware reality

The target hardware is a 1920×1080 touchscreen in landscape orientation,
typically wall-mounted or pedestal-mounted in a high-foot-traffic area
of the showroom. Touch targets are sized for standing customers, not
seated desk users — minimum 60px instead of the typical 44px web
guideline, because customers stand farther from the screen than they sit
at a desk. There are no hover states; every UI affordance must
communicate without `:hover`. Showroom glare from large windows matters,
which pushes the design toward high-contrast surfaces.

### Trust signals that matter to retail customers

Dealership shoppers walk in wary. The kiosk earns trust by:

- Showing the same dealer-discounted price the customer would see if a
  salesperson walked them to the desk — no bait pricing.
- Itemizing every fee, including doc fee. The doc fee is a contentious
  line item — many customers don't know it exists until they see it on
  the contract — and surfacing it transparently in the worksheet is a
  deliberate signal.
- Surfacing real Google reviews
  (`frontend/src/components/GoogleReviews.tsx`) rather than dealership
  testimonials.
- Offering a QR code that takes the customer's selected vehicle to
  their phone — they leave with their selection in hand whether or not
  they engage with a salesperson.
- Never asking for SSN, driver's license number, or hard credit pull
  data. The kiosk collects soft-touch information only: first name,
  phone number, optional email. Anything that requires a credit pull
  happens at the F&I desk, with a human, on paper.
- Notifying staff via the `notify_staff` tool only when the customer
  *affirmatively asks* for help. The kiosk does not silently page
  Sales the moment someone walks up to the screen.

## What this kiosk does not try to do

- Replace salespeople. The kiosk is a force-multiplier; closing happens
  human-to-human at the desk.
- Run F&I. No credit pulls, no contracts, no GAP or service-contract
  sales — those happen with a human, on paper, at the F&I desk.
- Sync to PBS for inventory updates. Read-only on inventory; PBS
  remains the system of record.
- Handle service appointments. Out of scope; service has its own
  scheduling tools and customer touchpoints.
- Process payments. The kiosk has no PCI scope; no card data is ever
  collected.
- Replace the dealership website. A different surface for a different
  customer state — the website serves people on couches; the kiosk
  serves people on the showroom floor.

## Glossary

- **Be-back** — A customer who left without buying and said they'd
  return. The kiosk exists partly to make be-backs more recoverable.
- **BDC** — Business Development Center. The dealership's phone team
  that works internet leads, missed calls, and be-back follow-ups.
- **Closer** — A senior salesperson or manager called in to finalize a
  deal that the original salesperson can't close alone.
- **DMS** — Dealer Management System. The dealership's system of
  record for inventory, deals, F&I, service, and accounting. PBS is
  the DMS this kiosk targets.
- **Doc fee** — Documentation fee. A per-deal administrative charge,
  varies by state, often a contentious line item with informed buyers.
- **F&I** — Finance & Insurance. The back-office function customers
  visit *after* agreeing on a deal with Sales.
- **Four-square** — The traditional negotiation worksheet with four
  quadrants (trade, down, payment, price). The kiosk's Digital
  Worksheet is deliberately not one.
- **Fresh** — A customer who just walked in and hasn't been greeted.
- **GAP** — Guaranteed Asset Protection. An insurance product F&I
  sells that covers the gap between a vehicle's depreciated value and
  the outstanding loan balance after a total loss.
- **Lot** — Physical vehicle inventory area. "On the lot" means in
  current inventory.
- **MSRP** — Manufacturer's Suggested Retail Price. The sticker price.
- **Pencil** — The act of writing up an initial deal proposal, or the
  proposal itself ("we penciled them at $48k").
- **PBS** — PBS Systems, a major DMS vendor. The DMS this kiosk
  integrates with.
- **Rooftop** — A single dealership location. A dealer group operates
  multiple rooftops; "per-rooftop" pricing or features mean per
  physical store.
- **Stock number** — Internal SKU for a specific vehicle on a specific
  lot. Always present in PBS exports, always shown in the kiosk UI
  alongside any vehicle a customer might want to discuss with staff.
- **Up** — A customer the salesperson is currently working with ("I've
  got an up").
- **VIN** — Vehicle Identification Number. The 17-character unique
  vehicle ID stamped on every car ever built.
- **Walk** — A customer who left without buying and didn't say they'd
  return (verb form: "we walked them"; nominal form: "that was a walk").
