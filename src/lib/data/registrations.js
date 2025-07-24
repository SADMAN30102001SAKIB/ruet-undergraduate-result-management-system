import { pool } from "../postgres";
import { getStudentById } from "./students";
import { getCourseById } from "./courses";

// Course registration operations
export async function getStudentRegistrations(studentId, currentYear, currentSemester) {
  try {
    let query = `
      SELECT cr.*, c.course_code, c.course_name, c.year, c.semester, c.credits, c.cgpa_weight
      FROM student_courses cr
      JOIN courses c ON cr.course_id = c.id
      WHERE cr.student_id = $1`;

    const params = [studentId];

    // If current year and semester are provided, filter by them
    if (currentYear !== undefined && currentSemester !== undefined) {
      query += ` AND c.year = $2 AND c.semester = $3`;
      params.push(currentYear, currentSemester);
    }

    query += ` ORDER BY c.year, c.semester, c.course_code`;

    const result = await pool.query(query, params);

    // Convert numeric fields to ensure proper types
    const processedRows = result.rows.map((row) => ({
      ...row,
      credits: parseFloat(row.credits || 0),
      cgpa_weight: parseFloat(row.cgpa_weight || 0),
      year: parseInt(row.year || 1),
    }));

    return processedRows;
  } catch (error) {
    console.error("Error in getStudentRegistrations:", error);
    throw error;
  }
}

