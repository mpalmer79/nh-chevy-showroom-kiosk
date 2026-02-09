"""
Quirk AI Kiosk - Vehicle Data Normalizer
Canonical field names for vehicle data across the entire codebase.

PROBLEM:
  20+ locations do this:
    vehicle.get('Stock Number') or vehicle.get('stockNumber', '')
    vehicle.get('MSRP') or vehicle.get('msrp') or vehicle.get('price', 0)
  because data arrives in different formats from Excel headers, enrichment, and frontend.

SOLUTION:
  One normalizer at the boundary. All downstream code uses canonical field names.
  Canonical convention: camelCase (matches JS/frontend and inventory.py output).

USAGE:
  from app.services.vehicle_normalizer import VF, get_price, get_stock_number

  # Use constants for field access (catches typos at import time)
  price = vehicle[VF.MSRP]
  stock = vehicle[VF.STOCK_NUMBER]

  # Use helpers for defensive access on raw/mixed data
  price = get_price(some_raw_vehicle)
  stock = get_stock_number(some_raw_vehicle)

  # Normalize a whole dict at a boundary
  from app.services.vehicle_normalizer import normalize_vehicle
  clean_vehicle = normalize_vehicle(raw_data)
"""

from typing import Dict, Any, List


class VehicleFields:
    """
    Canonical field name constants.
    Use these instead of string literals for IDE autocomplete and typo protection.
    """
    # Identity
    ID = "id"
    VIN = "vin"
    STOCK_NUMBER = "stockNumber"

    # Basic info
    YEAR = "year"
    MAKE = "make"
    MODEL = "model"
    TRIM = "trim"

    # Body
    BODY = "body"
    BODY_STYLE = "bodyStyle"
    CAB_STYLE = "cabStyle"
    BED_LENGTH = "bedLength"

    # Colors
    EXTERIOR_COLOR = "exteriorColor"
    INTERIOR_COLOR = "interiorColor"

    # Pricing
    MSRP = "msrp"
    PRICE = "price"
    SALE_PRICE = "salePrice"

    # Powertrain
    ENGINE = "engine"
    TRANSMISSION = "transmission"
    DRIVETRAIN = "drivetrain"
    FUEL_TYPE = "fuelType"

    # Economy
    MPG_CITY = "mpgCity"
    MPG_HIGHWAY = "mpgHighway"
    EV_RANGE = "evRange"

    # Capacity
    SEATING_CAPACITY = "seatingCapacity"
    TOWING_CAPACITY = "towingCapacity"

    # Media
    IMAGE_URL = "imageUrl"

    # Metadata
    MILEAGE = "mileage"
    STATUS = "status"
    CONDITION = "condition"
    FEATURES = "features"

    # Enrichment flags
    IS_PERFORMANCE = "isPerformance"
    IS_LUXURY = "isLuxury"
    IS_ELECTRIC = "isElectric"


# Shorthand alias
VF = VehicleFields


# ---
# FIELD MAPPINGS: variant name → canonical name
# ---

