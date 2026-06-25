# Nabora — Complete Local Setup & Testing Guide

This guide runs the full Nabora stack locally (API + Web) and walks through testing every feature in order, from auth to org analytics.

---

## What you will run

| Service | URL | Description |
|---------|-----|-------------|
| nabora-api | http://localhost:3000 | NestJS backend |
| Swagger UI | http://localhost:3000/docs | Interactive API docs |
| nabora-web | http://localhost:3001 | Next.js frontend |
| PostgreSQL | localhost:5432 | Via Docker |
| Redis | localhost:6379 | Via Docker |

---

## Prerequisites

Install these first:

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 20 LTS | https://nodejs.org |
| Docker Desktop | latest | https://docker.com/get-started |
| Git | any | https://git-scm.com |

Verify:
```bash
node -v    # v20.x.x
npm -v     # 10.x.x
docker -v  # 24+
```

---

## Part 1 — nabora-api (Backend)

### Step 1 — Clone & install

```bash
git clone https://github.com/dhruv861/nabora-api.git
cd nabora-api
npm install
```

---

### Step 2 — Start PostgreSQL + Redis with Docker

Create `docker-compose.yml` in the `nabora-api` folder:

```yaml
version: '3.8'
services:
  postgres:
    image: postgis/postgis:16-3.4
    container_name: nabora-postgres
    environment:
      POSTGRES_USER: nabora
      POSTGRES_PASSWORD: nabora123
      POSTGRES_DB: nabora
    ports:
      - '5432:5432'
    volumes:
      - nabora_pg_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    container_name: nabora-redis
    ports:
      - '6379:6379'

volumes:
  nabora_pg_data:
```

Start both:
```bash
docker compose up -d
```

Verify:
```bash
docker ps
# Must show: nabora-postgres and nabora-redis both as "Up"
```

---

### Step 3 — Create `.env`

Create `.env` in the `nabora-api` root:

```env
# App
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL="postgresql://nabora:nabora123@localhost:5432/nabora?schema=public"
DIRECT_URL="postgresql://nabora:nabora123@localhost:5432/nabora?schema=public"

# JWT
JWT_SECRET=local-dev-super-secret-key-minimum-32-chars-long
JWT_EXPIRES_IN=7d

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# SMS provider — "console" prints OTP to terminal instead of sending SMS
SMS_PROVIDER=console

# R2 storage — use mock values for local (file upload won't work but app won't crash)
R2_ACCOUNT_ID=mock-account
R2_ACCESS_KEY_ID=mock-key
R2_SECRET_ACCESS_KEY=mock-secret
R2_BUCKET_NAME=nabora-local
R2_PUBLIC_URL=http://localhost:3000/mock-files

# Firebase Admin — use placeholder for local (Firebase auth not needed with console OTP)
FIREBASE_PROJECT_ID=nabora-local
FIREBASE_CLIENT_EMAIL=mock@nabora-local.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMOCK\n-----END RSA PRIVATE KEY-----\n"

# Frontend CORS
FRONTEND_URL=http://localhost:3001
```

> **Firebase note:** The mock Firebase values above work for local testing because `SMS_PROVIDER=console` bypasses Firebase entirely. The API will log OTPs directly to your terminal.

---

### Step 4 — Run database migrations

```bash
npx prisma migrate dev --name init
```

If it fails first time (fresh DB), use:
```bash
npx prisma db push
```

Then generate the Prisma client:
```bash
npx prisma generate
```

---

### Step 5 — Add PostGIS generated columns

Required for GPS check-in and distance-based feed features:

```bash
docker exec -it nabora-postgres psql -U nabora -d nabora << 'SQL'
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS location_point geography(Point,4326)
  GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint("locationLng","locationLat"),4326)) STORED;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS location_point geography(Point,4326)
  GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint("locationLng","locationLat"),4326)) STORED;

ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS location_point geography(Point,4326)
  GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint("locationLng","locationLat"),4326)) STORED;

CREATE INDEX IF NOT EXISTS idx_job_location ON "Job" USING GIST(location_point);
CREATE INDEX IF NOT EXISTS idx_user_location ON "User" USING GIST(location_point);
CREATE INDEX IF NOT EXISTS idx_event_location ON "Event" USING GIST(location_point);
SQL
```

Expected output: `ALTER TABLE` repeated 3 times, `CREATE INDEX` 3 times.

---

### Step 6 — Seed skills

```bash
npm run seed
```

