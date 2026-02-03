"""
Tests for Budget Calculation Logic
Covers the calculate_budget tool and affordability calculations
Critical business logic for customer financing

Updated: Now imports from app.services.budget_calculator instead of
duplicating formulas locally. This ensures tests validate the ACTUAL
code that runs in production, not a local copy.
"""

import pytest

from app.services.budget_calculator import (
    calculate_max_vehicle_price,
    calculate_monthly_payment,
    check_affordability,
    BudgetResult,
    AffordabilityResult,
)


# =============================================================================
# HELPER: Adapt BudgetResult to dict for backward-compatible assertions
# =============================================================================

def _budget_to_dict(result: BudgetResult) -> dict:
    """Convert BudgetResult dataclass to dict matching old test expectations."""
    return {
        "down_payment": result.down_payment,
        "monthly_payment": round(result.monthly_payment, 2),
        "apr": result.apr,
        "term_months": result.term_months,
        "financed_amount": round(result.financed_amount, 2),
        "max_vehicle_price": round(result.max_vehicle_price, 2),
        "total_of_payments": round(result.total_of_payments, 2),
        "total_interest": round(result.total_interest, 2),
    }


def _payment_to_dict(result: BudgetResult) -> dict:
    """Convert BudgetResult from calculate_monthly_payment to dict."""
    return {
        "vehicle_price": round(result.max_vehicle_price, 2),
        "down_payment": result.down_payment,
        "financed_amount": round(result.financed_amount, 2),
        "monthly_payment": round(result.monthly_payment, 2),
        "apr": result.apr,
        "term_months": result.term_months,
        "total_of_payments": round(result.total_of_payments, 2),
        "total_interest": round(result.total_interest, 2),
    }


# =============================================================================
# BUDGET CALCULATION TESTS
# =============================================================================

class TestCalculateMaxVehiclePrice:
    """Tests for max vehicle price calculation from budget"""

    def test_standard_budget_calculation(self):
        """Standard case: $5000 down, $500/month @ 7% for 84 months"""
        result = _budget_to_dict(calculate_max_vehicle_price(
            down_payment=5000, monthly_payment=500, apr=7.0, term_months=84
        ))

        assert result["max_vehicle_price"] > 35000
        assert result["max_vehicle_price"] < 40000
        assert result["down_payment"] == 5000
        assert result["monthly_payment"] == 500

    def test_high_down_payment(self):
        """High down payment: $20,000 down, $400/month"""
        result = _budget_to_dict(calculate_max_vehicle_price(
            down_payment=20000, monthly_payment=400, apr=7.0, term_months=84
        ))

        assert result["max_vehicle_price"] > 44000
        assert result["max_vehicle_price"] < 50000

    def test_low_budget(self):
        """Budget buyer: $2000 down, $300/month"""
        result = _budget_to_dict(calculate_max_vehicle_price(
            down_payment=2000, monthly_payment=300, apr=7.0, term_months=84
        ))

        assert result["max_vehicle_price"] > 20000
        assert result["max_vehicle_price"] < 25000

    def test_premium_buyer(self):
        """Premium buyer: $15,000 down, $800/month"""
        result = _budget_to_dict(calculate_max_vehicle_price(
            down_payment=15000, monthly_payment=800, apr=7.0, term_months=84
        ))

        assert result["max_vehicle_price"] > 60000
        assert result["max_vehicle_price"] < 70000

    def test_zero_down_payment(self):
        """Zero down payment scenario"""
        result = _budget_to_dict(calculate_max_vehicle_price(
            down_payment=0, monthly_payment=500, apr=7.0, term_months=84
        ))

        assert result["max_vehicle_price"] > 30000
        assert result["max_vehicle_price"] < 35000
        assert result["down_payment"] == 0

    def test_different_apr(self):
        """Different APR rates"""
        low_apr = _budget_to_dict(calculate_max_vehicle_price(5000, 500, apr=4.0, term_months=84))
        high_apr = _budget_to_dict(calculate_max_vehicle_price(5000, 500, apr=10.0, term_months=84))

        assert low_apr["max_vehicle_price"] > high_apr["max_vehicle_price"]

    def test_different_terms(self):
        """Different loan terms"""
        short_term = _budget_to_dict(calculate_max_vehicle_price(5000, 500, apr=7.0, term_months=60))
        long_term = _budget_to_dict(calculate_max_vehicle_price(5000, 500, apr=7.0, term_months=84))

        assert long_term["max_vehicle_price"] > short_term["max_vehicle_price"]

    def test_zero_apr(self):
        """Zero APR (promotional financing)"""
        result = _budget_to_dict(calculate_max_vehicle_price(
            down_payment=5000, monthly_payment=500, apr=0.0, term_months=84
        ))

        assert result["max_vehicle_price"] == 47000.0
        assert result["total_interest"] == 0.0

    def test_total_interest_calculation(self):
        """Verify total interest is calculated correctly"""
        result = _budget_to_dict(calculate_max_vehicle_price(
            down_payment=5000, monthly_payment=500, apr=7.0, term_months=84
        ))

        assert result["total_of_payments"] == 42000.0
        expected_interest = result["total_of_payments"] - result["financed_amount"]
        assert abs(result["total_interest"] - expected_interest) < 0.01