export async function getAvailableCoursesForStudent(
  studentId,
  departmentId,
  currentYear,
  currentSemester
) {
  try {
    const result = await pool.query(
      `
      SELECT c.*, d.name as department_name 
      FROM courses c 
      JOIN departments d ON c.department_id = d.id 
      WHERE c.department_id = $1 
        AND c.year = $2
        AND c.semester = $3
        AND c.id NOT IN (
          SELECT course_id FROM student_courses WHERE student_id = $4
        )
      ORDER BY c.course_code
    `,
      [departmentId, currentYear, currentSemester, studentId]
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
    console.error("Error in getAvailableCoursesForStudent:", error);
    throw error;
  }
}

export async function registerStudentForCourse(studentId, courseId) {
  try {
    // Validate inputs
    if (!studentId || !courseId || isNaN(parseInt(studentId)) || isNaN(parseInt(courseId))) {
      throw new Error("Valid student ID and course ID are required");
    }

    // Check if already registered
    if (await isStudentRegisteredForCourse(studentId, courseId)) {
      throw new Error("Student is already registered for this course");
    }

    // Check if student and course exist
    const student = await getStudentById(studentId);
    if (!student) {
      throw new Error("Student not found");
    }

    const course = await getCourseById(courseId);
    if (!course) {
      throw new Error("Course not found");
    }

    // Validate business rules
    if (course.department_id !== student.department_id) {
      throw new Error("Course department does not match student's department");
    }

    if (course.year !== student.current_year) {
      throw new Error("Course year does not match student's current year");
    }

    if (course.semester !== student.current_semester) {
      throw new Error("Course semester does not match student's current semester");
    }

    const result = await pool.query(
      "INSERT INTO student_courses (student_id, course_id) VALUES ($1, $2) RETURNING *",
      [studentId, courseId]
    );
    return result.rows[0];
  } catch (error) {
    if (error.code === "23505") {
      // PostgreSQL unique violation
      throw new Error("Student is already registered for this course");
    }
    console.error("Error in registerStudentForCourse:", error);
    throw error;
  }
}

export async function unregisterStudentFromCourse(studentId, courseId) {
  try {
    // Validate inputs
    if (!studentId || !courseId || isNaN(parseInt(studentId)) || isNaN(parseInt(courseId))) {
      throw new Error("Valid student ID and course ID are required");
    }

    const result = await pool.query(
      "DELETE FROM student_courses WHERE student_id = $1 AND course_id = $2",
      [studentId, courseId]
    );

    return result.rowCount > 0;
  } catch (error) {
    console.error("Error in unregisterStudentFromCourse:", error);
    throw error;
  }
}

export async function isStudentRegisteredForCourse(studentId, courseId) {
  try {
    const result = await pool.query(
      "SELECT id FROM student_courses WHERE student_id = $1 AND course_id = $2",
      [studentId, courseId]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error("Error in isStudentRegisteredForCourse:", error);
    throw error;
  }
}

// New function to get registered courses for a specific student with all results
export async function getRegisteredCoursesForStudent(studentId, filters = {}) {
  try {
    let query = `
      SELECT c.*, d.name as department_name, d.code as department_code,
             r.marks, r.published, r.is_backlog,
             CASE WHEN r.id IS NULL THEN 0 ELSE 1 END as has_result
      FROM courses c 
      JOIN departments d ON c.department_id = d.id 
      JOIN student_courses cr ON c.id = cr.course_id
      LEFT JOIN results r ON c.id = r.course_id AND r.student_id = $1
        AND r.id = (
          SELECT r2.id FROM results r2 
          WHERE r2.course_id = c.id AND r2.student_id = $1
          ORDER BY r2.marks DESC, r2.created_at DESC 
          LIMIT 1
        )
      WHERE cr.student_id = $1
    `;

    const params = [studentId];
    let paramCount = 2;

    // Apply filters if provided
    if (filters.departmentId) {
      query += ` AND c.department_id = $${paramCount++}`;
      params.push(parseInt(filters.departmentId));
    }

    if (filters.year) {
      query += ` AND c.year = $${paramCount++}`;
      params.push(parseInt(filters.year));
    }

    if (filters.semester) {
      query += ` AND c.semester = $${paramCount++}`;
      params.push(filters.semester);
    }

    query += ` ORDER BY c.year, c.semester, c.course_code`;

    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    console.error("Error in getRegisteredCoursesForStudent:", error);
    throw error;
  }
}

// Get registered courses that are available for result entry/editing
// Returns courses that either have no result, unpublished results, or published failing results
export async function getCoursesAvailableForResultEntry(studentId, filters = {}) {
  try {
    let query = `
      SELECT c.*, d.name as department_name, d.code as department_code,
             r.marks, r.published, r.is_backlog, r.id as result_id,
             CASE WHEN r.id IS NULL THEN 0 ELSE 1 END as has_result
      FROM courses c 
      JOIN departments d ON c.department_id = d.id 
      JOIN student_courses cr ON c.id = cr.course_id
      LEFT JOIN results r ON c.id = r.course_id AND r.student_id = $1
        AND r.id = (
          SELECT r2.id FROM results r2 
          WHERE r2.course_id = c.id AND r2.student_id = $1
          ORDER BY r2.marks DESC, r2.created_at DESC 
          LIMIT 1
        )
      WHERE cr.student_id = $1
        AND (
          r.id IS NULL OR                           -- No result yet
          r.published = false OR                    -- Unpublished result
          (r.published = true AND r.marks < 40)     -- Published failing result (F grade)
        )
    `;

    const params = [studentId];
    let paramCount = 2;

    // Apply filters if provided
    if (filters.departmentId) {
      query += ` AND c.department_id = $${paramCount++}`;
      params.push(parseInt(filters.departmentId));
    }

    if (filters.year) {
      query += ` AND c.year = $${paramCount++}`;
      params.push(parseInt(filters.year));
    }

    if (filters.semester) {
      query += ` AND c.semester = $${paramCount++}`;
      params.push(filters.semester);
    }

    query += ` ORDER BY c.year, c.semester, c.course_code`;

    const result = await pool.query(query, params);

    // Convert numeric fields to ensure proper types
    const processedRows = result.rows.map((row) => ({
      ...row,
      credits: parseFloat(row.credits || 0),
      cgpa_weight: parseFloat(row.cgpa_weight || 0),
      year: parseInt(row.year || 1),
    }));

    return processedRows;
  } catch (error) {
    console.error("Error in getCoursesAvailableForResultEntry:", error);
    throw error;
  }
}

// Function to validate course unregistration business logic
export async function canUnregisterStudentFromCourse(studentId, courseId) {
  try {
    // Validate inputs
    if (!studentId || !courseId || isNaN(parseInt(studentId)) || isNaN(parseInt(courseId))) {
      return { canUnregister: false, error: "Valid student ID and course ID are required" };
    }

    // Check if student is registered for this course
    if (!(await isStudentRegisteredForCourse(studentId, courseId))) {
      return { canUnregister: false, error: "Student is not registered for this course" };
    }

    // Check if student has a published result for this course
    const result = await pool.query(
      "SELECT id FROM results WHERE student_id = $1 AND course_id = $2 AND published = true",
      [studentId, courseId]
    );

    if (result.rows.length > 0) {
      return {
        canUnregister: false,
        error: "Cannot unregister from courses with published results",
      };
    }

    return { canUnregister: true };
  } catch (error) {
    console.error("Error in canUnregisterStudentFromCourse:", error);
    throw error;
  }
}
