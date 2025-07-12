import { pool, executeWithRetry } from "../postgres";

// Course operations
export async function getCourses() {
  try {
    const result = await pool.query(`
      SELECT c.*, d.name as department_name, d.code as department_code 
      FROM courses c 
      JOIN departments d ON c.department_id = d.id 
      ORDER BY d.name, c.year, c.semester, c.course_code
    `);

    // Convert numeric fields to ensure proper types
    const processedRows = result.rows.map((row) => ({
      ...row,
      credits: parseFloat(row.credits || 0),
      cgpa_weight: parseFloat(row.cgpa_weight || 0),
      year: parseInt(row.year || 1),
    }));

    return processedRows;
  } catch (error) {
    console.error("Error in getCourses:", error);
    throw error;
  }
}

export async function getCoursesByDepartment(departmentId) {
  try {
    const result = await pool.query(
      `
      SELECT c.*, d.name as department_name, d.code as department_code 
      FROM courses c 
      JOIN departments d ON c.department_id = d.id 
      WHERE c.department_id = $1
      ORDER BY c.year, c.semester, c.course_code
    `,
      [departmentId]
    );

    // Convert numeric fields to ensure proper types
    const processedRows = result.rows.map((row) => ({
      ...row,
      credits: parseFloat(row.credits || 0),
      cgpa_weight: parseFloat(row.cgpa_weight || 0),
      year: parseInt(row.year || 1),
    }));

    return processedRows;
  } catch (error) {
    console.error("Error in getCoursesByDepartment:", error);
    throw error;
  }
}

