# Revify Outreach - Production Setup Guide

## Quick Setup Checklist

- [ ] Step 1: Create Supabase Project
- [ ] Step 2: Run Database Schema
- [ ] Step 3: Configure Environment Variables
- [ ] Step 4: Enable Google OAuth
- [ ] Step 5: Deploy to Vercel
- [ ] Step 6: Test the Flow

---

## Step 1: Create Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Configure:
   - **Name**: `revify-outreach`
   - **Database Password**: (save this somewhere safe)
   - **Region**: Choose closest to your users
4. Wait for project to be created (~2 minutes)

---

## Step 2: Run Database Schema

1. In Supabase Dashboard, click **"SQL Editor"** in the left sidebar
2. Click **"New query"**
3. Copy the ENTIRE contents of `lib/supabase/schema.sql`
4. Paste into the SQL editor
5. Click **"Run"** (or press Cmd/Ctrl + Enter)
6. You should see "Success. No rows returned" - this is correct!

**Verify tables were created:**
- Go to **"Table Editor"** in the sidebar
- You should see these tables:
  - `organizations`
  - `users`
  - `api_keys`
  - `ghl_config`
  - `user_settings`
  - `subscriptions`
  - `usage_records`
  - `research_sessions`
  - `api_logs`
  - `audit_logs`

---

## Step 3: Configure Environment Variables

### Get Supabase Keys:

1. In Supabase Dashboard, go to **Settings** (gear icon) → **API**
2. Copy these values:

| Variable | Where to Find |
|----------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL (e.g., `https://abc123.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Under "Project API keys" → `anon` `public` |
| `SUPABASE_SERVICE_ROLE_KEY` | Under "Project API keys" → `service_role` (click "Reveal") |

### Generate Encryption Key:

Run this in your terminal:
```bash
openssl rand -hex 32
```

Copy the output for `API_KEY_ENCRYPTION_KEY`.

### Update .env.local:

Replace the placeholder values in `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-actual-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-actual-service-role-key
API_KEY_ENCRYPTION_KEY=your-generated-32-byte-hex
```

---

## Step 4: Enable Google OAuth

1. In Supabase Dashboard, go to **Authentication** → **Providers**
2. Find **Google** and enable it
3. You'll need Google OAuth credentials:

### Create Google OAuth App:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create or select a project
3. Go to **APIs & Services** → **Credentials**
4. Click **"Create Credentials"** → **"OAuth Client ID"**
5. Select **"Web application"**
6. Configure:
   - **Name**: `Revify Outreach`
   - **Authorized JavaScript origins**:
     - `http://localhost:3000` (for development)
     - `https://your-domain.vercel.app` (for production)
   - **Authorized redirect URIs**:
     - `http://localhost:3000/auth/callback`
     - `https://your-domain.vercel.app/auth/callback`
     - `https://your-project-id.supabase.co/auth/v1/callback`
7. Copy the **Client ID** and **Client Secret**

### Configure in Supabase:

1. Back in Supabase **Authentication** → **Providers** → **Google**
2. Paste your **Client ID** and **Client Secret**
3. Click **Save**

### Configure Redirect URL in Supabase:

1. Go to **Authentication** → **URL Configuration**
2. Set **Site URL**: `http://localhost:3000` (or your production URL)
3. Add to **Redirect URLs**:
   - `http://localhost:3000/auth/callback`
   - `https://your-domain.vercel.app/auth/callback`

---

## Step 5: Deploy to Vercel

### Option A: Using Vercel CLI

```bash
# Install Vercel CLI if not installed
npm i -g vercel

# Deploy
vercel

# Set environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add API_KEY_ENCRYPTION_KEY
vercel env add GHL_API_KEY
vercel env add GHL_LOCATION_ID
vercel env add NEXT_PUBLIC_APP_URL

# Deploy to production
vercel --prod
```

### Option B: Using Vercel Dashboard

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Import your GitHub repository
3. Add Environment Variables in project settings
4. Deploy

---

## Step 6: Test the Flow

### Local Testing:

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

### Test Checklist:

1. **Signup Flow**
   - [ ] Go to `/signup`
   - [ ] Sign up with email OR Google
   - [ ] Verify redirect to onboarding

2. **Onboarding Flow**
   - [ ] Complete Step 1 (Welcome)
   - [ ] Add GHL Location ID (Step 2)
   - [ ] Add OpenAI API Key (Step 3)
   - [ ] Complete onboarding (Step 4)
   - [ ] Verify redirect to dashboard

3. **Research Flow**
   - [ ] Go to `/research`
   - [ ] Enter a company name
   - [ ] Select research depth
   - [ ] Run research
   - [ ] Verify results appear

4. **History Flow**
   - [ ] Go to `/history`
   - [ ] Verify research session appears
   - [ ] Click into session detail
   - [ ] Test "Push to GHL" button

5. **Email Generation**
   - [ ] From history detail, click "Generate Email"
   - [ ] Select persona and tone
   - [ ] Generate email
   - [ ] Verify email appears

---

## Production Readiness Checklist

### Already Done ✅

- [x] Multi-tenant database schema
- [x] Row Level Security (RLS) policies
- [x] User authentication (email + Google OAuth)
- [x] Onboarding flow
- [x] Dashboard with research cards
- [x] Single company research
- [x] Bulk research (GHL import, CSV)
- [x] Email generation
- [x] Research history
- [x] Settings page (API keys, GHL config)
- [x] Credit tracking system
- [x] GHL integration (push contacts)
- [x] Health check endpoint

### Needs Your Action 🔧

- [ ] Create Supabase project
- [ ] Run database schema
- [ ] Configure environment variables
- [ ] Enable Google OAuth
- [ ] Deploy to Vercel
- [ ] Push `enterprise-v2` branch to GitHub

### Optional Enhancements (Post-MVP) 📋

- [ ] Stripe billing integration
- [ ] Sentry error tracking
- [ ] Custom domain
- [ ] Email notifications (low credits)
- [ ] Team member invitations
- [ ] Webhook integrations

---

## Troubleshooting

### "Unauthorized" error on API calls
- Check that `SUPABASE_SERVICE_ROLE_KEY` is correctly set
- Verify user is logged in

### "Organization not found" error
- The `handle_new_user()` trigger may not have run
- Check Supabase Logs for errors
- Manually create organization if needed

### Google OAuth not working
- Verify redirect URLs are correctly configured in both Google Console and Supabase
- Check browser console for specific error messages

### Research not saving
- Check Supabase Logs → Edge Functions
- Verify RLS policies are correct
- Check that `credits_used < credits_limit`

---

## Support

If you run into issues:
1. Check Supabase Dashboard → Logs
2. Check browser console for errors
3. Verify all environment variables are set correctly
