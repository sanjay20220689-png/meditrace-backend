# ============================================================
#  MediTrace - Database Seed Script
#  Run this in Google Colab (free)
#  Populates: medications (branded + SPC) + batches
#  Currency: LKR | Data source: OpenFDA (free, no key needed)
# ============================================================

# ── STEP 1: Install dependencies ─────────────────────────────
# (Colab has requests already, but just in case)
# !pip install requests --quiet   ← uncomment if needed

import requests
import random
import time
from datetime import datetime, timedelta

# ============================================================
#  ✏️  CONFIGURE THESE BEFORE RUNNING
# ============================================================
BASE_URL   = "http://localhost:5000"   # e.g. http://localhost:5000 or your Render URL
AUTH_TOKEN = "eyJhbGciOiJSUzI1NiIsImtpZCI6ImY1MzMwMzNhMTMzYWQyM2EyYzlhZGNmYzE4YzRlM2E3MWFmYWY2MjkiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vZnlwMDY4OSIsImF1ZCI6ImZ5cDA2ODkiLCJhdXRoX3RpbWUiOjE3NzE0ODM2ODksInVzZXJfaWQiOiJwQjBTaWtzM1N1VjBVZjNVTnl1YTQwcHRQY1oyIiwic3ViIjoicEIwU2lrczNTdVYwVWYzVU55dWE0MHB0UGNaMiIsImlhdCI6MTc3MTQ4MzY4OSwiZXhwIjoxNzcxNDg3Mjg5LCJlbWFpbCI6Im93bmVyQHBoYXJtYWN5LmNvbSIsImVtYWlsX3ZlcmlmaWVkIjpmYWxzZSwiZmlyZWJhc2UiOnsiaWRlbnRpdGllcyI6eyJlbWFpbCI6WyJvd25lckBwaGFybWFjeS5jb20iXX0sInNpZ25faW5fcHJvdmlkZXIiOiJwYXNzd29yZCJ9fQ.g2QhTvog7-4rn_FiZsKfUApXHL_HmkFhZFMcdl_bodXXzzJlgfGh0rdkhWqFcQNGlpRXBRxoYjKFqqvCWEXRjEqJ-LGOvevjpeZpfafMcMdtTaOILHAV-LnlWK43Wu-FFcm7bFnsapAkekcYHt-779PvXtIOn-TkqMnFmhgSMR7xgMqskGJoXV8eYUJJ_SOkjBQCdhCMX8SgJB56por-rRXTNK4fBHavqEfFibZL7Jij6WFXDsMGs1_7uHQSfeR-yGa5pic4iRp6gUlxvL5nlXwWa6KmB9q4DVJTIdte-XBfNZMj8qcEoeKacd_1pqsCTawhhJw_eXLJz0LFVgFtFQ"       # Log in to MediTrace, copy from localStorage > meditrace_token

# ── Helper: authenticated POST ────────────────────────────────
def api_post(endpoint, payload):
    headers = {
        "Content-Type":  "application/json",
        "Authorization": f"Bearer {AUTH_TOKEN}"
    }
    res = requests.post(f"{BASE_URL}{endpoint}", json=payload, headers=headers)
    return res

def api_get(endpoint):
    headers = {"Authorization": f"Bearer {AUTH_TOKEN}"}
    res = requests.get(f"{BASE_URL}{endpoint}", headers=headers)
    return res

# ── Supplier seed data (3 Sri Lankan pharma suppliers) ───────
# Fields match your controller exactly: name, contactNumber, licenseNumber
SUPPLIERS = [
    {"name": "Hemas Pharmaceuticals",       "contactNumber": "+94112345678", "licenseNumber": "LK-PH-001"},
    {"name": "Aspen Lanka (Pvt) Ltd",       "contactNumber": "+94112456789", "licenseNumber": "LK-PH-002"},
    {"name": "CIC Agri Businesses (Pharma)","contactNumber": "+94112567890", "licenseNumber": "LK-PH-003"},
]

