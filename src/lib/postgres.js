import pkg from "pg";
const { Pool } = pkg;

// Validate environment variables
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

// Create PostgreSQL connection pool with Neon-optimized settings
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  // Neon PostgreSQL optimizations
  max: 8,
  min: 1,
  idleTimeoutMillis: 20000,
  connectionTimeoutMillis: 15000,
  acquireTimeoutMillis: 15000,
  statement_timeout: 45000,
  query_timeout: 45000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

// Add connection pool event handlers for monitoring
pool.on("error", (err) => {
  console.error("Unexpected error on idle database client:", err.message);
});

// Retry wrapper for database operations with exponential backoff
export async function executeWithRetry(operation, maxRetries = 3, baseDelay = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      const isConnectionError =
        error.code === "ECONNRESET" ||
        error.code === "ETIMEDOUT" ||
        error.code === "ENOTFOUND" ||
        error.message?.includes("Connection terminated") ||
        error.message?.includes("timeout");

      if (isConnectionError && attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(`Database connection attempt ${attempt} failed, retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}

// Helper function to execute queries with retry
async function executeQuery(client, query, params = []) {
  return executeWithRetry(() => client.query(query, params));
}

// Helper function to ensure NOT NULL constraints
async function ensureNotNull(client, tableName, columnName, defaultValue) {
  const columnCheck = await executeQuery(
    client,
    `
    SELECT is_nullable FROM information_schema.columns
    WHERE table_name = $1 AND column_name = $2
  `,
    [tableName, columnName]
  );

  if (columnCheck.rows[0]?.is_nullable === "YES") {
    await executeQuery(
      client,
      `UPDATE ${tableName} SET ${columnName} = $1 WHERE ${columnName} IS NULL`,
      [defaultValue]
    );
    await executeQuery(client, `ALTER TABLE ${tableName} ALTER COLUMN ${columnName} SET NOT NULL`);
  }
}

// Table creation definitions
const TABLE_SCHEMAS = {
  admin: `
    CREATE TABLE IF NOT EXISTS admin (
      id SERIAL PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `,
  departments: `
    CREATE TABLE IF NOT EXISTS departments (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      code VARCHAR(50) UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `,
  students: `
    CREATE TABLE IF NOT EXISTS students (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      parent_name VARCHAR(255) NOT NULL,
      phone VARCHAR(20) NOT NULL,
      roll_number VARCHAR(50) UNIQUE NOT NULL,
      registration_number VARCHAR(50) UNIQUE NOT NULL,
      department_id INTEGER REFERENCES departments(id),
      academic_session VARCHAR(50) NOT NULL,
      current_year INTEGER NOT NULL,
      current_semester VARCHAR(10) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `,
  courses: `
    CREATE TABLE IF NOT EXISTS courses (
      id SERIAL PRIMARY KEY,
      course_code VARCHAR(50) UNIQUE NOT NULL,
      course_name VARCHAR(255) NOT NULL,
      department_id INTEGER REFERENCES departments(id),
      year INTEGER NOT NULL,
      semester VARCHAR(10) NOT NULL,
      credits DECIMAL(4,2) NOT NULL,
      cgpa_weight DECIMAL(3,2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `,
  student_courses: `
    CREATE TABLE IF NOT EXISTS student_courses (
      id SERIAL PRIMARY KEY,
      student_id INTEGER REFERENCES students(id),
      course_id INTEGER REFERENCES courses(id),
      registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(student_id, course_id)
    )
  `,
  backlog_groups: `
    CREATE TABLE IF NOT EXISTS backlog_groups (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      is_open BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `,
  backlog_group_courses: `
    CREATE TABLE IF NOT EXISTS backlog_group_courses (
      id SERIAL PRIMARY KEY,
      group_id INTEGER REFERENCES backlog_groups(id) ON DELETE CASCADE,
      student_id INTEGER REFERENCES students(id),
      course_id INTEGER REFERENCES courses(id),
      is_registered BOOLEAN DEFAULT FALSE,
      registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(group_id, student_id, course_id)
    )
  `,
  results: `
    CREATE TABLE IF NOT EXISTS results (
      id SERIAL PRIMARY KEY,
      student_id INTEGER REFERENCES students(id),
      course_id INTEGER REFERENCES courses(id),
      marks DECIMAL(5,2) NOT NULL,
      published BOOLEAN DEFAULT FALSE,
      is_backlog BOOLEAN DEFAULT FALSE,
      backlog_group_id INTEGER REFERENCES backlog_groups(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `,
};

// Migration functions for existing databases
const runMigrations = async (client) => {
  // Fix students table constraints
  await ensureNotNull(client, "students", "parent_name", "Unknown");
  await ensureNotNull(client, "students", "phone", "0000000000");
  await ensureNotNull(client, "students", "academic_session", "2024-25");
  await ensureNotNull(client, "students", "current_year", 1);
  await ensureNotNull(client, "students", "current_semester", "Spring");

  // Fix courses table constraints
  await ensureNotNull(client, "courses", "cgpa_weight", 1.0);

  // Add backlog_group_id column to results if missing
  await executeQuery(
    client,
    `
    ALTER TABLE results
    ADD COLUMN IF NOT EXISTS backlog_group_id INTEGER REFERENCES backlog_groups(id)
  `
  );

  // Fix backlog_group_courses table structure if needed
  const tableExists = await executeQuery(
    client,
    `
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'backlog_group_courses'
  `
  );

  if (tableExists.rows.length > 0) {
    // Ensure correct primary key
    await executeQuery(
      client,
      `
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_type = 'PRIMARY KEY' AND table_name = 'backlog_group_courses'
          AND constraint_name = 'backlog_group_courses_pkey'
        ) THEN
          ALTER TABLE backlog_group_courses ADD COLUMN IF NOT EXISTS id SERIAL;
          UPDATE backlog_group_courses SET id = nextval('backlog_group_courses_id_seq')
          WHERE id IS NULL OR id = 0;
          ALTER TABLE backlog_group_courses ADD CONSTRAINT backlog_group_courses_pkey PRIMARY KEY (id);
        END IF;
      END $$;
    `
    );

    // Ensure unique constraint
    await executeQuery(
      client,
      `
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'backlog_group_courses_unique_group_student_course'
        ) THEN
          ALTER TABLE backlog_group_courses
          ADD CONSTRAINT backlog_group_courses_unique_group_student_course
          UNIQUE (group_id, student_id, course_id);
        END IF;
      END $$;
    `
    );

    // Make foreign key columns nullable
    await executeQuery(
      client,
      `
      ALTER TABLE backlog_group_courses
      ALTER COLUMN group_id DROP NOT NULL,
      ALTER COLUMN student_id DROP NOT NULL,
      ALTER COLUMN course_id DROP NOT NULL
    `
    );
  }
};

// Initialize database tables
const initializeTables = async () => {
  let client;
  try {
    client = await executeWithRetry(() => pool.connect());
    if (process.env.NODE_ENV === "production" || process.env.DEBUG_DB) {
      console.log("Successfully connected to PostgreSQL database");
    }
  } catch (error) {
    console.error("Failed to connect to PostgreSQL database:", error.message);
    console.error("Please check your DATABASE_URL and ensure PostgreSQL is accessible");
    return;
  }

  try {
    // Create all tables
    for (const schema of Object.values(TABLE_SCHEMAS)) {
      await executeQuery(client, schema);
    }

    // Run migrations for existing databases
    await runMigrations(client);

    if (process.env.NODE_ENV === "production" || process.env.DEBUG_DB) {
      console.log("PostgreSQL tables initialized successfully");
    }
  } catch (error) {
    console.error("Error initializing tables:", error);
  } finally {
    client.release();
  }
};

// Initialize on startup
if (process.env.DATABASE_URL) {
  initializeTables();
}

export { pool };
export default pool;