export async function createCourse(course) {
  try {
    // Validate required fields
    const requiredFields = [
      "course_code",
      "course_name",
      "department_id",
      "year",
      "semester",
      "cgpa_weight",
      "credits",
    ];

    for (const field of requiredFields) {
      if (course[field] === undefined || course[field] === null) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate data formats and constraints
    if (!/^[A-Z0-9]+$/i.test(course.course_code)) {
      throw new Error("Course code must contain only letters and numbers");
    }

    // Validate year and semester values
    if (course.year < 1 || course.year > 4) {
      throw new Error("Year must be between 1 and 4");
    }

    if (!["odd", "even"].includes(course.semester)) {
      throw new Error("Semester must be either 'odd' or 'even'");
    }

    // Validate credits and cgpa_weight are positive numbers
    if (course.credits <= 0) {
      throw new Error("Credits must be a positive number");
    }

    if (course.cgpa_weight < 0 || course.cgpa_weight > 4) {
      throw new Error("CGPA weight must be between 0 and 4");
    }

    const result = await pool.query(
      `
      INSERT INTO courses 
      (course_code, course_name, department_id, year, semester, cgpa_weight, credits) 
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `,
      [
        course.course_code,
        course.course_name,
        course.department_id,
        course.year,
        course.semester,
        course.cgpa_weight,
        course.credits,
      ]
    );

    const courseResult = await pool.query(
      `
      SELECT c.*, d.name as department_name 
      FROM courses c 
      JOIN departments d ON c.department_id = d.id 
      WHERE c.id = $1
    `,
      [result.rows[0].id]
    );

    return courseResult.rows[0];
  } catch (error) {
    if (error.code === "23505") {
      // PostgreSQL unique violation
      throw new Error("Course code already exists in this department");
    }
    console.error("Error in createCourse:", error);
    throw error;
  }
}

export async function deleteCourse(courseId) {
  try {
    // Check if there are any registrations or results for this course
    const registrations = await pool.query(
      "SELECT COUNT(*) as count FROM student_courses WHERE course_id = $1",
      [courseId]
    );

    const results = await pool.query("SELECT COUNT(*) as count FROM results WHERE course_id = $1", [
      courseId,
    ]);

    if (parseInt(registrations.rows[0].count) > 0 || parseInt(results.rows[0].count) > 0) {
      return false; // Cannot delete course with existing data
    }

    const result = await pool.query("DELETE FROM courses WHERE id = $1", [courseId]);
    return result.rowCount > 0;
  } catch (error) {
    console.error("Error deleting course:", error);
    return false;
  }
}

export async function getCourseById(courseId) {
  try {
    const result = await pool.query(
      `
      SELECT c.*, d.name as department_name 
      FROM courses c 
      JOIN departments d ON c.department_id = d.id 
      WHERE c.id = $1
    `,
      [courseId]
    );

    if (result.rows[0]) {
      // Convert numeric fields to ensure proper types
      return {
        ...result.rows[0],
        credits: parseFloat(result.rows[0].credits || 0),
        cgpa_weight: parseFloat(result.rows[0].cgpa_weight || 0),
        year: parseInt(result.rows[0].year || 1),
      };
    }

    return result.rows[0];
  } catch (error) {
    console.error("Error fetching course:", error);
    return null;
  }
}

export async function updateCourse(courseId, updates) {
  try {
    // Define allowed fields for security
    const allowedFields = [
      "course_code",
      "course_name",
      "department_id",
      "year",
      "semester",
      "cgpa_weight",
      "credits",
    ];

    const fields = Object.keys(updates).filter(
      (key) => allowedFields.includes(key) && updates[key] !== undefined && updates[key] !== null
    );
    const values = fields.map((field) => updates[field]);
    const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(", ");

    if (fields.length === 0) {
      return await getCourseById(courseId);
    }

    // Validate updated fields that have specific requirements
    if (updates.course_code && !/^[A-Z0-9]+$/i.test(updates.course_code)) {
      throw new Error("Course code must contain only letters and numbers");
    }

    if (updates.course_name && typeof updates.course_name !== "string") {
      throw new Error("Course name must be a string");
    }

    if (updates.year && (updates.year < 1 || updates.year > 4)) {
      throw new Error("Year must be between 1 and 4");
    }

    if (updates.semester && !["odd", "even"].includes(updates.semester)) {
      throw new Error("Semester must be either 'odd' or 'even'");
    }

    if (updates.credits && updates.credits <= 0) {
      throw new Error("Credits must be a positive number");
    }

    if (updates.cgpa_weight !== undefined && (updates.cgpa_weight < 0 || updates.cgpa_weight > 4)) {
      throw new Error("CGPA weight must be between 0 and 4");
    }

    const result = await pool.query(
      `UPDATE courses SET ${setClause} WHERE id = $${fields.length + 1}`,
      [...values, courseId]
    );

    if (result.rowCount === 0) {
      return null;
    }

    return await getCourseById(courseId);
  } catch (error) {
    if (error.code === "23505") {
      // PostgreSQL unique violation
      throw new Error("Course code already exists in this department");
    }
    console.error("Error updating course:", error);
    throw error;
  }
}

// Get all course years and semesters for results page filtering
export async function getAllCourseYears() {
  try {
    const result = await pool.query("SELECT DISTINCT year FROM courses ORDER BY year");

    // Combine with standard academic years to ensure completeness
    const allYears = new Set();
    [1, 2, 3, 4].forEach((year) => allYears.add(year));
    result.rows.forEach((c) => allYears.add(c.year));

    return Array.from(allYears).sort();
  } catch (error) {
    console.error("Error in getAllCourseYears:", error);
    throw error;
  }
}

export async function getAllCourseSemesters() {
  try {
    const result = await pool.query("SELECT DISTINCT semester FROM courses ORDER BY semester");

    // Combine with standard semesters to ensure completeness (only even/odd)
    const allSemesters = new Set();
    ["even", "odd"].forEach((semester) => allSemesters.add(semester));
    result.rows.forEach((c) => allSemesters.add(c.semester));

    return Array.from(allSemesters).filter(Boolean).sort();
  } catch (error) {
    console.error("Error in getAllCourseSemesters:", error);
    throw error;
  }
}

// Get student count for a specific course
export async function getCourseStudentCount(courseId) {
  try {
    const result = await pool.query(
      "SELECT COUNT(*) as count FROM student_courses WHERE course_id = $1",
      [courseId]
    );
    return parseInt(result.rows[0].count) || 0;
  } catch (error) {
    console.error("Error in getCourseStudentCount:", error);
    throw error;
  }
}

// Get all courses with student counts (optimized single query with resilience and retry)
export async function getCoursesWithStudentCounts() {
  try {
    const result = await executeWithRetry(async () => {
      return await pool.query(`
        SELECT c.*, d.name as department_name, d.code as department_code,
               COALESCE(sc.student_count, 0) as student_count
        FROM courses c 
        JOIN departments d ON c.department_id = d.id 
        LEFT JOIN (
          SELECT course_id, COUNT(*) as student_count
          FROM student_courses
          GROUP BY course_id
        ) sc ON c.id = sc.course_id
        ORDER BY d.name, c.year, c.semester, c.course_code
      `);
    });

    // Convert numeric fields to ensure proper types
    const processedRows = result.rows.map((row) => ({
      ...row,
      credits: parseFloat(row.credits || 0),
      cgpa_weight: parseFloat(row.cgpa_weight || 0),
      year: parseInt(row.year || 1),
      student_count: parseInt(row.student_count || 0),
    }));

    return processedRows;
  } catch (error) {
    console.error("Error in getCoursesWithStudentCounts:", error);

    // Provide more specific error information for connection issues
    if (error.code === "ECONNRESET" || error.code === "ETIMEDOUT") {
      console.error(
        "Database connection issue detected. This may be due to network latency or Neon PostgreSQL connection limits."
      );
    }

    throw error;
  }
}