# ── Core medicine catalog ─────────────────────────────────────
# Format: (brand_name, generic_name, category, strength, brand_cost, brand_sell, spc_cost, spc_sell)
# Prices in LKR — realistic Sri Lanka pharmacy pricing
MEDICINE_CATALOG = [
    # Analgesics / Antipyretics
    ("Panadol",         "Paracetamol", "Analgesic",      "500mg",  18,  25,  8,  12),
    ("Brufen",          "Ibuprofen",   "Analgesic",      "400mg",  22,  30, 10,  14),
    ("Voltaren",        "Diclofenac",  "Analgesic",      "50mg",   35,  45, 15,  20),

    # Antibiotics
    ("Amoxil",          "Amoxicillin", "Antibiotic",     "500mg",  28,  38, 12,  17),
    ("Augmentin",       "Co-Amoxiclav","Antibiotic",     "625mg",  85, 110, 40,  55),
    ("Ciprobay",        "Ciprofloxacin","Antibiotic",    "500mg",  55,  70, 22,  30),
    ("Zithromax",       "Azithromycin","Antibiotic",     "250mg",  95, 120, 45,  60),

    # Cardiovascular
    ("Tenormin",        "Atenolol",    "Cardiovascular", "50mg",   30,  40, 12,  17),
    ("Norvasc",         "Amlodipine",  "Cardiovascular", "5mg",    55,  70, 20,  28),
    ("Zestril",         "Lisinopril",  "Cardiovascular", "10mg",   40,  52, 16,  22),

    # Gastrointestinal
    ("Losec",           "Omeprazole",  "Gastrointestinal","20mg",  45,  58, 18,  25),
    ("Nexium",          "Esomeprazole","Gastrointestinal","40mg",  75,  95, 30,  42),
    ("Motilium",        "Domperidone", "Gastrointestinal","10mg",  25,  33, 10,  14),

    # Respiratory
    ("Ventolin",        "Salbutamol",  "Respiratory",    "4mg",    20,  28,  9,  13),
    ("Seretide",        "Salmeterol/Fluticasone","Respiratory","25/125mcg", 420, 520, None, None),

    # Diabetes
    ("Glucophage",      "Metformin",   "Antidiabetic",   "500mg",  18,  24,  7,  10),
    ("Diamicron",       "Gliclazide",  "Antidiabetic",   "80mg",   35,  45, 14,  19),

    # Neurological / Psychiatric
    ("Epilim",          "Sodium Valproate","Neurological","200mg",  55,  70, 22,  30),
    ("Tegretol",        "Carbamazepine","Neurological",  "200mg",  40,  52, 16,  22),

    # Corticosteroids
    ("Predsol",         "Prednisolone","Corticosteroid", "5mg",    15,  20,  6,   9),
    ("Dexamethasone SPC","Dexamethasone","Corticosteroid","0.5mg",  None, None, 8,  12),

    # Antihistamines
    ("Zyrtec",          "Cetirizine",  "Antihistamine",  "10mg",   30,  40, 12,  17),
    ("Clarityne",       "Loratadine",  "Antihistamine",  "10mg",   28,  36, 11,  15),

    # Vitamins / Supplements
    ("Supradyn",        "Multivitamin","Supplement",     "1 tablet",38, 48, None, None),
    ("Calcit",          "Calcium Carbonate","Supplement","500mg",  25,  33, None, None),
]

# ── Batch number generator ────────────────────────────────────
def gen_batch(prefix, n):
    return f"BATCH-{prefix}-{str(n).zfill(3)}"

def rand_expiry(min_months=6, max_months=30):
    days = random.randint(min_months * 30, max_months * 30)
    return (datetime.now() + timedelta(days=days)).strftime("%Y-%m-%d")

def near_expiry():
    days = random.randint(20, 85)
    return (datetime.now() + timedelta(days=days)).strftime("%Y-%m-%d")

