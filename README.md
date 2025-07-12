# RUET Result Management System

A comprehensive web application for managing student records, course enrollment, and academic results with automated CGPA calculation.

## Features

### Admin Portal

- **Student Management**: Add, edit, and manage student profiles
- **Department Management**: Create and manage academic departments
- **Course Management**: Set up courses with semester mappings
- **Result Management**: Enter and publish student results
- **Dashboard**: Overview of system statistics and quick actions

### Student Portal

- **Profile View**: Access personal information and academic details
- **Course Registration**: Enroll in semester-based courses
- **Results View**: Check published academic results
- **CGPA Tracking**: Automated SGPA and CGPA calculation

## Technology Stack

- **Frontend**: Next.js 15 with JavaScript and App Router
- **Database**: PostgreSQL (Neon) with pg library
- **Styling**: CSS Modules with modern styling
- **Authentication**: Session-based auth with secure cookies
- **UI Components**: Custom components following shadcn/ui patterns

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn package manager
- PostgreSQL database (Neon recommended)

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd student-result-management-system
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

Create a `.env.local` file in the root directory:

```env
POSTGRES_URL="your-postgresql-connection-string"
```

For Neon PostgreSQL, get your connection string from your Neon dashboard.

4. Start the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Default Credentials

### Admin Login

- **Username**: `admin`
- **Password**: `admin123`

### Student Login

Students can log in using their roll number and registration number (to be created by admin)

## Database Schema

The application uses **PostgreSQL** with the following main tables:

- **admin**: Administrative user accounts
- **departments**: Academic departments (CSE, EEE, ME, etc.)
- **students**: Student profiles and academic information
- **courses**: Course catalog with semester mappings
- **student_courses**: Student course enrollments
- **results**: Academic results and grades

### Database Features

- **Automatic Schema Creation**: Tables and relationships are created automatically
- **Migration Support**: Built-in migration system for schema updates
- **Connection Pooling**: Optimized database connections for scalability
- **Data Integrity**: Foreign key constraints and validation rules

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── admin/             # Admin portal pages
│   ├── student/           # Student portal pages
│   └── api/               # API routes
├── components/            # Reusable UI components
│   ├── ui/               # Base UI components
├── lib/                   # Utility libraries
│   ├── auth.js           # Authentication functions
│   ├── data.js           # Database operations
│   ├── postgres.js       # PostgreSQL setup and schema
│   └── utils.js          # Utility functions
└── middleware.ts          # Route protection middleware
```

## Key Features Implementation

### Authentication System

- Session-based authentication using cookies
- Role-based access control (admin/student)
- Secure password hashing with bcryptjs
- Protected routes with middleware

### CGPA Calculation

- Automatic SGPA calculation per semester
- Overall CGPA calculation across all semesters
- Credit-weighted grade point averages
- Grade letter assignments based on GPA ranges

### Course Registration System

- Semester-based course enrollment
- Department-specific course catalogs
- Year and semester progression tracking
- Registration validation and constraints

### Modern UI/UX

- Responsive design with CSS Modules
- Form validation and error handling

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Database Management

The PostgreSQL database is automatically initialized with the required schema on first run. The system includes:

- **Automatic table creation** with proper relationships
- **Schema migration** support for updates
- **Sample data seeding** for testing purposes
- **Connection pooling** for optimal performance

### Environment Configuration

Required environment variables:

```env
POSTGRES_URL="postgresql://username:password@host:port/database"
```

### Adding New Features

1. Create database schema changes in `lib/postgres.js`
2. Add data access functions in `lib/data.js`
3. Create API routes in `app/api/`
4. Build UI components and pages
5. Update middleware for route protection if needed

## Deployment

### Production Setup

1. Set up a PostgreSQL database (Neon recommended for serverless)

2. Configure environment variables:

```env
POSTGRES_URL="your-production-postgresql-url"
```

3. Build the application:

```bash
npm run build
```

4. Start the production server:

```bash
npm start
```

The application can be deployed to platforms like Vercel, Netlify, Railway, or any Node.js hosting service that supports PostgreSQL connections.

### Verification

After deployment, run the verification script to ensure all APIs are working:

```bash
node comprehensive-verification.mjs
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support or questions, please open an issue in the repository or contact the development team.
