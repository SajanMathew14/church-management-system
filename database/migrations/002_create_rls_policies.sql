-- Row Level Security Policies for Church Management System
-- Migration 002: RLS Policies

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;

-- User Profiles Policies
CREATE POLICY "Users can view all active user profiles" ON user_profiles
  FOR SELECT USING (is_active = true);

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can do everything on user profiles" ON user_profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert new user profiles" ON user_profiles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Families Policies
CREATE POLICY "Users can view families" ON families
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage families" ON families
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Family heads can update their family" ON families
  FOR UPDATE USING (head_of_family_id = auth.uid());

-- Groups Policies
CREATE POLICY "Users can view active groups" ON groups
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage all groups" ON groups
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Group leaders can update their groups" ON groups
  FOR UPDATE USING (leader_id = auth.uid());

CREATE POLICY "Group leaders can create groups" ON groups
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'group_leader')
    )
  );

-- Group Memberships Policies
CREATE POLICY "Users can view group memberships" ON group_memberships
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM groups g 
      WHERE g.id = group_id AND g.leader_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can request group membership" ON group_memberships
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Group leaders can manage their group memberships" ON group_memberships
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM groups g 
      WHERE g.id = group_id AND g.leader_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins and group leaders can delete memberships" ON group_memberships
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM groups g 
      WHERE g.id = group_id AND g.leader_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Group Messages Policies
CREATE POLICY "Group members can view messages" ON group_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_memberships gm 
      WHERE gm.group_id = group_messages.group_id 
      AND gm.user_id = auth.uid() 
      AND gm.status = 'approved'
    ) OR
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Group leaders can send messages" ON group_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM groups g 
      WHERE g.id = group_id AND g.leader_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Message senders can update their messages" ON group_messages
  FOR UPDATE USING (sender_id = auth.uid());

CREATE POLICY "Admins and senders can delete messages" ON group_messages
  FOR DELETE USING (
    sender_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Attendance Records Policies
CREATE POLICY "Users can view attendance records" ON attendance_records
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM groups g 
      WHERE g.id = group_id AND g.leader_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Group leaders can manage attendance" ON attendance_records
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM groups g 
      WHERE g.id = group_id AND g.leader_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Import Jobs Policies
CREATE POLICY "Admins can manage import jobs" ON import_jobs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user is group leader for specific group
CREATE OR REPLACE FUNCTION is_group_leader(user_id UUID, group_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM groups 
    WHERE id = group_id AND leader_id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user is member of specific group
CREATE OR REPLACE FUNCTION is_group_member(user_id UUID, group_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM group_memberships 
    WHERE group_id = group_id AND user_id = user_id AND status = 'approved'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
