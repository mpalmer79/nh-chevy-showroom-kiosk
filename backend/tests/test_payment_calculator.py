"""
Tests for Payment Calculator Service
Validates payment math, term options, and affordability calculations.
"""

import pytest
from app.services.payment_calculator import PaymentCalculator, get_payment_calculator


class TestPaymentCalculator:
    """Tests for the PaymentCalculator service"""
    
    @pytest.fixture
    def calculator(self):
        """Get calculator instance"""
        return get_payment_calculator()
    
    #
    # BASIC PAYMENT CALCULATION TESTS
    #
    
    def test_calculate_payment_standard(self, calculator):
        """Standard payment calculation: $35,000 financed @ 7% for 72 months"""
        result = calculator.calculate_payment(
            amount_financed=35000,
            apr=7.0,
            term_months=72
        )
        
        # Payment should be around $597/month
        assert 590 < result.monthly_payment < 610
        assert result.amount_financed == 35000
        assert result.apr == 7.0
        assert result.term_months == 72
        assert result.total_of_payments > 35000  # More than principal due to interest
        assert result.total_interest > 0
    
    def test_calculate_payment_zero_apr(self, calculator):
        """Zero APR promotional financing"""
        result = calculator.calculate_payment(
            amount_financed=42000,
            apr=0.0,
            term_months=84
        )
        
        # Simple division: $42,000 / 84 = $500
        assert result.monthly_payment == 500.0
        assert result.total_interest == 0.0
        assert result.total_of_payments == 42000.0
    
    def test_calculate_payment_high_apr(self, calculator):
        """High APR calculation"""
        result = calculator.calculate_payment(
            amount_financed=30000,
            apr=15.0,
            term_months=60
        )
        
        # Higher APR = higher payment
        assert result.monthly_payment > 700
        assert result.total_interest > 5000  # Significant interest
    
    def test_calculate_payment_short_term(self, calculator):
        """Short term (48 months) - higher payment, less interest"""
        result_short = calculator.calculate_payment(
            amount_financed=30000,
            apr=7.0,
            term_months=48
        )
        
        result_long = calculator.calculate_payment(
            amount_financed=30000,
            apr=7.0,
            term_months=84
        )
        
        # Shorter term = higher payment but less total interest
        assert result_short.monthly_payment > result_long.monthly_payment
        assert result_short.total_interest < result_long.total_interest
    
    def test_calculate_payment_zero_amount(self, calculator):
        """Zero amount financed returns zero payment"""
        result = calculator.calculate_payment(
            amount_financed=0,
            apr=7.0,
            term_months=72
        )
        
        assert result.monthly_payment == 0
        assert result.total_of_payments == 0
        assert result.total_interest == 0
    
    #
    # MAX AFFORDABLE CALCULATION TESTS
    #
    
    def test_calculate_max_affordable(self, calculator):
        """Calculate max affordable from down payment and monthly payment"""
        result = calculator.calculate_max_affordable(
            down_payment=5000,
            monthly_payment=600,
            apr=7.0,
            term_months=84
        )
        
        # $600/month @ 7% for 84 months + $5000 down
        assert result > 40000
        assert result < 50000
    
    def test_calculate_max_affordable_zero_apr(self, calculator):
        """Max affordable with 0% APR"""
        result = calculator.calculate_max_affordable(
            down_payment=5000,
            monthly_payment=500,
            apr=0.0,
            term_months=84
        )
        
        # Simple: $500 * 84 + $5000 = $47,000
        assert result == 47000.0
    
    def test_max_affordable_round_trip(self, calculator):
        """Verify max affordable matches payment calculation"""
        down = 5000
        target_payment = 700
        
        # Get max affordable
        max_price = calculator.calculate_max_affordable(
            down_payment=down,
            monthly_payment=target_payment,
            apr=7.0,
            term_months=72
        )
        
        # Calculate payment for that amount
        amount_to_finance = max_price - down
        result = calculator.calculate_payment(
            amount_financed=amount_to_finance,
            apr=7.0,
            term_months=72
        )
        
        # Should match original target (within rounding)
        assert abs(result.monthly_payment - target_payment) < 1
    
    #
    # VEHICLE AFFORDABILITY CHECK TESTS
    #
    
    def test_check_affordability_within_budget(self, calculator):
        """Vehicle within budget"""
        result = calculator.check_vehicle_affordability(
            vehicle_price=35000,
            down_payment=10000,
            monthly_payment=600,
            apr=7.0,
            term_months=84
        )
        
        assert result.can_afford is True
        assert result.difference > 0
        assert result.actual_monthly_payment < 600
    
    def test_check_affordability_over_budget(self, calculator):
        """Vehicle over budget"""
        result = calculator.check_vehicle_affordability(
            vehicle_price=80000,
            down_payment=10000,
            monthly_payment=500,
            apr=7.0,
            term_months=84
        )
        
        assert result.can_afford is False
        assert result.difference < 0
        assert result.actual_monthly_payment > 500
    
    def test_check_affordability_returns_correct_fields(self, calculator):
        """Affordability result has all expected fields"""
        result = calculator.check_vehicle_affordability(
            vehicle_price=40000,
            down_payment=5000,
            monthly_payment=600,
            apr=7.0,
            term_months=84
        )
        
        # Check all fields exist
        assert hasattr(result, 'can_afford')
        assert hasattr(result, 'vehicle_price')
        assert hasattr(result, 'max_affordable')
        assert hasattr(result, 'difference')
        assert hasattr(result, 'actual_monthly_payment')
        assert hasattr(result, 'target_monthly_payment')
        assert hasattr(result, 'down_payment')
        assert hasattr(result, 'term_months')
        assert hasattr(result, 'apr')
        
        # Verify values
        assert result.vehicle_price == 40000
        assert result.target_monthly_payment == 600
        assert result.down_payment == 5000
    
    #
    # TERM OPTIONS GENERATION TESTS
    #
    
    def test_generate_term_options(self, calculator):
        """Generate standard term options"""
        options = calculator.generate_term_options(amount_financed=40000)
        
        # Should have 3 options (60, 72, 84 months)
        assert len(options) == 3
        
        terms = [opt.term_months for opt in options]
        assert 60 in terms
        assert 72 in terms
        assert 84 in terms
        
        # Longer term = lower payment
        payments = {opt.term_months: opt.monthly_payment for opt in options}
        assert payments[60] > payments[72] > payments[84]
        
        # Shorter term = less total interest
        interest = {opt.term_months: opt.total_interest for opt in options}
        assert interest[60] < interest[72] < interest[84]
    
    def test_generate_term_options_custom_rates(self, calculator):
        """Term options use correct APR for each term"""
        options = calculator.generate_term_options(amount_financed=30000)
        
        for opt in options:
            if opt.term_months == 60:
                assert opt.apr == 6.49
            elif opt.term_months == 72:
                assert opt.apr == 6.99
            elif opt.term_months == 84:
                assert opt.apr == 7.49
    
    def test_generate_term_options_custom_terms(self, calculator):
        """Generate options for custom terms"""
        options = calculator.generate_term_options(
            amount_financed=30000,
            terms=[48, 60]
        )
        
        assert len(options) == 2
        terms = [opt.term_months for opt in options]
        assert 48 in terms
        assert 60 in terms
    
    #
    # TOTAL DUE AT SIGNING TESTS
    #
    
    def test_total_due_at_signing_basic(self, calculator):
        """Basic due at signing calculation"""
        total = calculator.calculate_total_due_at_signing(
            down_payment=5000,
            doc_fee=599,
            title_fee=25
        )
        
        assert total == 5624  # 5000 + 599 + 25
    
    def test_total_due_at_signing_with_registration(self, calculator):
        """Due at signing with registration estimate"""
        total = calculator.calculate_total_due_at_signing(
            down_payment=10000,
            doc_fee=599,
            title_fee=25,
            registration_estimate=150
        )
        
        assert total == 10774  # 10000 + 599 + 25 + 150
    
    def test_total_due_at_signing_with_first_payment(self, calculator):
        """Due at signing including first payment"""
        total = calculator.calculate_total_due_at_signing(
            down_payment=5000,
            doc_fee=599,
            title_fee=25,
            first_payment_due=True,
            monthly_payment=500
        )
        
        assert total == 6124  # 5000 + 599 + 25 + 500
    
    def test_total_due_at_signing_default_fees(self, calculator):
        """Due at signing uses default fees when not specified"""
        total = calculator.calculate_total_due_at_signing(down_payment=5000)
        
        # Default: doc_fee=599, title_fee=25
        assert total == 5624
    
    #
    # TRADE-IN CALCULATION TESTS
    #
    
    def test_calculate_with_trade_positive_equity(self, calculator):
        """Trade with positive equity reduces amount financed"""
        result = calculator.calculate_with_trade(
            selling_price=45000,
            trade_value=15000,
            trade_payoff=10000,  # $5000 equity
            down_payment=5000
        )
        
        assert result["trade_equity"] == 5000
        assert result["is_underwater"] is False
        # Financed = 45000 - 5000 down - 5000 equity = 35000
        assert result["amount_financed"] == 35000
    
    def test_calculate_with_trade_negative_equity(self, calculator):
        """Trade with negative equity increases amount financed"""
        result = calculator.calculate_with_trade(
            selling_price=45000,
            trade_value=10000,
            trade_payoff=15000,  # -$5000 equity (underwater)
            down_payment=5000
        )
        
        assert result["trade_equity"] == -5000
        assert result["is_underwater"] is True
        # Financed = 45000 - 5000 down + 5000 negative equity = 45000
        assert result["amount_financed"] == 45000
    
    def test_calculate_with_trade_no_payoff(self, calculator):
        """Trade with no payoff (owned outright)"""
        result = calculator.calculate_with_trade(
            selling_price=40000,
            trade_value=12000,
            trade_payoff=0,
            down_payment=5000
        )
        
        # Full trade value is equity
        assert result["trade_equity"] == 12000
        assert result["amount_financed"] == 23000  # 40000 - 5000 - 12000
        assert result["is_underwater"] is False
    
    #
    # WHAT IT TAKES CALCULATION TESTS
    #
    
    def test_what_it_takes_needs_more_down(self, calculator):
        """Calculate what it takes when more down payment needed"""
        result = calculator.calculate_what_it_takes(
            vehicle_price=60000,
            current_down=5000,
            current_monthly=500,
            apr=7.0,
            term_months=84
        )
        
        # Should need more down payment to keep current monthly
        assert result["option_increase_down"]["additional_down_needed"] > 0
        assert result["option_increase_down"]["keeps_monthly_at"] == 500
        
        # Or increase monthly to keep current down
        assert result["option_increase_monthly"]["needed_monthly"] > 500
        assert result["option_increase_monthly"]["keeps_down_at"] == 5000
    
    def test_what_it_takes_already_affordable(self, calculator):
        """What it takes for already affordable vehicle"""
        result = calculator.calculate_what_it_takes(
            vehicle_price=30000,
            current_down=10000,
            current_monthly=600,
            apr=7.0,
            term_months=84
        )
        
        # Should not need additional down or monthly
        assert result["option_increase_down"]["additional_down_needed"] == 0
        # Monthly needed should be less than current
        assert result["option_increase_monthly"]["needed_monthly"] <= 600
    
    #
    # SINGLETON TESTS
    #
    
    def test_singleton_instance(self):
        """Verify singleton pattern works"""
        calc1 = get_payment_calculator()
        calc2 = get_payment_calculator()
        
        assert calc1 is calc2


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
