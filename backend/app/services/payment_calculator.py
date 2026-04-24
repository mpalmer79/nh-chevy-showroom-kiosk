"""
Payment Calculator Service
Centralized payment calculation logic for budget tools and worksheets.
Used by calculate_budget, check_vehicle_affordability, and worksheet services.
"""

from typing import List, Dict, Optional
from dataclasses import dataclass
import logging

logger = logging.getLogger("showroom_kiosk.ai.payment_calculator")


@dataclass
class PaymentResult:
    """Result of a payment calculation"""
    term_months: int
    apr: float
    monthly_payment: float
    amount_financed: float
    total_of_payments: float
    total_interest: float


@dataclass
class AffordabilityResult:
    """Result of an affordability check"""
    can_afford: bool
    vehicle_price: float
    max_affordable: float
    difference: float
    actual_monthly_payment: float
    target_monthly_payment: float
    down_payment: float
    term_months: int
    apr: float


class PaymentCalculator:
    """
    Centralized payment calculation logic.
    Used by both calculate_budget tool and worksheet service.
    """
    
    # Standard rate tiers (simplified - real implementation would use credit tiers)
    STANDARD_RATES = {
        60: 6.49,   # Lower rate for shorter term
        72: 6.99,
        84: 7.49,   # Higher rate for longest term
    }
    
    # Dealership standard fees
    DOC_FEE = 599
    TITLE_FEE = 25
    
    # State tax rates (NH = 0)
    STATE_TAX_RATES = {
        "NH": 0.0,
        "MA": 0.0625,  # 6.25%
        "ME": 0.055,
        "VT": 0.06,
    }
    
    def calculate_payment(
        self,
        amount_financed: float,
        apr: float,
        term_months: int
    ) -> PaymentResult:
        """
        Calculate monthly payment using standard amortization.
        
        PMT = P × [r(1+r)^n] / [(1+r)^n - 1]
        
        Args:
            amount_financed: Principal loan amount
            apr: Annual percentage rate (e.g., 7.0 for 7%)
            term_months: Loan term in months
            
        Returns:
            PaymentResult with all calculation details
        """
        if amount_financed <= 0:
            return PaymentResult(
                term_months=term_months,
                apr=apr,
                monthly_payment=0,
                amount_financed=0,
                total_of_payments=0,
                total_interest=0
            )
        
        monthly_rate = apr / 100 / 12
        
        if monthly_rate > 0:
            payment = amount_financed * (
                (monthly_rate * (1 + monthly_rate) ** term_months) /
                ((1 + monthly_rate) ** term_months - 1)
            )
        else:
            # 0% APR case
            payment = amount_financed / term_months
        
        total_of_payments = payment * term_months
        total_interest = total_of_payments - amount_financed
        
        return PaymentResult(
            term_months=term_months,
            apr=apr,
            monthly_payment=round(payment, 2),
            amount_financed=round(amount_financed, 2),
            total_of_payments=round(total_of_payments, 2),
            total_interest=round(total_interest, 2)
        )
    
    def calculate_max_affordable(
        self,
        down_payment: float,
        monthly_payment: float,
        apr: float = 7.0,
        term_months: int = 84
    ) -> float:
        """
        Calculate maximum vehicle price from budget.
        (Used by calculate_budget and check_vehicle_affordability tools)
        
        PV = PMT × [(1 - (1+r)^-n) / r]
        Max Price = Down Payment + PV
        
        Args:
            down_payment: Cash down payment
            monthly_payment: Target monthly payment
            apr: Annual percentage rate (default 7%)
            term_months: Loan term in months (default 84)
            
        Returns:
            Maximum affordable vehicle price
        """
        monthly_rate = apr / 100 / 12
        
        if monthly_rate > 0:
            pv_factor = (1 - (1 + monthly_rate) ** -term_months) / monthly_rate
            financed_amount = monthly_payment * pv_factor
        else:
            # 0% APR case
            financed_amount = monthly_payment * term_months
        
        return round(down_payment + financed_amount, 2)
    
    def check_vehicle_affordability(
        self,
        vehicle_price: float,
        down_payment: float,
        monthly_payment: float,
        apr: float = 7.0,
        term_months: int = 84
    ) -> AffordabilityResult:
        """
        Check if a customer can afford a specific vehicle.
        
        Args:
            vehicle_price: Price of the vehicle
            down_payment: Customer's down payment
            monthly_payment: Customer's target monthly payment
            apr: Annual percentage rate
            term_months: Loan term in months
            
        Returns:
            AffordabilityResult with detailed breakdown
        """
        # Calculate max affordable
        max_affordable = self.calculate_max_affordable(
            down_payment=down_payment,
            monthly_payment=monthly_payment,
            apr=apr,
            term_months=term_months
        )
        
        # Calculate actual monthly payment for this vehicle
        actual_financed = vehicle_price - down_payment
        if actual_financed > 0:
            actual_payment_result = self.calculate_payment(
                amount_financed=actual_financed,
                apr=apr,
                term_months=term_months
            )
            actual_monthly = actual_payment_result.monthly_payment
        else:
            actual_monthly = 0
        
        # Determine affordability
        difference = max_affordable - vehicle_price
        can_afford = difference >= 0
        
        return AffordabilityResult(
            can_afford=can_afford,
            vehicle_price=vehicle_price,
            max_affordable=max_affordable,
            difference=round(difference, 2),
            actual_monthly_payment=actual_monthly,
            target_monthly_payment=monthly_payment,
            down_payment=down_payment,
            term_months=term_months,
            apr=apr
        )
    
    def generate_term_options(
        self,
        amount_financed: float,
        terms: List[int] = None,
        rate_override: Optional[Dict[int, float]] = None
    ) -> List[PaymentResult]:
        """
        Generate payment options for multiple terms.
        
        Args:
            amount_financed: Principal to finance
            terms: List of term lengths (default [60, 72, 84])
            rate_override: Optional dict mapping term to APR
            
        Returns:
            List of PaymentResult for each term
        """
        if terms is None:
            terms = [60, 72, 84]
        
        rates = rate_override or self.STANDARD_RATES
        
        options = []
        for term in terms:
            apr = rates.get(term, 7.0)
            result = self.calculate_payment(amount_financed, apr, term)
            options.append(result)
        
        return options
    
    def calculate_total_due_at_signing(
        self,
        down_payment: float,
        doc_fee: float = None,
        title_fee: float = None,
        registration_estimate: float = 0,
        first_payment_due: bool = False,
        monthly_payment: float = 0
    ) -> float:
        """
        Calculate total cash due at signing.
        
        Args:
            down_payment: Cash down payment
            doc_fee: Documentation fee (default $599)
            title_fee: Title fee (default $25)
            registration_estimate: Estimated registration cost
            first_payment_due: Whether first payment is due at signing
            monthly_payment: Monthly payment amount (if first_payment_due)
            
        Returns:
            Total amount due at signing
        """
        if doc_fee is None:
            doc_fee = self.DOC_FEE
        if title_fee is None:
            title_fee = self.TITLE_FEE
            
        total = down_payment + doc_fee + title_fee + registration_estimate
        
        if first_payment_due and monthly_payment > 0:
            total += monthly_payment
        
        return round(total, 2)
    
    def calculate_with_trade(
        self,
        selling_price: float,
        trade_value: float,
        trade_payoff: float,
        down_payment: float
    ) -> Dict:
        """
        Calculate deal structure with trade-in.
        
        Trade equity = value - payoff (can be negative if underwater)
        Amount to finance = selling price - down payment - trade equity
        
        Args:
            selling_price: Vehicle selling price
            trade_value: Appraised value of trade-in
            trade_payoff: Remaining loan balance on trade
            down_payment: Additional cash down
            
        Returns:
            Dict with trade equity and amount financed
        """
        trade_equity = trade_value - trade_payoff
        amount_financed = selling_price - down_payment - trade_equity
        
        # If negative equity, it adds to amount financed
        # If positive equity, it reduces amount financed
        
        return {
            "trade_value": round(trade_value, 2),
            "trade_payoff": round(trade_payoff, 2),
            "trade_equity": round(trade_equity, 2),
            "is_underwater": trade_equity < 0,
            "amount_financed": round(max(0, amount_financed), 2),
            "down_payment": round(down_payment, 2),
            "total_down": round(down_payment + max(0, trade_equity), 2),
        }
    
    def calculate_what_it_takes(
        self,
        vehicle_price: float,
        current_down: float,
        current_monthly: float,
        apr: float = 7.0,
        term_months: int = 84
    ) -> Dict:
        """
        Calculate what it would take to afford a vehicle.
        
        Returns options for:
        1. Keeping current monthly, increasing down payment
        2. Keeping current down, increasing monthly payment
        
        Args:
            vehicle_price: Target vehicle price
            current_down: Current down payment offer
            current_monthly: Current monthly payment target
            apr: Annual percentage rate
            term_months: Loan term
            
        Returns:
            Dict with options to afford the vehicle
        """
        # Option 1: Keep monthly, calculate needed down
        monthly_rate = apr / 100 / 12
        if monthly_rate > 0:
            pv_factor = (1 - (1 + monthly_rate) ** -term_months) / monthly_rate
            max_financed_at_current_monthly = current_monthly * pv_factor
        else:
            max_financed_at_current_monthly = current_monthly * term_months
        
        needed_down = vehicle_price - max_financed_at_current_monthly
        additional_down_needed = max(0, needed_down - current_down)
        
        # Option 2: Keep down, calculate needed monthly
        amount_to_finance = vehicle_price - current_down
        if amount_to_finance > 0:
            needed_payment_result = self.calculate_payment(
                amount_financed=amount_to_finance,
                apr=apr,
                term_months=term_months
            )
            needed_monthly = needed_payment_result.monthly_payment
        else:
            needed_monthly = 0
        
        additional_monthly_needed = max(0, needed_monthly - current_monthly)
        
        return {
            "vehicle_price": vehicle_price,
            "current_down": current_down,
            "current_monthly": current_monthly,
            "option_increase_down": {
                "needed_down": round(needed_down, 2),
                "additional_down_needed": round(additional_down_needed, 2),
                "keeps_monthly_at": current_monthly,
            },
            "option_increase_monthly": {
                "needed_monthly": round(needed_monthly, 2),
                "additional_monthly_needed": round(additional_monthly_needed, 2),
                "keeps_down_at": current_down,
            }
        }


# Singleton instance
_calculator_instance = None


def get_payment_calculator() -> PaymentCalculator:
    """Get the singleton PaymentCalculator instance."""
    global _calculator_instance
    if _calculator_instance is None:
        _calculator_instance = PaymentCalculator()
    return _calculator_instance
