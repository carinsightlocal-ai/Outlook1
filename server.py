import os
import sys
import re
import uuid
import time
import random
import json
import hashlib
import secrets
import imaplib
import email
from email.header import decode_header
from typing import Dict, List, Optional
import subprocess
from datetime import datetime
import requests
import shutil

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends, Header
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Jaun Fetch Otp - OTP Fetcher Pro", version="3.5.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

APP_DIR = os.path.dirname(os.path.abspath(__file__))
PARENT_DIR = os.path.dirname(APP_DIR)

DATA_DIR = os.path.join(APP_DIR, "data")
STATIC_DIR = os.path.join(APP_DIR, "static")
TEMPLATES_DIR = os.path.join(APP_DIR, "templates")
DB_FILE = os.path.join(DATA_DIR, "database.json")
PARENT_DB_FILE = os.path.join(PARENT_DIR, "data", "database.json")
CHROME_PROFILES_DIR = os.path.join(APP_DIR, "chrome_profiles")

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(STATIC_DIR, exist_ok=True)
os.makedirs(TEMPLATES_DIR, exist_ok=True)
os.makedirs(CHROME_PROFILES_DIR, exist_ok=True)

# Copy parent database if local does not exist so existing accounts are preserved
if not os.path.exists(DB_FILE) and os.path.exists(PARENT_DB_FILE):
    try:
        shutil.copy2(PARENT_DB_FILE, DB_FILE)
    except Exception as e:
        print(f"Initial DB copy notice: {e}")

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# ----------------- Database Management -----------------
def hash_pin(pin: str) -> str:
    return hashlib.sha256(pin.strip().encode("utf-8")).hexdigest()

def generate_api_key() -> str:
    return f"otp_live_{secrets.token_hex(16)}"