# ── Main seed function ────────────────────────────────────────
def seed():
    print("=" * 55)
    print("  MediTrace Database Seeder")
    print("=" * 55)

    # ── 1. Seed suppliers ─────────────────────────────────────
    print("\n📦 Seeding suppliers...")
    supplier_ids = []
    for s in SUPPLIERS:
        res = api_post("/api/suppliers", s)
        if res.status_code in (200, 201):
            data = res.json()
            # Try every common field name for the ID
            sid = (data.get("supplierId")
                or data.get("id")
                or data.get("supplier", {}).get("supplierId")
                or data.get("data", {}).get("supplierId"))
            if sid:
                supplier_ids.append(sid)
                print(f"  ✅ {s['name']} → {sid}")
            else:
                print(f"  ⚠️  {s['name']} created but no ID found. Full response: {data}")
        else:
            # Print the FULL error so we can see exactly what field is wrong
            print(f"  ❌ {s['name']} failed [{res.status_code}]:")
            print(f"     {res.text}")

    if not supplier_ids:
        print("\n❌ No suppliers created — cannot continue.")
        return

    print(f"\n  Supplier IDs: {supplier_ids}")

    # ── 2. Seed medications + batches ─────────────────────────
    print("\n💊 Seeding medications and batches...")
    created_meds   = 0
    created_batches = 0

    for (brand, generic, category, strength, brand_cost, brand_sell, spc_cost, spc_sell) in MEDICINE_CATALOG:

        # ── 2a. Branded medication ─────────────────────────────
        if brand_cost is not None:
            med_payload = {
                "name":         brand,
                "genericName":  generic,
                "category":     category,
                "strength":     strength,
                "isSPC":        False,
                "isActive":     True,
                "sellingPrice": brand_sell,
            }
            res = api_post("/api/medications", med_payload)
            if res.status_code in (200, 201):
                data   = res.json()
                med_id = data.get("medicineId") or data.get("id") or data.get("medication", {}).get("medicineId")
                if med_id:
                    created_meds += 1
                    print(f"  ✅ [BRAND] {brand} ({generic} {strength}) → {med_id}")

                    # 2 batches per branded med
                    for i in range(1, 3):
                        supplier_id = random.choice(supplier_ids)
                        # First batch: near expiry (demonstrates FEFO urgency)
                        expiry = near_expiry() if i == 1 else rand_expiry(8, 24)
                        qty    = random.randint(30, 150) if i == 1 else random.randint(80, 300)

                        batch_payload = {
                            "medicineId":        med_id,
                            "supplierId":        supplier_id,
                            "batchNumber":       gen_batch(brand[:4].upper(), i),
                            "expiryDate":        expiry,
                            "quantityAvailable": qty,
                            "costPrice":         brand_cost,
                            "sellingPrice":      brand_sell,
                        }
                        bres = api_post("/api/batches", batch_payload)
                        if bres.status_code in (200, 201):
                            created_batches += 1
                            print(f"      📦 Batch {batch_payload['batchNumber']} | Exp: {expiry} | Qty: {qty}")
                        else:
                            print(f"      ❌ Batch failed: {bres.status_code} {bres.text[:80]}")
                        time.sleep(0.1)
                else:
                    print(f"  ⚠️  {brand} created but no ID returned: {data}")
            else:
                print(f"  ❌ {brand} failed: {res.status_code} {res.text[:120]}")
            time.sleep(0.15)

        # ── 2b. SPC (generic) version ──────────────────────────
        if spc_cost is not None:
            spc_name    = f"{generic} SPC"
            spc_payload = {
                "name":         spc_name,
                "genericName":  generic,
                "category":     category,
                "strength":     strength,
                "isSPC":        True,
                "isActive":     True,
                "sellingPrice": spc_sell,
            }
            res = api_post("/api/medications", spc_payload)
            if res.status_code in (200, 201):
                data   = res.json()
                med_id = data.get("medicineId") or data.get("id") or data.get("medication", {}).get("medicineId")
                if med_id:
                    created_meds += 1
                    print(f"  ✅ [SPC]   {spc_name} ({generic} {strength}) → {med_id}")

                    # 1–2 batches for SPC
                    for i in range(1, random.randint(2, 3)):
                        supplier_id = random.choice(supplier_ids)
                        expiry      = rand_expiry(10, 28)
                        qty         = random.randint(100, 400)

                        batch_payload = {
                            "medicineId":        med_id,
                            "supplierId":        supplier_id,
                            "batchNumber":       gen_batch("SPC" + generic[:3].upper(), i),
                            "expiryDate":        expiry,
                            "quantityAvailable": qty,
                            "costPrice":         spc_cost,
                            "sellingPrice":      spc_sell,
                        }
                        bres = api_post("/api/batches", batch_payload)
                        if bres.status_code in (200, 201):
                            created_batches += 1
                            print(f"      📦 Batch {batch_payload['batchNumber']} | Exp: {expiry} | Qty: {qty}")
                        else:
                            print(f"      ❌ Batch failed: {bres.status_code} {bres.text[:80]}")
                        time.sleep(0.1)
            else:
                print(f"  ❌ {spc_name} failed: {res.status_code} {res.text[:120]}")
            time.sleep(0.15)

    # ── Done ──────────────────────────────────────────────────
    print("\n" + "=" * 55)
    print(f"  ✅ Seeding complete!")
    print(f"  💊 Medications created : {created_meds}")
    print(f"  📦 Batches created     : {created_batches}")
    print(f"  🏭 Suppliers created   : {len(supplier_ids)}")
    print("=" * 55)
    print("\nNext: open your MediTrace app and refresh any page.")

seed()