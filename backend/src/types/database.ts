export interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  phone?: string;
  date_of_birth?: string;
  gender?: string;
  blood_group?: 'A+' | 'B+' | 'AB+' | 'O+' | 'A-' | 'B-' | 'AB-' | 'O-';
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  role: 'admin' | 'member' | 'group_leader';
  family_id?: string;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Family {
  id: string;
  family_name: string;
  head_of_family_id?: string;
  address?: string;
  phone?: string;
  email?: string;
  created_at: string;
  updated_at: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  group_type: 'sunday_school' | 'choir' | 'youth' | 'senior_youth' | 'ministry' | 'other';
  leader_id?: string;
  max_members?: number;
  meeting_day?: string;
  meeting_time?: string;
  meeting_location?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GroupMembership {
  id: string;
  group_id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'inactive';
  role: 'member' | 'assistant_leader';
  joined_date?: string;
  requested_at: string;
  approved_at?: string;
  approved_by?: string;
}

export interface GroupMessage {
  id: string;
  group_id: string;
  sender_id: string;
  title: string;
  content: string;
  message_type: 'announcement' | 'reminder' | 'urgent';
  is_email_sent: boolean;
  is_push_sent: boolean;
  created_at: string;
}

export interface AttendanceRecord {
  id: string;
  group_id: string;
  user_id: string;
  event_date: string;
  event_type: string;
  status: 'present' | 'absent' | 'excused';
  notes?: string;
  recorded_by: string;
  recorded_at: string;
}

export interface ImportJob {
  id: string;
  filename: string;
  file_url: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total_records: number;
  processed_records: number;
  successful_records: number;
  failed_records: number;
  error_log?: Array<{
    row: number;
    error: string;
    data: Record<string, any>;
  }>;
  created_by: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

// Request/Response types
export interface CreateUserProfileRequest {
  first_name: string;
  last_name: string;
  phone?: string;
  date_of_birth?: string;
  gender?: string;
  blood_group?: string;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  role?: 'member' | 'group_leader';
  family_id?: string;
  avatar_url?: string;
}

export interface UpdateUserProfileRequest {
  first_name?: string;
  last_name?: string;
  phone?: string;
  date_of_birth?: string;
  gender?: string;
  blood_group?: string;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  role?: 'admin' | 'member' | 'group_leader';
  family_id?: string;
  avatar_url?: string;
  is_active?: boolean;
}

export interface CreateFamilyRequest {
  family_name: string;
  head_of_family_id?: string;
  address?: string;
  phone?: string;
  email?: string;
}

export interface UpdateFamilyRequest {
  family_name?: string;
  head_of_family_id?: string;
  address?: string;
  phone?: string;
  email?: string;
}

export interface CreateGroupRequest {
  name: string;
  description?: string;
  group_type: 'sunday_school' | 'choir' | 'youth' | 'senior_youth' | 'ministry' | 'other';
  leader_id?: string;
  max_members?: number;
  meeting_day?: string;
  meeting_time?: string;
  meeting_location?: string;
}

export interface UpdateGroupRequest {
  name?: string;
  description?: string;
  group_type?: 'sunday_school' | 'choir' | 'youth' | 'senior_youth' | 'ministry' | 'other';
  leader_id?: string;
  max_members?: number;
  meeting_day?: string;
  meeting_time?: string;
  meeting_location?: string;
  is_active?: boolean;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}