class TestCalculateMonthlyPayment:
    """Tests for monthly payment calculation from vehicle price"""

    def test_standard_payment_calculation(self):
        """Standard case: $40,000 vehicle, $5,000 down"""
        result = _payment_to_dict(calculate_monthly_payment(
            vehicle_price=40000, down_payment=5000, apr=7.0, term_months=84
        ))

        assert result["monthly_payment"] > 500
        assert result["monthly_payment"] < 600
        assert result["financed_amount"] == 35000.0

    def test_high_price_vehicle(self):
        """Luxury vehicle: $75,000 with $15,000 down"""
        result = _payment_to_dict(calculate_monthly_payment(
            vehicle_price=75000, down_payment=15000, apr=7.0, term_months=84
        ))

        assert result["monthly_payment"] > 850
        assert result["monthly_payment"] < 950
        assert result["financed_amount"] == 60000.0

    def test_budget_vehicle(self):
        """Budget vehicle: $25,000 with $3,000 down"""
        result = _payment_to_dict(calculate_monthly_payment(
            vehicle_price=25000, down_payment=3000, apr=7.0, term_months=84
        ))

        assert result["monthly_payment"] > 300
        assert result["monthly_payment"] < 370
        assert result["financed_amount"] == 22000.0

    def test_zero_down(self):
        """Zero down payment"""
        result = _payment_to_dict(calculate_monthly_payment(
            vehicle_price=35000, down_payment=0, apr=7.0, term_months=84
        ))

        assert result["financed_amount"] == 35000.0
        assert result["monthly_payment"] > 500

    def test_short_term(self):
        """Shorter 60-month term"""
        result = _payment_to_dict(calculate_monthly_payment(
            vehicle_price=40000, down_payment=5000, apr=7.0, term_months=60
        ))

        assert result["monthly_payment"] > 650
        assert result["monthly_payment"] < 750

    def test_zero_apr(self):
        """Zero APR promotional financing"""
        result = _payment_to_dict(calculate_monthly_payment(
            vehicle_price=42000, down_payment=0, apr=0.0, term_months=84
        ))

        assert result["monthly_payment"] == 500.0
        assert result["total_interest"] == 0.0

    def test_total_cost(self):
        """Verify total cost calculations"""
        result = _payment_to_dict(calculate_monthly_payment(
            vehicle_price=40000, down_payment=5000, apr=7.0, term_months=84
        ))

        expected_total = result["monthly_payment"] * 84
        assert abs(result["total_of_payments"] - expected_total) < 1
        assert result["total_interest"] > 0


class TestBudgetRoundTrip:
    """Test that calculations are consistent both directions"""

    def test_price_to_payment_to_price(self):
        """Start with price, get payment, verify we get back same price"""
        original_price = 45000
        down = 5000

        payment_result = calculate_monthly_payment(
            vehicle_price=original_price, down_payment=down, apr=7.0, term_months=84
        )

        price_result = calculate_max_vehicle_price(
            down_payment=down, monthly_payment=payment_result.monthly_payment, apr=7.0, term_months=84
        )

        assert abs(price_result.max_vehicle_price - original_price) < 10

    def test_payment_to_price_to_payment(self):
        """Start with payment, get max price, verify payment matches"""
        target_payment = 600
        down = 8000

        price_result = calculate_max_vehicle_price(
            down_payment=down, monthly_payment=target_payment, apr=7.0, term_months=84
        )

        payment_result = calculate_monthly_payment(
            vehicle_price=price_result.max_vehicle_price, down_payment=down, apr=7.0, term_months=84
        )

        assert abs(payment_result.monthly_payment - target_payment) < 1


