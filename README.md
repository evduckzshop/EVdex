# EVdex — Setup & Deployment Guide

## File Structure

```
evdex/
├── index.html
├── vite.config.js
├── package.json
├── .env.example          ← copy to .env.local
├── schema.sql            ← run this in Supabase SQL editor
├── public/
│   └── favicon.svg
├── supabase/
│   └── functions/
│       └── invite-employee/
│           └── index.ts  ← Edge Function for admin invites
└── src/
    ├── main.jsx
    ├── App.jsx           ← all routes + auth guards
    ├── context/
    │   └── AuthContext.jsx
    ├── lib/
    │   └── supabase.js   ← Supabase client + all helpers
    ├── hooks/
    │   └── useData.js    ← CRUD hooks with auto audit logging
    ├── components/
    │   ├── auth/
    │   │   └── ProtectedRoute.jsx
    │   ├── layout/
    │   │   └── AppLayout.jsx
    │   └── ui/
    │       └── FormComponents.jsx
    └── pages/
        ├── LoginPage.jsx
        ├── PasswordPages.jsx   (ForgotPassword + ResetPassword)
        ├── HomePage.jsx
        ├── SalesPage.jsx
        ├── BuysPage.jsx
        ├── OperationsPages.jsx (Expenses, Shows, Inventory, Contacts)
        ├── ExpensesPage.jsx    (re-export)
        ├── ShowsPage.jsx       (re-export)
        ├── InventoryPage.jsx   (re-export)
        ├── ContactsPage.jsx    (re-export)
        ├── AdminPages.jsx      (CashFlow, P&L, Reporting, Export, Activity, Settings)
        ├── CashFlowPage.jsx    (re-export)
        ├── PLPage.jsx          (re-export)
        ├── ReportingPage.jsx   (re-export)
        ├── ExportPage.jsx      (re-export)
        ├── ActivityPage.jsx    (re-export)
        ├── SettingsPage.jsx    (re-export)
        ├── ProfilePage.jsx
        └── EmployeesPage.jsx
```

---

## Step 1 — Supabase Project

1. Go to https://supabase.com and create a new project
2. Copy your **Project URL** and **anon key** from Settings → API
3. In the SQL editor, paste and run the entire contents of `schema.sql`
4. Go to Authentication → Settings:
   - Disable **Enable email confirmations** (or keep enabled — your choice)
   - Set **Site URL** to your production domain (e.g. `https://evdex.vercel.app`)
   - Add `http://localhost:3000` to **Redirect URLs** for local dev

---

## Step 2 — Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**Never commit `.env.local` to git.**

---

## Step 3 — Create Your Admin Account

In Supabase → Authentication → Users → **Invite user**:
- Enter your email
- After you receive the email and set your password, you'll have a `profiles` row with `role = 'employee'`

Update it to admin in the SQL editor:

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'your@email.com');
```

---

## Step 4 — Deploy the Edge Function

Install the Supabase CLI:
```bash
npm install -g supabase
supabase login
supabase link --project-ref your-project-ref
```

Set the required secrets:
```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
supabase secrets set SITE_URL=https://evdex.vercel.app
```

Deploy:
```bash
supabase functions deploy invite-employee
```

---

## Step 5 — Local Development

```bash
npm install
npm run dev
# Opens at http://localhost:3000
```

---

## Step 6 — Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Add environment variables in the Vercel dashboard:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

## Roles & Access

| Feature                          | Admin | Employee |
|----------------------------------|-------|----------|
| Home / activity feed             | ✅    | ✅       |
| Log sales, buys, expenses        | ✅    | ✅       |
| Shows, inventory, contacts       | ✅    | ✅       |
| Profile page                     | ✅    | ✅       |
| Cash flow                        | ✅    | ❌       |
| Profit & Loss                    | ✅    | ❌       |
| General reporting                | ✅    | ❌       |
| Export CSV                       | ✅    | ❌       |
| Employee management              | ✅    | ❌       |
| Activity log (all users)         | ✅    | ❌       |
| Settings                         | ✅    | ❌       |

Employees who try to access admin URLs are redirected to `/access-denied`.

---

## Inviting Employees

From the **Employees** page in the app:
1. Enter name + email + role
2. Click **Send invite**
3. Supabase emails them a magic link
4. They click it, set their password, and are in

Employee accounts are always admin-created. Public signup is disabled.

---

## Audit Trail

Every `insert` and `update` via `useData.js` hooks automatically:
- Sets `created_by` / `updated_by` to the current user's UUID
- Sets `created_at` / `updated_at` timestamps
- Writes a row to `activity_logs` with action type, entity, summary, and before/after JSON

Admins can view the full log at `/activity`.

---

## RLS Summary

All tables have Row Level Security enabled. Key rules:
- Employees can only **read** their own records
- Admins can **read all** records in every table
- The `is_admin()` helper function is `security definer` — it can't be spoofed from the client
- The `service_role` key is only used in the Edge Function, never in frontend code
- The anon key in the frontend is safe — RLS enforces all access control server-side

---

## PIN / Show Mode (optional future feature)

The `user_pins` table is ready. To implement:
1. Hash a 4-digit PIN client-side with `crypto.subtle`
2. Store hash in `user_pins` via the `useData` hook
3. On the login page, add a "Quick PIN login" flow that looks up the hash
