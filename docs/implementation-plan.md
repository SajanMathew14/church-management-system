# Church Management System - Implementation Plan

## Project Overview

A modern Church Management System with community/groups functionality built using Supabase + Node.js + React stack. The system focuses on member management, family directories, and group-specific management features for Sunday School, Choir, Youth, and other church communities.

## Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **State Management**: React Context API + useReducer
- **UI Components**: Headless UI + Custom components
- **Form Handling**: React Hook Form
- **Data Fetching**: SWR or TanStack Query

### Backend
- **Framework**: Express.js
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (Google OAuth + SMS OTP)
- **File Storage**: Supabase Storage
- **Email Service**: Resend (10k emails/month free)
- **Push Notifications**: Firebase Cloud Messaging

### Deployment
- **Frontend**: Vercel
- **Backend**: Render or Railway
- **Database**: Supabase Cloud
- **CI/CD**: GitHub Actions

## Database Schema

### Core Tables

#### 1. users (Extended Supabase Auth)
```sql
-- Supabase auth.users table is extended with user_profiles
CREATE TABLE user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  phone VARCHAR(20),
  date_of_birth DATE,
  gender VARCHAR(10),
  blood_group VARCHAR(5), -- A+, B+, AB+, O+, A-, B-, AB-, O-
  address TEXT,
  emergency_contact_name VARCHAR(100),
  emergency_contact_phone VARCHAR(20),
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'member', 'group_leader')),
  family_id UUID REFERENCES families(id),
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 2. families
```sql
CREATE TABLE families (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_name VARCHAR(100) NOT NULL,
  head_of_family_id UUID REFERENCES user_profiles(id),
  address TEXT,
  phone VARCHAR(20),
  email VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 3. groups
```sql
CREATE TABLE groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  group_type VARCHAR(50) NOT NULL, -- 'sunday_school', 'choir', 'youth', 'senior_youth', 'ministry'
  leader_id UUID REFERENCES user_profiles(id),
  max_members INTEGER,
  meeting_day VARCHAR(20),
  meeting_time TIME,
  meeting_location VARCHAR(200),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 4. group_memberships
```sql
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
```

#### 5. group_messages
```sql
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
```

#### 6. attendance_records
```sql
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
```

#### 7. polls
```sql
CREATE TABLE polls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  created_by UUID REFERENCES user_profiles(id),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  poll_type VARCHAR(20) DEFAULT 'single_choice' CHECK (poll_type IN ('single_choice', 'multiple_choice', 'yes_no')),
  options JSONB NOT NULL, -- Array of poll options
  is_anonymous BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 8. poll_responses
```sql
CREATE TABLE poll_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  selected_options JSONB NOT NULL, -- Array of selected option indices
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(poll_id, user_id)
);
```

#### 9. reactions
```sql
CREATE TABLE reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('message', 'event', 'poll')),
  target_id UUID NOT NULL,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  reaction_type VARCHAR(20) NOT NULL, -- 'like', 'love', 'pray', 'amen'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(target_type, target_id, user_id, reaction_type)
);
```

#### 10. events
```sql
CREATE TABLE events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  event_type VARCHAR(50) DEFAULT 'group_meeting',
  group_id UUID REFERENCES groups(id), -- NULL for church-wide events
  location VARCHAR(200),
  start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  end_datetime TIMESTAMP WITH TIME ZONE,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern JSONB, -- For recurring events
  created_by UUID REFERENCES user_profiles(id),
  max_attendees INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 11. import_jobs
```sql
CREATE TABLE import_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  total_records INTEGER DEFAULT 0,
  processed_records INTEGER DEFAULT 0,
  successful_records INTEGER DEFAULT 0,
  failed_records INTEGER DEFAULT 0,
  error_log JSONB, -- Array of error messages with row numbers
  created_by UUID REFERENCES user_profiles(id),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 12. announcements
```sql
CREATE TABLE announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(50) DEFAULT 'general' CHECK (category IN ('service_updates', 'events', 'prayer_requests', 'community_news', 'general')),
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('normal', 'important', 'urgent')),
  is_pinned BOOLEAN DEFAULT false,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  published_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  allow_comments BOOLEAN DEFAULT true,
  view_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES user_profiles(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 13. announcement_comments
```sql
CREATE TABLE announcement_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_approved BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 14. sermons_content
```sql
CREATE TABLE sermons_content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('sermon', 'devotional', 'bible_study')),
  series_name VARCHAR(100),
  scripture_references TEXT,
  audio_url TEXT,
  video_url TEXT,
  written_content TEXT,
  visibility VARCHAR(20) DEFAULT 'members' CHECK (visibility IN ('public', 'members', 'group_specific')),
  group_id UUID REFERENCES groups(id), -- For group-specific content
  published_date DATE,
  download_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES user_profiles(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 15. content_bookmarks
```sql
CREATE TABLE content_bookmarks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('sermon', 'announcement')),
  content_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, content_type, content_id)
);
```

#### 16. prayer_requests
```sql
CREATE TABLE prayer_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  requester_id UUID REFERENCES user_profiles(id),
  privacy_level VARCHAR(20) DEFAULT 'members' CHECK (privacy_level IN ('public', 'members', 'prayer_team')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'answered', 'archived')),
  prayer_count INTEGER DEFAULT 0,
  answered_description TEXT,
  answered_at TIMESTAMP WITH TIME ZONE,
  is_approved BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES user_profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 17. prayer_responses
