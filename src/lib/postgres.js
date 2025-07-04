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
  max: 8, // Reduced max connections for better stability
  min: 1, // Reduced min connections to avoid idle timeouts
  idleTimeoutMillis: 20000, // Reduced idle timeout
  connectionTimeoutMillis: 15000, // Increased connection timeout
  acquireTimeoutMillis: 15000, // Increased acquire timeout
  // Add some resilience for network issues
  statement_timeout: 45000, // Increased statement timeout
  query_timeout: 45000, // Increased query timeout
  // Additional Neon-specific settings
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

      // If it's not a connection error or we've exhausted retries, throw the error
      throw error;
    }
  }
}

// Initialize database tables with retry logic
const initializeTables = async () => {
  let client;
  try {
    client = await executeWithRetry(async () => {
      return await pool.connect();
    });
    // Only log connection success in production or if debug mode is enabled
    if (process.env.NODE_ENV === "production" || process.env.DEBUG_DB) {
      console.log("Successfully connected to PostgreSQL database");
    }
  } catch (error) {
    console.error("Failed to connect to PostgreSQL database:", error.message);
    console.error("Please check your DATABASE_URL and ensure PostgreSQL is accessible");
    return;
  }

  try {
    // Create tables with retry logic for better resilience
    await executeWithRetry(async () => {
      // Admin table
      await client.query(`
        CREATE TABLE IF NOT EXISTS admin (
          id SERIAL PRIMARY KEY,
          username VARCHAR(255) UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    });

    await executeWithRetry(async () => {
      // Departments table
      await client.query(`
        CREATE TABLE IF NOT EXISTS departments (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) UNIQUE NOT NULL,
          code VARCHAR(50) UNIQUE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    });

    await executeWithRetry(async () => {
      // Students table
      await client.query(`
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
      `);
    });

    await executeWithRetry(async () => {
      // Courses table
      await client.query(`
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
      `);
    });

    await executeWithRetry(async () => {
      // Student course registrations table
      await client.query(`
        CREATE TABLE IF NOT EXISTS student_courses (
          id SERIAL PRIMARY KEY,
          student_id INTEGER REFERENCES students(id),
          course_id INTEGER REFERENCES courses(id),
          registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(student_id, course_id)
        )
      `);
    });

    await executeWithRetry(async () => {
      // Results table
      await client.query(`
        CREATE TABLE IF NOT EXISTS results (
          id SERIAL PRIMARY KEY,
          student_id INTEGER REFERENCES students(id),
          course_id INTEGER REFERENCES courses(id),
          marks DECIMAL(5,2) NOT NULL,
          published BOOLEAN DEFAULT FALSE,
          is_backlog BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    });

    // Apply schema migrations for existing tables
    try {
      // Add published column to results table if it doesn't exist
      await client.query(`
        ALTER TABLE results 
        ADD COLUMN IF NOT EXISTS published BOOLEAN DEFAULT FALSE
      `);

      // Add missing columns to students table if they don't exist
      await client.query(`
        ALTER TABLE students 
        ADD COLUMN IF NOT EXISTS parent_name VARCHAR(255)
      `);

      await client.query(`
        ALTER TABLE students 
        ADD COLUMN IF NOT EXISTS academic_session VARCHAR(50)
      `);

      await client.query(`
        ALTER TABLE students 
        ADD COLUMN IF NOT EXISTS current_year INTEGER
      `);

      await client.query(`
        ALTER TABLE students 
        ADD COLUMN IF NOT EXISTS current_semester VARCHAR(10)
      `);

      // Handle legacy columns in students table
      const studentsColumns = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'students' AND column_name IN ('year', 'semester')
      `);

      // If legacy year column exists, either drop it or make it nullable
      if (studentsColumns.rows.some((row) => row.column_name === "year")) {
        await client.query(`
          ALTER TABLE students 
          ALTER COLUMN year DROP NOT NULL
        `);
        console.log("Made students.year column nullable");
      }

      // If legacy semester column exists, either drop it or make it nullable
      if (studentsColumns.rows.some((row) => row.column_name === "semester")) {
        await client.query(`
          ALTER TABLE students 
          ALTER COLUMN semester DROP NOT NULL
        `);
        console.log("Made students.semester column nullable");
      }

      // Migrate courses table columns if they exist with old names
      const coursesColumns = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name IN ('code', 'name')
      `);

      if (coursesColumns.rows.some((row) => row.column_name === "code")) {
        await client.query(`
          ALTER TABLE courses 
          RENAME COLUMN code TO course_code
        `);
        console.log("Renamed courses.code to courses.course_code");
      }

      if (coursesColumns.rows.some((row) => row.column_name === "name")) {
        await client.query(`
          ALTER TABLE courses 
          RENAME COLUMN name TO course_name
        `);
        console.log("Renamed courses.name to courses.course_name");
      }

      // Ensure year and semester columns exist in courses table with correct types
      await client.query(`
        ALTER TABLE courses 
        ADD COLUMN IF NOT EXISTS year INTEGER
      `);

      // Change semester column to VARCHAR if it's currently INTEGER
      const semesterColumn = await client.query(`
        SELECT data_type 
        FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'semester'
      `);

      if (semesterColumn.rows.length > 0 && semesterColumn.rows[0].data_type === "integer") {
        await client.query(`
          ALTER TABLE courses 
          ALTER COLUMN semester TYPE VARCHAR(10) USING semester::text
        `);
        console.log("Changed courses.semester from INTEGER to VARCHAR(10)");
      } else {
        await client.query(`
          ALTER TABLE courses 
          ADD COLUMN IF NOT EXISTS semester VARCHAR(10)
        `);
      }

      await client.query(`
        ALTER TABLE courses 
        ADD COLUMN IF NOT EXISTS cgpa_weight DECIMAL(3,2) DEFAULT 1.0
      `);

      // Update credits column type to support decimal values
      try {
        await client.query(`
          ALTER TABLE courses 
          ALTER COLUMN credits TYPE DECIMAL(4,2) USING credits::decimal(4,2)
        `);
        console.log("Updated courses.credits column to support decimal values");
      } catch (error) {
        // Column might already be correct type or migration already applied
        if (
          !error.message.includes("already exists") &&
          !error.message.includes("cannot be cast")
        ) {
          console.log(
            "Credits column migration skipped (already applied or type conversion issue)"
          );
        }
      }

      // Remove unique constraint from results table to allow backlog entries
      try {
        // Check if constraint exists
        const constraintExists = await client.query(`
          SELECT constraint_name 
          FROM information_schema.table_constraints 
          WHERE table_name = 'results' 
            AND constraint_type = 'UNIQUE' 
            AND constraint_name LIKE '%student_id%course_id%'
        `);

        if (constraintExists.rows.length > 0) {
          const constraintName = constraintExists.rows[0].constraint_name;
          await client.query(`
            ALTER TABLE results DROP CONSTRAINT ${constraintName}
          `);
          console.log(
            `Removed unique constraint ${constraintName} from results table to allow backlog entries`
          );
        }
      } catch (error) {
        console.log(
          "Note: Could not remove results unique constraint (may not exist):",
          error.message
        );
      }
    } catch (migrationError) {
      console.log("Migration note:", migrationError.message);
    }

    // Only log initialization success in production or debug mode
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
