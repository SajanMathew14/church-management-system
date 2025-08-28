# Church Management System

A modern, comprehensive Church Management System built with Next.js, Express.js, and Supabase. This system focuses on member management, family directories, and group-specific management features for Sunday School, Choir, Youth, and other church communities.

## 🚀 Features

### ✅ Completed (Priority 1)
- **Member Management**: Complete CRUD operations for church members with personal information, contact details, and family associations
- **Family Directory**: Organize members into family units with head of household management
- **Group Management**: Create and manage different types of groups (Sunday School, Choir, Youth, etc.)
- **Group Membership Workflows**: Join requests, approval/rejection system, and member management
- **Role-Based Access Control**: Admin, Group Leader, and Member roles with appropriate permissions
- **Bulk Excel Import**: Upload Excel files to import members with family relationships and group memberships
- **Search & Filter**: Comprehensive search across members, families, and groups
- **Responsive Dashboard**: Modern UI with quick actions and system statistics

### 📋 Planned Features (Future Phases)
- Group Communication & Messaging
- Attendance Tracking
- Polling System & Reactions
- Event Management
- Church Announcements & Content Hub
- Prayer Requests & Prayer Wall
- Volunteer Management
- Visitor Tracking & Follow-up
- Analytics & Reporting

## 🛠 Tech Stack

### Frontend
- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS
- **State Management**: React Context API
- **Form Handling**: React Hook Form with Zod validation
- **HTTP Client**: Custom API client with Supabase Auth integration

### Backend
- **Framework**: Express.js with TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **File Processing**: ExcelJS for bulk imports
- **Validation**: Express Validator
- **Security**: Helmet, CORS, Rate Limiting

### Database
- **Provider**: Supabase Cloud
- **Type**: PostgreSQL with Row Level Security (RLS)
- **Tables**: 23+ comprehensive tables for all features
- **Security**: JWT-based authentication with role-based access

## 📁 Project Structure

```
church-management-system/
├── docs/                           # Documentation
│   ├── implementation-plan.md      # Detailed implementation roadmap
│   └── bulk-import-specification.md # Excel import specifications
├── database/
│   ├── migrations/                 # Database migration scripts
│   │   ├── 001_create_core_tables.sql
│   │   └── 002_create_rls_policies.sql
│   └── seeds/                      # Sample data
├── backend/                        # Express.js API
│   ├── src/
│   │   ├── routes/                 # API endpoints
│   │   │   ├── users.ts           # Member management
│   │   │   ├── families.ts        # Family operations
│   │   │   ├── groups.ts          # Group management
│   │   │   └── import.ts          # Bulk import
│   │   ├── middleware/            # Authentication & validation
│   │   ├── services/              # Business logic
│   │   │   ├── supabase.ts        # Database client
│   │   │   └── excelImport.ts     # Excel processing
│   │   ├── types/                 # TypeScript definitions
│   │   └── app.ts                 # Express app setup
│   └── .env.example               # Environment variables
└── frontend/                      # Next.js application
    ├── src/
    │   ├── app/                   # App router pages
    │   │   └── dashboard/         # Main dashboard
    │   └── lib/
    │       └── supabase.ts        # Supabase client
    └── .env.local.example         # Frontend environment variables
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Supabase account
- Git

### 1. Clone the Repository
```bash
git clone <repository-url>
cd church-management-system
```

### 2. Database Setup
1. Create a new Supabase project
2. Run the migration scripts in order:
   ```sql
   -- Execute database/migrations/001_create_core_tables.sql
   -- Execute database/migrations/002_create_rls_policies.sql
   ```

### 3. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your Supabase credentials
npm run dev
```

### 4. Frontend Setup
```bash
cd frontend
npm install
cp .env.local.example .env.local
# Edit .env.local with your configuration
npm run dev
```

### 5. Access the Application
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Health Check: http://localhost:3001/health

## 📊 Database Schema

The system includes 23+ tables covering:

### Core Tables
- `user_profiles` - Member information and profiles
- `families` - Family units and relationships
- `groups` - Church groups and ministries
- `group_memberships` - Group membership relationships
- `import_jobs` - Bulk import tracking

### Key Features
- **Row Level Security (RLS)** on all tables
- **Automated timestamps** with triggers
- **Comprehensive indexes** for performance
- **Foreign key relationships** maintaining data integrity
- **Check constraints** for data validation

## 🔐 Authentication & Authorization