class TestEdgeCases:
    """Edge cases and boundary conditions"""

    def test_very_high_payment(self):
        """Very high monthly payment (premium buyer)"""
        result = calculate_max_vehicle_price(
            down_payment=50000, monthly_payment=2000, apr=7.0, term_months=84
        )
        assert result.max_vehicle_price > 150000

    def test_minimum_viable_payment(self):
        """Minimum payment scenario"""
        result = calculate_max_vehicle_price(
            down_payment=1000, monthly_payment=200, apr=7.0, term_months=84
        )
        assert result.max_vehicle_price > 10000

    def test_high_apr_impact(self):
        """High APR significantly reduces buying power"""
        normal_apr = calculate_max_vehicle_price(5000, 500, apr=7.0, term_months=84)
        high_apr = calculate_max_vehicle_price(5000, 500, apr=15.0, term_months=84)

        difference = normal_apr.max_vehicle_price - high_apr.max_vehicle_price
        assert difference > 5000

    def test_term_impact(self):
        """Longer terms increase buying power but cost more"""
        short_term = calculate_max_vehicle_price(5000, 500, apr=7.0, term_months=48)
        long_term = calculate_max_vehicle_price(5000, 500, apr=7.0, term_months=84)

        assert long_term.max_vehicle_price > short_term.max_vehicle_price

        short_interest_ratio = short_term.total_interest / short_term.financed_amount
        long_interest_ratio = long_term.total_interest / long_term.financed_amount
        assert long_interest_ratio > short_interest_ratio


class TestRealWorldScenarios:
    """Real-world customer scenarios"""

    def test_first_time_buyer(self):
        """First-time buyer with limited budget"""
        result = calculate_max_vehicle_price(3000, 350, 7.0, 84)
        assert 24000 < result.max_vehicle_price < 28000

    def test_family_upgrade(self):
        """Family upgrading to SUV/Truck"""
        result = calculate_max_vehicle_price(10000, 700, 7.0, 84)
        assert 53000 < result.max_vehicle_price < 58000

    def test_enthusiast_buyer(self):
        """Enthusiast buying Corvette/Camaro"""
        result = calculate_max_vehicle_price(25000, 1200, 7.0, 84)
        assert 100000 < result.max_vehicle_price < 110000

    def test_commercial_buyer(self):
        """Commercial buyer (work truck)"""
        result = calculate_max_vehicle_price(15000, 800, 7.0, 60)
        assert 50000 < result.max_vehicle_price < 58000

    def test_inventory_filtering(self):
        """Simulate filtering inventory by budget"""
        sample_inventory = [
            {"stock": "M001", "model": "Equinox", "price": 32000},
            {"stock": "M002", "model": "Blazer", "price": 45000},
            {"stock": "M003", "model": "Tahoe", "price": 65000},
            {"stock": "M004", "model": "Traverse", "price": 48000},
            {"stock": "M005", "model": "Corvette", "price": 85000},
        ]

        budget = calculate_max_vehicle_price(20000, 900, 7.0, 84)
        max_price = budget.max_vehicle_price

        affordable = [v for v in sample_inventory if v["price"] <= max_price]

        assert len(affordable) == 4
        assert not any(v["model"] == "Corvette" for v in affordable)


# =============================================================================
# CHECK VEHICLE AFFORDABILITY TESTS
# =============================================================================

