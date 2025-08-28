# Bulk Excel Import Specification

## Overview

The Church Management System includes a robust bulk import feature that allows administrators to upload Excel files containing member data, family relationships, and group memberships. This feature is designed to handle large datasets efficiently while providing detailed feedback and error handling.

## Key Features

### 1. Excel Template System
- **Standardized Template**: Pre-defined Excel template with all required and optional columns
- **Template Download**: `/api/import/template` endpoint provides downloadable template
- **Column Validation**: System validates that uploaded files match the expected format

### 2. Supported Data Fields

#### Required Fields (*)
- First Name*
- Last Name*
- Email*
- Phone*
- Family Name*

#### Optional Fields
- Date of Birth
- Gender
- Blood Group (A+, B+, AB+, O+, A-, B-, AB-, O-)
- Address
- Emergency Contact Name
- Emergency Contact Phone
- Head of Family (Yes/No)
- Group Memberships (comma-separated group names)
- Role (member/group_leader)
- Notes

### 3. Advanced Processing Features

#### Family Management
- **Automatic Family Creation**: Creates family units based on Family Name
- **Head of Household Assignment**: Automatically assigns head of family based on "Head of Family" column
- **Family Address Inheritance**: Members inherit family address if individual address not provided

#### Group Membership Handling
- **Multiple Group Assignment**: Supports comma-separated group names
- **Auto-Group Creation**: Creates group membership requests for existing groups
- **Group Leader Assignment**: Automatically assigns group leader role if specified

#### Duplicate Detection & Resolution
- **Email/Phone Matching**: Identifies existing members by email or phone
- **Update vs Create**: Updates existing members or creates new ones
- **Conflict Resolution**: Provides options for handling duplicates

### 4. Import Process Workflow

#### Step 1: File Upload
```
POST /api/import/excel
Content-Type: multipart/form-data
```
- Accepts .xlsx and .xls files
- File size limit: 10MB
- Stores file in Supabase Storage

#### Step 2: Validation & Preview
- Validates file format and structure
- Checks required columns are present
- Provides data preview with validation results
- Shows potential duplicates and conflicts

#### Step 3: Processing
- Creates import job with unique ID
- Processes records in batches for performance
- Updates job status in real-time
- Handles errors gracefully without stopping entire import

#### Step 4: Completion & Reporting
- Generates comprehensive import report
- Provides success/failure counts
- Details error log with specific row numbers and reasons
- Sends email notification to admin upon completion

### 5. Database Schema

#### import_jobs Table
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

### 6. API Endpoints

#### Upload Excel File
```
POST /api/import/excel
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data

Body: {
  file: <excel_file>
}

Response: {
  jobId: "uuid",
  status: "pending",
  message: "Import job created successfully"
}
```

#### Download Template
```
GET /api/import/template
Authorization: Bearer <admin_token>

Response: Excel file download
```

#### Check Import Status
```
GET /api/import/status/:jobId
Authorization: Bearer <admin_token>

Response: {
  id: "uuid",
  filename: "members.xlsx",
  status: "processing",
  totalRecords: 150,
  processedRecords: 75,
  successfulRecords: 70,
  failedRecords: 5,
  errorLog: [
    {
      row: 12,
      error: "Invalid email format",
      data: { email: "invalid-email" }
    }
  ],
  startedAt: "2024-01-15T10:30:00Z",
  completedAt: null
}
```

#### View Import History
```
GET /api/import/history
Authorization: Bearer <admin_token>

Response: {
  imports: [
    {
      id: "uuid",
      filename: "members.xlsx",
      status: "completed",
      totalRecords: 150,
      successfulRecords: 145,
      failedRecords: 5,
      createdAt: "2024-01-15T10:00:00Z",
      completedAt: "2024-01-15T10:35:00Z"
    }
  ]
}
```

### 7. Error Handling & Validation

#### Data Validation Rules
- **Email Format**: Valid email address format
- **Phone Format**: Valid phone number (supports international formats)
- **Date Format**: Valid date format (YYYY-MM-DD or MM/DD/YYYY)
- **Blood Group**: Must be one of: A+, B+, AB+, O+, A-, B-, AB-, O-
- **Role**: Must be 'member' or 'group_leader'
- **Head of Family**: Must be 'Yes', 'No', 'Y', 'N', or boolean

#### Common Error Types
- Missing required fields
- Invalid data formats
- Duplicate email/phone within file
- Non-existent group references
- Invalid blood group values
- Malformed dates

### 8. Performance Considerations

#### Batch Processing
- Processes records in batches of 50-100
- Prevents memory overflow for large files
- Allows for progress tracking

#### Background Jobs
- Uses job queue for processing (Bull/Agenda)
- Non-blocking import process
- Real-time status updates via WebSocket

#### File Size Limits
- Maximum file size: 10MB
- Maximum records: 5,000 per import
- Automatic compression for storage

### 9. Security Features

#### Access Control
- Admin-only functionality
- JWT token validation
- Role-based permissions

#### File Validation
- MIME type checking
- File extension validation
- Virus scanning (future enhancement)

#### Data Privacy
- Temporary file storage
- Automatic cleanup after processing
- Audit logging for all imports

### 10. User Experience

#### Frontend Components
- Drag-and-drop file upload
- Real-time progress indicators
- Preview table with validation highlights
- Downloadable error reports
- Import history dashboard

#### Notifications
- Email notifications for completion
- In-app notifications for status updates
- Error alerts with actionable feedback

### 11. Sample Excel Template Structure

| First Name* | Last Name* | Email* | Phone* | Date of Birth | Gender | Blood Group | Address | Emergency Contact Name | Emergency Contact Phone | Family Name* | Head of Family | Group Memberships | Role | Notes |
|-------------|------------|--------|--------|---------------|--------|-------------|---------|----------------------|------------------------|-------------|----------------|-------------------|------|-------|
| John | Doe | john@email.com | +1234567890 | 1985-06-15 | Male | A+ | 123 Main St | Jane Doe | +1234567891 | Doe Family | Yes | Choir, Youth Group | member | Active member |
| Jane | Doe | jane@email.com | +1234567891 | 1987-08-20 | Female | B+ | 123 Main St | John Doe | +1234567890 | Doe Family | No | Choir | member | Spouse |

### 12. Implementation Timeline

The bulk import functionality is scheduled for **Phase 2: Core Features (Weeks 5-8)** and includes:

- Week 5: Database schema and API endpoints
- Week 6: Excel parsing and validation logic
- Week 7: Frontend upload interface and progress tracking
- Week 8: Error handling, reporting, and testing

This comprehensive bulk import system will significantly reduce the time and effort required for churches to migrate their existing member data into the new system, making adoption much smoother and more appealing.
