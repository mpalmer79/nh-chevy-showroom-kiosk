"""
Quirk AI Kiosk - Budget Calculator Service
Single source of truth for all financing math.

Consolidates budget calculations previously duplicated in:
- app/ai/tool_executor.py (_execute_calculate_budget, _execute_check_affordability)

All financial calculations should import from this module.
"""

from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class BudgetResult:
    """Immutable result of a budget calculation."""
    down_payment: float
    monthly_payment: float
    apr: float
    term_months: int
    financed_amount: float
    max_vehicle_price: float
    total_of_payments: float
    total_interest: float

    def to_dict(self) -> dict:
        return {
            "down_payment": round(self.down_payment, 2),
            "monthly_payment": round(self.monthly_payment, 2),
            "apr": self.apr,
            "term_months": self.term_months,
            "financed_amount": round(self.financed_amount, 2),
            "max_vehicle_price": round(self.max_vehicle_price, 2),
            "total_of_payments": round(self.total_of_payments, 2),
            "total_interest": round(self.total_interest, 2),
        }


@dataclass(frozen=True)
class AffordabilityResult:
    """Result of a vehicle affordability check."""
    vehicle_price: float
    vehicle_description: str
    max_affordable: float
    down_payment: float
    monthly_payment: float
    apr: float
    term_months: int
    is_affordable: bool
    gap: float  # Positive = over budget, negative = under budget
    required_monthly: float  # What monthly payment WOULD be for this vehicle

    def to_dict(self) -> dict:
        return {
            "vehicle_price": round(self.vehicle_price, 2),
            "vehicle_description": self.vehicle_description,
            "max_affordable": round(self.max_affordable, 2),
            "is_affordable": self.is_affordable,
            "gap": round(self.gap, 2),
            "required_monthly": round(self.required_monthly, 2),
        }


# =============================================================================
# CORE FORMULAS
# =============================================================================

def _present_value_factor(monthly_rate: float, term_months: int) -> float:
    """
    Present value annuity factor.
    PV Factor = [(1 - (1 + r)^-n) / r]
    """
    if monthly_rate <= 0:
        return float(term_months)
    return (1 - (1 + monthly_rate) ** -term_months) / monthly_rate


def _payment_factor(monthly_rate: float, term_months: int) -> float:
    """
    Payment factor (inverse of PV factor).
    PMT Factor = [r(1 + r)^n] / [(1 + r)^n - 1]
    """
    if monthly_rate <= 0:
        return 1.0 / term_months if term_months > 0 else 0.0
    compound = (1 + monthly_rate) ** term_months
    return (monthly_rate * compound) / (compound - 1)


# =============================================================================
# PUBLIC API
# =============================================================================

def calculate_max_vehicle_price(
    down_payment: float,
    monthly_payment: float,
    apr: float = 7.0,
    term_months: int = 84,
) -> BudgetResult:
    """
    Calculate maximum vehicle price from down payment and desired monthly payment.

    Uses standard amortization: PV = PMT × [(1 - (1 + r)^-n) / r]
    Max Price = Down Payment + PV

    Args:
        down_payment: Cash down payment in dollars.
        monthly_payment: Desired monthly payment in dollars.
        apr: Annual percentage rate (default 7%).
        term_months: Loan term in months (default 84).

    Returns:
        BudgetResult with all calculation details.
    """
    monthly_rate = apr / 100 / 12
    pv_factor = _present_value_factor(monthly_rate, term_months)

    financed_amount = monthly_payment * pv_factor
    max_vehicle_price = down_payment + financed_amount
    total_of_payments = monthly_payment * term_months
    total_interest = total_of_payments - financed_amount

    return BudgetResult(
        down_payment=down_payment,
        monthly_payment=monthly_payment,
        apr=apr,
        term_months=term_months,
        financed_amount=financed_amount,
        max_vehicle_price=max_vehicle_price,
        total_of_payments=total_of_payments,
        total_interest=total_interest,
    )


def calculate_monthly_payment(
    vehicle_price: float,
    down_payment: float,
    apr: float = 7.0,
    term_months: int = 84,
) -> BudgetResult:
    """
    Calculate monthly payment from vehicle price.

    Uses standard amortization: PMT = PV × [r(1+r)^n] / [(1+r)^n - 1]

    Args:
        vehicle_price: Total vehicle price.
        down_payment: Cash down payment.
        apr: Annual percentage rate.
        term_months: Loan term in months.

    Returns:
        BudgetResult with all calculation details.
    """
    financed_amount = max(vehicle_price - down_payment, 0)
    monthly_rate = apr / 100 / 12
    pmt_factor = _payment_factor(monthly_rate, term_months)

    monthly_payment = financed_amount * pmt_factor
    total_of_payments = monthly_payment * term_months
    total_interest = total_of_payments - financed_amount

    return BudgetResult(
        down_payment=down_payment,
        monthly_payment=monthly_payment,
        apr=apr,
        term_months=term_months,
        financed_amount=financed_amount,
        max_vehicle_price=vehicle_price,
        total_of_payments=total_of_payments,
        total_interest=total_interest,
    )


def check_affordability(
    vehicle_price: float,
    vehicle_description: str,
    down_payment: float,
    monthly_payment: float,
    apr: float = 7.0,
    term_months: int = 84,
) -> AffordabilityResult:
    """
    Check whether a customer can afford a specific vehicle.

    Args:
        vehicle_price: The vehicle's price.
        vehicle_description: Human-readable vehicle name.
        down_payment: Customer's down payment.
        monthly_payment: Customer's target monthly payment.
        apr: Annual percentage rate.
        term_months: Loan term in months.

    Returns:
        AffordabilityResult with affordability details.
    """
    budget = calculate_max_vehicle_price(down_payment, monthly_payment, apr, term_months)
    actual_payment = calculate_monthly_payment(vehicle_price, down_payment, apr, term_months)

    gap = vehicle_price - budget.max_vehicle_price
    is_affordable = gap <= 0

    return AffordabilityResult(
        vehicle_price=vehicle_price,
        vehicle_description=vehicle_description,
        max_affordable=budget.max_vehicle_price,
        down_payment=down_payment,
        monthly_payment=monthly_payment,
        apr=apr,
        term_months=term_months,
        is_affordable=is_affordable,
        gap=gap,
        required_monthly=actual_payment.monthly_payment,
    )
