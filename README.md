# RUET Undergraduate Result Management System

A comprehensive web application for managing records, course enrollment, and academic results of undergraduate students at RUET with automated CGPA calculation.

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

- **Frontend**: Next.js 15 (App Router) - Focused on native React features.
- **Database**: PostgreSQL (Neon) with pg library for connection pooling- Choice of RDBMS over NoSQL for strict data integrity.
- **Migrations**: Manual migration layer (`src/lib/migrations.js`) to handle schema evolution.
- **Styling**: CSS Modules - Vanilla CSS approach for precision without Tailwind overhead.
- **State**: Native React Hooks (`useState`, `useContext`) and Server-side State.
- **Authentication**: Session-based auth with secure cookies and middleware.

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn package manager
- PostgreSQL database (Neon recommended)

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd ruet-undergraduate-result-management-system
```

2. Install dependencies:

```bash
pnpm install
```

3. Set up environment variables:

Create a `.env.local` file in the root directory:

```env
POSTGRES_URL="your-postgresql-connection-string"
```

For Neon PostgreSQL, get your connection string from your Neon dashboard.

4. Start the development server:

```bash
pnpm run dev
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

### Database Engineering & Lifecycle

- **Relational Integrity**: Unlike NoSQL/MongoDB, this app uses PostgreSQL to enforce strict relationships (e.g., Results cannot exist without a Course).
- **Evolutionary Schema (Manual Migrations)**: Because SQL is strict, we maintain a [migrations.js](file:///c:/Users/Asus/Desktop/ruet-undergraduate-result-management-system/src/lib/migrations.js) layer. This handles schema updates that tools like Prisma or Mongoose would usually automate, ensuring the database evolves safely as we add features.
- **Neon Optimized Pooling**: Configured with a `max: 8` limit to solve the **"Multi-Instance Problem"** in serverless environments. Unlike a single traditional server, Vercel spins up many concurrent "Lambdas". A low `max` per instance prevents a traffic spike from opening thousands of cumulative connections (e.g., 20 instances x 8 vs 100) which would crash the database. This "sweet spot" handles hundreds of requests per second via low query latency (10-50ms) while staying safely within Neon's connection limits.
- **Automatic Initialization**: The database is automatically initialized with the required tables and relationships on the first run.

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

### State Management Philosophy

- **Zero Global State Libraries**: This project deliberately avoids Redux, Zustand, or MobX.
- **Why?**: Undergraduate management is primarily a **CRUD** application. The "Source of Truth" is the database. We use native `useState` for local UI interactions and Next.js data fetching for "Server State."
- **Efficiency**: This drastically reduces the bundle size and prevents "State Desync" bugs where the UI shows something different from the database.

### Modern UI/UX

- **CSS Modules**: We chose CSS Modules over Tailwind to keep the HTML clean and maintain a "Pure CSS" design system. Each component is self-contained.
- **Micro-animations**: Subtle transitions using pure CSS for a premium feel.

## Development

### Available Scripts

- `pnpm run dev` - Start development server
- `pnpm run build` - Build for production
- `pnpm run start` - Start production server
- `pnpm run lint` - Run ESLint


### Environment Configuration

Required environment variables:

```env
POSTGRES_URL="postgresql://username:password@host:port/database"
```

## Deployment

### Production Setup

1. Set up a PostgreSQL database (Neon recommended for serverless)

2. Configure environment variables:

```env
POSTGRES_URL="your-production-postgresql-url"
```

3. Build the application:

```bash
pnpm run build
```

4. Start the production server:

```bash
pnpm start
```

The application can be deployed to platforms like Vercel, Netlify, Railway, or any Node.js hosting service that supports PostgreSQL connections.

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
