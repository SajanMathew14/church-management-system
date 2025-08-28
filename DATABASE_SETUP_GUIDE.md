# Database Setup Guide

## Step 1: Set up Database Schema

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** (in the left sidebar)
3. Click **New query**

### Run Migration 1 (Core Tables)
1. Copy the entire content from `database/migrations/001_create_core_tables.sql`
2. Paste it into the SQL Editor
3. Click **Run** button
4. You should see "Success. No rows returned" message

### Run Migration 2 (Security Policies)
1. Copy the entire content from `database/migrations/002_create_rls_policies.sql`
2. Paste it into the SQL Editor  
3. Click **Run** button
4. You should see "Success. No rows returned" message

## Step 2: Verify Tables Were Created
1. In the left sidebar, click **Table Editor**
2. You should see these tables:
   - user_profiles
   - families
   - groups
   - group_memberships
   - group_messages
   - attendance_records
   - import_jobs

## Step 3: Ready to Start Applications!
Once the database is set up, we can start the backend and frontend applications.

## Troubleshooting
If you get any errors:
- Make sure you're using the correct Supabase project
- Ensure your service_role key has the correct permissions
- Check that the SQL is copied completely without any truncation