def load_db() -> dict:
    if os.path.exists(DB_FILE):
        try:
            with open(DB_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    if os.path.exists(PARENT_DB_FILE):
        try:
            with open(PARENT_DB_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {"users": {}}

def save_db(db_data: dict):
    with open(DB_FILE, "w", encoding="utf-8") as f:
        json.dump(db_data, f, indent=2, ensure_ascii=False)
    # Also keep parent database in sync if available
    try:
        if os.path.exists(os.path.dirname(PARENT_DB_FILE)):
            with open(PARENT_DB_FILE, "w", encoding="utf-8") as f:
                json.dump(db_data, f, indent=2, ensure_ascii=False)
    except Exception:
        pass

def ensure_user_api_keys(db_data: dict) -> bool:
    updated = False
    for u_email, u_data in db_data.get("users", {}).items():
        if not u_data.get("api_key"):
            u_data["api_key"] = generate_api_key()
            updated = True
    return updated

db = load_db()
if "users" not in db:
    db["users"] = {}
if ensure_user_api_keys(db):
    save_db(db)

ACTIVE_CONNECTIONS: Dict[str, List[WebSocket]] = {}

# ----------------- OTP Extraction & Detection -----------------
def is_invalid_year_or_date(val: str) -> bool:
    if not val or not val.isdigit():
        return True
    if len(val) == 4 and (1990 <= int(val) <= 2035):
        return True
    if len(val) == 6 and (val.startswith('202') or val.startswith('203') or val.startswith('199')):
        return True
    return False

def extract_otp(subject: str, body: str = "") -> Optional[str]:
    combined = f"{subject}\n{body}"
    
    # 1. WhatsApp / SMS style 3-3 digits: 123-456 or 123 456
    m = re.search(r'\b([0-9]{3})[- ]([0-9]{3})\b', combined)
    if m:
        cand = f"{m.group(1)}{m.group(2)}"
        if not is_invalid_year_or_date(cand):
            return cand
        
    # 2. Service prefixed: G-123456, FB-12345, MS-123456
    m = re.search(r'\b(?:G|FB|TG|MS|ID|VK)[- ]([0-9]{4,8})\b', combined, re.IGNORECASE)
    if m:
        return m.group(1)

    # 3. Facebook / Meta confirmation code patterns
    fb_patterns = [
        r'\b([0-9]{5,8})\s+is your code to confirm\b',
        r'\b([0-9]{5,8})\s+is your (?:facebook|fb)?\s*(?:confirmation|verification|security|login|reset)?\s*code\b',
        r'\b(?:FB-)?([0-9]{5,8})\s+is your\b',
        r'(?:facebook|fb)\s*(?:confirmation|verification|security|login|reset)?\s*code[:\s=]+(?:FB-)?([0-9]{5,8})\b',
        r'(?:código de confirmación|código de facebook)[:\s=]+([0-9]{5,8})\b',
        r'\b([0-9]{5,8})\s+(?:es tu|is your)\s+(?:código|code)\b',
    ]
    for pat in fb_patterns:
        m = re.search(pat, combined, re.IGNORECASE)
        if m:
            cand = m.group(1).strip()
            if not is_invalid_year_or_date(cand):
                return cand
        
    # 4. Labeled OTP patterns
    labeled_patterns = [
        r'(?:security code|verification code|login code|confirmation code|access code|single-use code|one-time code|código de verificación|code de vérification)[:\s=]+([0-9]{4,8})\b',
        r'(?:code|otp|pin|passcode|código)[:\s=]+([0-9]{4,8})\b',
        r'\b([0-9]{4,8})[:\s]+is your (?:code|otp|verification|security|confirmation)\b',
        r'\buse\s+([0-9]{4,8})\s+(?:to|as|for)\b',
        r'\byour\s+(?:security|verification|login|single-use)?\s*code\s+is[:\s]+([0-9]{4,8})\b',
        r'\benter\s+([0-9]{4,8})\b'
    ]
    for pat in labeled_patterns:
        m = re.search(pat, combined, re.IGNORECASE)
        if m:
            cand = m.group(1).strip()
            if not is_invalid_year_or_date(cand):
                return cand
            
    # 5. Check 6-digit numbers in subject first
    sub_six = re.findall(r'\b([0-9]{6})\b', subject)
    for c in sub_six:
        if not is_invalid_year_or_date(c):
            return c
            
    # 6. HTML prominent tags
    html_tags = re.findall(r'>\s*([0-9]{4,8})\s*<', body)
    for c in html_tags:
        if not is_invalid_year_or_date(c):
            return c
            
    # 7. General 6-digit numbers in combined text
    six_digit = re.findall(r'\b([0-9]{6})\b', combined)
    for c in six_digit:
        if not is_invalid_year_or_date(c):
            return c
            
    # 8. General 4 or 5 or 8 digits
    for pat in [r'\b([0-9]{5})\b', r'\b([0-9]{4})\b', r'\b([0-9]{8})\b']:
        matches = re.findall(pat, combined)
        for c in matches:
            if not is_invalid_year_or_date(c):
                return c
                
    return None

def detect_service(sender: str, subject: str) -> str:
    text = (sender + " " + subject).lower()
    services = {
        "Microsoft": ["microsoft", "live.com", "msft", "azure", "xbox", "accountprotection"],
        "WhatsApp": ["whatsapp", "meta"],
        "Google": ["google", "gmail", "youtube", "android"],
        "Telegram": ["telegram"],
        "Facebook / Meta": ["instagram", "facebook", "meta", "fbmail"],
        "TikTok": ["tiktok", "bytedance"],
        "Netflix": ["netflix"],
        "Binance": ["binance", "crypto"],
        "Steam": ["steam", "valvesoftware"],
        "OpenAI": ["openai", "chatgpt"],
        "Amazon": ["amazon", "aws"],
        "Discord": ["discord"],
        "Twitter / X": ["twitter", "x.com"],
        "Apple": ["apple", "icloud"],
        "Snapchat": ["snapchat"],
        "PayPal": ["paypal"],
        "Uber": ["uber"]
    }
    for name, keywords in services.items():
        if any(k in text for k in keywords):
            return name
    return "Outlook Service"

FIRST_NAMES = ["alex", "jordan", "taylor", "morgan", "sam", "chris", "pat", "robin", "casey", "riley", "zack", "emma", "noah", "liam", "olivia"]
LAST_NAMES = ["smith", "johnson", "williams", "brown", "jones", "miller", "davis", "garcia", "rodriguez", "wilson", "khan", "ross", "clark"]

def generate_random_outlook() -> dict:
    fn = random.choice(FIRST_NAMES)
    ln = random.choice(LAST_NAMES)
    num = random.randint(100, 999)
    domain = random.choice(["outlook.com", "hotmail.com"])
    email_addr = f"{fn}.{ln}{num}@{domain}".lower()
    full_name = f"{fn.title()} {ln.title()}"
    acc_id = str(uuid.uuid4())[:8]
    pwd = f"Pass#{fn.title()}{num}!"
    return {
        "id": acc_id,
        "email": email_addr,
        "name": full_name,
        "password": pwd,
        "created_at": time.time(),
        "is_custom": False,
        "unread_count": 0,
        "client_id": "9e5f94bc-e8a4-4e73-b8be-63364c29d753"
    }

# ----------------- Real Outlook Token & Mail Fetching -----------------
TOKEN_CACHE: Dict[str, dict] = {}

def get_outlook_access_token(account: dict) -> Optional[str]:
    aid = account.get("id")
    now = time.time()
    if aid in TOKEN_CACHE:
        cached = TOKEN_CACHE[aid]
        if cached["expires_at"] > now + 60:
            return cached["access_token"]
            
    token = account.get("token")
    if not token or not token.startswith("M."):
        return None
        
    client_id = account.get("client_id") or "9e5f94bc-e8a4-4e73-b8be-63364c29d753"
    try:
        resp = requests.post("https://login.live.com/oauth20_token.srf", data={
            "client_id": client_id,
            "grant_type": "refresh_token",
            "refresh_token": token
        }, timeout=15)
        if resp.status_code == 200:
            data = resp.json()
            at = data.get("access_token")
            new_rt = data.get("refresh_token")
            if new_rt and new_rt != token:
                account["token"] = new_rt
            expires_in = data.get("expires_in", 3600)
            TOKEN_CACHE[aid] = {
                "access_token": at,
                "expires_at": now + expires_in
            }
            return at
        else:
            print(f"Token refresh failed ({resp.status_code}) for {account.get('email')}")
    except Exception as e:
        print(f"Token error for {account.get('email')}: {e}")
    return None

def fetch_imap_live_messages(account: dict) -> List[dict]:
    email_addr = account.get("email")
    pwd = account.get("password")
    if not email_addr or not pwd:
        return []
    parsed_emails = []
    try:
        mail = imaplib.IMAP4_SSL("outlook.office365.com", 993, timeout=10)
        mail.login(email_addr, pwd)
        for folder in ["INBOX", "Junk", "Junk Email", "Spam"]:
            try:
                res_sel, _ = mail.select(folder)
                if res_sel != "OK":
                    continue
                target_ids = []
                try:
                    s_fb, d_fb = mail.search(None, '(OR FROM "facebook" SUBJECT "facebook")')
                    if s_fb == "OK" and d_fb[0]:
                        target_ids.extend(d_fb[0].split())
                except Exception:
                    pass

                status, data = mail.search(None, "ALL")
                if status == "OK" and data[0]:
                    all_ids = data[0].split()
                    target_ids.extend(all_ids[-30:])

                unique_ids = list(dict.fromkeys(target_ids))
                recent_ids = unique_ids[-35:]

                for mid in reversed(recent_ids):
                    res, msg_data = mail.fetch(mid, "(RFC822)")
                    if res != "OK" or not msg_data or not msg_data[0]:
                        continue
                    raw_email = msg_data[0][1]
                    msg = email.message_from_bytes(raw_email)
                    
                    sub_bytes, encoding = decode_header(msg.get("Subject", ""))[0]
                    subject = sub_bytes.decode(encoding or "utf-8", errors="ignore") if isinstance(sub_bytes, bytes) else str(sub_bytes)
                        
                    from_hdr = msg.get("From", "")
                    from_bytes, encoding = decode_header(from_hdr)[0]
                    from_str = from_bytes.decode(encoding or "utf-8", errors="ignore") if isinstance(from_bytes, bytes) else str(from_bytes)
                    sender_name = from_str.split("<")[0].strip().strip('"') if "<" in from_str else from_str
                    sender_email = re.search(r'<([^>]+)>', from_str).group(1) if "<" in from_str and ">" in from_str else from_str
                    
                    body_text = ""
                    body_html = ""
                    if msg.is_multipart():
                        for part in msg.walk():
                            ctype = part.get_content_type()
                            payload = part.get_payload(decode=True)
                            if payload:
                                text = payload.decode(part.get_content_charset() or "utf-8", errors="ignore")
                                if ctype == "text/plain" and not body_text:
                                    body_text = text
                                elif ctype == "text/html" and not body_html:
                                    body_html = text
                    else:
                        payload = msg.get_payload(decode=True)
                        if payload:
                            body_text = payload.decode(msg.get_content_charset() or "utf-8", errors="ignore")
                            
                    if not body_html:
                        body_html = f"<p>{body_text}</p>"
                    if not body_text:
                        body_text = re.sub(r'<[^>]+>', ' ', body_html).strip()
                        
                    date_str = msg.get("Date")
                    ts = time.time()
                    if date_str:
                        try:
                            parsed_tuple = email.utils.parsedate_tz(date_str)
                            if parsed_tuple:
                                ts = email.utils.mktime_tz(parsed_tuple)
                        except Exception:
                            pass
                            
                    otp = extract_otp(subject, body_text or body_html)
                    service = detect_service(f"{sender_name} {sender_email}", subject)
                    hash_id = hashlib.md5(f"{email_addr}_{subject}_{ts}".encode("utf-8")).hexdigest()[:12]
                    
                    parsed_emails.append({
                        "id": hash_id,
                        "account_id": account.get("id"),
                        "sender_name": sender_name or "Unknown",
                        "sender_email": sender_email,
                        "subject": subject or "(No Subject)",
                        "body_text": body_text,
                        "body_html": body_html,
                        "otp_code": otp,
                        "service_tag": service,
                        "timestamp": ts,
                        "is_read": False,
                        "is_real": True
                    })
            except Exception:
                pass
        mail.logout()
    except Exception as e:
        print(f"IMAP fallback for {email_addr}: {e}")
    return parsed_emails

def fetch_outlook_live_messages(account: dict) -> List[dict]:
    access_token = get_outlook_access_token(account)
    if not access_token:
        return fetch_imap_live_messages(account)
        
    headers = {"Authorization": f"Bearer {access_token}", "Accept": "application/json"}
    urls = [
        "https://outlook.office.com/api/v2.0/me/messages?$top=30&$orderby=ReceivedDateTime desc",
        "https://outlook.office.com/api/v2.0/me/MailFolders/JunkEmail/messages?$top=15&$orderby=ReceivedDateTime desc"
    ]
    raw_msgs = []
    seen_ids = set()
    for u in urls:
        try:
            r = requests.get(u, headers=headers, timeout=12)
            if r.status_code == 200:
                for item in r.json().get("value", []):
                    mid = item.get("Id")
                    if mid and mid not in seen_ids:
                        seen_ids.add(mid)
                        raw_msgs.append(item)
        except Exception as e:
            print(f"Error fetching from {u}: {e}")
            
    parsed_emails = []
    for item in raw_msgs:
        subject = item.get("Subject") or "(No Subject)"
        sender_info = item.get("From", {}).get("EmailAddress", {})
        sender_name = sender_info.get("Name") or "Unknown"
        sender_email = sender_info.get("Address") or ""
        preview = item.get("BodyPreview") or ""
        body_obj = item.get("Body", {})
        body_content = body_obj.get("Content") or ""
        is_html = body_obj.get("ContentType", "").lower() == "html"
        
        body_html = body_content if is_html else f"<p>{body_content}</p>"
        body_text = preview or re.sub(r'<[^>]+>', ' ', body_content).strip()
        
        dt_str = item.get("ReceivedDateTime")
        ts = time.time()
        if dt_str:
            try:
                dt = datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
                ts = dt.timestamp()
            except Exception:
                pass
                
        otp = extract_otp(subject, body_text or body_html)
        service = detect_service(f"{sender_name} {sender_email}", subject)
        hash_id = hashlib.md5(item.get("Id", str(ts)).encode("utf-8")).hexdigest()[:12]
        
        parsed_emails.append({
            "id": hash_id,
            "account_id": account.get("id"),
            "sender_name": sender_name,
            "sender_email": sender_email,
            "subject": subject,
            "body_text": body_text,
            "body_html": body_html,
            "otp_code": otp,
            "service_tag": service,
            "timestamp": ts,
            "is_read": bool(item.get("IsRead", False)),
            "is_real": True
        })
        
    return parsed_emails

async def sync_account_live_emails(user_email: str, account_id: str) -> dict:
    user = get_user_data(user_email)
    if not user:
        return {"status": "error", "message": "User profile nahi mila."}
    acc = next((a for a in user.get("accounts", []) if a["id"] == account_id), None)
    if not acc:
        return {"status": "error", "message": "Account nahi mila."}
        
    live_messages = fetch_outlook_live_messages(acc)
    
    user.setdefault("emails", {})
    existing_emails = user["emails"].get(account_id, [])
    existing_map = {e["id"]: e for e in existing_emails}
    
    new_found = []
    for msg in live_messages:
        if msg["id"] not in existing_map:
            new_found.append(msg)
            existing_map[msg["id"]] = msg
        else:
            existing_map[msg["id"]]["body_html"] = msg["body_html"]
            existing_map[msg["id"]]["otp_code"] = msg["otp_code"]
            existing_map[msg["id"]]["service_tag"] = msg["service_tag"]
            
    updated_list = sorted(list(existing_map.values()), key=lambda x: x["timestamp"], reverse=True)
    user["emails"][account_id] = updated_list
    acc["unread_count"] = sum(1 for e in updated_list if not e.get("is_read"))
    save_user_data(user_email, user)
    
    for nm in reversed(new_found):
        await broadcast_new_email(account_id, nm)
        
    return {
        "status": "success",
        "total_count": len(updated_list),
        "new_count": len(new_found),
        "emails": updated_list,
        "account": acc,
        "has_token": bool(acc.get("token"))
    }

# ----------------- User Helpers -----------------
def get_user_data(user_email: str) -> Optional[dict]:
    db = load_db()
    email_clean = user_email.strip().lower()
    user = db.get("users", {}).get(email_clean)
    if user and not user.get("api_key"):
        user["api_key"] = generate_api_key()
        save_user_data(email_clean, user)
    return user

def save_user_data(user_email: str, user_dict: dict):
    db = load_db()
    if "users" not in db:
        db["users"] = {}
    if not user_dict.get("api_key"):
        user_dict["api_key"] = generate_api_key()
    db["users"][user_email.strip().lower()] = user_dict
    save_db(db)

async def broadcast_new_email(account_id: str, email_data: dict):
    if account_id in ACTIVE_CONNECTIONS:
        dead = []
        for ws in ACTIVE_CONNECTIONS[account_id]:
            try:
                await ws.send_json({
                    "event": "new_email",
                    "email": email_data
                })
            except Exception:
                dead.append(ws)
        for ws in dead:
            ACTIVE_CONNECTIONS[account_id].remove(ws)

# ----------------- API Request Models -----------------
class PinAuthRequest(BaseModel):
    email: str
    pin: str

class AddCustomAccountRequest(BaseModel):
    user_email: str
    email: str
    password: Optional[str] = ""

class BulkImportRequest(BaseModel):
    user_email: str
    raw_text: str

class BulkActionRequest(BaseModel):
    user_email: str
    account_ids: List[str]

class SingleFbCheckRequest(BaseModel):
    email: str
    password: Optional[str] = ""
    token: Optional[str] = ""
    client_id: Optional[str] = "9e5f94bc-e8a4-4e73-b8be-63364c29d753"
    raw_line: Optional[str] = ""

class BulkParseRequest(BaseModel):
    raw_text: str

class V1AddAccountRequest(BaseModel):
    email: str
    password: Optional[str] = ""
    token: Optional[str] = ""
    client_id: Optional[str] = "9e5f94bc-e8a4-4e73-b8be-63364c29d753"
    raw_line: Optional[str] = ""

# ----------------- Application Routes -----------------
@app.get("/", response_class=HTMLResponse)
async def serve_index():
    with open(os.path.join(TEMPLATES_DIR, "index.html"), "r", encoding="utf-8") as f:
        return f.read()

@app.post("/api/auth/login")
async def auth_login(req: PinAuthRequest):
    email_clean = req.email.strip().lower()
    pin_clean = req.pin.strip()
    
    if not email_clean or "@" not in email_clean:
        raise HTTPException(status_code=400, detail="Durust Email address darj karein.")
        
    if not (len(pin_clean) == 4 and pin_clean.isdigit()):
        raise HTTPException(status_code=400, detail="PIN sirf 4 digits (e.g. 1234) par mushtamil hona chahiye.")
        
    user = get_user_data(email_clean)
    hashed = hash_pin(pin_clean)
    
    if not user:
        user = {
            "email": email_clean,
            "pin_hash": hashed,
            "api_key": generate_api_key(),
            "created_at": time.time(),
            "accounts": [],
            "emails": {}
        }
        save_user_data(email_clean, user)
        return {
            "status": "created",
            "message": "Naya Profile 4-digit PIN ke sath create ho gaya! Ab Bulk Import ya Add se accounts add karein.",
            "user": {
                "email": user["email"],
                "api_key": user["api_key"],
                "accounts": []
            }
        }
    else:
        if user.get("pin_hash") != hashed:
            raise HTTPException(status_code=401, detail="Ghalat 4-digit PIN! Baraye meharbani durust PIN darj karein.")
            
        if not user.get("api_key"):
            user["api_key"] = generate_api_key()
            save_user_data(email_clean, user)
            
        return {
            "status": "success",
            "message": "PIN verified! Aapka data load ho gaya.",
            "user": {
                "email": user["email"],
                "api_key": user["api_key"],
                "accounts": user.get("accounts", [])
            }
        }

@app.get("/api/user/{user_email}/api-key")
async def get_user_api_key(user_email: str):
    user = get_user_data(user_email)
    if not user:
        raise HTTPException(status_code=404, detail="User profile nahi mila.")
    if not user.get("api_key"):
        user["api_key"] = generate_api_key()
        save_user_data(user_email, user)
    return {
        "status": "success",
        "email": user["email"],
        "api_key": user["api_key"]
    }

@app.post("/api/user/{user_email}/api-key/regenerate")
async def regenerate_user_api_key(user_email: str):
    user = get_user_data(user_email)
    if not user:
        raise HTTPException(status_code=404, detail="User profile nahi mila.")
    new_key = generate_api_key()
    user["api_key"] = new_key
    save_user_data(user_email, user)
    return {
        "status": "success",
        "email": user["email"],
        "api_key": new_key,
        "message": "Nayi API Key kamyabi se generate ho gayi hai!"
    }

@app.get("/api/user/{user_email}/accounts")
async def get_user_accounts(user_email: str):
    user = get_user_data(user_email)
    if not user:
        raise HTTPException(status_code=404, detail="User profile nahi mila.")
    accs = user.get("accounts", [])
    for a in accs:
        if not a.get("password"):
            a["password"] = "Pass#Outlook2026!"
    return accs

@app.post("/api/user/{user_email}/generate")
async def generate_temp_for_user(user_email: str):
    user = get_user_data(user_email)
    if not user:
        raise HTTPException(status_code=404, detail="User profile nahi mila.")
        
    acc = generate_random_outlook()
    user.setdefault("accounts", []).append(acc)
    user.setdefault("emails", {})[acc["id"]] = []
    save_user_data(user_email, user)
    return acc

@app.post("/api/accounts/custom")
async def add_custom_account(req: AddCustomAccountRequest):
    user = get_user_data(req.user_email)
    if not user:
        raise HTTPException(status_code=404, detail="User profile nahi mila.")
        
    email_clean = req.email.strip().lower()
    if not email_clean or "@" not in email_clean:
        raise HTTPException(status_code=400, detail="Invalid Outlook Email address")
        
    prefix = email_clean.split("@")[0].replace(".", " ").replace("_", " ").title()
    acc_id = str(uuid.uuid4())[:8]
    acc = {
        "id": acc_id,
        "email": email_clean,
        "name": prefix,
        "password": req.password or "",
        "created_at": time.time(),
        "is_custom": True,
        "unread_count": 0
    }
    user.setdefault("accounts", []).append(acc)
    user.setdefault("emails", {})[acc_id] = []
    save_user_data(req.user_email, user)
    return acc

@app.post("/api/accounts/bulk-import")
async def bulk_import_accounts(req: BulkImportRequest):
    user = get_user_data(req.user_email)
    if not user:
        raise HTTPException(status_code=404, detail="User profile nahi mila.")
        
    lines = req.raw_text.strip().splitlines()
    imported = []
    user.setdefault("accounts", [])
    user.setdefault("emails", {})
    
    for raw_line in lines:
        line = raw_line.strip()
        if not line:
            continue
            
        email_addr = ""
        pwd = ""
        recovery_email = ""
        recovery_pwd = ""
        token = ""
        client_id = ""
        
        if '|' in line:
            p_parts = [p.strip() for p in line.split('|')]
            email_addr = p_parts[0].lower()
            if len(p_parts) > 1: pwd = p_parts[1]
            if len(p_parts) > 2: token = p_parts[2]
            if len(p_parts) > 3: client_id = p_parts[3]
            if len(p_parts) > 4: recovery_email = p_parts[4]
            if len(p_parts) > 5: recovery_pwd = p_parts[5]
        elif ':' in line:
            c_parts = [p.strip() for p in line.split(':')]
            email_addr = c_parts[0].lower()
            pwd = c_parts[1] if len(c_parts) > 1 else ""
        elif '\t' in line:
            t_parts = [p.strip() for p in line.split('\t')]
            email_addr = t_parts[0].lower()
            pwd = t_parts[1] if len(t_parts) > 1 else ""
        else:
            parts = re.split(r'[\s,]+', line)
            email_addr = parts[0].strip().lower()
            pwd = parts[1].strip() if len(parts) > 1 else ""
            
        if not pwd:
            pwd = "Pass#Outlook2026!"
            
        if "@" in email_addr:
            existing = next((a for a in user["accounts"] if a.get("email") == email_addr), None)
            if existing:
                existing["password"] = pwd
                if recovery_email: existing["recovery_email"] = recovery_email
                if recovery_pwd: existing["recovery_password"] = recovery_pwd
                if token: existing["token"] = token
                if client_id: existing["client_id"] = client_id
                continue
                
            prefix = email_addr.split("@")[0].replace(".", " ").replace("_", " ").title()
            acc_id = str(uuid.uuid4())[:8]
            new_acc = {
                "id": acc_id,
                "email": email_addr,
                "name": prefix,
                "password": pwd,
                "recovery_email": recovery_email,
                "recovery_password": recovery_pwd,
                "token": token,
                "client_id": client_id or "9e5f94bc-e8a4-4e73-b8be-63364c29d753",
                "raw_line": line,
                "created_at": time.time(),
                "is_custom": True,
                "unread_count": 0
            }
            user["accounts"].append(new_acc)
            user["emails"][acc_id] = []
            imported.append(new_acc)
            
    save_user_data(req.user_email, user)
    return {
        "status": "success",
        "imported_count": len(imported),
        "accounts": user["accounts"]
    }

@app.post("/api/accounts/bulk-delete")
async def bulk_delete_accounts(req: BulkActionRequest):
    user = get_user_data(req.user_email)
    if not user:
        raise HTTPException(status_code=404, detail="User profile nahi mila.")
        
    delete_set = set(req.account_ids)
    user["accounts"] = [a for a in user.get("accounts", []) if a["id"] not in delete_set]
    
    for aid in delete_set:
        if aid in user.get("emails", {}):
            del user["emails"][aid]
            
    save_user_data(req.user_email, user)
    return {"status": "deleted", "remaining_count": len(user["accounts"])}

def find_browser_exe():
    paths = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%PROGRAMFILES%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%PROGRAMFILES(X86)%\Google\Chrome\Application\chrome.exe"),
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        os.path.expandvars(r"%PROGRAMFILES(X86)%\Microsoft\Edge\Application\msedge.exe")
    ]
    for p in paths:
        if p and os.path.exists(p):
            return p
    return None

@app.post("/api/accounts/bulk-launch-chrome")
async def bulk_launch_chrome(req: BulkActionRequest):
    user = get_user_data(req.user_email)
    if not user:
        raise HTTPException(status_code=404, detail="User profile nahi mila.")
        
    chrome_exe = find_browser_exe()
    if not chrome_exe:
        raise HTTPException(status_code=404, detail="Browser (Chrome / Edge) installation not found.")
        
    acc_map = {a["id"]: a for a in user.get("accounts", [])}
    launched = []
    
    for aid in req.account_ids:
        if aid in acc_map:
            acc = acc_map[aid]
            safe_name = re.sub(r'[^a-zA-Z0-9_-]', '_', acc['email'])
            profile_dir = os.path.join(CHROME_PROFILES_DIR, safe_name)
            os.makedirs(profile_dir, exist_ok=True)
            
            url = f"https://outlook.live.com/mail/?login_hint={acc['email']}"
            cmd = [
                chrome_exe,
                f"--user-data-dir={profile_dir}",
                f"--app={url}",
                f"--window-name=Outlook - {acc['email']}"
            ]
            try:
                subprocess.Popen(cmd)
                launched.append(acc['email'])
            except Exception as e:
                print(f"Failed launching Chrome for {acc['email']}: {e}")
                
    return {"status": "launched", "count": len(launched), "accounts": launched}

@app.get("/api/user/{user_email}/inbox/{account_id}")
async def get_user_inbox(user_email: str, account_id: str, sync: bool = True):
    user = get_user_data(user_email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    acc = next((a for a in user.get("accounts", []) if a["id"] == account_id), None)
    if not acc:
        raise HTTPException(status_code=404, detail="Account not found")
        
    if sync and (acc.get("token") or acc.get("password")):
        try:
            await sync_account_live_emails(user_email, account_id)
            user = get_user_data(user_email)
            acc = next((a for a in user.get("accounts", []) if a["id"] == account_id), acc)
        except Exception as e:
            print(f"Sync error during get_user_inbox: {e}")
            
    emails_list = sorted(user.get("emails", {}).get(account_id, []), key=lambda x: x["timestamp"], reverse=True)
    return {
        "account": acc,
        "emails": emails_list,
        "has_token": bool(acc.get("token"))
    }

@app.post("/api/user/{user_email}/accounts/{account_id}/sync")
async def sync_single_account(user_email: str, account_id: str):
    res = await sync_account_live_emails(user_email, account_id)
    if res.get("status") == "error":
        raise HTTPException(status_code=400, detail=res.get("message"))
    return res

@app.post("/api/user/{user_email}/sync-all")
async def sync_all_accounts(user_email: str):
    user = get_user_data(user_email)
    if not user:
        raise HTTPException(status_code=404, detail="User profile nahi mila.")
        
    synced = 0
    total_new = 0
    for acc in user.get("accounts", []):
        if acc.get("token") or acc.get("password"):
            try:
                res = await sync_account_live_emails(user_email, acc["id"])
                if res.get("status") == "success":
                    synced += 1
                    total_new += res.get("new_count", 0)
            except Exception as e:
                print(f"Error syncing {acc.get('email')}: {e}")
                
    return {
        "status": "success",
        "synced_accounts": synced,
        "total_new_emails": total_new
    }

@app.post("/api/user/{user_email}/accounts/{account_id}/launch-chrome")
async def launch_chrome_single(user_email: str, account_id: str):
    user = get_user_data(user_email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    acc = next((a for a in user.get("accounts", []) if a["id"] == account_id), None)
    if not acc:
        raise HTTPException(status_code=404, detail="Account not found")
        
    safe_name = re.sub(r'[^a-zA-Z0-9_-]', '_', acc['email'])
    profile_dir = os.path.join(CHROME_PROFILES_DIR, safe_name)
    os.makedirs(profile_dir, exist_ok=True)
    
    chrome_exe = find_browser_exe()
    if not chrome_exe:
        raise HTTPException(status_code=404, detail="Browser (Chrome / Edge) installation not found.")
        
    url = f"https://outlook.live.com/mail/?login_hint={acc['email']}"
    cmd = [
        chrome_exe,
        f"--user-data-dir={profile_dir}",
        f"--app={url}",
        f"--window-name=Outlook - {acc['email']}"
    ]
    try:
        subprocess.Popen(cmd)
        return {"status": "launched", "account": acc["email"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/user/{user_email}/accounts/{account_id}/clear-inbox")
async def clear_user_inbox(user_email: str, account_id: str):
    user = get_user_data(user_email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if "emails" in user and account_id in user["emails"]:
        user["emails"][account_id] = []
        
    for a in user.get("accounts", []):
        if a["id"] == account_id:
            a["unread_count"] = 0
            
    save_user_data(user_email, user)
    return {"status": "cleared"}

@app.post("/api/user/{user_email}/accounts/{account_id}/emails/{email_id}/delete")
@app.delete("/api/user/{user_email}/accounts/{account_id}/emails/{email_id}")
async def delete_single_email(user_email: str, account_id: str, email_id: str):
    user = get_user_data(user_email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    emails = user.get("emails", {}).get(account_id, [])
    user["emails"][account_id] = [e for e in emails if e.get("id") != email_id]
    
    # Recalculate unread count
    for a in user.get("accounts", []):
        if a["id"] == account_id:
            a["unread_count"] = sum(1 for e in user["emails"][account_id] if not e.get("is_read"))
            
    save_user_data(user_email, user)
    return {"status": "deleted", "email_id": email_id}

@app.post("/api/user/{user_email}/accounts/{account_id}/delete")
@app.delete("/api/user/{user_email}/accounts/{account_id}")
async def delete_single_account(user_email: str, account_id: str):
    user = get_user_data(user_email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user["accounts"] = [a for a in user.get("accounts", []) if a["id"] != account_id]
    if account_id in user.get("emails", {}):
        del user["emails"][account_id]
    save_user_data(user_email, user)
    return {"status": "deleted", "account_id": account_id}

# ----------------- Bulk Facebook OTP Checker Tool -----------------
def parse_account_lines(raw_text: str) -> List[dict]:
    lines = raw_text.strip().splitlines()
    accounts = []
    for raw_line in lines:
        line = raw_line.strip()
        if not line:
            continue
        email_addr = ""
        pwd = ""
        recovery_email = ""
        recovery_pwd = ""
        token = ""
        client_id = ""

        if '|' in line:
            parts = [p.strip() for p in line.split('|')]
            email_addr = parts[0].lower()
            if len(parts) > 1: pwd = parts[1]
            if len(parts) > 2: token = parts[2]
            if len(parts) > 3: client_id = parts[3]
            if len(parts) > 4: recovery_email = parts[4]
            if len(parts) > 5: recovery_pwd = parts[5]
        elif ':' in line:
            parts = [p.strip() for p in line.split(':')]
            email_addr = parts[0].lower()
            pwd = parts[1] if len(parts) > 1 else ""
        elif '\t' in line:
            parts = [p.strip() for p in line.split('\t')]
            email_addr = parts[0].lower()
            pwd = parts[1] if len(parts) > 1 else ""
        else:
            parts = re.split(r'[\s,]+', line)
            email_addr = parts[0].strip().lower()
            pwd = parts[1].strip() if len(parts) > 1 else ""

        if "@" in email_addr:
            accounts.append({
                "id": str(uuid.uuid4())[:8],
                "email": email_addr,
                "password": pwd,
                "token": token,
                "client_id": client_id or "9e5f94bc-e8a4-4e73-b8be-63364c29d753",
                "recovery_email": recovery_email,
                "recovery_password": recovery_pwd,
                "raw_line": line
            })
    return accounts

def find_account_in_db(email_addr: str) -> tuple[Optional[dict], list]:
    db = load_db()
    email_clean = email_addr.strip().lower()
    for u_email, u_data in db.get("users", {}).items():
        for a in u_data.get("accounts", []):
            if a.get("email", "").strip().lower() == email_clean:
                existing_emails = u_data.get("emails", {}).get(a.get("id"), [])
                return a, existing_emails
    return None, []

def check_account_for_fb_otp(acc: dict) -> dict:
    email_addr = acc.get("email", "").strip().lower()
    raw_line = acc.get("raw_line", "") or f"{email_addr}|{acc.get('password', '')}"
    
    if not email_addr or "@" not in email_addr:
        return {
            "status": "error",
            "has_fb_otp": False,
            "email": email_addr,
            "password": acc.get("password", ""),
            "otp_code": None,
            "message": "Invalid email address",
            "raw_line": raw_line
        }

    db_acc, existing_emails = find_account_in_db(email_addr)
    if db_acc:
        if not acc.get("token") and db_acc.get("token"): acc["token"] = db_acc["token"]
        if not acc.get("client_id") and db_acc.get("client_id"): acc["client_id"] = db_acc["client_id"]
        if not acc.get("password") and db_acc.get("password"): acc["password"] = db_acc["password"]
        if not acc.get("id") and db_acc.get("id"): acc["id"] = db_acc["id"]

    all_messages = []
    seen_ids = set()

    for e in (existing_emails or []):
        eid = e.get("id") or f"{e.get('subject')}_{e.get('timestamp')}"
        if eid not in seen_ids:
            seen_ids.add(eid)
            all_messages.append(e)

    try:
        live_messages = fetch_outlook_live_messages(acc)
        for msg in live_messages:
            mid = msg.get("id") or f"{msg.get('subject')}_{msg.get('timestamp')}"
            if mid not in seen_ids:
                seen_ids.add(mid)
                all_messages.append(msg)
    except Exception as e:
        print(f"Live fetch error during FB check: {e}")

    fb_messages = []
    fb_otp = None
    best_msg = None

    all_messages.sort(key=lambda x: x.get("timestamp") or 0, reverse=True)

    for msg in all_messages:
        sender_email = (msg.get("sender_email") or "").lower()
        sender_name = (msg.get("sender_name") or "").lower()
        subject = msg.get("subject") or ""
        body_text = msg.get("body_text") or ""
        body_html = msg.get("body_html") or ""

        is_fb = (
            "facebookmail.com" in sender_email or
            "facebook.com" in sender_email or
            "meta.com" in sender_email or
            "facebook" in sender_name or
            "meta" in sender_name or
            "facebook" in subject.lower() or
            "fb-" in subject.lower() or
            "fb code" in subject.lower() or
            "confirm this email address" in subject.lower() or
            "código de facebook" in subject.lower() or
            "código de confirmación" in subject.lower()
        )

        if is_fb:
            otp = msg.get("otp_code")
            if not otp:
                otp = extract_otp(subject, body_text or body_html)
            
            if not otp:
                fb_m = re.search(r'\b(?:FB-)?([0-9]{5,8})\b', f"{subject} {body_text}")
                if fb_m and not is_invalid_year_or_date(fb_m.group(1)):
                    otp = fb_m.group(1)

            fb_messages.append({
                "subject": subject,
                "sender": f"{sender_name} <{sender_email}>",
                "otp": otp,
                "timestamp": msg.get("timestamp")
            })

            if otp and not fb_otp:
                fb_otp = otp
                best_msg = msg

    if fb_otp:
        return {
            "status": "success",
            "has_fb_otp": True,
            "email": email_addr,
            "password": acc.get("password", ""),
            "otp_code": fb_otp,
            "subject": best_msg.get("subject", "Facebook Confirmation Code"),
            "timestamp": best_msg.get("timestamp", time.time()),
            "raw_line": raw_line,
            "total_emails": len(all_messages),
            "fb_emails_count": len(fb_messages)
        }
    else:
        has_fb_mail = len(fb_messages) > 0
        return {
            "status": "success",
            "has_fb_otp": False,
            "email": email_addr,
            "password": acc.get("password", ""),
            "otp_code": None,
            "subject": fb_messages[0]["subject"] if has_fb_mail else None,
            "timestamp": time.time(),
            "raw_line": raw_line,
            "total_emails": len(all_messages),
            "fb_emails_count": len(fb_messages)
        }

@app.post("/api/tools/parse-bulk-accounts")
async def api_parse_bulk_accounts(req: BulkParseRequest):
    accs = parse_account_lines(req.raw_text)
    return {"status": "success", "count": len(accs), "accounts": accs}

@app.post("/api/tools/check-fb-otp")
async def api_check_single_fb_otp(req: SingleFbCheckRequest):
    acc_dict = {
        "email": req.email,
        "password": req.password,
        "token": req.token,
        "client_id": req.client_id,
        "raw_line": req.raw_line
    }
    return check_account_for_fb_otp(acc_dict)

# ----------------- Developer API (v1) Endpoints -----------------
def get_authenticated_user(
    api_key: Optional[str] = None,
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    authorization: Optional[str] = Header(None, alias="Authorization")
) -> tuple[str, dict]:
    key = api_key or x_api_key
    if not key and authorization:
        if authorization.lower().startswith("bearer "):
            key = authorization[7:].strip()
        else:
            key = authorization.strip()

    if not key:
        raise HTTPException(
            status_code=401,
            detail="API Key matloob hai. Baraye meharbani 'X-API-Key' header ya '?api_key=' parameter provide karein."
        )

    db = load_db()
    for u_email, u_data in db.get("users", {}).items():
        if u_data.get("api_key") and u_data.get("api_key").strip() == key.strip():
            return u_email, u_data

    raise HTTPException(
        status_code=401,
        detail="Ghalat ya invalid API Key! Baraye meharbani durust API Key provide karein."
    )

@app.get("/api/v1/me")
async def v1_get_me(auth: tuple = Depends(get_authenticated_user)):
    u_email, u_data = auth
    return {
        "status": "success",
        "user_email": u_email,
        "total_accounts": len(u_data.get("accounts", [])),
        "created_at": u_data.get("created_at")
    }

@app.get("/api/v1/accounts")
async def v1_get_accounts(auth: tuple = Depends(get_authenticated_user)):
    u_email, u_data = auth
    accounts = []
    for a in u_data.get("accounts", []):
        accounts.append({
            "id": a.get("id"),
            "email": a.get("email"),
            "name": a.get("name"),
            "unread_count": a.get("unread_count", 0),
            "created_at": a.get("created_at"),
            "has_token": bool(a.get("token"))
        })
    return {
        "status": "success",
        "user_email": u_email,
        "count": len(accounts),
        "accounts": accounts
    }

@app.post("/api/v1/accounts/add")
async def v1_add_account(req: V1AddAccountRequest, auth: tuple = Depends(get_authenticated_user)):
    u_email, u_data = auth
    email_clean = req.email.strip().lower()
    if not email_clean or "@" not in email_clean:
        raise HTTPException(status_code=400, detail="Invalid email address.")

    u_data.setdefault("accounts", [])
    u_data.setdefault("emails", {})

    existing = next((a for a in u_data["accounts"] if a.get("email") == email_clean), None)
    if existing:
        if req.password: existing["password"] = req.password
        if req.token: existing["token"] = req.token
        if req.client_id: existing["client_id"] = req.client_id
        save_user_data(u_email, u_data)
        return {"status": "updated", "account": existing}

    prefix = email_clean.split("@")[0].replace(".", " ").replace("_", " ").title()
    acc_id = str(uuid.uuid4())[:8]
    new_acc = {
        "id": acc_id,
        "email": email_clean,
        "name": prefix,
        "password": req.password or "Pass#Outlook2026!",
        "token": req.token or "",
        "client_id": req.client_id or "9e5f94bc-e8a4-4e73-b8be-63364c29d753",
        "raw_line": req.raw_line or f"{email_clean}|{req.password}",
        "created_at": time.time(),
        "is_custom": True,
        "unread_count": 0
    }
    u_data["accounts"].append(new_acc)
    u_data["emails"][acc_id] = []
    save_user_data(u_email, u_data)
    return {"status": "created", "account": new_acc}

@app.get("/api/v1/otp")
async def v1_get_latest_otp(
    email: Optional[str] = None,
    account_id: Optional[str] = None,
    service: Optional[str] = None,
    sync: bool = True,
    auth: tuple = Depends(get_authenticated_user)
):
    u_email, u_data = auth
    if not email and not account_id:
        raise HTTPException(status_code=400, detail="'email' ya 'account_id' query parameter zaroori hai.")

    acc = None
    for a in u_data.get("accounts", []):
        if email and a.get("email", "").strip().lower() == email.strip().lower():
            acc = a
            break
        if account_id and a.get("id") == account_id:
            acc = a
            break

    if not acc:
        raise HTTPException(
            status_code=404,
            detail=f"Account '{email or account_id}' aapke profile ({u_email}) me nahi mila."
        )

    aid = acc["id"]
    if sync and (acc.get("token") or acc.get("password")):
        try:
            await sync_account_live_emails(u_email, aid)
            u_data = get_user_data(u_email)
        except Exception as e:
            print(f"Sync error during API v1 OTP fetch: {e}")

    emails = u_data.get("emails", {}).get(aid, [])
    service_lower = service.strip().lower() if service else None
    found_otp = None
    best_email = None
    all_otps = []

    for em in sorted(emails, key=lambda x: x.get("timestamp", 0), reverse=True):
        otp_code = em.get("otp_code")
        if not otp_code:
            otp_code = extract_otp(em.get("subject", ""), em.get("body_text", "") or em.get("body_html", ""))
        if otp_code:
            s_tag = em.get("service_tag", "")
            if service_lower:
                combined_text = f"{s_tag} {em.get('subject','')} {em.get('sender_name','')} {em.get('sender_email','')}".lower()
                if service_lower not in combined_text:
                    continue
            item = {
                "otp": otp_code,
                "service": s_tag,
                "subject": em.get("subject"),
                "sender": f"{em.get('sender_name','')} <{em.get('sender_email','')}>".strip(),
                "timestamp": em.get("timestamp")
            }
            all_otps.append(item)
            if not found_otp:
                found_otp = otp_code
                best_email = item

    if found_otp and best_email:
        return {
            "status": "success",
            "has_otp": True,
            "account_email": acc["email"],
            "otp": found_otp,
            "service": best_email["service"],
            "subject": best_email["subject"],
            "sender": best_email["sender"],
            "timestamp": best_email["timestamp"],
            "all_otps": all_otps
        }
    else:
        return {
            "status": "no_otp",
            "has_otp": False,
            "account_email": acc["email"],
            "otp": None,
            "message": "Is account ke liye abhi koi OTP nahi mila.",
            "total_emails_checked": len(emails)
        }

@app.get("/api/v1/emails")
async def v1_get_account_emails(
    email: Optional[str] = None,
    account_id: Optional[str] = None,
    limit: int = 50,
    sync: bool = True,
    auth: tuple = Depends(get_authenticated_user)
):
    u_email, u_data = auth
    if not email and not account_id:
        raise HTTPException(status_code=400, detail="'email' ya 'account_id' query parameter zaroori hai.")

    acc = None
    for a in u_data.get("accounts", []):
        if email and a.get("email", "").strip().lower() == email.strip().lower():
            acc = a
            break
        if account_id and a.get("id") == account_id:
            acc = a
            break

    if not acc:
        raise HTTPException(
            status_code=404,
            detail=f"Account '{email or account_id}' aapke profile ({u_email}) me nahi mila."
        )

    aid = acc["id"]
    if sync and (acc.get("token") or acc.get("password")):
        try:
            await sync_account_live_emails(u_email, aid)
            u_data = get_user_data(u_email)
        except Exception as e:
            print(f"Sync error during API v1 emails fetch: {e}")

    emails = u_data.get("emails", {}).get(aid, [])
    sorted_emails = sorted(emails, key=lambda x: x.get("timestamp", 0), reverse=True)[:limit]

    return {
        "status": "success",
        "account_email": acc["email"],
        "total_count": len(emails),
        "returned_count": len(sorted_emails),
        "emails": sorted_emails
    }

@app.get("/api/v1/fb-check")
async def v1_check_fb_otp(
    email: Optional[str] = None,
    account_id: Optional[str] = None,
    auth: tuple = Depends(get_authenticated_user)
):
    u_email, u_data = auth
    if not email and not account_id:
        raise HTTPException(status_code=400, detail="'email' ya 'account_id' query parameter zaroori hai.")

    acc = None
    for a in u_data.get("accounts", []):
        if email and a.get("email", "").strip().lower() == email.strip().lower():
            acc = a
            break
        if account_id and a.get("id") == account_id:
            acc = a
            break

    if not acc:
        raise HTTPException(
            status_code=404,
            detail=f"Account '{email or account_id}' aapke profile ({u_email}) me nahi mila."
        )

    res = check_account_for_fb_otp(acc)
    return res

# ----------------- WebSocket Live Connection -----------------
@app.websocket("/ws/{account_id}")
async def websocket_endpoint(websocket: WebSocket, account_id: str):
    await websocket.accept()
    if account_id not in ACTIVE_CONNECTIONS:
        ACTIVE_CONNECTIONS[account_id] = []
    ACTIVE_CONNECTIONS[account_id].append(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        if account_id in ACTIVE_CONNECTIONS and websocket in ACTIVE_CONNECTIONS[account_id]:
            ACTIVE_CONNECTIONS[account_id].remove(websocket)

if __name__ == "__main__":
    import uvicorn
    import webbrowser
    import threading
    import socket

    def open_browser():
        time.sleep(1.2)
        try:
            webbrowser.open("http://localhost:8000")
        except Exception:
            pass

    threading.Thread(target=open_browser, daemon=True).start()

    print("\n" + "=" * 60)
    print("      Jaun Fetch Otp - OTP Fetcher Pro")
    print("      Support WhatsApp: 03361849934")
    print("=" * 60)
    print("  Local URL:    http://localhost:8000")
    try:
        host_name = socket.gethostname()
        local_ip = socket.gethostbyname(host_name)
        print(f"  Network URL:  http://{local_ip}:8000")
    except Exception:
        pass
    print("  Buy Accounts: Outlook & Hotmail @ Price 10")
    print("=" * 60 + "\n")

    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
