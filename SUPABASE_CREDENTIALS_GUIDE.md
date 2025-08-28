# How to Get Supabase Credentials

## Step-by-Step Guide

### 1. Access Your Supabase Project
1. Go to [https://supabase.com](https://supabase.com)
2. Sign in to your account
3. Select your Church Management System project

### 2. Navigate to API Settings
1. In the left sidebar, click on **Settings** (gear icon)
2. Click on **API** from the settings menu

### 3. Find Your Credentials

You'll see a section called **Project API keys**. Here are the three keys you need:

#### For SUPABASE_URL:
- Look for **Project URL** 
- It looks like: `https://your-project-id.supabase.co`

#### For SUPABASE_ANON_KEY:
- Look for **anon** **public**
- It's a long string starting with `eyJ...`
- This key is safe to use in frontend applications

#### For SUPABASE_SERVICE_ROLE_KEY:
- Look for **service_role** **secret** 
- It's also a long string starting with `eyJ...`
- **⚠️ IMPORTANT:** This key has admin privileges - keep it secret!
- Only use this in backend applications, never in frontend code

### 4. Copy the Values
1. Click the **copy** button next to each key
2. Paste them into your environment files:
   - `backend/.env` - All three values
   - `frontend/.env.local` - Only URL and anon key

### 5. Example Layout in Supabase Dashboard
```
Project API keys
┌─────────────────────────────────────────────────────────────┐
│ Project URL                                                 │
│ https://abcdefghijklmnop.supabase.co                       │ [copy]
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ anon public                                                 │
│ eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJz...      │ [copy]
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ service_role secret                                         │
│ eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJz...      │ [copy]
└─────────────────────────────────────────────────────────────┘
```

## Security Notes
- **anon key**: Safe for frontend use, has limited permissions
- **service_role key**: Has full admin access, use ONLY in backend
- Never commit the service_role key to version control
- The `.env` files are already in `.gitignore` to prevent accidental commits