```sql
CREATE TABLE prayer_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prayer_request_id UUID REFERENCES prayer_requests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  response_type VARCHAR(20) DEFAULT 'praying' CHECK (response_type IN ('praying', 'encouragement')),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(prayer_request_id, user_id, response_type)
);
```

#### 18. volunteer_opportunities
```sql
CREATE TABLE volunteer_opportunities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  requirements TEXT,
  ministry_area VARCHAR(100),
  time_commitment VARCHAR(100),
  background_check_required BOOLEAN DEFAULT false,
  coordinator_id UUID REFERENCES user_profiles(id),
  max_volunteers INTEGER,
  start_date DATE,
  end_date DATE,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 19. volunteer_signups
```sql
CREATE TABLE volunteer_signups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  opportunity_id UUID REFERENCES volunteer_opportunities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'signed_up' CHECK (status IN ('signed_up', 'confirmed', 'completed', 'cancelled')),
  hours_served DECIMAL(5,2) DEFAULT 0,
  notes TEXT,
  background_check_date DATE,
  background_check_expiry DATE,
  signed_up_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(opportunity_id, user_id)
);
```

#### 20. visitors
```sql
CREATE TABLE visitors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  email VARCHAR(100),
  phone VARCHAR(20),
  address TEXT,
  how_heard_about_church VARCHAR(100),
  first_visit_date DATE NOT NULL,
  total_visits INTEGER DEFAULT 1,
  last_visit_date DATE,
  became_member BOOLEAN DEFAULT false,
  member_date DATE,
  follow_up_assigned_to UUID REFERENCES user_profiles(id),
  notes TEXT,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 21. visitor_follow_ups
