# Quick Start Guide

## Current Status ✅
- [x] Environment files created (`backend/.env` and `frontend/.env.local`)
- [x] Dependencies already installed
- [x] Project structure ready

## Next Steps 🚀

### 1. Get Supabase Credentials
Create a Supabase project at https://supabase.com and get:
- Project URL
- anon public key  
- service_role key

### 2. Update Environment Files
Replace placeholder values in:
- `backend/.env` (lines 2-4)
- `frontend/.env.local` (lines 2-3)

### 3. Set Up Database
In Supabase SQL Editor, run:
1. `database/migrations/001_create_core_tables.sql`
2. `database/migrations/002_create_rls_policies.sql`

### 4. Start Applications
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend  
cd frontend
npm run dev
```

### 5. Access Application
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

## Need Help?
Let me know when you have your Supabase credentials and I'll help update the files and run the database migrations!
