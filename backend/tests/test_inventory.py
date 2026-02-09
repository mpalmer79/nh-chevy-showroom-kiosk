"""
Tests for Inventory Router functions
Tests the actual functions in app/routers/inventory.py

Note: Tests focus on function behavior, not internal data structures.
"""
import pytest
from app.routers.inventory import (
    parse_model_code,
    get_image_url,
    get_body_style,
    get_fuel_type,
    get_engine,
    get_transmission,
    parse_drivetrain,
    get_features,
    VEHICLE_IMAGES,
)


class TestParseModelCode:
    """
    Test GM model code parsing.
    
    GM Model Code Format: [Drive][Series][Body]
    - Drive: CC = 2WD, CK = 4WD
    - Series: 10 = 1500, 20 = 2500, 30 = 3500, 54/55/56 = Medium Duty
    - Body: 3-digit code for cab/bed configuration
    """

    # Light-Duty Trucks (1500/2500/3500 Series)

    def test_crew_cab_short_bed_4wd(self):
        """CK10543: 4WD 1500 series, Crew Cab Short Bed"""
        result = parse_model_code('CK10543')
        assert result['cab'] == 'Crew Cab'
        assert result['bed'] == 'Short Bed'
        assert result['drive'] == '4WD'

    def test_crew_cab_standard_bed_4wd(self):
        """CK10743: 4WD 1500 series, Crew Cab Standard Bed"""
        result = parse_model_code('CK10743')
        assert result['cab'] == 'Crew Cab'
        assert result['bed'] == 'Standard Bed'
        assert result['drive'] == '4WD'

    def test_crew_cab_long_bed_4wd(self):
        """CK20943: 4WD 2500 series, Crew Cab Long Bed"""
        result = parse_model_code('CK20943')
        assert result['cab'] == 'Crew Cab'
        assert result['bed'] == 'Long Bed'
        assert result['drive'] == '4WD'

    def test_double_cab_standard_bed_2wd(self):
        """CC10753: 2WD 1500 series, Double Cab Standard Bed"""
        result = parse_model_code('CC10753')
        assert result['cab'] == 'Double Cab'
        assert result['bed'] == 'Standard Bed'
        assert result['drive'] == '2WD'

    def test_double_cab_long_bed_4wd(self):
        """CK30953: 4WD 3500 series, Double Cab Long Bed"""
        result = parse_model_code('CK30953')
        assert result['cab'] == 'Double Cab'
        assert result['bed'] == 'Long Bed'
        assert result['drive'] == '4WD'

    def test_regular_cab_standard_bed_2wd(self):
        """CC10703: 2WD 1500 series, Regular Cab Standard Bed"""
        result = parse_model_code('CC10703')
        assert result['cab'] == 'Regular Cab'
        assert result['bed'] == 'Standard Bed'
        assert result['drive'] == '2WD'

    def test_regular_cab_long_bed_4wd(self):
        """CK20903: 4WD 2500 series, Regular Cab Long Bed"""
        result = parse_model_code('CK20903')
        assert result['cab'] == 'Regular Cab'
        assert result['bed'] == 'Long Bed'
        assert result['drive'] == '4WD'

    # Medium-Duty Trucks (4500/5500/6500 Series)

    def test_medium_duty_regular_cab_2wd(self):
        """CC56403: 2WD Medium Duty (5500/6500), Regular Cab Chassis"""
        result = parse_model_code('CC56403')
        assert result['cab'] == 'Regular Cab'
        assert result['bed'] == 'Chassis Cab'
        assert result['drive'] == '2WD'

    def test_medium_duty_regular_cab_4wd(self):
        """CK56403: 4WD Medium Duty, Regular Cab Chassis"""
        result = parse_model_code('CK56403')
        assert result['cab'] == 'Regular Cab'
        assert result['bed'] == 'Chassis Cab'
        assert result['drive'] == '4WD'

    def test_medium_duty_crew_cab_2wd(self):
        """CC56443: 2WD Medium Duty, Crew Cab Chassis"""
        result = parse_model_code('CC56443')
        assert result['cab'] == 'Crew Cab'
        assert result['bed'] == 'Chassis Cab'
        assert result['drive'] == '2WD'

    def test_medium_duty_crew_cab_4wd(self):
        """CK54543: 4WD Medium Duty (4500), Crew Cab Chassis"""
        result = parse_model_code('CK54543')
        assert result['cab'] == 'Crew Cab'
        assert result['bed'] == 'Chassis Cab'
        assert result['drive'] == '4WD'

    # Drive Type Tests (CC = 2WD, CK = 4WD)

    def test_cc_prefix_is_2wd(self):
        """CC prefix should always return 2WD"""
        result = parse_model_code('CC10543')
        assert result['drive'] == '2WD'

    def test_ck_prefix_is_4wd(self):
        """CK prefix should always return 4WD"""
        result = parse_model_code('CK10543')
        assert result['drive'] == '4WD'

    # Edge Cases

    def test_empty_string_returns_none(self):
        """Empty string should return all None values"""
        result = parse_model_code('')
        assert result['cab'] is None
        assert result['bed'] is None
        assert result['drive'] is None

    def test_none_input_returns_none(self):
        """None input should return all None values"""
        result = parse_model_code(None)
        assert result['cab'] is None
        assert result['bed'] is None
        assert result['drive'] is None

    def test_non_gm_model_returns_none(self):
        """Non-GM model codes should return None for cab/bed"""
        result = parse_model_code('F-150 XLT')
        assert result['cab'] is None
        assert result['bed'] is None
        assert result['drive'] is None

    def test_invalid_body_code_returns_none_for_cab(self):
        """Valid prefix but invalid body code should return None for cab/bed"""
        result = parse_model_code('CK10999')  # 999 is not a valid body code
        assert result['drive'] == '4WD'  # Drive should still be parsed
        assert result['cab'] is None
        assert result['bed'] is None

    def test_lowercase_input_is_handled(self):
        """Lowercase input should be handled correctly"""
        result = parse_model_code('ck10543')
        assert result['cab'] == 'Crew Cab'
        assert result['drive'] == '4WD'

    def test_whitespace_is_trimmed(self):
        """Whitespace should be trimmed"""
        result = parse_model_code('  CK10543  ')
        assert result['cab'] == 'Crew Cab'
        assert result['drive'] == '4WD'