```sql
CREATE TABLE visitor_follow_ups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id UUID REFERENCES visitors(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES user_profiles(id),
  follow_up_type VARCHAR(50) NOT NULL CHECK (follow_up_type IN ('phone_call', 'email', 'home_visit', 'welcome_packet')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  notes TEXT,
  due_date DATE,
  completed_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 22. church_documents
```sql
CREATE TABLE church_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL CHECK (category IN ('forms', 'policies', 'resources', 'ministry_guides', 'reports')),
  file_url TEXT NOT NULL,
  file_type VARCHAR(10),
  file_size INTEGER,
  access_level VARCHAR(20) DEFAULT 'members' CHECK (access_level IN ('public', 'members', 'admin', 'leaders')),
  download_count INTEGER DEFAULT 0,
  version_number VARCHAR(10) DEFAULT '1.0',
  uploaded_by UUID REFERENCES user_profiles(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 23. pastoral_care_visits
```sql
CREATE TABLE pastoral_care_visits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  pastor_id UUID REFERENCES user_profiles(id),
  visit_type VARCHAR(50) NOT NULL CHECK (visit_type IN ('home_visit', 'hospital_visit', 'counseling', 'phone_call', 'meeting')),
  visit_date DATE NOT NULL,
  duration_minutes INTEGER,
  purpose TEXT,
  notes TEXT,
  follow_up_needed BOOLEAN DEFAULT false,
  follow_up_date DATE,
  confidential_notes TEXT, -- Only visible to assigned pastor and admin
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## API Specifications

### Authentication Endpoints
- `POST /api/auth/login` - Login with email/phone
- `POST /api/auth/google` - Google OAuth login
- `POST /api/auth/otp/send` - Send OTP to phone
- `POST /api/auth/otp/verify` - Verify OTP
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user profile

### User Management
- `GET /api/users` - List all users (admin only)
- `GET /api/users/:id` - Get user profile
- `PUT /api/users/:id` - Update user profile
- `DELETE /api/users/:id` - Deactivate user (admin only)

### Bulk Data Import
- `POST /api/import/excel` - Upload and process Excel file for bulk member import
- `GET /api/import/template` - Download Excel template for bulk import
- `GET /api/import/status/:jobId` - Check import job status
- `GET /api/import/history` - View import history and logs

### Family Management
- `GET /api/families` - List families
- `POST /api/families` - Create family
- `GET /api/families/:id` - Get family details
- `PUT /api/families/:id` - Update family
- `DELETE /api/families/:id` - Delete family

### Group Management
- `GET /api/groups` - List all groups
- `POST /api/groups` - Create group (admin/leader)
- `GET /api/groups/:id` - Get group details
- `PUT /api/groups/:id` - Update group (leader/admin)
- `DELETE /api/groups/:id` - Delete group (admin)

### Group Membership
- `POST /api/groups/:id/join` - Request to join group
- `GET /api/groups/:id/members` - List group members
- `PUT /api/groups/:id/members/:userId` - Approve/reject membership
- `DELETE /api/groups/:id/members/:userId` - Remove member

### Messaging
- `POST /api/groups/:id/messages` - Send group message
- `GET /api/groups/:id/messages` - Get group messages
- `PUT /api/messages/:id` - Update message (sender only)
- `DELETE /api/messages/:id` - Delete message (sender/admin)

### Attendance
- `POST /api/groups/:id/attendance` - Record attendance
- `GET /api/groups/:id/attendance` - Get attendance records
- `PUT /api/attendance/:id` - Update attendance record

### Polls
- `POST /api/groups/:id/polls` - Create poll
- `GET /api/groups/:id/polls` - List group polls
- `POST /api/polls/:id/vote` - Vote on poll
- `GET /api/polls/:id/results` - Get poll results

### Events
- `GET /api/events` - List events
- `POST /api/events` - Create event
- `GET /api/events/:id` - Get event details
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event

## Project Structure

```
church-management-system/
├── docs/
│   ├── implementation-plan.md
│   ├── api-documentation.md
│   └── deployment-guide.md
├── frontend/
│   ├── components/
│   │   ├── ui/
│   │   ├── auth/
│   │   ├── groups/
│   │   ├── members/
│   │   ├── families/
│   │   ├── messaging/
│   │   ├── attendance/
│   │   ├── polls/
│   │   └── events/
│   ├── pages/
│   │   ├── api/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── groups/
│   │   ├── members/
│   │   ├── families/
│   │   └── events/
│   ├── hooks/
│   ├── services/
│   ├── utils/
│   ├── contexts/
│   └── styles/
├── backend/
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── families.js
│   │   ├── groups.js
│   │   ├── messages.js
│   │   ├── attendance.js
│   │   ├── polls.js
│   │   └── events.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── validation.js
│   │   └── rbac.js
│   ├── services/
│   │   ├── supabase.js
│   │   ├── email.js
│   │   ├── notifications.js
│   │   └── storage.js
│   ├── utils/
│   └── app.js
├── database/
│   ├── migrations/
│   ├── seeds/
│   └── schema.sql
├── .env.example
├── package.json
└── README.md
```

## Detailed User Stories

### Priority 1: Core Member & Family Directory + Group Foundations

#### Epic: Member Management
**US-001**: As a church admin, I can create, edit, and delete member profiles with personal information, family associations, and contact details.
- **Acceptance Criteria**:
  - Admin can add new members with required fields (name, phone, email)
  - Admin can edit existing member information
  - Admin can deactivate members (soft delete)
  - System validates email and phone formats
  - Family associations are maintained

**US-002**: As a member, I can view and update my own profile information.
- **Acceptance Criteria**:
  - Members can edit their personal information
  - Members cannot change their role or family associations
  - Profile changes are logged for audit

**US-003**: As a user, I can search and filter the member directory.
- **Acceptance Criteria**:
  - Search by name, phone, email, or family
  - Filter by group membership, role, or family
  - Results are paginated for performance
  - Non-members see limited information

#### Epic: Family Management
**US-004**: As a church admin, I can create and manage family units with multiple members.
- **Acceptance Criteria**:
  - Create family with head of household
  - Add/remove family members
  - Maintain family contact information
  - View family directory

#### Epic: Bulk Data Import
**US-021**: As a church admin, I can upload an Excel file to bulk import member data with family relationships and group memberships.
- **Acceptance Criteria**:
  - Download standardized Excel template with required columns
  - Upload Excel file with member data (name, phone, email, address, blood group, etc.)
  - System validates data format and shows preview before import
  - Automatically creates families and assigns head of household
  - Maps members to existing groups or creates group membership requests
  - Provides detailed import report with success/failure counts
  - Shows error log for failed records with specific reasons
  - Supports updating existing members if email/phone matches
  - Handles duplicate detection and resolution
  - Processes large files (1000+ records) with progress tracking

**Excel Template Columns**:
- First Name*, Last Name*, Email*, Phone*
- Date of Birth, Gender, Blood Group, Address
- Emergency Contact Name, Emergency Contact Phone
- Family Name*, Head of Family (Yes/No)
- Group Memberships (comma-separated group names)
- Role (member/group_leader), Notes

#### Epic: Authentication & Authorization
**US-005**: As a user, I can log in using Google OAuth or phone number with OTP.
- **Acceptance Criteria**:
  - Google OAuth integration works seamlessly
  - SMS OTP is sent and verified correctly
  - User sessions are managed securely
  - Failed login attempts are tracked

**US-006**: As a system, I enforce role-based access control for different user types.
- **Acceptance Criteria**:
  - Admins have full system access
  - Group leaders can manage their groups
  - Members have limited access to their data
  - Unauthorized access is prevented

#### Epic: Group Management
**US-007**: As a church admin, I can create and manage different types of groups (Sunday School, Choir, Youth, etc.).
- **Acceptance Criteria**:
  - Create groups with name, description, type, and leader
  - Set meeting schedules and locations
  - Define maximum member limits
  - Activate/deactivate groups

**US-008**: As a member, I can view available groups and request to join them.
- **Acceptance Criteria**:
  - Browse all active groups
  - View group details and meeting information
  - Submit join requests with optional message
  - Track request status

**US-009**: As a group leader, I can approve or reject membership requests for my groups.
- **Acceptance Criteria**:
  - View pending membership requests
  - Approve or reject with optional notes
  - Send notifications to applicants
  - Manage current group members

### Priority 2: Group Communication & Attendance

#### Epic: Group Messaging
**US-010**: As a group leader, I can send broadcast messages to all group members via email and push notifications.
- **Acceptance Criteria**:
  - Compose messages with title and content
  - Select message priority (normal, urgent)
  - Send via email and/or push notifications
  - Track message delivery status

**US-011**: As a group member, I receive notifications for group messages and can view message history.
- **Acceptance Criteria**:
  - Receive email notifications for group messages
  - Get push notifications on mobile devices
  - View message history in the app
  - Mark messages as read/unread

#### Epic: Attendance Tracking
**US-012**: As a group leader, I can record attendance for group meetings and events.
- **Acceptance Criteria**:
  - Select meeting date and type
  - Mark members as present, absent, or excused
  - Add notes for individual attendance records
  - View attendance history and statistics

**US-013**: As a group leader, I can view attendance reports and statistics for my group.
- **Acceptance Criteria**:
  - Generate attendance reports by date range
  - View individual member attendance patterns
  - Export attendance data
  - Identify members with poor attendance

### Priority 3: Polls, Reactions & Engagement Tools

#### Epic: Polling System
**US-014**: As a group leader, I can create polls for group members to vote on decisions.
- **Acceptance Criteria**:
  - Create single-choice or multiple-choice polls
  - Set poll expiration dates
  - Make polls anonymous or public
  - View real-time poll results

**US-015**: As a group member, I can participate in group polls and view results.
- **Acceptance Criteria**:
  - Vote on active polls
  - Change vote before poll expires
  - View poll results (if not anonymous)
  - Receive notifications for new polls

#### Epic: Reactions & Engagement
**US-016**: As a group member, I can react to messages and events with emoji reactions.
- **Acceptance Criteria**:
  - Add reactions (like, love, pray, amen) to messages
  - View reaction counts and who reacted
  - Remove my own reactions
  - See popular reactions

#### Epic: Event Management
**US-017**: As a group leader, I can create and manage group-specific events.
- **Acceptance Criteria**:
  - Create events with date, time, location
  - Set event capacity limits
  - Send event invitations to group members
  - Track RSVPs and attendance

**US-018**: As a member, I can view group events and church-wide events in a calendar view.
- **Acceptance Criteria**:
  - View events in calendar format
  - Filter events by group or type
  - RSVP to events
  - Receive event reminders

### Priority 3.5: Church Communication & Content (High Priority Addition)

#### Epic: Church Announcements & Notices
**US-022**: As a church admin, I can post church-wide announcements and important notices that all members can see.
- **Acceptance Criteria**:
  - Create announcements with title, content, and category (Service Updates, Events, Prayer Requests, Community News)
  - Set announcement priority (Normal, Important, Urgent)
  - Schedule announcements for future publication
  - Pin important announcements to the top
  - Track announcement views and engagement
  - Send push notifications for urgent announcements
  - Allow comments and reactions on announcements

**US-023**: As a member, I can view all church announcements in a news feed format and interact with them.
- **Acceptance Criteria**:
  - View announcements in chronological order with category filters
  - Mark announcements as read/unread
  - React to announcements (pray, amen, like)
  - Comment on announcements (if enabled)
  - Receive notifications for new urgent announcements
  - Search through announcement history

#### Epic: Sermons & Devotionals Hub
**US-024**: As a church admin/pastor, I can publish sermons, devotionals, and spiritual content for members to access.
- **Acceptance Criteria**:
  - Upload sermon audio/video files with metadata (date, series, scripture references)
  - Create written devotionals and Bible studies
  - Organize content by series, topics, and scripture references
  - Set content visibility (public, members-only, group-specific)
  - Track content engagement and downloads
  - Allow members to bookmark favorite content

**US-025**: As a member, I can access the church's sermon library and spiritual content.
- **Acceptance Criteria**:
  - Browse sermons by series, date, or topic
  - Stream or download sermon audio/video
  - Read devotionals and Bible studies
  - Bookmark content for later reference
  - Share content with other members
  - Take notes on sermons (personal notes feature)

#### Epic: Prayer Requests & Prayer Wall
**US-026**: As a member, I can submit prayer requests and pray for others in the church community.
- **Acceptance Criteria**:
  - Submit prayer requests with privacy settings (public, church members, prayer team only)
  - Browse and pray for active prayer requests
  - Mark prayers as "Praying for this" with prayer count
  - Receive updates when prayers are answered
  - Set reminders to pray for specific requests
  - Report answered prayers with testimonies

**US-027**: As a prayer team member/pastor, I can manage prayer requests and maintain the prayer wall.
- **Acceptance Criteria**:
  - Review and approve public prayer requests
  - Follow up on prayer requests with pastoral care
  - Mark prayers as answered with testimonies
  - Send encouragement messages to prayer requesters
  - Generate prayer reports for church leadership

### Priority 4: Advanced Church Features

#### Epic: Volunteer Management
**US-028**: As a church admin, I can manage volunteers and ministry opportunities across the church.
- **Acceptance Criteria**:
  - Create volunteer opportunities with descriptions and requirements
  - Allow members to sign up for volunteer slots
  - Track volunteer hours and service history
  - Send reminders to scheduled volunteers
  - Generate volunteer appreciation reports
  - Manage background check requirements and expiration dates

#### Epic: Visitor Management & Follow-up
**US-029**: As a church admin/greeter, I can track first-time visitors and manage follow-up activities.
- **Acceptance Criteria**:
  - Quick visitor check-in system for services
  - Capture visitor information (name, contact, how they heard about church)
  - Assign follow-up tasks to pastoral staff
  - Track visitor return visits and conversion to membership
  - Send automated welcome emails and information packets
  - Generate visitor reports and analytics

#### Epic: Resource Library & Document Management
**US-030**: As a church admin, I can manage a digital library of church resources, forms, and documents.
- **Acceptance Criteria**:
  - Upload and organize church documents by category
  - Provide downloadable forms (membership, baptism, wedding, etc.)
  - Share ministry resources and guides
  - Set access permissions for different document types
  - Track document downloads and usage
  - Version control for updated documents

#### Epic: Pastoral Care & Member Tracking
**US-031**: As a pastor/minister, I can track pastoral visits, counseling sessions, and member care activities.
- **Acceptance Criteria**:
  - Log pastoral visits with notes and follow-up reminders
  - Track counseling sessions and spiritual guidance
  - Set birthday and anniversary reminders for members
  - Monitor member engagement and attendance patterns
  - Generate pastoral care reports and insights
  - Maintain confidential notes and prayer concerns

### Priority 4: Payments & Advanced Analytics (Optional)

#### Epic: Payment Management
**US-019**: As a group leader, I can manage group-specific donations and payments.
- **Acceptance Criteria**:
  - Set up payment requests for group activities
  - Track payment status for members
  - Generate payment reports
  - Send payment reminders

#### Epic: Analytics & Reporting
**US-020**: As a church admin, I can view comprehensive analytics and reports across all groups.
- **Acceptance Criteria**:
  - Dashboard with key metrics
  - Group engagement statistics
  - Member activity reports
  - Export data for external analysis

## Development Phases

### Phase 1: Foundation (Weeks 1-4)
- [ ] Project setup and repository structure
- [ ] Database schema implementation
- [ ] Supabase configuration and authentication
- [ ] Basic Express.js API setup
- [ ] Next.js frontend initialization
- [ ] Deployment pipeline setup (Vercel + Render)

### Phase 2: Core Features (Weeks 5-8)
- [ ] User registration and profile management
- [ ] Family management system
- [ ] Group CRUD operations
- [ ] Group membership workflow
- [ ] Basic role-based access control
- [ ] Bulk Excel import functionality with template generation
- [ ] Import job tracking and error reporting

### Phase 3: Communication & Church Content (Weeks 9-12)
- [ ] Group messaging system
- [ ] Email notification service integration
- [ ] Push notification setup
- [ ] Attendance tracking functionality
- [ ] Real-time updates with Supabase subscriptions
- [ ] Church announcements system with categories and priorities
- [ ] Sermon library with audio/video upload capabilities
- [ ] Prayer requests and prayer wall functionality

### Phase 4: Engagement & Interaction (Weeks 13-16)
- [ ] Polling system implementation
- [ ] Reaction system for messages/events/announcements
- [ ] Event management and calendar
- [ ] Content bookmarking and sharing features
- [ ] Comment system for announcements
- [ ] Enhanced UI/UX improvements
- [ ] Mobile responsiveness optimization

### Phase 5: Advanced Church Features (Weeks 17-24)
- [ ] Volunteer management system
- [ ] Visitor tracking and follow-up workflows
- [ ] Resource library and document management
- [ ] Pastoral care tracking system
- [ ] Advanced search and filtering across all content
- [ ] Automated reminders and notifications
- [ ] Performance optimization
- [ ] Security audit and testing

### Phase 6: Analytics & Integrations (Weeks 25-28)
- [ ] Payment integration for donations and group activities
- [ ] Comprehensive analytics dashboard
- [ ] Advanced reporting and data export
- [ ] Third-party integrations (calendar apps, accounting software)
- [ ] Mobile app planning and initial development
- [ ] Load testing and scalability improvements

## Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- Supabase account
- Google Cloud Console account (for OAuth)
- Resend account (for emails)
- Firebase account (for push notifications)

### Environment Variables
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Email Service
RESEND_API_KEY=your_resend_api_key

# Firebase (Push Notifications)
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY=your_firebase_private_key
FIREBASE_CLIENT_EMAIL=your_firebase_client_email

# App Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret
API_BASE_URL=http://localhost:3001
```

### Installation Steps
1. Clone repository and install dependencies
2. Set up Supabase project and configure authentication
3. Run database migrations
4. Configure Google OAuth and Firebase
5. Set up email service (Resend)
6. Start development servers
7. Deploy to Vercel and Render

## Security Considerations

### Data Protection
- All sensitive data encrypted at rest
- HTTPS enforced for all communications
- Input validation and sanitization
- SQL injection prevention with parameterized queries

### Authentication & Authorization
- JWT tokens with short expiration
- Role-based access control (RBAC)
- Multi-factor authentication support
- Session management and logout

### Privacy
- GDPR compliance considerations
- Data retention policies
- User consent management
- Audit logging for sensitive operations

## Performance Optimization

### Database
- Proper indexing on frequently queried columns
- Connection pooling
- Query optimization
- Pagination for large datasets

### Frontend
- Code splitting and lazy loading
- Image optimization
- Caching strategies
- Progressive Web App (PWA) features

### Backend
- API rate limiting
- Response caching
- Database query optimization
- Background job processing

## Testing Strategy

### Unit Testing
- Jest for backend logic
- React Testing Library for components
- Database function testing

### Integration Testing
- API endpoint testing
- Authentication flow testing
- Database integration testing

### End-to-End Testing
- Playwright for critical user journeys
- Mobile responsiveness testing
- Cross-browser compatibility

## Deployment Strategy

### Staging Environment
- Automatic deployment from develop branch
- Database migrations testing
- Feature testing before production

### Production Deployment
- Blue-green deployment strategy
- Database backup before migrations
- Rollback procedures
- Health checks and monitoring

## Monitoring & Maintenance

### Application Monitoring
- Error tracking with Sentry
- Performance monitoring
- Uptime monitoring
- User analytics

### Database Monitoring
- Query performance tracking
- Connection pool monitoring
- Storage usage alerts
- Backup verification

## Future Enhancements

### Mobile Application
- React Native app development
- Offline functionality
- Push notification optimization
- Mobile-specific features

### Advanced Features
- Video conferencing integration
- Document management system
- Advanced reporting and analytics
- Multi-church support (SaaS model)

### Integrations
- Calendar applications (Google Calendar, Outlook)
- Accounting software integration
- Social media integration
- Third-party donation platforms

---

This implementation plan provides a comprehensive roadmap for building a modern, scalable Church Management System with robust community/groups functionality. The phased approach ensures steady progress while maintaining focus on core business value and user needs.
