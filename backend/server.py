from fastapi import FastAPI, APIRouter, HTTPException, Query, Request, Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import re
import uuid
import httpx
from pathlib import Path
from urllib.parse import quote
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]
welltrack_db = client[os.environ.get('STUDENT_DB_NAME', 'welltrack_db')]

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

class ItemUpdate(BaseModel):
    name: Optional[str] = None
    cost: Optional[int] = None
    category: Optional[str] = None

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

async def seed_session():
    count = await db.sessions.count_documents({})
    if count == 0:
        doc = {
            "label": "Session 1",
            "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "active": True
        }
        await db.sessions.insert_one(doc)
        logger.info("Seeded default session")

# ── Auth ──

GOOGLE_CLIENT_ID = os.environ['GOOGLE_CLIENT_ID']
GOOGLE_CLIENT_SECRET = os.environ['GOOGLE_CLIENT_SECRET']
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"

async def get_current_admin(request: Request):
    token = request.cookies.get("session_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(401, "Not authenticated")
    session_doc = await db.admin_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session_doc:
        raise HTTPException(401, "Invalid session")
    expires_at = session_doc["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(401, "Session expired")
    return session_doc

@api_router.get("/auth/google/login")
async def google_login(request: Request):
    redirect_uri = request.query_params.get("redirect_uri", "")
    if not redirect_uri:
        raise HTTPException(400, "Missing redirect_uri")
    state = redirect_uri
    google_auth_url = (
        "https://accounts.google.com/o/oauth2/v2/auth"
        f"?client_id={quote(GOOGLE_CLIENT_ID, safe='')}"
        f"&redirect_uri={quote(redirect_uri, safe='')}"
        "&response_type=code"
        "&scope=openid%20email%20profile"
        f"&state={quote(state, safe='')}"
        "&access_type=offline"
        "&prompt=select_account"
    )
    return {"auth_url": google_auth_url}

@api_router.post("/auth/google/callback")
async def google_callback(request: Request, response: Response):
    body = await request.json()
    code = body.get("code")
    redirect_uri = body.get("redirect_uri")
    if not code or not redirect_uri:
        raise HTTPException(400, "Missing code or redirect_uri")

    async with httpx.AsyncClient() as http:
        token_resp = await http.post(GOOGLE_TOKEN_URL, data={
            "code": code,
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        })
    if token_resp.status_code != 200:
        raise HTTPException(401, "Failed to exchange code with Google")
    tokens = token_resp.json()
    access_token = tokens.get("access_token")

    async with httpx.AsyncClient() as http:
        userinfo_resp = await http.get(GOOGLE_USERINFO_URL, headers={"Authorization": f"Bearer {access_token}"})
    if userinfo_resp.status_code != 200:
        raise HTTPException(401, "Failed to get user info from Google")
    google_data = userinfo_resp.json()

    email = google_data.get("email", "").lower().strip()
    wt_user = await welltrack_db.users.find_one(
        {"email": {"$regex": f"^{re.escape(email)}$", "$options": "i"}},
        {"_id": 0}
    )
    if not wt_user:
        raise HTTPException(403, "Not authorised — your account is not in the system")

    session_token = f"admin_{uuid.uuid4().hex}"
    await db.admin_sessions.insert_one({
        "session_token": session_token,
        "email": email,
        "name": google_data.get("name", ""),
        "picture": google_data.get("picture", ""),
        "role": wt_user.get("role", "staff"),
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    response.set_cookie("session_token", session_token, path="/", httponly=True, samesite="lax", max_age=7*24*60*60)
    return {"email": email, "name": google_data.get("name", ""), "picture": google_data.get("picture", ""), "role": wt_user.get("role", "staff")}

@api_router.get("/auth/me")
async def auth_me(request: Request):
    session = await get_current_admin(request)
    return {"email": session["email"], "name": session["name"], "picture": session.get("picture", ""), "role": session.get("role", "staff")}

@api_router.post("/auth/logout")
async def auth_logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    if token:
        await db.admin_sessions.delete_one({"session_token": token})
    response.delete_cookie("session_token", path="/")
    return {"status": "ok"}

# ── Students ──

@api_router.get("/students")
async def get_students():
    """Read students directly from welltrack_db. Falls back to local beeshopkiosk_db.students if welltrack has none."""
    cursor = welltrack_db.students.find(
        {"enrolment_status": "active"},
        {"_id": 0, "preferred_name": 1, "first_name": 1, "last_name": 1, "class_name": 1, "photo_url": 1}
    )
    wt_docs = await cursor.to_list(5000)

    if wt_docs:
        grouped = {}
        for d in wt_docs:
            first = (d.get("preferred_name") or d.get("first_name") or "").strip()
            last = (d.get("last_name") or "").strip()
            name = f"{first} {last}".strip()
            cls = (d.get("class_name") or "Unknown").strip()
            if name and cls:
                stu_obj = {"name": name}
                if d.get("photo_url"):
                    stu_obj["photo_url"] = d["photo_url"]
                grouped.setdefault(cls, []).append(stu_obj)
        for cls in grouped:
            grouped[cls].sort(key=lambda x: x["name"])
        return grouped

    # Fallback: read from local beeshopkiosk_db.students (for CSV-imported data)
    local_cursor = db.students.find({"active": True}, {"_id": 0})
    local_docs = await local_cursor.to_list(5000)
    grouped = {}
    for d in local_docs:
        cls = d.get("class", "Unknown")
        stu_obj = {"name": d["student"]}
        if d.get("photo_url"):
            stu_obj["photo_url"] = d["photo_url"]
        grouped.setdefault(cls, []).append(stu_obj)
    for cls in grouped:
        grouped[cls].sort(key=lambda x: x["name"])
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
    await db.skipped_students.update_one(
        {"class": body.class_name, "student": body.student, "session_label": label},
        {"$set": {"class": body.class_name, "student": body.student, "session_label": label}},
        upsert=True
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

@api_router.put("/items/{name}")
async def update_item(name: str, body: ItemUpdate):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(400, "No fields to update")
    if "name" in updates and updates["name"] != name:
        existing = await db.items.find_one({"name": updates["name"]})
        if existing:
            raise HTTPException(400, "An item with that name already exists")
    result = await db.items.update_one({"name": name}, {"$set": updates})
    if result.matched_count == 0:
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

@api_router.put("/sessions/{label}/activate")
async def activate_session(label: str):
    existing = await db.sessions.find_one({"label": label})
    if not existing:
        raise HTTPException(404, "Session not found")
    await db.sessions.update_many({}, {"$set": {"active": False}})
    await db.sessions.update_one({"label": label}, {"$set": {"active": True}})
    return {"status": "ok", "label": label}

@api_router.delete("/sessions/{label}")
async def delete_session(label: str):
    result = await db.sessions.delete_one({"label": label})
    if result.deleted_count == 0:
        raise HTTPException(404, "Session not found")
    await db.transactions.delete_many({"session_label": label})
    await db.skipped_students.delete_many({"session_label": label})
    return {"status": "ok"}

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
    skipped = await db.skipped_students.find(
        {"session_label": session},
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

@api_router.get("/report/balances")
async def get_student_balances():
    """Cumulative saved tokens per student across all sessions."""
    pipeline = [
        {"$group": {
            "_id": {"class": "$class", "student": "$student"},
            "total_earned": {"$sum": "$earned"},
            "total_spent": {"$sum": "$spent"},
            "total_saved": {"$sum": "$saved"},
            "sessions": {"$addToSet": "$session_label"},
        }},
        {"$sort": {"_id.class": 1, "_id.student": 1}},
        {"$project": {
            "_id": 0,
            "class_name": "$_id.class",
            "student": "$_id.student",
            "total_earned": 1,
            "total_spent": 1,
            "total_saved": 1,
            "session_count": {"$size": "$sessions"},
        }}
    ]
    docs = await db.transactions.aggregate(pipeline).to_list(5000)
    return docs

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
    await seed_session()
    logger.info("Bee Shop Kiosk API started")

@app.on_event("shutdown")
async def shutdown():
    client.close()
