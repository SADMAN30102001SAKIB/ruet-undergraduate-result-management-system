import { pool } from "./postgres";
import { getGradeFromMarks, getBacklogGradeFromMarks, calculateSGPAWithBacklog } from "./utils";

// Department operations
export async function getDepartments() {
  try {
    const result = await pool.query("SELECT * FROM departments ORDER BY name");
    return result.rows;
  } catch (error) {
    console.error("Error in getDepartments:", error);
    throw error;
  }
}

export async function createDepartment(name, code) {
  try {
    // Validate required fields
    if (!name || !code) {
      throw new Error("Department name and code are required");
    }

    // Validate code format (should be uppercase and reasonable length)
    if (typeof code !== "string" || code.length < 2 || code.length > 10) {
      throw new Error("Department code must be a string between 2 and 10 characters");
    }

    // Validate name length
    if (typeof name !== "string" || name.length < 2 || name.length > 100) {
      throw new Error("Department name must be a string between 2 and 100 characters");
    }

    const result = await pool.query(
      "INSERT INTO departments (name, code) VALUES ($1, $2) RETURNING *",
      [name.trim(), code.trim().toUpperCase()]
    );
    return result.rows[0];
  } catch (error) {
    if (error.code === "23505") {
      // PostgreSQL unique violation
      throw new Error("Department name or code already exists");
    }
    console.error("Error in createDepartment:", error);
    throw error;
  }
}

export async function getDepartmentById(id) {
  try {
    const result = await pool.query("SELECT * FROM departments WHERE id = $1", [id]);
    return result.rows[0];
  } catch (error) {
    console.error("Error in getDepartmentById:", error);
    throw error;
  }
}

export async function updateDepartment(id, updates) {
  try {
    // Allow valid field updates, exclude system fields and check for undefined/null
    const allowedFields = ["name", "code"];
    const fields = Object.keys(updates).filter(
      (key) => allowedFields.includes(key) && updates[key] !== undefined && updates[key] !== null
    );
    const values = fields.map((field) => updates[field]);
    const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(", ");

    if (fields.length === 0) {
      return await getDepartmentById(id);
    }

    const result = await pool.query(
      `UPDATE departments SET ${setClause} WHERE id = $${fields.length + 1}`,
      [...values, id]
    );

    if (result.rowCount === 0) {
      return null;
    }

    return await getDepartmentById(id);
  } catch (error) {
    if (error.code === "23505") {
      // PostgreSQL unique violation
      throw new Error("Department name or code already exists");
    }
    console.error("Error in updateDepartment:", error);
    throw error;
  }
}

export async function deleteDepartment(id) {
  try {
    // Check if department has students or courses
    const studentsCount = await pool.query(
      "SELECT COUNT(*) as count FROM students WHERE department_id = $1",
      [id]
    );
    const coursesCount = await pool.query(
      "SELECT COUNT(*) as count FROM courses WHERE department_id = $1",
      [id]
    );

    if (parseInt(studentsCount.rows[0].count) > 0 || parseInt(coursesCount.rows[0].count) > 0) {
      throw new Error("Cannot delete department with existing students or courses");
    }

    const result = await pool.query("DELETE FROM departments WHERE id = $1", [id]);
    return result.rowCount > 0;
  } catch (error) {
    console.error("Error in deleteDepartment:", error);
    throw error;
  }
}

// Student operations
export async function getStudents() {
  try {
    const result = await pool.query(`
      SELECT s.*, d.name as department_name, d.code as department_code 
      FROM students s 
      JOIN departments d ON s.department_id = d.id 
      ORDER BY s.name
    `);
    return result.rows;
  } catch (error) {
    console.error("Error in getStudents:", error);
    throw error;
  }
}

export async function getStudentById(id) {
  try {
    const result = await pool.query(
      `
      SELECT s.*, d.name as department_name, d.code as department_code 
      FROM students s 
      JOIN departments d ON s.department_id = d.id 
      WHERE s.id = $1
    `,
      [id]
    );
    return result.rows[0];
  } catch (error) {
    console.error("Error in getStudentById:", error);
    throw error;
  }
}