class TestGetImageUrl:
    """Test vehicle image URL selection"""

    def test_corvette_image(self):
        url = get_image_url('Corvette Stingray')
        assert 'corvette' in url.lower() or url == VEHICLE_IMAGES['corvette']

    def test_silverado_1500_image(self):
        url = get_image_url('Silverado 1500 LT')
        assert url == VEHICLE_IMAGES['silverado']

    def test_silverado_2500hd_image(self):
        url = get_image_url('Silverado 2500HD High Country')
        assert url == VEHICLE_IMAGES['silverado_hd']

    def test_silverado_ev_image(self):
        url = get_image_url('Silverado EV RST')
        assert url == VEHICLE_IMAGES['silverado_ev']

    def test_tahoe_image(self):
        url = get_image_url('Tahoe Z71')
        assert url == VEHICLE_IMAGES['tahoe']

    def test_equinox_image(self):
        url = get_image_url('Equinox RS')
        assert url == VEHICLE_IMAGES['equinox']

    def test_equinox_ev_image(self):
        url = get_image_url('Equinox EV')
        assert url == VEHICLE_IMAGES['equinox_ev']

    def test_unknown_model_returns_default(self):
        url = get_image_url('Unknown Model XYZ')
        assert url == VEHICLE_IMAGES['default']


class TestGetBodyStyle:
    """Test body style classification"""

    def test_silverado_is_truck(self):
        result = get_body_style('PKUP', 'Silverado 1500', None)
        assert result == 'Truck'

    def test_colorado_is_truck(self):
        result = get_body_style('', 'Colorado ZR2', None)
        assert result == 'Truck'

    def test_tahoe_is_suv(self):
        result = get_body_style('', 'Tahoe', None)
        assert result == 'SUV'

    def test_corvette_is_coupe(self):
        result = get_body_style('COUPE', 'Corvette Stingray', None)
        assert result == 'Coupe'

    def test_malibu_is_sedan(self):
        result = get_body_style('', 'Malibu LT', None)
        assert result == 'Sedan'

    def test_express_is_van(self):
        result = get_body_style('', 'Express', None)
        assert result == 'Van'


class TestGetFuelType:
    """Test fuel type detection"""

    def test_ev_model(self):
        assert get_fuel_type('Silverado EV') == 'Electric'
        assert get_fuel_type('Equinox EV') == 'Electric'
        assert get_fuel_type('Bolt EV') == 'Electric'

    def test_eray_is_hybrid(self):
        assert get_fuel_type('Corvette E-Ray') == 'Hybrid'

    def test_regular_model_is_gasoline(self):
        assert get_fuel_type('Silverado 1500') == 'Gasoline'
        assert get_fuel_type('Tahoe') == 'Gasoline'


class TestGetEngine:
    """Test engine derivation"""

    def test_ev_engine(self):
        assert get_engine(0, 'Silverado EV') == 'Electric Motor'

    def test_corvette_engine(self):
        assert get_engine(8, 'Corvette Stingray') == '6.2L V8'

    def test_corvette_eray_engine(self):
        assert get_engine(8, 'Corvette E-Ray') == '6.2L V8 + Electric Motor'

    def test_v8_hd_truck(self):
        assert get_engine(8, 'Silverado 2500HD') == '6.6L V8'

    def test_v6_engine(self):
        assert get_engine(6, 'Traverse') == '3.6L V6'

    def test_turbo_four(self):
        assert get_engine(4, 'Equinox') == '2.0L Turbo I4'


