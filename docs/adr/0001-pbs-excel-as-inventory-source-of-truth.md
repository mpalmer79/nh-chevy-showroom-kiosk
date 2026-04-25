# ADR-0001: PBS Excel export as inventory source of truth

**Status:** Accepted
**Date:** 2025-12

## Context

The kiosk needs current vehicle inventory — make, model, trim, VIN, stock
number, MSRP, dealer-discounted price, photos, and feature content. The
target dealership runs PBS Systems as its DMS. Three options were
available:

1. **PBS REST/SOAP API integration.** PBS exposes APIs to authorized
   integrators. Requires a contractual relationship with the dealer
   group, certificate-based auth, and per-rooftop provisioning.
2. **A third-party inventory feed** (HomeNet, vAuto, AutoUplink). These
   normalize PBS data and republish via standard feeds (often XML or
   CSV).
3. **Direct read of PBS's nightly Excel export.** Most PBS-using
   dealerships configure a nightly XLSX dump to a shared location
   (network drive, S3, SFTP) for use by their website provider and
   third-party tools.

## Decision

The kiosk reads inventory from a PBS-format XLSX file at
`backend/data/inventory.xlsx`, loaded at startup and refreshed on a
configurable interval. Loading uses pandas + openpyxl in
`backend/app/routers/inventory.py`, and the indexed result is shared with
`SemanticVehicleRetriever` (`backend/app/services/vehicle_retriever.py`)
for retrieval. The kiosk is **read-only** on PBS inventory — it never
writes back.

## Consequences

**Positive:**
- The kiosk works on day one for any PBS dealership without negotiating
  API access or vendor approval.
- The XLSX export is the same data feed the dealership's website
  provider already consumes — staying in line with established
  integration patterns reduces operational surprise.
- Read-only posture eliminates the failure mode of "the kiosk corrupted
  the live inventory" — a category of risk we explicitly do not want.

**Negative:**
- Inventory freshness is bounded by the export cadence (typically
  nightly). A vehicle sold at noon may still appear available on the
  kiosk until the next morning's load.
- We cannot use PBS-only fields that aren't in the XLSX export
  (extended pricing detail, internal dealer notes).
- Onboarding a non-PBS rooftop (one running CDK or Reynolds) would
  require either a different parser or a feed translator.

**Mitigations:**
- The configurable refresh interval trades data staleness for load on
  the file source.
- For non-PBS rooftops, the parser is small enough (~150 LOC) to swap
  with a sibling implementation — see the loader function in
  `backend/app/routers/inventory.py`.