class TestCheckVehicleAffordability:
    """Tests for the check_vehicle_affordability tool logic"""

    def _check(self, vehicle_price, down_payment, monthly_payment, apr=7.0, term_months=84):
        """Helper that returns dict matching old test expectations."""
        result = check_affordability(
            vehicle_price=vehicle_price,
            vehicle_description="test vehicle",
            down_payment=down_payment,
            monthly_payment=monthly_payment,
            apr=apr,
            term_months=term_months,
        )
        return {
            "can_afford": result.is_affordable,
            "vehicle_price": result.vehicle_price,
            "max_affordable": round(result.max_affordable, 2),
            "difference": round(-result.gap, 2),  # gap is positive=over, old test used negative=over
            "actual_monthly_payment": round(result.required_monthly, 2),
            "target_monthly_payment": monthly_payment,
            "down_payment": down_payment,
        }

    def test_corvette_3lz_affordability_over_budget(self):
        """
        Customer: $20,000 down, $1,000/month
        Vehicle: 2025 Corvette 3LZ at $130,575
        Expected: NOT affordable (over budget by ~$44,810)
        """
        result = self._check(
            vehicle_price=130575, down_payment=20000, monthly_payment=1000, apr=7.0, term_months=84
        )

        assert result["can_afford"] is False
        assert 85000 < result["max_affordable"] < 86500
        assert result["difference"] < 0
        assert abs(result["difference"]) > 44000
        assert abs(result["difference"]) < 46000
        assert result["actual_monthly_payment"] > result["target_monthly_payment"]

    def test_corvette_1lt_affordability_within_budget(self):
        """
        Same customer budget but checking the 1LT at $77,865
        Expected: AFFORDABLE
        """
        result = self._check(
            vehicle_price=77865, down_payment=20000, monthly_payment=1000, apr=7.0, term_months=84
        )

        assert result["can_afford"] is True
        assert result["difference"] > 0
        assert result["actual_monthly_payment"] < result["target_monthly_payment"]

    def test_affordable_vehicle(self):
        """Test a vehicle that IS affordable"""
        result = self._check(
            vehicle_price=35000, down_payment=10000, monthly_payment=600, apr=7.0, term_months=84
        )

        assert result["can_afford"] is True
        assert result["difference"] > 0
        assert result["actual_monthly_payment"] < result["target_monthly_payment"]

    def test_exactly_at_budget(self):
        """Test vehicle price exactly at max affordable"""
        budget = calculate_max_vehicle_price(5000, 500, 7.0, 84)
        max_price = budget.max_vehicle_price

        result = self._check(
            vehicle_price=max_price, down_payment=5000, monthly_payment=500, apr=7.0, term_months=84
        )

        assert result["can_afford"] is True
        assert abs(result["difference"]) < 1

    def test_slightly_over_budget(self):
        """Test vehicle just $1000 over budget"""
        budget = calculate_max_vehicle_price(5000, 500, 7.0, 84)
        over_budget_price = budget.max_vehicle_price + 1000

        result = self._check(
            vehicle_price=over_budget_price, down_payment=5000, monthly_payment=500, apr=7.0, term_months=84
        )

        assert result["can_afford"] is False
        assert -1100 < result["difference"] < -900

    def test_1lt_vs_3lz_comparison(self):
        """Compare affordability of 1LT ($77,865) vs 3LZ ($130,575) Corvette"""
        down = 20000
        monthly = 1000

        result_1lt = self._check(vehicle_price=77865, down_payment=down, monthly_payment=monthly)
        result_3lz = self._check(vehicle_price=130575, down_payment=down, monthly_payment=monthly)

        assert result_1lt["can_afford"] is True
        assert result_3lz["can_afford"] is False
        assert result_1lt["max_affordable"] == result_3lz["max_affordable"]

    def test_what_it_takes_to_afford_corvette_3lz(self):
        """Calculate what's needed to afford the $130,575 Corvette 3LZ"""
        vehicle_price = 130575

        # Option 1: Keep $1000/month, increase down payment
        budget_1k = calculate_max_vehicle_price(0, 1000, 7.0, 84)
        max_finance = budget_1k.financed_amount
        needed_down = vehicle_price - max_finance + 100  # Add $100 buffer for rounding

        result_high_down = self._check(
            vehicle_price=vehicle_price, down_payment=needed_down, monthly_payment=1000
        )
        assert result_high_down["can_afford"] is True, \
            f"Expected can_afford=True with down={needed_down:.2f}, got difference={result_high_down.get('difference', 'N/A')}"

        # Option 2: Keep $20,000 down, calculate needed monthly
        financed_needed = vehicle_price - 20000
        monthly_rate = 0.07 / 12
        pv_factor = (1 - (1 + monthly_rate) ** -84) / monthly_rate
        needed_monthly = (financed_needed / pv_factor) + 10  # Add $10/mo buffer

        result_high_monthly = self._check(
            vehicle_price=vehicle_price, down_payment=20000, monthly_payment=needed_monthly
        )
        assert result_high_monthly["can_afford"] is True, \
            f"Expected can_afford=True with monthly={needed_monthly:.2f}, got difference={result_high_monthly.get('difference', 'N/A')}"


# =============================================================================
# DATACLASS TESTS (new — validates the budget_calculator API)
# =============================================================================

class TestBudgetResultDataclass:
    """Tests for the BudgetResult immutable dataclass."""

    def test_budget_result_is_frozen(self):
        """BudgetResult should be immutable"""
        result = calculate_max_vehicle_price(5000, 500, 7.0, 84)
        with pytest.raises(AttributeError):
            result.max_vehicle_price = 999999

    def test_budget_result_to_dict(self):
        """to_dict should return all fields"""
        result = calculate_max_vehicle_price(5000, 500, 7.0, 84)
        d = result.to_dict()
        assert "max_vehicle_price" in d
        assert "financed_amount" in d
        assert "total_interest" in d
        assert d["apr"] == 7.0
        assert d["term_months"] == 84


class TestAffordabilityResultDataclass:
    """Tests for the AffordabilityResult dataclass."""

    def test_affordable_result_fields(self):
        """AffordabilityResult should have all expected fields"""
        result = check_affordability(35000, "Equinox", 5000, 500, 7.0, 84)
        assert hasattr(result, "is_affordable")
        assert hasattr(result, "gap")
        assert hasattr(result, "required_monthly")
        assert hasattr(result, "vehicle_description")
        assert result.vehicle_description == "Equinox"

    def test_affordability_to_dict(self):
        """to_dict should return structured output"""
        result = check_affordability(35000, "Equinox", 5000, 500, 7.0, 84)
        d = result.to_dict()
        assert "is_affordable" in d
        assert "gap" in d
        assert "required_monthly" in d


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