Expected:
```
Seeding 12 skills...
✅ Seeded 12 skills successfully
```

---

### Step 7 — Start the API

```bash
npm run start:dev
```

Expected output:
```
[NestApplication] Nest application successfully started
Application is running on: http://localhost:3000
```

Open Swagger: **http://localhost:3000/docs** — you should see all API endpoints listed.

---

## Part 2 — nabora-web (Frontend)

Open a **new terminal**.

### Step 8 — Clone & install

```bash
git clone https://github.com/dhruv861/nabora-web.git
cd nabora-web
npm install
```

---

### Step 9 — Create `.env.local`

Create `.env.local` in the `nabora-web` root:

```env
# API URL — points to your local NestJS server
NEXT_PUBLIC_API_URL=http://localhost:3000/v1

# Site URL
NEXT_PUBLIC_SITE_URL=http://localhost:3001

# Auth provider — "nabora" uses the API directly (no Firebase needed for local)
NEXT_PUBLIC_AUTH_PROVIDER=nabora

# Firebase — leave blank or use placeholder (not needed when AUTH_PROVIDER=nabora)
NEXT_PUBLIC_FIREBASE_API_KEY=placeholder
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=placeholder
NEXT_PUBLIC_FIREBASE_PROJECT_ID=placeholder
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=placeholder
NEXT_PUBLIC_FIREBASE_APP_ID=placeholder
```

> **Key:** `NEXT_PUBLIC_AUTH_PROVIDER=nabora` makes the login page call the API's OTP endpoints directly instead of using Firebase. The OTP will appear in the **API terminal** (nabora-api).

---

### Step 10 — Start the web app

```bash
npm run dev
```

Expected:
```
▲ Next.js 16.x
- Local: http://localhost:3001
```

Open **http://localhost:3001** — you should see the Nabora home page.

---

## Part 3 — End-to-End Testing

Now test every feature through the web UI at http://localhost:3001 while watching the API terminal.

---

### 🔐 Test 1 — Auth & Onboarding

**Goal:** Register two users (employer + worker) and complete their profiles.

**User 1 — Employer**

1. Go to http://localhost:3001 → click **Sign In**
2. Enter phone: `9876543210` → click **Send OTP**
3. **Look at the API terminal** — you will see:
   ```
   ========================================
   📱 OTP for 9876543210: 482910
   ========================================
   ```
4. Enter that OTP in the web app → click **Verify**
5. You are logged in. Complete onboarding:
   - Name: `Amit Shah`
   - Account type: **Employer / Organization**
   - City: `Ahmedabad`
   - Location: allow browser GPS, or click the map pin and enter Ahmedabad
6. You land on the feed

**User 2 — Worker** (open an incognito window for the second user)

1. Go to http://localhost:3001 in incognito → Sign In
2. Phone: `9876543211` → Send OTP → check API terminal for OTP
3. Complete onboarding:
   - Name: `Rahul Mehta`
   - Account type: **Worker**
   - City: `Ahmedabad`
4. Go to **Profile** → **Edit** and add:
   - Headline: `Freelance Event Photographer`
   - Category: `photographer`
5. Go to **Profile** → **Verification** — note verification level shows NONE (can test upgrade via admin later)

✅ **What to check:** Both users logged in, profiles visible at `/profile`.

---

### 💼 Test 2 — Create & Publish a Job

Using **User 1 (Employer)** in the normal browser:

1. Go to feed → tap **+** (Post Job) in the bottom nav
2. Fill in the form:
   - Title: `Brand Activation Promoter Needed Today`
   - Description: `We need 3 energetic promoters for a brand activation at Ahmedabad One Mall. You will engage customers and distribute samples. Experience preferred but not required.`
   - Short Description: `Brand activation at Ahmedabad One Mall. ₹800/day.`
   - Category: `Promoter`
   - City: `Ahmedabad`
   - Area: `Vastrapur`
   - Pay: `800` per `Day`
   - Work Date: any future date
   - Vacancies: `3`
3. Click **Save as Draft**
4. On **My Jobs** page, tap **Publish** on the draft job

✅ **What to check:**
- Job appears on the feed at http://localhost:3001/feed
- Job has a SEO URL like `/jobs/ahmedabad/promoter/brand-activation-promoter-needed-today-XXXXXXXX`
- In the API terminal: no errors

---

### 📋 Test 3 — Apply for a Job

Switch to **User 2 (Worker)** incognito window:

1. Go to http://localhost:3001/feed
2. You should see the job created above (if in the same city)
3. Tap the job card → tap **Apply**
4. Enter cover note: `I have 2 years of experience as a promoter and am free on the work date.`
5. Submit application

✅ **What to check:**
- Application button changes to `Applied ✓`
- Switch to User 1 → go to **My Jobs** → tap the job → **View Applicants** — Rahul Mehta should appear

---

### 🤝 Test 4 — Hire Flow

Still as **User 1 (Employer)**:

1. In the applicants list, tap **Shortlist** on Rahul's application
2. Application status changes to `SHORTLISTED`
3. Tap **Hire** → enter:
   - Agreed Rate: `800`
   - Unit: `Day`
4. Confirm hire

✅ **What to check:**
- A chat is automatically created between the two users
- Switch to **User 2** → go to **Chats** → a chat with Amit Shah should appear
- Go to **Hires** (User 2) → hire shows status `ACTIVE`

---

### 💬 Test 5 — Real-Time Chat

Open **both browsers side by side**.

User 1 window → Chats → open the chat with Rahul:
- Type: `Hi Rahul, please be at the venue by 9am tomorrow.`
- Press Send

User 2 window → should see the message appear in real-time without refreshing.

User 2 types a reply → User 1 sees it instantly.

✅ **What to check:**
- Messages appear in real-time (Socket.IO working)
- Typing indicator `Rahul is typing...` appears when the other user is typing
- Bell icon shows unread count when a notification arrives
- Go to **Notifications** page — notification for the hire should appear there

---

### ✅ Test 6 — Complete Hire & Auto-Invoice

**User 1 (Employer)** → **Hires** → open the hire → tap **Mark Complete** → Confirm.

