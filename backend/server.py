from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime
import re

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Default categories
DEFAULT_CATEGORIES = [
    {"id": "food", "name": "Food", "icon": "fast-food", "color": "#FF6B6B"},
    {"id": "transport", "name": "Transport", "icon": "car", "color": "#4ECDC4"},
    {"id": "shopping", "name": "Shopping", "icon": "cart", "color": "#45B7D1"},
    {"id": "bills", "name": "Bills", "icon": "receipt", "color": "#96CEB4"},
    {"id": "entertainment", "name": "Entertainment", "icon": "game-controller", "color": "#DDA0DD"},
    {"id": "healthcare", "name": "Healthcare", "icon": "medical", "color": "#98D8C8"},
    {"id": "income", "name": "Income", "icon": "cash", "color": "#2ECC71"},
    {"id": "others", "name": "Others", "icon": "ellipsis-horizontal", "color": "#95A5A6"}
]

# Define Models
class Expense(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    amount: float
    category_id: str
    description: str
    merchant: Optional[str] = None
    transaction_type: str = "debit"  # debit or credit
    source: str = "manual"  # manual or sms
    sms_body: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ExpenseCreate(BaseModel):
    amount: float
    category_id: str
    description: str
    merchant: Optional[str] = None
    transaction_type: str = "debit"
    source: str = "manual"
    sms_body: Optional[str] = None

class KeywordRule(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    keyword: str
    category_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class KeywordRuleCreate(BaseModel):
    keyword: str
    category_id: str

class Category(BaseModel):
    id: str
    name: str
    icon: str
    color: str

class SMSParseRequest(BaseModel):
    sms_body: str

class SMSParseResponse(BaseModel):
    success: bool
    amount: Optional[float] = None
    transaction_type: Optional[str] = None
    merchant: Optional[str] = None
    suggested_category_id: Optional[str] = None
    description: Optional[str] = None
    error: Optional[str] = None

# Helper function to parse SMS
async def parse_sms_message(sms_body: str) -> dict:
    """Parse SMS message to extract transaction details"""
    result = {
        "success": False,
        "amount": None,
        "transaction_type": None,
        "merchant": None,
        "suggested_category_id": "others",
        "description": None,
        "error": None
    }
    
    sms_lower = sms_body.lower()
    
    # Detect transaction type
    if "debited" in sms_lower or "debit" in sms_lower or "spent" in sms_lower or "paid" in sms_lower or "withdrawn" in sms_lower or "send" in sms_lower or "sent" in sms_lower or "transferred" in sms_lower:
        result["transaction_type"] = "debit"
    elif "credited" in sms_lower or "credit" in sms_lower or "received" in sms_lower or "deposited" in sms_lower:
        result["transaction_type"] = "credit"
    else:
        result["error"] = "Could not detect transaction type (Debited/Credited/Send keywords not found)"
        return result
    
    # Extract amount - various patterns
    amount_patterns = [
        r'(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{2})?)',  # Rs. 500 or INR 500 or ₹500
        r'([\d,]+(?:\.\d{2})?)\s*(?:rs\.?|inr|₹)',  # 500 Rs or 500 INR
        r'(?:amount|amt)\s*(?:of)?\s*(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{2})?)',  # amount of Rs 500
        r'(?:debited|credited|spent|paid|received|send|sent|transferred)\s*(?:for)?\s*(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{2})?)',
        r'([\d,]+(?:\.\d{2})?)\s*(?:has been|is|was)\s*(?:debited|credited)',
    ]
    
    amount = None
    for pattern in amount_patterns:
        match = re.search(pattern, sms_lower)
        if match:
            amount_str = match.group(1).replace(',', '')
            try:
                amount = float(amount_str)
                break
            except ValueError:
                continue
    
    if amount is None:
        result["error"] = "Could not extract amount from SMS"
        return result
    
    result["amount"] = amount
    
    # Extract merchant/recipient
    merchant_patterns = [
        r'(?:to|at|for|from)\s+([A-Za-z0-9\s]+?)(?:\s+on|\s+ref|\s+avl|\.)',
        r'(?:merchant|vendor|shop|store)[:\s]+([A-Za-z0-9\s]+)',
        r'(?:UPI|IMPS|NEFT)[:\s]*([A-Za-z0-9@\s]+?)(?:\s|$)',
    ]
    
    for pattern in merchant_patterns:
        match = re.search(pattern, sms_body, re.IGNORECASE)
        if match:
            merchant = match.group(1).strip()
            # Clean up merchant name
            merchant = re.sub(r'\s+', ' ', merchant)
            if len(merchant) > 2:
                result["merchant"] = merchant[:50]  # Limit length
                break
    
    # Get keyword rules for category suggestion
    keyword_rules = await db.keyword_rules.find().to_list(100)
    
    # Check if any keyword matches
    for rule in keyword_rules:
        if rule['keyword'].lower() in sms_lower:
            result["suggested_category_id"] = rule['category_id']
            break
    
    # If no custom rule matched, try default keyword matching
    if result["suggested_category_id"] == "others":
        default_keywords = {
            "food": ["swiggy", "zomato", "restaurant", "food", "cafe", "dominos", "mcdonalds", "kfc", "pizza", "burger"],
            "transport": ["uber", "ola", "rapido", "metro", "fuel", "petrol", "diesel", "parking", "toll"],
            "shopping": ["amazon", "flipkart", "myntra", "ajio", "nykaa", "meesho", "mall", "store"],
            "bills": ["electricity", "water", "gas", "internet", "broadband", "mobile", "recharge", "bill", "jio", "airtel"],
            "entertainment": ["netflix", "spotify", "hotstar", "prime", "movie", "ticket", "bookmyshow", "pvr", "inox"],
            "healthcare": ["pharmacy", "hospital", "clinic", "medical", "doctor", "medicine", "apollo", "1mg", "pharmeasy"],
            "income": ["salary", "refund", "cashback", "reward", "bonus"]
        }
        
        for category_id, keywords in default_keywords.items():
            for keyword in keywords:
                if keyword in sms_lower:
                    result["suggested_category_id"] = category_id
                    break
            if result["suggested_category_id"] != "others":
                break
    
    # Generate description
    if result["transaction_type"] == "credit":
        result["description"] = f"Received from {result['merchant']}" if result["merchant"] else "Amount credited"
    else:
        result["description"] = f"Payment to {result['merchant']}" if result["merchant"] else "Amount debited"
    
    result["success"] = True
    return result

# Routes
@api_router.get("/")
async def root():
    return {"message": "Expense Tracker API"}

# Categories
@api_router.get("/categories", response_model=List[Category])
async def get_categories():
    return DEFAULT_CATEGORIES

# Expenses CRUD
@api_router.post("/expenses", response_model=Expense)
async def create_expense(expense: ExpenseCreate):
    expense_dict = expense.dict()
    expense_obj = Expense(**expense_dict)
    await db.expenses.insert_one(expense_obj.dict())
    return expense_obj

@api_router.get("/expenses", response_model=List[Expense])
async def get_expenses(
    category_id: Optional[str] = None,
    transaction_type: Optional[str] = None,
    limit: int = 100
):
    query = {}
    if category_id:
        query["category_id"] = category_id
    if transaction_type:
        query["transaction_type"] = transaction_type
    
    expenses = await db.expenses.find(query).sort("created_at", -1).to_list(limit)
    return [Expense(**exp) for exp in expenses]

@api_router.get("/expenses/{expense_id}", response_model=Expense)
async def get_expense(expense_id: str):
    expense = await db.expenses.find_one({"id": expense_id})
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    return Expense(**expense)

@api_router.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str):
    result = await db.expenses.delete_one({"id": expense_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Expense not found")
    return {"message": "Expense deleted successfully"}

# Summary endpoint
@api_router.get("/expenses/summary/totals")
async def get_expense_summary():
    expenses = await db.expenses.find().to_list(1000)
    
    total_debit = sum(exp["amount"] for exp in expenses if exp.get("transaction_type") == "debit")
    total_credit = sum(exp["amount"] for exp in expenses if exp.get("transaction_type") == "credit")
    
    # Category-wise breakdown
    category_totals = {}
    for exp in expenses:
        cat_id = exp.get("category_id", "others")
        if cat_id not in category_totals:
            category_totals[cat_id] = {"debit": 0, "credit": 0, "count": 0}
        category_totals[cat_id][exp.get("transaction_type", "debit")] += exp["amount"]
        category_totals[cat_id]["count"] += 1
    
    return {
        "total_debit": total_debit,
        "total_credit": total_credit,
        "balance": total_credit - total_debit,
        "total_transactions": len(expenses),
        "category_totals": category_totals
    }

# Keyword Rules CRUD
@api_router.post("/keyword-rules", response_model=KeywordRule)
async def create_keyword_rule(rule: KeywordRuleCreate):
    # Check if keyword already exists
    existing = await db.keyword_rules.find_one({"keyword": rule.keyword.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Keyword rule already exists")
    
    rule_dict = rule.dict()
    rule_dict["keyword"] = rule_dict["keyword"].lower()
    rule_obj = KeywordRule(**rule_dict)
    await db.keyword_rules.insert_one(rule_obj.dict())
    return rule_obj

@api_router.get("/keyword-rules", response_model=List[KeywordRule])
async def get_keyword_rules():
    rules = await db.keyword_rules.find().to_list(100)
    return [KeywordRule(**rule) for rule in rules]

@api_router.delete("/keyword-rules/{rule_id}")
async def delete_keyword_rule(rule_id: str):
    result = await db.keyword_rules.delete_one({"id": rule_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Keyword rule not found")
    return {"message": "Keyword rule deleted successfully"}

# SMS Parsing
@api_router.post("/parse-sms", response_model=SMSParseResponse)
async def parse_sms(request: SMSParseRequest):
    result = await parse_sms_message(request.sms_body)
    return SMSParseResponse(**result)

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
