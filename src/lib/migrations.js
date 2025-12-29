import { executeQuery } from "./postgres";

const fixColumn = async (client, table, col, type, def) => {
  const value = typeof def === "string" ? `'${def}'` : def;
  await executeQuery(client, `
    DO $$ 
    BEGIN 
      IF (SELECT is_nullable FROM information_schema.columns WHERE table_name = '${table}' AND column_name = '${col}') = 'YES' THEN
        UPDATE ${table} SET ${col} = ${value}::${type} WHERE ${col} IS NULL;
        ALTER TABLE ${table} ALTER COLUMN ${col} SET NOT NULL;
      END IF;
    END $$;
  `);
};

export const runMigrations = async (client) => {
  // 1. Batch Student & Course Column Fixes
  await fixColumn(client, "students", "parent_name", "VARCHAR", "Unknown");
  await fixColumn(client, "students", "phone", "VARCHAR", "0000000000");
  await fixColumn(client, "students", "academic_session", "VARCHAR", "2024-25");
  await fixColumn(client, "students", "current_year", "INTEGER", 1);
  await fixColumn(client, "students", "current_semester", "VARCHAR", "Spring");
  await fixColumn(client, "courses", "cgpa_weight", "DECIMAL", 1.0);

  // 2. Refined Course Uniqueness (Safe & Compact)
  await executeQuery(client, `
    DO $$
    BEGIN
      -- Drop ANY old unique constraint that only touches 'course_code'
      IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'courses' AND constraint_type = 'UNIQUE') THEN
        EXECUTE (
          SELECT 'ALTER TABLE courses DROP CONSTRAINT ' || quote_ident(constraint_name)
          FROM information_schema.key_column_usage
          WHERE table_name = 'courses' AND column_name = 'course_code'
          GROUP BY constraint_name HAVING COUNT(*) = 1
        );
      END IF;
      
      -- Add composite constraint if missing
      IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'courses_unique_course_code_department') THEN
        ALTER TABLE courses ADD CONSTRAINT courses_unique_course_code_department UNIQUE (course_code, department_id);
      END IF;
    END $$;
  `);

  // 3. Results & Backlog Structure (One-shot)
  await executeQuery(client, `
    ALTER TABLE results ADD COLUMN IF NOT EXISTS backlog_group_id INTEGER REFERENCES backlog_groups(id);
    
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'backlog_group_courses') THEN
        -- Primary Key fix
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'backlog_group_courses' AND constraint_type = 'PRIMARY KEY') THEN
          ALTER TABLE backlog_group_courses ADD COLUMN IF NOT EXISTS id SERIAL PRIMARY KEY;
        END IF;
        -- Constraint & Nullability cleanup
        ALTER TABLE backlog_group_courses DROP CONSTRAINT IF EXISTS backlog_group_courses_unique_group_student_course;
        ALTER TABLE backlog_group_courses ADD CONSTRAINT backlog_group_courses_unique_group_student_course UNIQUE (group_id, student_id, course_id);
        ALTER TABLE backlog_group_courses ALTER COLUMN group_id DROP NOT NULL, ALTER COLUMN student_id DROP NOT NULL, ALTER COLUMN course_id DROP NOT NULL;
      END IF;
    END $$;
  `);
};