✅ **What to check in the API terminal:**
```
[invoice-generation] delegating to InvoicesService for hireId=...
[InvoicesService] Invoice NAB-2025-00001 generated
[InvoicePdfProcessor] Generating PDF for invoice ...
```
(PDF generation will fail locally since R2 is mocked — that's expected)

Go to **Invoices** (either user) → invoice should appear with:
- Invoice number: `NAB-2025-00001`
- Subtotal: `₹800`
- Platform fee: `₹99`
- Total Payable: `₹899`

---

### ⭐ Test 7 — Ratings

After completing the hire:

**User 1 (Employer)** → Hires → open hire → tap **Rate Now** (amber prompt appears):
- Skill Quality: 5 stars
- Communication: 4 stars
- Professionalism: 5 stars
- Punctuality: 4 stars
- Review: `Great promoter, highly recommend!`
- Submit

**User 2 (Worker)** → Hires → open hire → tap **Rate Now**:
- Payment Reliability: 5 stars
- Communication: 5 stars
- Working Conditions: 4 stars
- Submit

✅ **What to check:**
- Both users receive a `New Review Received` notification
- Go to Rahul's public profile (User 1 can browse workers) → RatingSummary shows average rating

---

### 🏢 Test 8 — Organizations & RBAC

**User 1** → Profile → **Organizations** section → **Create Organization**:
- Name: `EventCo Ahmedabad`
- Type: `Event Management`
- City: `Ahmedabad`
- Create

You land on the org dashboard. Tap **+ Invite Member**:
- Phone: `9876543211` (User 2)
- Role: `Event Manager`
- Send Invite

**User 2** → Profile → Organizations section → EventCo Ahmedabad should appear with role `Event Manager`.

✅ **What to check:**
- User 2 gets a notification about the invitation
- Org dashboard shows team count = 2

---

### 🎪 Test 9 — Events & Bulk Hiring

**User 1** → Organizations → EventCo dashboard → **+ Create Event**:

**Step 1 — Info:**
- Name: `Ahmedabad Brand Summit 2025`
- Description: `3-day summit for brand activations`
- Start: any future date/time
- End: 2 days later
- Next

**Step 2 — Venue:**
- Venue: `Ahmedabad One Mall`
- City: `Ahmedabad`
- Next

**Step 3 — Roles:**
- Role 1: Title `Brand Promoter`, Vacancies `3`, Pay `800`, Per `Day`
- Click `+ Add Another Role`
- Role 2: Title `Event Photographer`, Vacancies `1`, Pay `1500`, Per `Day`
- Click **Publish Event**

✅ **What to check:**
- Event appears in **Events** tab of the org
- Status: `PUBLISHED`
- Two jobs were auto-created (check API: `POST /events/:id/publish` creates 1 job per role)
- The jobs are visible on the public feed

**Apply to event jobs (User 2 incognito):**
- Go to feed → find `Brand Promoter` job → Apply

**Bulk hire (User 1):**
- Org → Events → event → **View Applicants**
- Rahul appears in the `Brand Promoter` tab
- Check his checkbox → tap **Hire Selected (1)** → Confirm Bulk Hire

---

### 📍 Test 10 — GPS Attendance Check-In

**User 2 (Worker)** → Hires → open the event hire → tap **Check In**:
- The full-screen camera modal opens
- Allow camera and GPS permissions
- GPS acquires your location
- Tap **Take Selfie & Check In**

> **Local tip:** The 500m radius check uses the job's `locationLat/Lng` (Ahmedabad One Mall). If your machine GPS shows your actual location and it's more than 500m away from the job, the check-in will fail with a distance error. To bypass this:
> - Use the API directly (see curl below) with coordinates matching the job location
> - Or update the job's `locationLat`/`locationLng` in the DB to match your actual location:
  ```bash
  docker exec -it nabora-postgres psql -U nabora -d nabora -c \
    "UPDATE \"Job\" SET \"locationLat\" = YOUR_LAT, \"locationLng\" = YOUR_LNG;"
  ```

**Check Out (same page):**
- After check-in, the page shows a blue **Check Out** button with elapsed time
- Tap Check Out → GPS acquired → checked out
- `totalHours` is shown in a success toast

✅ **What to check:**
- Org → Events → event → **Attendance** tab → Rahul shows as `CHECKED_OUT` with hours
- Override button (⋮) allows marking someone as Absent or Disputed

---

### 🧾 Test 11 — Invoice Detail & Mark Paid

**User 1** → Invoices → open invoice:
- See full invoice: FROM/TO, job reference, line items, totals
- Tap **Mark as Paid**:
  - Method: `UPI`
  - Reference: `UPI789456123`
  - Date: today
  - Confirm
- Invoice status changes to `PAID`

✅ **What to check:**
- Invoice status badge changes from `PENDING` → `PAID`
- Payment details section appears on the invoice
- User 2 receives a notification

---

### ⚠️ Test 12 — Disputes

**User 2 (Worker)** → Hires → open a hire → scroll to bottom → **Raise Dispute**:
- Type: `Payment Dispute`
- Description: `The employer has not confirmed payment for the additional overtime hours worked during the event.`
- Submit Dispute (confirm in the dialog)

✅ **What to check:**
- Hire status changes to `DISPUTED`
- Dispute detail page shows status `OPEN` and timeline
- Both users receive a `Dispute Raised` notification
- The admin user receives a `New Dispute Requires Review` notification

---

### 🗓️ Test 13 — Availability Calendar

**User 2 (Worker)** → Profile → **My Availability** (or go to http://localhost:3001/availability):
- Current month calendar appears
- Tap any future date to mark it **Unavailable** (turns red)
- Tap again to toggle back to **Available** (turns green)
- Tap a past date — nothing happens (greyed out, not tappable)
- Use `←` / `→` to navigate months

✅ **What to check:**
- Calendar persists after page refresh (data saved to DB)
- `Reset Month` button appears when any date is marked unavailable

---

### 📊 Test 14 — Org Analytics

**User 1** → Organizations → EventCo → **View Analytics** (or stat card **Hire Rate**):

You should see:
- **Hiring Funnel**: Applications → Hires → Hire Rate %
- **Invoice Collection**: Progress circle + total billed / collected amounts
- **Worker Quality**: Average worker rating (from the rating test above) + reliability bar
- **Overview**: Total Jobs, Events, Completed Hires, Invoices Paid

✅ **What to check:** Numbers match what you've actually done in the tests above.

---

### 🔐 Test 15 — Admin Portal

First, make User 1 an admin:
```bash
docker exec -it nabora-postgres psql -U nabora -d nabora -c \
  "UPDATE \"User\" SET \"isAdmin\" = true WHERE phone = '9876543210';"
```

**Log out and log back in** as User 1 (the JWT needs to be re-issued with `isAdmin: true`).

Go to http://localhost:3001/admin/dashboard:

- **Dashboard**: Platform summary stats
- **Users**: Search `rahul` → see Rahul Mehta → tap **Verify** → set level to `SILVER`
- **Organizations**: EventCo Ahmedabad → tap **Verify** → organization gets a ✓ Verified badge
- **Jobs**: See all jobs with status filter
- **Disputes**: See the dispute from Test 12 → expand → set status to `RESOLVED` → enter resolution note → Submit
- **Invoices**: See all invoices
- **Reports**: Full platform summary with all metrics

✅ **What to check:**
- After verifying Rahul, go to his public profile — `🛡 Silver` badge appears
- After resolving the dispute, User 2 gets a `Dispute Update` notification

---

### 🤖 Test 16 — Smart Feed (Recommended)

**User 2 (Worker)** → Feed → tap **Recommended ✨** tab:

- Jobs appear sorted by match score (skill overlap + distance + availability + reliability + rating)
- Jobs with `matchScore ≥ 85` show a `✨ Great Match` badge
- Jobs with `matchScore 70–84` show `★ Good Match`

Verify Redis cache is working:
```bash
# In another terminal
docker exec -it nabora-redis redis-cli KEYS "jobs:feed:*"
# Should show cached keys for non-recommended sections after browsing nearby/featured tabs
```

---

## Quick database inspection

After running through all tests:

```bash
docker exec -it nabora-postgres psql -U nabora -d nabora << 'SQL'
SELECT
  (SELECT COUNT(*) FROM "User") AS users,
  (SELECT COUNT(*) FROM "Job") AS jobs,
  (SELECT COUNT(*) FROM "Application") AS applications,
  (SELECT COUNT(*) FROM "Hire") AS hires,
  (SELECT COUNT(*) FROM "Invoice") AS invoices,
  (SELECT COUNT(*) FROM "Rating") AS ratings,
  (SELECT COUNT(*) FROM "Organization") AS organizations,
  (SELECT COUNT(*) FROM "Event") AS events,
  (SELECT COUNT(*) FROM "Notification") AS notifications,
  (SELECT COUNT(*) FROM "Dispute") AS disputes,
  (SELECT COUNT(*) FROM "AvailabilitySlot") AS availability_slots;
SQL
```

After completing all 16 tests, you should see all counts > 0.

---

## Useful Swagger tests

Open http://localhost:3000/docs → click **Authorize** → paste your JWT.

Useful quick tests via Swagger:
- `GET /v1/health` — DB + Redis ping
- `GET /v1/skills` — 12 seeded skills
- `GET /v1/jobs?lat=23.0225&lng=72.5714&section=nearby` — feed with distance
- `GET /v1/admin/reports/summary` — full platform metrics (admin token)
- `GET /v1/notifications/unread-count` — unread count

---

## Common errors & fixes

| Error | Fix |
|-------|-----|
| `P1001: Can't reach database` | `docker compose up -d` then wait 5s |
| `extension "postgis" does not exist` | Must use `postgis/postgis:16-3.4` image, not plain postgres |
| `column location_point does not exist` | Run Step 5 again |
| `Cannot find module '@prisma/client'` | `npx prisma generate` |
| `OTP not showing in terminal` | Check `SMS_PROVIDER=console` is in `.env` |
| `Firebase error on login` | Check `NEXT_PUBLIC_AUTH_PROVIDER=nabora` in `.env.local` |
| `CORS error in browser` | Check `FRONTEND_URL=http://localhost:3001` in API `.env` |
| `Bull connection error` | Redis not running — `docker compose up -d redis` |
| `403 Admin access required` | Re-login after setting `isAdmin=true` in DB |
| `Check-in fails: too far from job` | Update job coordinates to match your location (see Test 10) |
| `PDF generation fails` | Expected locally — R2 is mocked. Invoice data is still correct |

---

## Reset & start fresh

```bash
# Stop containers and wipe data
docker compose down -v

# Restart fresh
docker compose up -d
npx prisma db push
npx prisma generate

# Re-add PostGIS columns
docker exec -it nabora-postgres psql -U nabora -d nabora -c \
  "ALTER TABLE \"Job\" ADD COLUMN IF NOT EXISTS location_point geography(Point,4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(\"locationLng\",\"locationLat\"),4326)) STORED;"

npm run seed
npm run start:dev
```

---

## Two-terminal cheat sheet

```
Terminal 1 (API):          Terminal 2 (Web):
cd nabora-api              cd nabora-web
npm run start:dev          npm run dev

→ http://localhost:3000    → http://localhost:3001
→ /docs (Swagger)          → Normal browser (User 1)
                           → Incognito (User 2)
```