export async function createStudent(student) {
  try {
    // Validate required fields
    const requiredFields = [
      "name",
      "parent_name",
      "phone",
      "roll_number",
      "registration_number",
      "department_id",
      "academic_session",
      "current_year",
      "current_semester",
    ];

    for (const field of requiredFields) {
      if (!student[field] && student[field] !== 0) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate data formats and constraints
    if (!/^[0-9]{10,11}$/.test(student.phone)) {
      throw new Error("Phone number must be 10-11 digits");
    }

    if (!/^[A-Z0-9]+$/i.test(student.roll_number)) {
      throw new Error("Roll number must contain only letters and numbers");
    }

    if (!/^[A-Z0-9]+$/i.test(student.registration_number)) {
      throw new Error("Registration number must contain only letters and numbers");
    }

    // Validate year and semester values
    if (student.current_year < 1 || student.current_year > 4) {
      throw new Error("Current year must be between 1 and 4");
    }

    if (!["odd", "even"].includes(student.current_semester)) {
      throw new Error("Current semester must be either 'odd' or 'even'");
    }

    const result = await pool.query(
      `
      INSERT INTO students 
      (name, parent_name, phone, roll_number, registration_number, department_id, academic_session, current_year, current_semester) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `,
      [
        student.name,
        student.parent_name,
        student.phone,
        student.roll_number,
        student.registration_number,
        student.department_id,
        student.academic_session,
        student.current_year,
        student.current_semester,
      ]
    );

    return await getStudentById(result.rows[0].id);
  } catch (error) {
    if (error.code === "23505") {
      // PostgreSQL unique violation - check constraint details for specific field
      if (error.detail && error.detail.includes("roll_number")) {
        throw new Error("Roll number already exists");
      }
      if (error.detail && error.detail.includes("registration_number")) {
        throw new Error("Registration number already exists");
      }
      throw new Error("Roll number or registration number already exists");
    }
    console.error("Error in createStudent:", error);
    throw error;
  }
}

export async function updateStudent(id, updates) {
  try {
    // Define allowed fields for security
    const allowedFields = [
      "name",
      "parent_name",
      "phone",
      "roll_number",
      "registration_number",
      "department_id",
      "academic_session",
      "current_year",
      "current_semester",
    ];

    const fields = Object.keys(updates).filter(
      (key) => allowedFields.includes(key) && updates[key] !== undefined && updates[key] !== null
    );
    const values = fields.map((field) => updates[field]);
    const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(", ");

    if (fields.length === 0) {
      return await getStudentById(id);
    }

    // Validate updated fields that have format requirements
    if (updates.phone && !/^[0-9]{10,11}$/.test(updates.phone)) {
      throw new Error("Phone number must be 10-11 digits");
    }

    if (updates.roll_number && !/^[A-Z0-9]+$/i.test(updates.roll_number)) {
      throw new Error("Roll number must contain only letters and numbers");
    }

    if (updates.registration_number && !/^[A-Z0-9]+$/i.test(updates.registration_number)) {
      throw new Error("Registration number must contain only letters and numbers");
    }

    if (updates.current_year && (updates.current_year < 1 || updates.current_year > 4)) {
      throw new Error("Current year must be between 1 and 4");
    }

    if (updates.current_semester && !["odd", "even"].includes(updates.current_semester)) {
      throw new Error("Current semester must be either 'odd' or 'even'");
    }

    const result = await pool.query(
      `UPDATE students SET ${setClause} WHERE id = $${fields.length + 1}`,
      [...values, id]
    );

    if (result.rowCount === 0) {
      return null; // Student not found
    }

    return await getStudentById(id);
  } catch (error) {
    if (error.code === "23505") {
      // PostgreSQL unique violation - check constraint details for specific field
      if (error.detail && error.detail.includes("roll_number")) {
        throw new Error("Roll number already exists");
      }
      if (error.detail && error.detail.includes("registration_number")) {
        throw new Error("Registration number already exists");
      }
      throw new Error("Roll number or registration number already exists");
    }
    console.error("Error in updateStudent:", error);
    throw error;
  }
}

export async function deleteStudent(id) {
  try {
    // Check if student exists
    const student = await pool.query("SELECT id FROM students WHERE id = $1", [id]);
    if (student.rows.length === 0) {
      return { success: false, error: "Student not found" };
    }

    // Check if student has any results
    const hasResults = await pool.query(
      "SELECT COUNT(*) as count FROM results WHERE student_id = $1",
      [id]
    );

    if (parseInt(hasResults.rows[0].count) > 0) {
      return { success: false, error: "Cannot delete student with existing results" };
    }

    // Use PostgreSQL transaction for data consistency
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Delete related records first
      await client.query("DELETE FROM results WHERE student_id = $1", [id]);
      await client.query("DELETE FROM student_courses WHERE student_id = $1", [id]);
      // Note: semester_progress table doesn't exist in our schema

      // Delete the student
      const result = await client.query("DELETE FROM students WHERE id = $1", [id]);

      await client.query("COMMIT");
      return { success: result.rowCount > 0 };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error in deleteStudent:", error);
    throw error;
  }
}

// Course operations
export async function getCourses() {
  try {
    const result = await pool.query(`
      SELECT c.*, d.name as department_name, d.code as department_code 
      FROM courses c 
      JOIN departments d ON c.department_id = d.id 
      ORDER BY d.name, c.year, c.semester, c.course_code
    `);
    return result.rows;
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
    return result.rows;
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
    return result.rows;
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
    return result.rows;
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

// Result operations
export async function getStudentResults(studentId) {
  try {
    const result = await pool.query(
      `
      SELECT r.*, c.course_code, c.course_name, c.year, c.semester, c.credits, c.cgpa_weight
      FROM results r
      JOIN courses c ON r.course_id = c.id
      WHERE r.student_id = $1 AND r.published = true
      ORDER BY c.year, c.semester, c.course_code
    `,
      [studentId]
    );
    return result.rows;
  } catch (error) {
    console.error("Error in getStudentResults:", error);
    throw error;
  }
}

// Get student results separated into regular and backlog
export async function getStudentResultsWithBacklog(studentId) {
  try {
    const result = await pool.query(
      `
      SELECT r.*, c.course_code, c.course_name, c.year, c.semester, c.credits, c.cgpa_weight
      FROM results r
      JOIN courses c ON r.course_id = c.id
      WHERE r.student_id = $1 AND r.published = true
      ORDER BY r.is_backlog ASC, c.year, c.semester, c.course_code
    `,
      [studentId]
    );

    const allResults = result.rows;
    const regularResults = allResults.filter((r) => !r.is_backlog);
    const backlogResults = allResults.filter((r) => r.is_backlog);

    return { regularResults, backlogResults };
  } catch (error) {
    console.error("Error in getStudentResultsWithBacklog:", error);
    throw error;
  }
}

// Get effective results for CGPA calculation (backlog results override failed originals)
export async function getEffectiveStudentResults(studentId) {
  try {
    const { regularResults, backlogResults } = await getStudentResultsWithBacklog(studentId);

    // Create a map of course_id to best result
    const effectiveResults = new Map();

    // First add all regular results
    regularResults.forEach((result) => {
      effectiveResults.set(result.course_id, result);
    });

    // Then override with backlog results if they are better (higher marks)
    backlogResults.forEach((result) => {
      const existingResult = effectiveResults.get(result.course_id);
      if (!existingResult || result.marks > existingResult.marks) {
        effectiveResults.set(result.course_id, result);
      }
    });

    return Array.from(effectiveResults.values()).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      if (a.semester !== b.semester) return a.semester.localeCompare(b.semester);
      return a.course_code.localeCompare(b.course_code);
    });
  } catch (error) {
    console.error("Error in getEffectiveStudentResults:", error);
    throw error;
  }
}

export async function getResults() {
  try {
    const result = await pool.query(`
      SELECT r.*, s.name as student_name, c.course_code, c.course_name
      FROM results r
      JOIN students s ON r.student_id = s.id
      JOIN courses c ON r.course_id = c.id
      ORDER BY r.created_at DESC
    `);

    // Process each result to apply appropriate grading
    return result.rows.map((result) => {
      const gradeInfo = result.is_backlog
        ? getBacklogGradeFromMarks(result.marks)
        : getGradeFromMarks(result.marks);

      return {
        ...result,
        grade: gradeInfo.grade,
      };
    });
  } catch (error) {
    console.error("Error in getResults:", error);
    throw error;
  }
}

// Check if a backlog result can be added for a student-course combination
export async function canAddBacklogResult(studentId, courseId) {
  try {
    // First check if student is registered for this course
    const isRegistered = await isStudentRegisteredForCourse(studentId, courseId);
    if (!isRegistered) {
      return {
        canAdd: false,
        reason: "Student is not registered for this course",
      };
    }

    // Check if there's an existing result for this student-course combination
    const result = await pool.query(
      `
      SELECT * FROM results 
      WHERE student_id = $1 AND course_id = $2
      ORDER BY created_at DESC
      LIMIT 1
    `,
      [studentId, courseId]
    );

    const existingResult = result.rows[0];

    if (!existingResult) {
      // No existing result, can add normally
      return { canAdd: true };
    }

    // If existing result is a pass (marks >= 40), cannot add backlog
    if (existingResult.marks >= 40) {
      return {
        canAdd: false,
        reason: "Cannot add result for a course that has already been passed",
        existingResult,
      };
    }

    // If existing result is a fail (marks < 40), can add backlog
    return {
      canAdd: true,
      existingResult,
    };
  } catch (error) {
    console.error("Error in canAddBacklogResult:", error);
    throw error;
  }
}

export async function createResult(result) {
  try {
    // Validate input
    if (!result.student_id || !result.course_id || result.marks === undefined) {
      throw new Error("Missing required fields: student_id, course_id, marks");
    }

    // Validate marks range
    if (result.marks < 0 || result.marks > 100) {
      throw new Error("Marks must be between 0 and 100");
    }

    // Use PostgreSQL transaction to prevent race conditions
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Check if this is a valid backlog addition
      const backlogCheck = await canAddBacklogResult(result.student_id, result.course_id);

      if (!backlogCheck.canAdd) {
        throw new Error(backlogCheck.reason || "Cannot add duplicate result");
      }

      // If there's an existing failed result, this will be a backlog entry
      const isBacklog = !!backlogCheck.existingResult;

      const insertResult = await client.query(
        `
        INSERT INTO results (student_id, course_id, marks, published, is_backlog) 
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `,
        [result.student_id, result.course_id, result.marks, result.published || false, isBacklog]
      );

      await client.query("COMMIT");
      return insertResult.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    if (error.code === "23505") {
      // PostgreSQL unique violation
      throw new Error("Result already exists for this student-course combination");
    }
    console.error("Error in createResult:", error);
    throw error;
  }
}

export async function getResultById(id) {
  try {
    const result = await pool.query(
      `
      SELECT r.*, s.name as student_name, c.course_code, c.course_name
      FROM results r
      JOIN students s ON r.student_id = s.id
      JOIN courses c ON r.course_id = c.id
      WHERE r.id = $1
    `,
      [id]
    );

    if (result.rows.length > 0) {
      const resultData = result.rows[0];
      // Use appropriate grading function based on backlog status
      const gradeInfo = resultData.is_backlog
        ? getBacklogGradeFromMarks(resultData.marks)
        : getGradeFromMarks(resultData.marks);
      return {
        ...resultData,
        grade: gradeInfo.grade,
        gradePoint: gradeInfo.gradePoint,
      };
    }

    return undefined;
  } catch (error) {
    console.error("Error in getResultById:", error);
    throw error;
  }
}

export async function updateResult(id, updates) {
  try {
    // Build dynamic update query with validation
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (updates.student_id !== undefined) {
      fields.push(`student_id = $${paramCount++}`);
      values.push(updates.student_id);
    }
    if (updates.course_id !== undefined) {
      fields.push(`course_id = $${paramCount++}`);
      values.push(updates.course_id);
    }
    if (updates.marks !== undefined) {
      // Validate marks range
      if (updates.marks < 0 || updates.marks > 100) {
        throw new Error("Marks must be between 0 and 100");
      }
      fields.push(`marks = $${paramCount++}`);
      values.push(updates.marks);
    }
    if (updates.published !== undefined) {
      fields.push(`published = $${paramCount++}`);
      values.push(updates.published);
    }

    if (fields.length === 0) {
      return (await getResultById(id)) || null;
    }

    values.push(id); // Add ID as the last parameter

    const result = await pool.query(
      `UPDATE results SET ${fields.join(", ")} WHERE id = $${paramCount}`,
      values
    );

    if (result.rowCount === 0) {
      return null;
    }

    return (await getResultById(id)) || null;
  } catch (error) {
    if (error.code === "23505") {
      // PostgreSQL unique violation
      throw new Error("Result already exists for this student-course combination");
    }
    console.error("Error in updateResult:", error);
    throw error;
  }
}

export async function deleteResult(id) {
  try {
    const result = await pool.query("DELETE FROM results WHERE id = $1", [id]);
    return result.rowCount > 0;
  } catch (error) {
    console.error("Error in deleteResult:", error);
    throw error;
  }
}

// Calculate and get student CGPA
export async function getStudentCGPA(studentId) {
  try {
    const { regularResults, backlogResults } = await getStudentResultsWithBacklog(studentId);

    // Create a map to track the best result for each course, preserving backlog status
    const effectiveResults = new Map();

    // First add all regular results
    regularResults.forEach((result) => {
      effectiveResults.set(result.course_id, { ...result, is_backlog: false });
    });

    // Then override with backlog results if they are better (higher marks)
    backlogResults.forEach((result) => {
      const existingResult = effectiveResults.get(result.course_id);
      if (!existingResult || result.marks > existingResult.marks) {
        effectiveResults.set(result.course_id, { ...result, is_backlog: true });
      }
    });

    const results = Array.from(effectiveResults.values()).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      if (a.semester !== b.semester) return a.semester.localeCompare(b.semester);
      return a.course_code.localeCompare(b.course_code);
    });

    // Group results by semester
    const semesterGroups = results.reduce((acc, result) => {
      const key = `${result.year}-${result.semester}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(result);
      return acc;
    }, {});

    // Calculate SGPA for each semester using backlog-aware calculation
    const sgpas = Object.entries(semesterGroups).map(([key, semesterResults]) => {
      const [year, semester] = key.split("-");
      const sgpa = calculateSGPAWithBacklog(semesterResults);
      return {
        year: parseInt(year),
        semester,
        sgpa,
      };
    });

    // Calculate overall CGPA as the average of all semester SGPAs (RUET system)
    const cgpa =
      sgpas.length > 0
        ? Number((sgpas.reduce((sum, sem) => sum + sem.sgpa, 0) / sgpas.length).toFixed(2))
        : 0;

    return { sgpas, cgpa };
  } catch (error) {
    console.error("Error in getStudentCGPA:", error);
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

// Functions to get all possible filter values for admin pages
export async function getAllYears() {
  try {
    // Get years from both students and courses, plus standard academic years
    const studentYears = await pool.query(
      "SELECT DISTINCT current_year FROM students ORDER BY current_year"
    );

    const courseYears = await pool.query("SELECT DISTINCT year FROM courses ORDER BY year");

    // Combine all years and add standard academic years (1-4)
    const allYears = new Set();

    // Add standard academic years
    [1, 2, 3, 4].forEach((year) => allYears.add(year));

    // Add years from students
    studentYears.rows.forEach((s) => allYears.add(s.current_year));

    // Add years from courses
    courseYears.rows.forEach((c) => allYears.add(c.year));

    return Array.from(allYears).sort();
  } catch (error) {
    console.error("Error in getAllYears:", error);
    throw error;
  }
}

export async function getAllSemesters() {
  try {
    // Get semesters from both students and courses tables, plus standard semesters
    const studentSemesters = await pool.query(
      "SELECT DISTINCT current_semester FROM students ORDER BY current_semester"
    );

    const courseSemesters = await pool.query(
      "SELECT DISTINCT semester FROM courses ORDER BY semester"
    );

    // Combine all semesters and add standard semesters - only even/odd
    const allSemesters = new Set();

    ["even", "odd"].forEach((semester) => allSemesters.add(semester));

    // Add semesters from students
    studentSemesters.rows.forEach((s) => allSemesters.add(s.current_semester));

    // Add semesters from courses
    courseSemesters.rows.forEach((c) => allSemesters.add(c.semester));

    // Filter out null/undefined and sort
    return Array.from(allSemesters).filter(Boolean).sort();
  } catch (error) {
    console.error("Error in getAllSemesters:", error);
    throw error;
  }
}

export async function getAllAcademicSessions() {
  try {
    const result = await pool.query(
      "SELECT DISTINCT academic_session FROM students ORDER BY academic_session"
    );
    return result.rows.map((s) => s.academic_session);
  } catch (error) {
    console.error("Error in getAllAcademicSessions:", error);
    throw error;
  }
}

// Get all department codes for filter dropdowns
export async function getAllDepartmentCodes() {
  try {
    const result = await pool.query("SELECT DISTINCT code FROM departments ORDER BY code");
    return result.rows.map((d) => d.code);
  } catch (error) {
    console.error("Error in getAllDepartmentCodes:", error);
    throw error;
  }
}

// Get all filter options for students page
export async function getStudentFilterOptions() {
  try {
    return {
      departments: await getAllDepartmentCodes(),
      years: await getAllYears(),
      semesters: await getAllSemesters(),
      academicSessions: await getAllAcademicSessions(),
    };
  } catch (error) {
    console.error("Error in getStudentFilterOptions:", error);
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

// Get all filter options for results page
export async function getResultsFilterOptions() {
  try {
    return {
      departments: await getAllDepartmentCodes(),
      years: await getAllCourseYears(),
      semesters: await getAllCourseSemesters(),
    };
  } catch (error) {
    console.error("Error in getResultsFilterOptions:", error);
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

// Get all courses with student counts
export async function getCoursesWithStudentCounts() {
  try {
    const courses = await getCourses();
    const coursesWithCounts = await Promise.all(
      courses.map(async (course) => ({
        ...course,
        student_count: await getCourseStudentCount(course.id),
      }))
    );
    return coursesWithCounts;
  } catch (error) {
    console.error("Error in getCoursesWithStudentCounts:", error);
    throw error;
  }
}

// Get course count for a specific department
export async function getDepartmentCourseCount(departmentId) {
  try {
    const result = await pool.query(
      "SELECT COUNT(*) as count FROM courses WHERE department_id = $1",
      [departmentId]
    );
    return parseInt(result.rows[0].count) || 0;
  } catch (error) {
    console.error("Error in getDepartmentCourseCount:", error);
    throw error;
  }
}

// Get student count for a specific department
export async function getDepartmentStudentCount(departmentId) {
  try {
    const result = await pool.query(
      "SELECT COUNT(*) as count FROM students WHERE department_id = $1",
      [departmentId]
    );
    return parseInt(result.rows[0].count) || 0;
  } catch (error) {
    console.error("Error in getDepartmentStudentCount:", error);
    throw error;
  }
}

// Get all departments with course and student counts
export async function getDepartmentsWithCounts() {
  try {
    const departments = await getDepartments();
    const departmentsWithCounts = await Promise.all(
      departments.map(async (department) => ({
        ...department,
        course_count: await getDepartmentCourseCount(department.id),
        student_count: await getDepartmentStudentCount(department.id),
      }))
    );
    return departmentsWithCounts;
  } catch (error) {
    console.error("Error in getDepartmentsWithCounts:", error);
    throw error;
  }
}

// Function to promote students to next semester
export async function promoteStudentsToNextSemester(studentIds) {
  const results = { success: 0, failed: [] };

  // Use PostgreSQL transaction for data consistency
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const studentId of studentIds) {
      try {
        const student = await getStudentById(studentId);
        if (!student) {
          results.failed.push({ id: studentId, name: "Unknown", error: "Student not found" });
          continue;
        }
        let newYear = student.current_year;
        let newSemester = student.current_semester;

        // Determine next semester
        if (student.current_semester === "odd") {
          newSemester = "even";
        } else if (student.current_semester === "even") {
          newYear = student.current_year + 1;
          newSemester = "odd";
        } else {
          // Handle invalid semester values
          results.failed.push({
            id: studentId,
            name: student.name,
            error: `Invalid current semester: ${student.current_semester}`,
          });
          continue;
        }

        // Don't promote beyond 4th year
        if (newYear > 4) {
          results.failed.push({
            id: studentId,
            name: student.name,
            error: "Already in final year",
          });
          continue;
        }

        // Update student
        const updateResult = await client.query(
          "UPDATE students SET current_year = $1, current_semester = $2 WHERE id = $3",
          [newYear, newSemester, studentId]
        );

        if (updateResult.rowCount === 0) {
          results.failed.push({ id: studentId, name: student.name, error: "Update failed" });
        } else {
          results.success++;
        }
      } catch (error) {
        console.error(`Failed to promote student ${studentId}:`, error);
        const student = await getStudentById(studentId);
        results.failed.push({
          id: studentId,
          name: student?.name || "Unknown",
          error: "Database error",
        });
      }
    }

    await client.query("COMMIT");
    return results;
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Transaction failed during student promotion:", error);
    throw new Error("Bulk promotion failed. No students were promoted.");
  } finally {
    client.release();
  }
}

// Function to take students down a semester
export async function takeStudentsDownSemester(studentIds) {
  const results = {
    success: 0,
    failed: [],
  };

  // Use PostgreSQL transaction for data consistency
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const studentId of studentIds) {
      try {
        const student = await getStudentById(studentId);
        if (!student) {
          results.failed.push({
            id: studentId,
            name: "Unknown",
            roll_number: "Unknown",
            error: "Student not found",
          });
          continue;
        }

        let newYear = student.current_year;
        let newSemester = student.current_semester;

        // Determine previous semester
        if (student.current_semester === "even") {
          newSemester = "odd";
        } else if (student.current_semester === "odd") {
          newYear = student.current_year - 1;
          newSemester = "even";
        } else {
          // Handle invalid semester values
          results.failed.push({
            id: studentId,
            name: student.name,
            roll_number: student.roll_number,
            error: `Invalid current semester: ${student.current_semester}`,
          });
          continue;
        }

        // Don't take below 1st year
        if (newYear < 1) {
          results.failed.push({
            id: studentId,
            name: student.name,
            roll_number: student.roll_number,
            error: "Already in first year",
          });
          continue;
        }

        // Update student
        const updateResult = await client.query(
          "UPDATE students SET current_year = $1, current_semester = $2 WHERE id = $3",
          [newYear, newSemester, studentId]
        );

        if (updateResult.rowCount === 0) {
          results.failed.push({
            id: studentId,
            name: student.name,
            roll_number: student.roll_number,
            error: "Update failed",
          });
        } else {
          results.success++;
        }
      } catch (error) {
        console.error(`Failed to take down student ${studentId}:`, error);
        const student = await getStudentById(studentId);
        results.failed.push({
          id: studentId,
          name: student?.name || "Unknown",
          roll_number: student?.roll_number || "Unknown",
          error: "Database error",
        });
      }
    }

    await client.query("COMMIT");
    return results;
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Transaction failed during student demotion:", error);
    throw new Error("Bulk demotion failed. No students were demoted.");
  } finally {
    client.release();
  }
}

// Function to get passed exams count for a student
export async function getStudentPassedExamsCount(studentId) {
  try {
    // Validate input
    if (!studentId || isNaN(parseInt(studentId))) {
      throw new Error("Valid student ID is required");
    }

    // Get all registered courses for the student
    const registeredCourses = await pool.query(
      `
      SELECT cr.course_id
      FROM student_courses cr
      WHERE cr.student_id = $1
    `,
      [studentId]
    );

    const total = registeredCourses.rows.length;

    // Get effective results (considering backlog improvements) and count passed ones
    const effectiveResults = await getEffectiveStudentResults(studentId);
    const passed = effectiveResults.filter((result) => result.marks >= 40).length;

    return { passed, total };
  } catch (error) {
    console.error("Error in getStudentPassedExamsCount:", error);
    throw error;
  }
}

// Get published results count for a student
export async function getStudentPublishedResultsCount(studentId) {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) as count 
       FROM results 
       WHERE student_id = $1 AND published = true`,
      [studentId]
    );
    return parseInt(result.rows[0].count) || 0;
  } catch (error) {
    console.error("Error in getStudentPublishedResultsCount:", error);
    throw error;
  }
}

// Get total credits for a student
export async function getStudentTotalCredits(studentId) {
  try {
    const result = await pool.query(
      `SELECT SUM(c.credits) as total
       FROM student_courses cr
       JOIN courses c ON cr.course_id = c.id
       WHERE cr.student_id = $1`,
      [studentId]
    );
    return parseInt(result.rows[0].total) || 0;
  } catch (error) {
    console.error("Error in getStudentTotalCredits:", error);
    throw error;
  }
}

// Get admin statistics
export async function getAdminStats() {
  try {
    const totalStudents = await pool.query("SELECT COUNT(*) as count FROM students");
    const totalCourses = await pool.query("SELECT COUNT(*) as count FROM courses");
    const totalDepartments = await pool.query("SELECT COUNT(*) as count FROM departments");
    const publishedResults = await pool.query(
      "SELECT COUNT(*) as count FROM results WHERE published = true"
    );

    return {
      totalStudents: parseInt(totalStudents.rows[0].count),
      totalCourses: parseInt(totalCourses.rows[0].count),
      totalDepartments: parseInt(totalDepartments.rows[0].count),
      publishedResults: parseInt(publishedResults.rows[0].count),
    };
  } catch (error) {
    console.error("Error in getAdminStats:", error);
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
