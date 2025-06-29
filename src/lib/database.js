import Database from "better-sqlite3";
import { join } from "path";

const dbPath = join(process.cwd(), "database.sqlite");

// Use global to persist across module reloads in development
// Create tables
const createTables = (db) => {
  // Admin table
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Departments table
  db.exec(`
    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      code TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Students table
  db.exec(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      parent_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      roll_number TEXT UNIQUE NOT NULL,
      registration_number TEXT UNIQUE NOT NULL,
      department_id INTEGER NOT NULL,
      academic_session TEXT NOT NULL,
      current_year INTEGER NOT NULL CHECK (current_year IN (1, 2, 3, 4)),
      current_semester TEXT NOT NULL CHECK (current_semester IN ('odd', 'even')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (department_id) REFERENCES departments (id)
    )
  `);

  // Courses table
  db.exec(`
    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_code TEXT NOT NULL,
      course_name TEXT NOT NULL,
      department_id INTEGER NOT NULL,
      year INTEGER NOT NULL CHECK (year IN (1, 2, 3, 4)),
      semester TEXT NOT NULL CHECK (semester IN ('odd', 'even')),
      cgpa_weight REAL NOT NULL DEFAULT 4.0,
      credits INTEGER NOT NULL DEFAULT 3,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (department_id) REFERENCES departments (id),
      UNIQUE(course_code, department_id)
    )
  `);

  // Course registrations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS course_registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      course_id INTEGER NOT NULL,
      registration_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students (id),
      FOREIGN KEY (course_id) REFERENCES courses (id),
      UNIQUE(student_id, course_id)
    )
  `);
  // Results table
  db.exec(`
    CREATE TABLE IF NOT EXISTS results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      course_id INTEGER NOT NULL,
      marks REAL NOT NULL CHECK (marks >= 0 AND marks <= 100),
      published BOOLEAN DEFAULT FALSE,
      is_backlog BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students (id),
      FOREIGN KEY (course_id) REFERENCES courses (id)
    )
  `);

  // Semester progress tracking
  db.exec(`
    CREATE TABLE IF NOT EXISTS semester_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      year INTEGER NOT NULL,
      semester TEXT NOT NULL,
      sgpa REAL,
      completed BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students (id),
      UNIQUE(student_id, year, semester)
    )
  `);
};

// Migration function to add backlog support
const addBacklogSupport = (db) => {
  try {
    // Check if is_backlog column exists and if unique constraint is removed
    const tableInfo = db.pragma("table_info(results)");
    const hasBacklogColumn = tableInfo.some((col) => col.name === "is_backlog");

    // Check if unique constraint still exists
    const createSql = db
      .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='results'")
      .get();
    const hasUniqueConstraint = createSql?.sql.includes("UNIQUE(student_id, course_id)") || false;

    if (!hasBacklogColumn || hasUniqueConstraint) {
      // The migration has been applied manually, so we skip the automatic migration
      return;
    }
  } catch (error) {
    console.error("Error checking backlog support:", error);
  }
};

// Initialize database function
const initializeDatabase = () => {
  if (global.__db) {
    return global.__db;
  }

  global.__db = new Database(dbPath);

  // Enable foreign keys
  global.__db.pragma("foreign_keys = ON");

  // Only initialize once
  if (!global.__dbInitialized) {
    // Create tables and run migrations
    createTables(global.__db);
    addBacklogSupport(global.__db);

    // Import and run seeding (only in development)
    if (process.env.NODE_ENV !== "production") {
      import("./seed")
        .then(({ seedDatabase }) => {
          seedDatabase().catch(console.error);
        })
        .catch(console.error);
    }

    global.__dbInitialized = true;
    console.log("Database initialized successfully");
  }

  return global.__db;
};

// Export the database instance
export const db = initializeDatabase();

export default db;