### Roles
- **Admin**: Full system access, user management, system configuration
- **Group Leader**: Manage assigned groups, approve memberships, send messages
- **Member**: View directory, join groups, update own profile

### Security Features
- JWT-based authentication via Supabase
- Row Level Security (RLS) policies
- Role-based API endpoint protection
- Input validation and sanitization
- Rate limiting on API endpoints

## 📥 Bulk Import System

### Features
- Excel file upload and processing (.xlsx, .xls)
- Automatic family creation and management
- Group membership assignment
- Duplicate detection and resolution
- Comprehensive error reporting
- Progress tracking with real-time updates

### Import Process
1. Download Excel template (`/api/import/template`)
2. Fill in member data following the template
3. Upload file via the import interface
4. Monitor progress and review results
5. Handle any errors with detailed reporting

### Supported Data
- Member personal information
- Family relationships and head of household
- Emergency contacts and medical information
- Group memberships and roles
- Custom notes and additional data

## 🎯 API Endpoints

### Members (`/api/users`)
- `GET /` - List all members (paginated, searchable)
- `GET /:id` - Get member details
- `POST /` - Create new member (Admin only)
- `PUT /:id` - Update member
- `DELETE /:id` - Deactivate member (Admin only)

### Families (`/api/families`)
- `GET /` - List all families
- `GET /:id` - Get family details with members
- `POST /` - Create new family (Admin only)
- `PUT /:id` - Update family
- `DELETE /:id` - Delete family (Admin only)
- `POST /:id/members/:userId` - Add member to family
- `DELETE /:id/members/:userId` - Remove member from family

### Groups (`/api/groups`)
- `GET /` - List all groups
- `GET /:id` - Get group details with members
- `POST /` - Create new group
- `PUT /:id` - Update group
- `DELETE /:id` - Delete group (Admin only)
- `POST /:id/join` - Request to join group
- `GET /:id/members` - List group members
- `PUT /:id/members/:membershipId` - Approve/reject membership
- `DELETE /:id/members/:membershipId` - Remove member

### Import (`/api/import`)
- `GET /template` - Download Excel template
- `POST /excel` - Upload and process Excel file
- `GET /status/:jobId` - Check import status
- `GET /history` - View import history
- `GET /:jobId/errors` - Get detailed error log
- `DELETE /:jobId` - Cancel/delete import job

## 🔧 Configuration

### Environment Variables

**Backend (.env)**
```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
MAX_FILE_SIZE=10485760
UPLOAD_DIR=uploads
```

**Frontend (.env.local)**
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## 📝 Usage Examples

### Creating a New Member
```typescript
const newMember = await apiClient.post('/api/users', {
  first_name: 'John',
  last_name: 'Doe',
  email: 'john@example.com',
  phone: '+1234567890',
  role: 'member'
})
```

### Bulk Import Members
```typescript
const formData = new FormData()
formData.append('file', excelFile)

const importJob = await apiClient.post('/api/import/excel', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
})
```

### Managing Group Memberships
```typescript
// Join a group
await apiClient.post(`/api/groups/${groupId}/join`)

// Approve membership (Group Leader/Admin)
await apiClient.put(`/api/groups/${groupId}/members/${membershipId}`, {
  status: 'approved'
})
```

## 🎨 UI Components

### Dashboard Features
- **Real-time Statistics**: Member count, family count, group count, pending requests
- **Quick Actions**: Direct navigation to key system areas
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Role-based Interface**: Different views based on user permissions

### Planned UI Components
- Member directory with advanced search and filters
- Family management interface
- Group management dashboard
- Import wizard with progress tracking
- Reports and analytics dashboard

## 🚦 Development Status

### Current Phase: ✅ Complete
**Priority 1: Core Member & Family Directory + Group Foundations**

All core functionality has been implemented and tested:
- ✅ Member management with full CRUD operations
- ✅ Family management and relationships
- ✅ Group management with membership workflows
- ✅ Role-based access control
- ✅ Bulk Excel import system
- ✅ Responsive UI foundation
- ✅ Comprehensive API with validation

### Next Phase: 📋 Planned
**Priority 2: Group Communication & Attendance**
- Group messaging system
- Email notifications
- Attendance tracking
- Event management

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Database powered by [Supabase](https://supabase.com/)
- UI styled with [Tailwind CSS](https://tailwindcss.com/)
- Icons from various emoji sets

---

**Church Management System v1.0.0** - Empowering churches with modern technology for community management.