_FIELD_MAP: Dict[str, str] = {
    # Stock Number variants (Excel header → camelCase)
    "Stock Number": VF.STOCK_NUMBER,
    "stock_number": VF.STOCK_NUMBER,
    "stockNumber": VF.STOCK_NUMBER,

    # VIN
    "VIN": VF.VIN,
    "vin": VF.VIN,

    # Year
    "Year": VF.YEAR,
    "year": VF.YEAR,

    # Make
    "Make": VF.MAKE,
    "make": VF.MAKE,

    # Model
    "Model": VF.MODEL,
    "model": VF.MODEL,

    # Trim
    "Trim": VF.TRIM,
    "trim": VF.TRIM,

    # Body
    "Body": VF.BODY,
    "body": VF.BODY,
    "Body Type": VF.BODY_STYLE,
    "body_style": VF.BODY_STYLE,
    "bodyStyle": VF.BODY_STYLE,

    # Cab / Bed
    "cabStyle": VF.CAB_STYLE,
    "cab_style": VF.CAB_STYLE,
    "bedLength": VF.BED_LENGTH,
    "bed_length": VF.BED_LENGTH,

    # Colors
    "Exterior Color": VF.EXTERIOR_COLOR,
    "exterior_color": VF.EXTERIOR_COLOR,
    "exteriorColor": VF.EXTERIOR_COLOR,
    "Interior Color": VF.INTERIOR_COLOR,
    "interior_color": VF.INTERIOR_COLOR,
    "interiorColor": VF.INTERIOR_COLOR,

    # Pricing
    "MSRP": VF.MSRP,
    "msrp": VF.MSRP,
    "Price": VF.PRICE,
    "price": VF.PRICE,
    "sale_price": VF.SALE_PRICE,
    "salePrice": VF.SALE_PRICE,

    # Powertrain
    "engine": VF.ENGINE,
    "Engine": VF.ENGINE,
    "transmission": VF.TRANSMISSION,
    "Transmission": VF.TRANSMISSION,
    "drivetrain": VF.DRIVETRAIN,
    "Drivetrain": VF.DRIVETRAIN,
    "fuel_type": VF.FUEL_TYPE,
    "fuelType": VF.FUEL_TYPE,
    "Fuel Type": VF.FUEL_TYPE,

    # Economy
    "mpg_city": VF.MPG_CITY,
    "mpgCity": VF.MPG_CITY,
    "mpg_highway": VF.MPG_HIGHWAY,
    "mpgHighway": VF.MPG_HIGHWAY,
    "evRange": VF.EV_RANGE,
    "ev_range": VF.EV_RANGE,

    # Capacity
    "seatingCapacity": VF.SEATING_CAPACITY,
    "seating_capacity": VF.SEATING_CAPACITY,
    "towingCapacity": VF.TOWING_CAPACITY,
    "towing_capacity": VF.TOWING_CAPACITY,

    # Media
    "image_url": VF.IMAGE_URL,
    "imageUrl": VF.IMAGE_URL,

    # Metadata
    "mileage": VF.MILEAGE,
    "Mileage": VF.MILEAGE,
    "status": VF.STATUS,
    "Status": VF.STATUS,
    "condition": VF.CONDITION,
    "features": VF.FEATURES,
    "Features": VF.FEATURES,

    # ID
    "id": VF.ID,
    "ID": VF.ID,

    # Enrichment flags
    "isPerformance": VF.IS_PERFORMANCE,
    "isLuxury": VF.IS_LUXURY,
    "isElectric": VF.IS_ELECTRIC,

    # Passthrough (not renamed, just standardized)
    "Model Number": "modelNumber",
    "modelNumber": "modelNumber",
    "Cylinders": "cylinders",
    "cylinders": "cylinders",
    "Category": "category",
    "category": "category",
}


# ---
# PUBLIC API
# ---

def normalize_vehicle(vehicle: Dict[str, Any]) -> Dict[str, Any]:
    """
    Normalize a vehicle dict to use canonical field names.

    Unknown keys are passed through unchanged.
    If multiple source fields map to the same canonical name,
    the first non-empty value wins.

    Args:
        vehicle: Raw vehicle dict with potentially mixed field names.

    Returns:
        New dict with canonical field names. Original is not mutated.
    """
    normalized: Dict[str, Any] = {}

    for key, value in vehicle.items():
        canonical = _FIELD_MAP.get(key, key)
        # Prefer first non-None/non-empty value for duplicate mappings
        if canonical in normalized and normalized[canonical]:
            continue
        normalized[canonical] = value

    return normalized


def normalize_inventory(inventory: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Normalize all vehicles in an inventory list."""
    return [normalize_vehicle(v) for v in inventory]


def get_price(vehicle: Dict[str, Any]) -> float:
    """
    Extract the best available price from a vehicle dict.
    Works on both normalized and raw dicts.

    Priority: msrp → MSRP → price → salePrice → 0.0
    """
    for field in [VF.MSRP, "MSRP", VF.PRICE, "Price", VF.SALE_PRICE, "salePrice"]:
        val = vehicle.get(field)
        if val:
            try:
                return float(val)
            except (ValueError, TypeError):
                continue
    return 0.0


def get_stock_number(vehicle: Dict[str, Any]) -> str:
    """
    Extract stock number from a vehicle dict.
    Works on both normalized and raw dicts.
    """
    for field in [VF.STOCK_NUMBER, "Stock Number", "stock_number"]:
        val = vehicle.get(field)
        if val:
            return str(val).strip()
    return ""


def get_display_name(vehicle: Dict[str, Any]) -> str:
    """
    Build a human-readable vehicle description.
    E.g., '2025 Silverado 1500 High Country (Cherry Red)'
    """
    year = vehicle.get(VF.YEAR) or vehicle.get("Year") or ""
    model = vehicle.get(VF.MODEL) or vehicle.get("Model") or ""
    trim = vehicle.get(VF.TRIM) or vehicle.get("Trim") or ""
    color = vehicle.get(VF.EXTERIOR_COLOR) or vehicle.get("Exterior Color") or ""

    parts = [str(year), str(model).strip(), str(trim).strip()]
    name = " ".join(p for p in parts if p)
    if color:
        name += f" ({color})"
    return name
