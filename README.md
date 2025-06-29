# Student Result Management System

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

- **Frontend**: Next.js 15 with TypeScript and App Router
- **Database**: SQLite with better-sqlite3
- **Styling**: CSS Modules with dark/light mode support
- **Authentication**: Session-based auth with secure cookies
- **UI Components**: Custom components following shadcn/ui patterns

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn package manager

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

3. Start the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Default Credentials

### Admin Login

- **Username**: `admin`
- **Password**: `admin123`

### Student Login

Students can log in using their roll number and registration number (to be created by admin)

## Database Schema

The application uses SQLite with the following main tables:

- **admin**: Administrative user accounts
- **departments**: Academic departments (CSE, EEE, ME, etc.)
- **students**: Student profiles and academic information
- **courses**: Course catalog with semester mappings
- **course_registrations**: Student course enrollments
- **results**: Academic results and grades
- **semester_progress**: Semester completion tracking

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── admin/             # Admin portal pages
│   ├── student/           # Student portal pages
│   └── api/               # API routes
├── components/            # Reusable UI components
│   ├── ui/               # Base UI components
│   ├── theme-provider.tsx
│   └── theme-toggle.tsx
├── lib/                   # Utility libraries
│   ├── auth.ts           # Authentication functions
│   ├── data.ts           # Database operations
│   ├── database.ts       # SQLite setup and schema
│   ├── utils.ts          # Utility functions
│   └── seed.ts           # Sample data seeding
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
- Dark/light mode theme switching
- Interactive dashboards with statistics
- Form validation and error handling

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Database Management

The SQLite database is automatically created and seeded with sample data in development mode. Sample departments and courses are created for testing purposes.

### Adding New Features

1. Create database schema changes in `lib/database.ts`
2. Add data access functions in `lib/data.ts`
3. Create API routes in `app/api/`
4. Build UI components and pages
5. Update middleware for route protection if needed

## Deployment

1. Build the application:

```bash
npm run build
```

2. Start the production server:

```bash
npm start
```

The application can be deployed to platforms like Vercel, Netlify, or any Node.js hosting service.

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
