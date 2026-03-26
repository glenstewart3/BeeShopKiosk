from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ── Pydantic Models ──

class StudentIn(BaseModel):
    student: str
    class_name: str = Field(alias="class")

    class Config:
        populate_by_name = True

class SkipBody(BaseModel):
    student: str
    class_name: str = Field(alias="class")

    class Config:
        populate_by_name = True

class ItemIn(BaseModel):
    name: str
    cost: int
    category: str = "Menu Item"

class SessionIn(BaseModel):
    label: str

class CartItem(BaseModel):
    name: str
    cost: int

class TransactionIn(BaseModel):
    student: str
    class_name: str = Field(alias="class")
    earned: int
    spent: int
    items: List[CartItem] = []
    session_label: str

    class Config:
        populate_by_name = True

# ── Seed defaults ──

DEFAULT_ITEMS = [
    {"name": "Chocolate Bar", "cost": 5, "category": "Menu Item"},
    {"name": "Lollipop", "cost": 2, "category": "Menu Item"},
    {"name": "Chips", "cost": 3, "category": "Menu Item"},
    {"name": "Juice Box", "cost": 4, "category": "Menu Item"},
    {"name": "Sticker Pack", "cost": 1, "category": "Menu Item"},
    {"name": "Pencil", "cost": 3, "category": "Menu Item"},
    {"name": "5 Token Tub", "cost": 5, "category": "Tub"},
    {"name": "10 Token Tub", "cost": 10, "category": "Tub"},
]

async def seed_items():
    count = await db.items.count_documents({})
    if count == 0:
        await db.items.insert_many(DEFAULT_ITEMS)
        logger.info("Seeded %d default items", len(DEFAULT_ITEMS))

# ── Students ──

@api_router.get("/students")
async def get_students():
    cursor = db.students.find({"active": True}, {"_id": 0})
    docs = await cursor.to_list(5000)
    grouped = {}
    for d in docs:
        cls = d.get("class", "Unknown")
        grouped.setdefault(cls, []).append(d["student"])
    for cls in grouped:
        grouped[cls].sort()
    return grouped

@api_router.post("/students/import")
async def import_students(students: List[StudentIn]):
    await db.students.delete_many({})
    if students:
        docs = [{"class": s.class_name, "student": s.student, "active": True} for s in students]
        await db.students.insert_many(docs)
    return {"status": "ok", "count": len(students)}

@api_router.post("/students/skip")
async def skip_student(body: SkipBody):
    active = await db.sessions.find_one({"active": True}, {"_id": 0})
    if not active:
        raise HTTPException(400, "No active session")
    label = active["label"]
    await db.students.update_one(
        {"class": body.class_name, "student": body.student},
        {"$set": {"skipped_session": label}}
    )
    return {"status": "ok"}

# ── Items ──

@api_router.get("/items")
async def get_items():
    docs = await db.items.find({}, {"_id": 0}).to_list(500)
    return docs

@api_router.post("/items")
async def create_item(item: ItemIn):
    existing = await db.items.find_one({"name": item.name})
    if existing:
        raise HTTPException(400, "Item already exists")
    await db.items.insert_one(item.model_dump())
    return {"status": "ok"}

@api_router.delete("/items/{name}")
async def delete_item(name: str):
    result = await db.items.delete_one({"name": name})
    if result.deleted_count == 0:
        raise HTTPException(404, "Item not found")
    return {"status": "ok"}

# ── Sessions ──

@api_router.get("/sessions")
async def get_sessions():
    docs = await db.sessions.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return docs

@api_router.post("/sessions")
async def create_session(body: SessionIn):
    await db.sessions.update_many({}, {"$set": {"active": False}})
    doc = {
        "label": body.label,
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "active": True
    }
    await db.sessions.insert_one(doc)
    return {"status": "ok", "label": body.label}

@api_router.get("/sessions/active")
async def get_active_session():
    doc = await db.sessions.find_one({"active": True}, {"_id": 0})
    return doc

# ── Transactions ──

@api_router.post("/transactions")
async def create_transaction(txn: TransactionIn):
    saved = txn.earned - txn.spent
    doc = {
        "class": txn.class_name,
        "student": txn.student,
        "earned": txn.earned,
        "spent": txn.spent,
        "saved": saved,
        "items": [{"name": i.name, "cost": i.cost} for i in txn.items],
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "session_label": txn.session_label,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.transactions.insert_one(doc)
    return {"status": "ok", "saved": saved}

@api_router.get("/transactions/used")
async def get_used(session: str = Query(...)):
    pipeline = [
        {"$match": {"session_label": session}},
        {"$project": {"_id": 0, "class": 1, "student": 1}}
    ]
    docs = await db.transactions.aggregate(pipeline).to_list(5000)
    skipped = await db.students.find(
        {"skipped_session": session},
        {"_id": 0, "class": 1, "student": 1}
    ).to_list(5000)
    all_used = docs + skipped
    return all_used

# ── Reports ──

@api_router.get("/report")
async def get_report(session: str = Query("all")):
    match = {} if session == "all" else {"session_label": session}
    cursor = db.transactions.find(match, {"_id": 0})
    docs = await cursor.to_list(50000)

    report = {}
    for d in docs:
        cls = d["class"]
        stu = d["student"]
        if cls not in report:
            report[cls] = {"summary": {"total_earned": 0, "total_spent": 0, "total_saved": 0, "student_count": 0}, "students": {}}
        if stu not in report[cls]["students"]:
            report[cls]["students"][stu] = {"earned": 0, "spent": 0, "saved": 0, "items": {}}
            report[cls]["summary"]["student_count"] += 1
        report[cls]["students"][stu]["earned"] += d.get("earned", 0)
        report[cls]["students"][stu]["spent"] += d.get("spent", 0)
        report[cls]["students"][stu]["saved"] += d.get("saved", 0)
        for item in d.get("items", []):
            name = item["name"]
            report[cls]["students"][stu]["items"][name] = report[cls]["students"][stu]["items"].get(name, 0) + 1
        report[cls]["summary"]["total_earned"] += d.get("earned", 0)
        report[cls]["summary"]["total_spent"] += d.get("spent", 0)
        report[cls]["summary"]["total_saved"] += d.get("saved", 0)

    return report

@api_router.get("/report/items")
async def get_item_report(session: str = Query("all")):
    match = {} if session == "all" else {"session_label": session}
    cursor = db.transactions.find(match, {"_id": 0})
    docs = await cursor.to_list(50000)

    counts = {}
    for d in docs:
        for item in d.get("items", []):
            name = item["name"]
            cost = item.get("cost", 0)
            if name not in counts:
                counts[name] = {"name": name, "count": 0, "total_cost": 0}
            counts[name]["count"] += 1
            counts[name]["total_cost"] += cost

    result = sorted(counts.values(), key=lambda x: x["count"], reverse=True)
    return result

# ── Include router ──

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup():
    await seed_items()
    logger.info("Bee Shop Kiosk API started")

@app.on_event("shutdown")
async def shutdown():
    client.close()
