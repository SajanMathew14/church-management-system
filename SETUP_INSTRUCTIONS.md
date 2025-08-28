# Church Management System Setup Instructions

## Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Supabase account

## 1. Set up Supabase Project

### Create New Project
1. Go to [https://supabase.com](https://supabase.com)
2. Sign up/Sign in
3. Click "New Project"
4. Fill in project details:
   - Name: "Church Management System"
   - Database password: (create and save a strong password)
   - Region: (choose closest to you)
5. Wait for project setup to complete

### Get Credentials
1. Go to Settings → API in your Supabase dashboard
2. Copy these values:
   - Project URL → SUPABASE_URL
   - anon public → SUPABASE_ANON_KEY
   - service_role → SUPABASE_SERVICE_ROLE_KEY

## 2. Environment Setup
Once you have Supabase credentials:
1. Backend: Copy `.env.example` to `.env` and fill in values
2. Frontend: Copy `.env.local.example` to `.env.local` and fill in values

## 3. Database Schema
Run the migration files in SQL Editor:
1. `database/migrations/001_create_core_tables.sql`
2. `database/migrations/002_create_rls_policies.sql`

## 4. Start Applications
Backend: `cd backend && npm run dev`
Frontend: `cd frontend && npm run dev`

The app will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
