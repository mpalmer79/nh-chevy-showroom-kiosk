"""
Inventory Router - Handles vehicle inventory endpoints
Reads from PBS DMS Excel export
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from pydantic import BaseModel
import pandas as pd
import os
import re
import httpx

router = APIRouter()


# Pydantic models for response schema
class Vehicle(BaseModel):
    id: str
    vin: str
    year: int
    make: str
    model: str
    trim: str
    body: Optional[str] = None  # Raw body field (e.g., "4WD Reg Cab 126\"")
    bodyStyle: str
    exteriorColor: str
    interiorColor: str
    mileage: int
    price: float
    msrp: Optional[float] = None
    engine: str
    transmission: str
    drivetrain: str
    fuelType: str
    mpgCity: Optional[int] = None
    mpgHighway: Optional[int] = None
    evRange: Optional[int] = None
    features: List[str]
    imageUrl: str
    status: str
    stockNumber: str
    cabStyle: Optional[str] = None
    bedLength: Optional[str] = None


class InventoryResponse(BaseModel):
    vehicles: List[Vehicle]
    total: int
    featured: Optional[List[Vehicle]] = None


# Body type mapping from PBS codes
BODY_TYPE_MAP = {
    'PKUP': 'Truck',
    'FLTBD': 'Truck',
    'VAN': 'Van',
    'COUPE': 'Coupe',
    'CONVT': 'Convertible',
    'APURP': 'SUV',
}

# Category mapping
CATEGORY_MAP = {
    'ON DEALER LOT': 'In Stock',
    'ON DEALER LOT ': 'In Stock',
    'IN TRANSIT': 'In Transit',
    'IN TRANSIT SOLD': 'Sold - In Transit',
}


# ---
# GM MODEL CODE DECODER
# ---

# Body code mapping for light-duty trucks (Silverado 1500/2500/3500)
BODY_CODE_MAP_LIGHT_DUTY = {
    '703': {'cab': 'Regular Cab', 'bed': 'Standard Bed'},
    '903': {'cab': 'Regular Cab', 'bed': 'Long Bed'},
    '753': {'cab': 'Double Cab', 'bed': 'Standard Bed'},
    '953': {'cab': 'Double Cab', 'bed': 'Long Bed'},
    '543': {'cab': 'Crew Cab', 'bed': 'Short Bed'},
    '743': {'cab': 'Crew Cab', 'bed': 'Standard Bed'},
    '943': {'cab': 'Crew Cab', 'bed': 'Long Bed'},
}

# Body code mapping for Medium Duty trucks (Silverado 4500/5500/6500)
BODY_CODE_MAP_MEDIUM_DUTY = {
    '403': {'cab': 'Regular Cab', 'bed': 'Chassis Cab'},
    '503': {'cab': 'Regular Cab', 'bed': 'Chassis Cab'},
    '443': {'cab': 'Crew Cab', 'bed': 'Chassis Cab'},
    '543': {'cab': 'Crew Cab', 'bed': 'Chassis Cab'},
}


def parse_model_code(model_str: str) -> dict:
    """
    Parse GM model code to extract cab style, bed length, and drive type.
    
    Format: CC/CK + Series (2 digits) + Body Code (3 digits)
    Examples:
      - CK10543: 4WD, 1500 series, Crew Cab Short Bed
      - CC20903: 2WD, 2500 series, Regular Cab Long Bed  
      - CC56403: 2WD, Medium Duty (5500/6500), Regular Cab Chassis
    
    Drive codes:
      - CC = 2WD (Conventional Cab, 2-wheel drive)
      - CK = 4WD (Conventional Cab, K = 4-wheel drive)
    """
    result = {'cab': None, 'bed': None, 'drive': None}
    
    if not model_str:
        return result
    
    model_upper = model_str.upper().strip()
    
    # Pattern: CC or CK + 2 digits (series) + 3 digits (body code)
    pattern = r'^(CC|CK)(\d{2})(\d{3})$'
    match = re.match(pattern, model_upper)
    
    if not match:
        return result
    
    drive_code = match.group(1)
    series_code = match.group(2)
    body_code = match.group(3)
    
    # Drive type: CC = 2WD, CK = 4WD
    result['drive'] = '4WD' if drive_code == 'CK' else '2WD'
    
    # Determine if light-duty or medium-duty based on series
    series_int = int(series_code)
    
    if series_int in [10, 20, 30]:
        # Light-duty: 1500, 2500, 3500
        if body_code in BODY_CODE_MAP_LIGHT_DUTY:
            result['cab'] = BODY_CODE_MAP_LIGHT_DUTY[body_code]['cab']
            result['bed'] = BODY_CODE_MAP_LIGHT_DUTY[body_code]['bed']
    elif series_int >= 40:
        # Medium-duty: 4500, 5500, 6500 (series codes 54, 55, 56, etc.)
        if body_code in BODY_CODE_MAP_MEDIUM_DUTY:
            result['cab'] = BODY_CODE_MAP_MEDIUM_DUTY[body_code]['cab']
            result['bed'] = BODY_CODE_MAP_MEDIUM_DUTY[body_code]['bed']
    
    return result


# ---
# VEHICLE IMAGES - DIRECT Wikimedia Commons CDN URLs
# These are DIRECT links that load immediately - NO redirects
# All images are actual Chevrolet vehicles from Wikimedia Commons
# ---

VEHICLE_IMAGES = {
    # Corvette - Red C8 Stingray
    'corvette': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/2020_Chevrolet_Corvette_C8_rearview_cropped.jpg/800px-2020_Chevrolet_Corvette_C8_rearview_cropped.jpg',
    
    # Camaro - Yellow 2019 Camaro 2SS
    'camaro': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/2019_Chevrolet_Camaro_2SS%2C_front_9.30.19.jpg/800px-2019_Chevrolet_Camaro_2SS%2C_front_9.30.19.jpg',
    
    # Silverado 1500 - Black Trail Boss
    'silverado': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/2019_Chevrolet_Silverado_LT_Trail_Boss%2C_front_9.28.19.jpg/800px-2019_Chevrolet_Silverado_LT_Trail_Boss%2C_front_9.28.19.jpg',
    
    # Silverado HD 2500/3500 - White High Country
    'silverado_hd': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/2020_Chevrolet_Silverado_2500HD_High_Country%2C_front_2.22.20.jpg/800px-2020_Chevrolet_Silverado_2500HD_High_Country%2C_front_2.22.20.jpg',
    
    # Colorado - Black ZR2 Midnight
    'colorado': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/2021_Chevrolet_Colorado_ZR2_Midnight%2C_front_9.26.21.jpg/800px-2021_Chevrolet_Colorado_ZR2_Midnight%2C_front_9.26.21.jpg',
    
    # Tahoe - Black Z71
    'tahoe': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/2021_Chevrolet_Tahoe_Z71%2C_front_8.16.20.jpg/800px-2021_Chevrolet_Tahoe_Z71%2C_front_8.16.20.jpg',
    
    # Suburban - Black High Country
    'suburban': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/2021_Chevrolet_Suburban_High_Country%2C_front_2.27.21.jpg/800px-2021_Chevrolet_Suburban_High_Country%2C_front_2.27.21.jpg',
    
    # Traverse - Gray RS
    'traverse': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/2018_Chevrolet_Traverse_High_Country%2C_front_7.2.18.jpg/800px-2018_Chevrolet_Traverse_High_Country%2C_front_7.2.18.jpg',
    
    # Equinox - Black RS
    'equinox': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/2022_Chevrolet_Equinox_RS_AWD_in_Mosaic_Black_Metallic%2C_Front_Left%2C_01-22-2022.jpg/800px-2022_Chevrolet_Equinox_RS_AWD_in_Mosaic_Black_Metallic%2C_Front_Left%2C_01-22-2022.jpg',
    
    # Trailblazer - Bronze RS
    'trailblazer': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/2021_Chevrolet_Trailblazer_RS_AWD_in_Zeus_Bronze_Metallic%2C_Front_Left%2C_11-06-2020.jpg/800px-2021_Chevrolet_Trailblazer_RS_AWD_in_Zeus_Bronze_Metallic%2C_Front_Left%2C_11-06-2020.jpg',
    
    # Trax - Green 2RS
    'trax': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/2024_Chevrolet_Trax_2RS_in_Cacti_Green%2C_Front_Left%2C_06-15-2023.jpg/800px-2024_Chevrolet_Trax_2RS_in_Cacti_Green%2C_Front_Left%2C_06-15-2023.jpg',
    
    # Blazer - Red RS
    'blazer': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/2019_Chevrolet_Blazer_RS_AWD%2C_front_9.1.19.jpg/800px-2019_Chevrolet_Blazer_RS_AWD%2C_front_9.1.19.jpg',
    
    # Malibu - Gray RS
    'malibu': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/2019_Chevrolet_Malibu_RS%2C_front_11.3.19.jpg/800px-2019_Chevrolet_Malibu_RS%2C_front_11.3.19.jpg',
    
    # Bolt EV/EUV - Silver Premier
    'bolt': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/2017_Chevrolet_Bolt_EV_Premier_in_Kinetic_Blue_Metallic%2C_front_left.jpg/800px-2017_Chevrolet_Bolt_EV_Premier_in_Kinetic_Blue_Metallic%2C_front_left.jpg',
    
    # Express Van - White
    'express': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Chevrolet_Express_%28facelift%29.jpg/800px-Chevrolet_Express_%28facelift%29.jpg',
    
    # Silverado EV - White RST
    'silverado_ev': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/2024_Chevrolet_Silverado_EV_RST%2C_front_NYIAS_2022.jpg/800px-2024_Chevrolet_Silverado_EV_RST%2C_front_NYIAS_2022.jpg',
    
    # Equinox EV - Blue
    'equinox_ev': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Chevrolet_Equinox_EV_3RS_eAWD_%28front%29%2C_NYIAS_2024.jpg/800px-Chevrolet_Equinox_EV_3RS_eAWD_%28front%29%2C_NYIAS_2024.jpg',
    
    # Default fallback - Tahoe SUV
    'default': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/2021_Chevrolet_Tahoe_Z71%2C_front_8.16.20.jpg/800px-2021_Chevrolet_Tahoe_Z71%2C_front_8.16.20.jpg',
}


def get_image_url(model: str, exterior_color: str = '', cab_style: str = None) -> str:
    """Get reliable Wikimedia Commons image URL based on model type."""
    model_lower = model.lower()
    
    # Corvette
    if 'corvette' in model_lower:
        return VEHICLE_IMAGES['corvette']
    
    # Camaro
    if 'camaro' in model_lower:
        return VEHICLE_IMAGES['camaro']
    
    # Silverado EV (check before regular Silverado)
    if 'silverado' in model_lower and 'ev' in model_lower:
        return VEHICLE_IMAGES['silverado_ev']
    
    # Silverado HD trucks
    if 'silverado' in model_lower:
        if '2500' in model_lower or '3500' in model_lower or 'hd' in model_lower:
            return VEHICLE_IMAGES['silverado_hd']
        return VEHICLE_IMAGES['silverado']
    
    # Colorado
    if 'colorado' in model_lower:
        return VEHICLE_IMAGES['colorado']
    
    # Tahoe
    if 'tahoe' in model_lower:
        return VEHICLE_IMAGES['tahoe']
    
    # Suburban
    if 'suburban' in model_lower:
        return VEHICLE_IMAGES['suburban']
    
    # Traverse
    if 'traverse' in model_lower:
        return VEHICLE_IMAGES['traverse']
    
    # Equinox EV (check before regular Equinox)
    if 'equinox' in model_lower and 'ev' in model_lower:
        return VEHICLE_IMAGES['equinox_ev']
    
    # Equinox
    if 'equinox' in model_lower:
        return VEHICLE_IMAGES['equinox']
    
    # Trailblazer
    if 'trailblazer' in model_lower:
        return VEHICLE_IMAGES['trailblazer']
    
    # Trax
    if 'trax' in model_lower:
        return VEHICLE_IMAGES['trax']
    
    # Blazer
    if 'blazer' in model_lower:
        return VEHICLE_IMAGES['blazer']
    
    # Malibu
    if 'malibu' in model_lower:
        return VEHICLE_IMAGES['malibu']
    
    # Bolt EV/EUV
    if 'bolt' in model_lower:
        return VEHICLE_IMAGES['bolt']
    
    # Express
    if 'express' in model_lower:
        return VEHICLE_IMAGES['express']
    
    # Default
    return VEHICLE_IMAGES['default']


# ---
# HELPER FUNCTIONS
# ---

def get_engine(cylinders, model: str) -> str:
    """Derive engine string from cylinders and model"""
    model_upper = model.upper()
    
    if 'EV' in model_upper or 'ELECTRIC' in model_upper:
        return 'Electric Motor'
    
    if 'CORVETTE' in model_upper:
        if 'E-RAY' in model_upper:
            return '6.2L V8 + Electric Motor'
        return '6.2L V8'
    
    try:
        cyl = int(cylinders)
        if cyl == 8:
            if 'HD' in model_upper or '2500' in model_upper or '3500' in model_upper:
                return '6.6L V8'
            return '6.2L V8'
        elif cyl == 6:
            return '3.6L V6'
        elif cyl == 4:
            return '2.0L Turbo I4'
        elif cyl == 3:
            return '1.2L Turbo I3'
    except (ValueError, TypeError):
        pass
    
    return '2.0L Turbo'


def get_transmission(model: str) -> str:
    """Derive transmission from model"""
    model_upper = model.upper()
    
    if 'EV' in model_upper:
        return 'Single-Speed Direct Drive'
    if 'CORVETTE' in model_upper:
        return '8-Speed Dual Clutch'
    if 'SILVERADO' in model_upper or 'COLORADO' in model_upper:
        return '10-Speed Automatic'
    
    return '9-Speed Automatic'


def parse_drivetrain(body: str, model: str = '') -> str:
    """Parse drivetrain from PBS Body field"""
    model_upper = model.upper() if model else ''
    
    if 'CORVETTE' in model_upper:
        if 'E-RAY' in model_upper:
            return 'AWD'
        return 'RWD'
    
    if 'CK' in model_upper or '4WD' in model_upper or '4X4' in model_upper:
        return '4WD'
    
    if not body or pd.isna(body):
        return 'FWD'
    
    body_upper = str(body).upper()
    if '4WD' in body_upper or '4X4' in body_upper:
        return '4WD'
    if 'AWD' in body_upper:
        return 'AWD'
    if 'RWD' in body_upper:
        return 'RWD'
    
    return 'FWD'


def get_fuel_type(model: str) -> str:
    """Determine fuel type from model"""
    model_upper = model.upper()
    
    if 'EV' in model_upper or 'ELECTRIC' in model_upper:
        return 'Electric'
    if 'E-RAY' in model_upper:
        return 'Hybrid'
    
    return 'Gasoline'


def get_mpg(model: str):
    """Get MPG estimates based on model"""
    model_upper = model.upper()
    
    if 'EV' in model_upper:
        return None, None, 300
    
    if 'SILVERADO' in model_upper or 'COLORADO' in model_upper:
        if '2500' in model_upper or '3500' in model_upper:
            return 15, 19, None
        return 17, 23, None
    
    if 'TAHOE' in model_upper or 'SUBURBAN' in model_upper:
        return 16, 21, None
    if 'TRAVERSE' in model_upper:
        return 20, 27, None
    if 'EQUINOX' in model_upper:
        return 26, 31, None
    if 'TRAILBLAZER' in model_upper:
        return 28, 33, None
    if 'TRAX' in model_upper:
        return 28, 32, None
    if 'CORVETTE' in model_upper:
        return 16, 24, None
    
    return 24, 30, None


def get_features(trim: str, model: str) -> List[str]:
    """Generate feature list based on trim and model"""
    features = ['Apple CarPlay', 'Android Auto', 'Backup Camera']
    
    trim_upper = (trim or '').upper()
    model_upper = model.upper()
    
    if 'LT' in trim_upper or 'RS' in trim_upper:
        features.extend(['Heated Seats', 'Remote Start'])
    
    if 'Z71' in trim_upper:
        features.extend(['Z71 Off-Road Package', 'Skid Plates'])
    
    if 'ZR2' in trim_upper:
        features.extend(['ZR2 Off-Road Package', 'Multimatic DSSV Dampers'])
    
    if 'TRAIL BOSS' in trim_upper:
        features.extend(['Trail Boss Package', 'Lifted Suspension'])
    
    if 'PREMIER' in trim_upper or 'HIGH COUNTRY' in trim_upper:
        features.extend(['Leather Seats', 'Bose Audio', 'Panoramic Sunroof'])
    
    if 'Z06' in trim_upper or 'Z06' in model_upper:
        features.extend(['Z06 Performance Package', 'Carbon Fiber Aero'])
    
    if 'CORVETTE' in model_upper:
        features.extend(['Performance Exhaust', 'Head-Up Display'])
    
    if 'EV' in model_upper:
        features.extend(['One-Pedal Driving', 'DC Fast Charging'])
    
    return list(set(features))


def get_body_style(body_type: str, model: str, cab_style: str = None) -> str:
    """Determine body style from PBS data and model info"""
    model_upper = model.upper()
    
    if 'SILVERADO' in model_upper or 'COLORADO' in model_upper:
        return 'Truck'
    
    if body_type and body_type.strip() in BODY_TYPE_MAP:
        return BODY_TYPE_MAP[body_type.strip()]
    
    if any(x in model_upper for x in ['TAHOE', 'SUBURBAN', 'TRAVERSE', 'EQUINOX', 'TRAILBLAZER', 'TRAX', 'BLAZER']):
        return 'SUV'
    if 'CORVETTE' in model_upper or 'CAMARO' in model_upper:
        return 'Coupe'
    if 'MALIBU' in model_upper:
        return 'Sedan'
    if 'EXPRESS' in model_upper:
        return 'Van'
    if 'BOLT' in model_upper:
        return 'Electric'
    
    return 'SUV'


# ---
# INVENTORY LOADING
# ---

def load_inventory_from_excel() -> List[dict]:
    """Load and transform PBS Excel export to vehicle records"""
    
    possible_paths = [
        os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'inventory.xlsx'),
        '/app/data/inventory.xlsx',
        'data/inventory.xlsx',
        'inventory.xlsx',
    ]
    
    excel_path = None
    for path in possible_paths:
        if os.path.exists(path):
            excel_path = path
            break
    
    if not excel_path:
        print("Warning: No inventory file found, using empty inventory")
        return []
    
    try:
        df = pd.read_excel(excel_path)
        print(f"Reading inventory from {excel_path}")
    except Exception as e:
        print(f"Error reading inventory: {e}")
        return []
    
    vehicles = []
    
    for idx, row in df.iterrows():
        try:
            msrp = float(row.get('MSRP', 0) or 0)
            if msrp <= 0:
                continue
            
            model = str(row.get('Model', ''))
            model_number = str(row.get('Model Number', ''))  # CC56403, CK10543, etc.
            trim = str(row.get('Trim', ''))
            body = str(row.get('Body', ''))
            body_type = str(row.get('Body Type', ''))
            cylinders = row.get('Cylinders', 0)
            exterior_color = str(row.get('Exterior Color', '')).strip()
            
            # Parse Model Number (not Model) to get cab style from GM code
            model_info = parse_model_code(model_number)
            cab_style = model_info.get('cab')
            bed_length = model_info.get('bed')
            
            # Fallback: parse cab style from Body field (e.g., "4WD Reg Cab 126\"")
            if not cab_style and body:
                body_lower = body.lower()
                if 'crew cab' in body_lower:
                    cab_style = 'Crew Cab'
                elif 'double cab' in body_lower or 'dbl cab' in body_lower:
                    cab_style = 'Double Cab'
                elif 'reg cab' in body_lower or 'regular cab' in body_lower:
                    cab_style = 'Regular Cab'
                elif 'ext cab' in body_lower or 'extended cab' in body_lower:
                    cab_style = 'Extended Cab'
            
            drivetrain = model_info.get('drive') or parse_drivetrain(body, model)
            
            fuel_type = get_fuel_type(model)
            mpg_city, mpg_highway, ev_range = get_mpg(model)
            
            vehicle = {
                'id': f"v{str(row.get('Stock Number', idx)).strip()}",
                'vin': str(row.get('VIN', '')).strip(),
                'year': int(row.get('Year', 2024)),
                'make': str(row.get('Make', 'Chevrolet')).strip().title(),
                'model': model.strip().title(),
                'trim': trim.strip(),
                'body': body.strip(),  # Raw body field for filtering (e.g., "4WD Reg Cab 126\"")
                'bodyStyle': get_body_style(body_type, model, cab_style),
                'exteriorColor': exterior_color.title(),
                'interiorColor': 'Jet Black',
                'mileage': 0,
                'price': round(msrp * 0.97, 2),
                'msrp': msrp,
                'engine': get_engine(cylinders, model),
                'transmission': get_transmission(model),
                'drivetrain': drivetrain,
                'fuelType': fuel_type,
                'mpgCity': mpg_city,
                'mpgHighway': mpg_highway,
                'evRange': ev_range,
                'features': get_features(trim, model),
                'imageUrl': get_image_url(model, exterior_color, cab_style),
                'status': CATEGORY_MAP.get(str(row.get('Category', '')).strip(), 'In Stock'),
                'stockNumber': str(row.get('Stock Number', '')).strip(),
                'cabStyle': cab_style,
                'bedLength': bed_length,
            }
            
            vehicles.append(vehicle)
            
        except Exception as e:
            print(f"Error processing row {idx}: {e}")
            continue
    
    return vehicles


# Load inventory on module import
INVENTORY = load_inventory_from_excel()
print(f"Loaded {len(INVENTORY)} vehicles from PBS inventory")


# ---
# HEALTH CHECK HELPER
# ---

def get_vehicle_count() -> int:
    """Get total vehicle count for health checks"""
    return len(INVENTORY)


# ---
# API ENDPOINTS
# ---

@router.get("", response_model=InventoryResponse)
async def get_inventory(
    model: Optional[str] = Query(None, description="Filter by model"),
    body_style: Optional[str] = Query(None, description="Filter by body style"),
    make: Optional[str] = Query(None, description="Filter by make"),
    min_price: Optional[float] = Query(None, description="Minimum price"),
    max_price: Optional[float] = Query(None, description="Maximum price"),
    fuel_type: Optional[str] = Query(None, description="Filter by fuel type"),
    status: Optional[str] = Query(None, description="Filter by status"),
    cab_style: Optional[str] = Query(None, alias="cab_type", description="Filter by cab style"),
):
    """Get all vehicles in inventory with optional filters"""
    vehicles = INVENTORY.copy()
    
    if model:
        model_lower = model.lower()
        vehicles = [v for v in vehicles if model_lower in v["model"].lower()]
    if body_style:
        vehicles = [v for v in vehicles if v["bodyStyle"].lower() == body_style.lower()]
    if make:
        vehicles = [v for v in vehicles if v["make"].lower() == make.lower()]
    if min_price:
        vehicles = [v for v in vehicles if v["price"] >= min_price]
    if max_price:
        vehicles = [v for v in vehicles if v["price"] <= max_price]
    if fuel_type:
        vehicles = [v for v in vehicles if v["fuelType"].lower() == fuel_type.lower()]
    if status:
        vehicles = [v for v in vehicles if status.lower() in v["status"].lower()]
    if cab_style:
        # Match cab style from cabStyle field or body field
        cab_lower = cab_style.lower()
        # Handle abbreviations: "Regular Cab" -> also match "Reg Cab"
        cab_variants = [cab_lower]
        if 'regular' in cab_lower:
            cab_variants.append('reg cab')
        vehicles = [v for v in vehicles if 
                    (v.get("cabStyle") and any(cv in v["cabStyle"].lower() for cv in cab_variants)) or
                    (v.get("body") and any(cv in v["body"].lower() for cv in cab_variants))]
    
    vehicles.sort(key=lambda x: x["price"], reverse=True)
    
    featured = []
    seen_models = set()
    for v in vehicles:
        if v["model"] not in seen_models and len(featured) < 6:
            featured.append(v)
            seen_models.add(v["model"])
    
    return InventoryResponse(
        vehicles=vehicles,
        total=len(vehicles),
        featured=featured
    )


@router.get("/featured", response_model=List[Vehicle])
async def get_featured_vehicles():
    """Get featured vehicles - variety of top models"""
    featured = []
    seen_models = set()
    sorted_inv = sorted(INVENTORY, key=lambda x: x["price"], reverse=True)
    
    for v in sorted_inv:
        model_key = v["model"].split()[0]
        if model_key not in seen_models and len(featured) < 8:
            featured.append(v)
            seen_models.add(model_key)
    
    return featured


@router.get("/search")
async def search_inventory(q: str = Query(..., min_length=1)):
    """Search inventory"""
    query = q.lower()
    results = [
        v for v in INVENTORY
        if query in v["make"].lower()
        or query in v["model"].lower()
        or query in v["vin"].lower()
        or query in v["stockNumber"].lower()
        or query in v["bodyStyle"].lower()
        or query in v["exteriorColor"].lower()
        or query in v["trim"].lower()
        or (v.get("cabStyle") and query in v["cabStyle"].lower())
    ]
    return {"vehicles": results, "total": len(results), "query": q}


@router.get("/models")
async def get_available_models():
    """Get available models for filtering"""
    models = {}
    for v in INVENTORY:
        model = v["model"]
        if model not in models:
            models[model] = {"count": 0, "minPrice": v["price"], "maxPrice": v["price"]}
        models[model]["count"] += 1
        models[model]["minPrice"] = min(models[model]["minPrice"], v["price"])
        models[model]["maxPrice"] = max(models[model]["maxPrice"], v["price"])
    
    return {"models": models, "total": len(models)}


@router.get("/models/{make}")
async def get_models_by_make(make: str, year: Optional[str] = None):
    """
    Get available models for a specific make using NHTSA VPIC API.
    If year is provided, returns only models produced in that year.
    Used for trade-in vehicle selection.
    """
    if not make or len(make) < 2:
        raise HTTPException(status_code=400, detail="Make must be at least 2 characters")
    
    # Use year-filtered endpoint if year provided (more accurate results)
    if year:
        nhtsa_url = f"https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeYear/make/{make}/modelyear/{year}?format=json"
    else:
        nhtsa_url = f"https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMake/{make}?format=json"
    
    # Commercial/fleet vehicle patterns to filter out
    commercial_patterns = [
        r'^W\d',           # W3, W4, W5, W6, W7 (Chevrolet/GMC commercial)
        r'^W\d+',          # W3500, W4500, W5500
        r'Cutaway',        # Cutaway vans
        r'Chassis',        # Chassis cabs
        r'Stripped',       # Stripped chassis
        r'^LCF',           # Low Cab Forward trucks
        r'^NPR',           # Isuzu NPR series
        r'^NQR',           # Isuzu NQR series
        r'^NRR',           # Isuzu NRR series
        r'Conventional',   # V Conventional, etc.
        r'^C\d{4}',        # C4500, C5500, etc. (commercial)
        r'^T\d{3}',        # T170, T270, etc. (commercial)
    ]
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(nhtsa_url)
            response.raise_for_status()
            data = response.json()
            
            # Extract model names from NHTSA response
            results = data.get("Results", [])
            models = []
            
            for item in results:
                model_name = (item.get("Model_Name") or "").strip()
                if not model_name:
                    continue
                    
                # Filter out commercial vehicles
                is_commercial = any(
                    re.search(pattern, model_name, re.IGNORECASE) 
                    for pattern in commercial_patterns
                )
                
                if not is_commercial:
                    models.append(model_name)
            
            # Return sorted unique models
            return sorted(set(models))
            
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="NHTSA API timeout")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"NHTSA API error: {e.response.status_code}")
    except Exception as e:
        # Fallback: return empty list rather than failing completely
        print(f"Error fetching models for {make}: {e}")
        return []


@router.get("/stats")
async def get_inventory_stats():
    """Get inventory statistics"""
    if not INVENTORY:
        return {
            "total": 0,
            "byBodyStyle": {},
            "byStatus": {},
            "byCabStyle": {},
            "priceRange": {"min": 0, "max": 0, "avg": 0}
        }
    
    by_body = {}
    by_status = {}
    by_cab = {}
    
    for v in INVENTORY:
        by_body[v["bodyStyle"]] = by_body.get(v["bodyStyle"], 0) + 1
        by_status[v["status"]] = by_status.get(v["status"], 0) + 1
        if v.get("cabStyle"):
            by_cab[v["cabStyle"]] = by_cab.get(v["cabStyle"], 0) + 1
    
    prices = [v["price"] for v in INVENTORY]
    
    return {
        "total": len(INVENTORY),
        "byBodyStyle": by_body,
        "byStatus": by_status,
        "byCabStyle": by_cab,
        "priceRange": {"min": min(prices), "max": max(prices), "avg": sum(prices) / len(prices)}
    }


@router.get("/{vehicle_id}", response_model=Vehicle)
async def get_vehicle_by_id(vehicle_id: str):
    """Get vehicle by ID"""
    vehicle = next((v for v in INVENTORY if v["id"] == vehicle_id), None)
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return vehicle


@router.get("/vin/{vin}", response_model=Vehicle)
async def get_vehicle_by_vin(vin: str):
    """Get vehicle by VIN"""
    vehicle = next((v for v in INVENTORY if v["vin"].upper() == vin.upper()), None)
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return vehicle


@router.get("/stock/{stock_number}", response_model=Vehicle)
async def get_vehicle_by_stock(stock_number: str):
    """Get vehicle by stock number"""
    vehicle = next((v for v in INVENTORY if v["stockNumber"] == stock_number), None)
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return vehicle
