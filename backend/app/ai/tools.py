"""
NH Chevy Showroom Kiosk - Tool Definitions
All tool definitions for Claude's tool use capability.
"""

# Tool definitions for Claude
TOOLS = [
    # Anthropic's native web search - no external API needed
    {
        "type": "web_search_20250305",
        "name": "web_search"
    },
    {
        "name": "calculate_budget",
        "description": "Calculate what vehicle price a customer can afford based on their down payment and desired monthly payment. ALWAYS use this when a customer mentions both a down payment AND monthly payment amount. Uses 7% APR at 84 months.",
        "input_schema": {
            "type": "object",
            "properties": {
                "down_payment": {
                    "type": "number",
                    "description": "Customer's cash down payment amount in dollars"
                },
                "monthly_payment": {
                    "type": "number",
                    "description": "Customer's desired monthly payment amount in dollars"
                },
                "apr": {
                    "type": "number",
                    "description": "Annual percentage rate (default 7.0 if not specified)",
                    "default": 7.0
                },
                "term_months": {
                    "type": "integer",
                    "description": "Loan term in months (default 84 if not specified)",
                    "default": 84
                }
            },
            "required": ["down_payment", "monthly_payment"]
        }
    },
    {
        "name": "search_inventory",
        "description": "Search dealership inventory for vehicles matching customer needs. Use this when the customer asks about available vehicles, specific models, or wants recommendations.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Natural language search query based on customer needs (e.g., 'blue truck for towing', 'family SUV under 50k')"
                },
                "body_style": {
                    "type": "string",
                    "description": "Filter by body style: Truck, SUV, Van, Sedan, Sports Car",
                    "enum": ["Truck", "SUV", "Van", "Sedan", "Sports Car", "Coupe", "Convertible"]
                },
                "max_price": {
                    "type": "number",
                    "description": "REQUIRED when customer mentions budget. Maximum vehicle price filter. Extract from phrases like 'under $50K' (50000), 'below $40,000' (40000), 'budget is $35K' (35000). ALWAYS pass this when a price limit is mentioned - do NOT rely on semantic search for budget filtering."
                },
                "min_seating": {
                    "type": "integer",
                    "description": "Minimum seating capacity needed"
                },
                "min_towing": {
                    "type": "integer",
                    "description": "Minimum towing capacity in lbs"
                }
            },
            "required": ["query"]
        }
    },
    {
        "name": "get_vehicle_details",
        "description": "Get detailed information about a specific vehicle by stock number. Use when customer asks about a specific vehicle or wants more details.",
        "input_schema": {
            "type": "object",
            "properties": {
                "stock_number": {
                    "type": "string",
                    "description": "The vehicle stock number (e.g., M12345)"
                }
            },
            "required": ["stock_number"]
        }
    },
    {
        "name": "find_similar_vehicles",
        "description": "Find vehicles similar to one the customer likes. Use when they want alternatives or comparisons.",
        "input_schema": {
            "type": "object",
            "properties": {
                "stock_number": {
                    "type": "string",
                    "description": "Stock number of the vehicle to find similar matches for"
                }
            },
            "required": ["stock_number"]
        }
    },
    {
        "name": "notify_staff",
        "description": "Notify dealership staff to assist the customer. Use when customer is ready for test drive, wants appraisal, or needs finance help.",
        "input_schema": {
            "type": "object",
            "properties": {
                "notification_type": {
                    "type": "string",
                    "description": "Type of staff to notify",
                    "enum": ["sales", "appraisal", "finance"]
                },
                "message": {
                    "type": "string",
                    "description": "Brief message about what the customer needs"
                },
                "vehicle_stock": {
                    "type": "string",
                    "description": "Stock number of vehicle customer is interested in (if applicable)"
                }
            },
            "required": ["notification_type", "message"]
        }
    },
    {
        "name": "mark_favorite",
        "description": "Mark a vehicle as a customer favorite for quick reference.",
        "input_schema": {
            "type": "object",
            "properties": {
                "stock_number": {
                    "type": "string",
                    "description": "Stock number to mark as favorite"
                }
            },
            "required": ["stock_number"]
        }
    },
    {
        "name": "lookup_conversation",
        "description": "Look up a customer's previous conversation using their phone number. Use this when customer says they want to continue a previous conversation or when they provide a phone number to retrieve their history.",
        "input_schema": {
            "type": "object",
            "properties": {
                "phone_number": {
                    "type": "string",
                    "description": "Customer's 10-digit phone number (digits only, e.g., '6175551234')"
                }
            },
            "required": ["phone_number"]
        }
    },
    {
        "name": "save_customer_phone",
        "description": "Save the customer's phone number to their conversation for future lookup. Use this when customer provides their phone number.",
        "input_schema": {
            "type": "object",
            "properties": {
                "phone_number": {
                    "type": "string",
                    "description": "Customer's 10-digit phone number"
                }
            },
            "required": ["phone_number"]
        }
    },
    {
        "name": "check_vehicle_affordability",
        "description": """Check if a customer can afford a SPECIFIC vehicle they're asking about.

USE THIS TOOL WHEN customer asks:
- "Can I afford the [vehicle/trim]?" (e.g., "Can I afford the 3LZ?")
- "Is the [vehicle] in my budget?"
- "What would my payment be on that one?"
- References a vehicle by trim (3LZ, 1LT, Z71, RST, High Country) + gives budget info

CRITICAL: When customer references a vehicle from the conversation (like "the 3LZ" or "that Corvette"), 
you MUST identify the correct stock number from the conversation history and use it here.

This calculates their max affordable price AND compares to the specific vehicle's price.
Returns a clear YES/NO answer with payment details.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "stock_number": {
                    "type": "string",
                    "description": "Stock number of the vehicle to check (e.g., M39196). REQUIRED when customer references a specific vehicle from conversation."
                },
                "vehicle_price": {
                    "type": "number",
                    "description": "Price of the vehicle if stock number is unknown."
                },
                "vehicle_description": {
                    "type": "string",
                    "description": "Description of the vehicle (e.g., '2025 Corvette 3LZ') for the response."
                },
                "down_payment": {
                    "type": "number",
                    "description": "Customer's down payment amount in dollars"
                },
                "monthly_payment": {
                    "type": "number",
                    "description": "Customer's desired maximum monthly payment in dollars"
                },
                "apr": {
                    "type": "number",
                    "description": "Annual percentage rate (default 7.0)",
                    "default": 7.0
                },
                "term_months": {
                    "type": "integer",
                    "description": "Loan term in months (default 84)",
                    "default": 84
                }
            },
            "required": ["down_payment", "monthly_payment"]
        }
    },
    {
        "name": "create_worksheet",
        "description": """Create a Digital Worksheet for deal structuring when customer is ready to "talk numbers".

USE THIS TOOL WHEN:
- Customer says "what would my payments be?" or "let's look at the numbers"
- Customer asks "how can we make this work?" or "let's run the numbers"
- Customer is focused on ONE vehicle and wants to see financing options
- Customer has provided budget info (down payment and/or monthly target)
- After confirming a vehicle IS affordable and customer wants next steps

DO NOT USE WHEN:
- Customer is still browsing multiple vehicles
- No budget information has been discussed
- Customer is a service customer just looking around
- Customer is comparing 3+ vehicles (help them narrow down first)

The worksheet shows:
- Vehicle details and selling price
- Multiple term options (60/72/84 months) with payments
- Trade-in equity (if applicable)
- Total due at signing
- Interactive adjustments for customer

After creating, explain the options and let customer adjust. When they're ready, they click "I'm Ready" to notify sales.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "stock_number": {
                    "type": "string",
                    "description": "Stock number of the vehicle to create worksheet for. REQUIRED."
                },
                "down_payment": {
                    "type": "number",
                    "description": "Customer's down payment amount (from conversation or default 0)"
                },
                "monthly_payment_target": {
                    "type": "number",
                    "description": "Customer's target monthly payment (if mentioned)"
                },
                "include_trade": {
                    "type": "boolean",
                    "description": "Whether to include trade-in from conversation state",
                    "default": False
                },
                "reason": {
                    "type": "string",
                    "description": "Brief note on why worksheet is being created (for context)"
                }
            },
            "required": ["stock_number"]
        }
    }
]
