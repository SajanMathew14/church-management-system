-- Church Management System Database Schema
-- Migration 001: Core Tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create user_profiles table (extends Supabase auth.users)
CREATE TABLE user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  phone VARCHAR(20),
  date_of_birth DATE,
  gender VARCHAR(10),
  blood_group VARCHAR(5) CHECK (blood_group IN ('A+', 'B+', 'AB+', 'O+', 'A-', 'B-', 'AB-', 'O-')),
  address TEXT,
  emergency_contact_name VARCHAR(100),
  emergency_contact_phone VARCHAR(20),
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'member', 'group_leader')),
  family_id UUID,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create families table
CREATE TABLE families (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_name VARCHAR(100) NOT NULL,
  head_of_family_id UUID,
  address TEXT,
  phone VARCHAR(20),
  email VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraints after both tables are created
ALTER TABLE user_profiles ADD CONSTRAINT fk_user_profiles_family_id 
  FOREIGN KEY (family_id) REFERENCES families(id);
ALTER TABLE families ADD CONSTRAINT fk_families_head_of_family_id 
  FOREIGN KEY (head_of_family_id) REFERENCES user_profiles(id);

-- Create groups table
CREATE TABLE groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  group_type VARCHAR(50) NOT NULL CHECK (group_type IN ('sunday_school', 'choir', 'youth', 'senior_youth', 'ministry', 'other')),
  leader_id UUID REFERENCES user_profiles(id),
  max_members INTEGER,
  meeting_day VARCHAR(20),
  meeting_time TIME,
  meeting_location VARCHAR(200),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create group_memberships table
CREATE TABLE group_memberships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'inactive')),
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('member', 'assistant_leader')),
  joined_date DATE,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES user_profiles(id),
  UNIQUE(group_id, user_id)
);

-- Create group_messages table
CREATE TABLE group_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES user_profiles(id),
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'announcement' CHECK (message_type IN ('announcement', 'reminder', 'urgent')),
  is_email_sent BOOLEAN DEFAULT false,
  is_push_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create attendance_records table
CREATE TABLE attendance_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  event_date DATE NOT NULL,
  event_type VARCHAR(50) DEFAULT 'regular_meeting',
  status VARCHAR(20) DEFAULT 'present' CHECK (status IN ('present', 'absent', 'excused')),
  notes TEXT,
  recorded_by UUID REFERENCES user_profiles(id),
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, user_id, event_date, event_type)
);

-- Create import_jobs table for bulk Excel imports
CREATE TABLE import_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  total_records INTEGER DEFAULT 0,
  processed_records INTEGER DEFAULT 0,
  successful_records INTEGER DEFAULT 0,
  failed_records INTEGER DEFAULT 0,
  error_log JSONB,
  created_by UUID REFERENCES user_profiles(id),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_user_profiles_family_id ON user_profiles(family_id);
CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_user_profiles_is_active ON user_profiles(is_active);
CREATE INDEX idx_families_head_of_family_id ON families(head_of_family_id);
CREATE INDEX idx_groups_leader_id ON groups(leader_id);
CREATE INDEX idx_groups_group_type ON groups(group_type);
CREATE INDEX idx_groups_is_active ON groups(is_active);
CREATE INDEX idx_group_memberships_group_id ON group_memberships(group_id);
CREATE INDEX idx_group_memberships_user_id ON group_memberships(user_id);
CREATE INDEX idx_group_memberships_status ON group_memberships(status);
CREATE INDEX idx_group_messages_group_id ON group_messages(group_id);
CREATE INDEX idx_attendance_records_group_id ON attendance_records(group_id);
CREATE INDEX idx_attendance_records_user_id ON attendance_records(user_id);
CREATE INDEX idx_attendance_records_event_date ON attendance_records(event_date);
CREATE INDEX idx_import_jobs_status ON import_jobs(status);
CREATE INDEX idx_import_jobs_created_by ON import_jobs(created_by);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_families_updated_at BEFORE UPDATE ON families 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