class TestGetTransmission:
    """Test transmission derivation"""

    def test_ev_transmission(self):
        assert get_transmission('Silverado EV') == 'Single-Speed Direct Drive'

    def test_corvette_transmission(self):
        assert get_transmission('Corvette') == '8-Speed Dual Clutch'

    def test_truck_transmission(self):
        assert get_transmission('Silverado 1500') == '10-Speed Automatic'

    def test_default_transmission(self):
        assert get_transmission('Equinox') == '9-Speed Automatic'


class TestParseDrivetrain:
    """Test drivetrain parsing"""

    def test_ck_model_is_4wd(self):
        assert parse_drivetrain('', 'CK10543') == '4WD'

    def test_corvette_is_rwd(self):
        assert parse_drivetrain('', 'Corvette Stingray') == 'RWD'

    def test_corvette_eray_is_awd(self):
        assert parse_drivetrain('', 'Corvette E-Ray') == 'AWD'

    def test_4wd_in_body(self):
        assert parse_drivetrain('4WD CREW', '') == '4WD'

    def test_awd_in_body(self):
        assert parse_drivetrain('AWD SUV', '') == 'AWD'

    def test_default_is_fwd(self):
        assert parse_drivetrain('', 'Equinox') == 'FWD'


class TestGetFeatures:
    """Test feature generation"""

    def test_base_features_always_present(self):
        features = get_features('LS', 'Silverado')
        assert 'Apple CarPlay' in features
        assert 'Android Auto' in features
        assert 'Backup Camera' in features

    def test_lt_trim_adds_features(self):
        features = get_features('LT', 'Equinox')
        assert 'Heated Seats' in features
        assert 'Remote Start' in features

    def test_z71_trim_adds_offroad(self):
        features = get_features('Z71', 'Tahoe')
        assert 'Z71 Off-Road Package' in features

    def test_high_country_adds_premium(self):
        features = get_features('High Country', 'Silverado')
        assert 'Leather Seats' in features
        assert 'Bose Audio' in features

    def test_ev_adds_ev_features(self):
        features = get_features('RST', 'Silverado EV')
        assert 'One-Pedal Driving' in features
        assert 'DC Fast Charging' in features


class TestParseModelCodeBehavior:
    """
    Test parse_model_code behavior comprehensively.
    
    These tests verify the function produces valid outputs for all supported
    configurations without testing internal data structures.
    """

    def test_all_light_duty_cab_types_supported(self):
        """Verify all light-duty cab types can be parsed"""
        # Regular Cab
        result = parse_model_code('CK10703')
        assert result['cab'] == 'Regular Cab'
        
        # Double Cab
        result = parse_model_code('CK10753')
        assert result['cab'] == 'Double Cab'
        
        # Crew Cab
        result = parse_model_code('CK10543')
        assert result['cab'] == 'Crew Cab'

    def test_all_light_duty_bed_types_supported(self):
        """Verify all light-duty bed lengths can be parsed"""
        # Short Bed (Crew Cab only)
        result = parse_model_code('CK10543')
        assert result['bed'] == 'Short Bed'
        
        # Standard Bed
        result = parse_model_code('CK10703')
        assert result['bed'] == 'Standard Bed'
        
        # Long Bed
        result = parse_model_code('CK10903')
        assert result['bed'] == 'Long Bed'

    def test_medium_duty_chassis_cab_supported(self):
        """Verify medium-duty chassis cab configurations are supported"""
        result = parse_model_code('CC56403')
        assert result['cab'] == 'Regular Cab'
        assert result['bed'] == 'Chassis Cab'

    def test_all_series_supported(self):
        """Verify 1500, 2500, 3500 series are all supported"""
        # 1500 series
        result = parse_model_code('CK10543')
        assert result['cab'] is not None
        
        # 2500 series
        result = parse_model_code('CK20543')
        assert result['cab'] is not None
        
        # 3500 series
        result = parse_model_code('CK30543')
        assert result['cab'] is not None


class TestVehicleImages:
    """Test vehicle images mapping"""

    def test_all_urls_are_https(self):
        for model, url in VEHICLE_IMAGES.items():
            assert url.startswith('https://'), f"{model} URL not HTTPS"

    def test_default_image_exists(self):
        assert 'default' in VEHICLE_IMAGES

    def test_key_models_have_images(self):
        required = ['corvette', 'silverado', 'tahoe', 'equinox', 'colorado']
        for model in required:
            assert model in VEHICLE_IMAGES
