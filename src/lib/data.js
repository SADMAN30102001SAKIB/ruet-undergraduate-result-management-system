import { db } from "./database";
import { getGradeFromMarks, getBacklogGradeFromMarks, calculateSGPAWithBacklog } from "./utils";

// Department operations
export function getDepartments() {
  try {
    return db.prepare("SELECT * FROM departments ORDER BY name").all();
  } catch (error) {
    console.error("Error in getDepartments:", error);
    throw error;
  }
}

export function createDepartment(name, code) {
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

    const stmt = db.prepare("INSERT INTO departments (name, code) VALUES (?, ?)");
    const result = stmt.run(name.trim(), code.trim().toUpperCase());
    const department = db
      .prepare("SELECT * FROM departments WHERE id = ?")
      .get(result.lastInsertRowid);
    return department;
  } catch (error) {
    console.error("Error in createDepartment:", error);
    throw error;
  }
}

export function getDepartmentById(id) {
  try {
    return db.prepare("SELECT * FROM departments WHERE id = ?").get(id);
  } catch (error) {
    console.error("Error in getDepartmentById:", error);
    throw error;
  }
}

export function updateDepartment(id, updates) {
  try {
    // Allow valid field updates, exclude system fields and check for undefined/null
    const allowedFields = ["name", "code"];
    const fields = Object.keys(updates).filter(
      (key) => allowedFields.includes(key) && updates[key] !== undefined && updates[key] !== null
    );
    const values = fields.map((field) => updates[field]);
    const setClause = fields.map((field) => `${field} = ?`).join(", ");

    if (fields.length === 0) {
      return getDepartmentById(id);
    }

    const stmt = db.prepare(`UPDATE departments SET ${setClause} WHERE id = ?`);
    const result = stmt.run(...values, id);

    if (result.changes === 0) {
      return null;
    }

    return getDepartmentById(id);
  } catch (error) {
    console.error("Error in updateDepartment:", error);
    throw error;
  }
}

export function deleteDepartment(id) {
  try {
    // Check if department has students or courses
    const studentsCount = db
      .prepare("SELECT COUNT(*) as count FROM students WHERE department_id = ?")
      .get(id);
    const coursesCount = db
      .prepare("SELECT COUNT(*) as count FROM courses WHERE department_id = ?")
      .get(id);

    if (studentsCount.count > 0 || coursesCount.count > 0) {
      throw new Error("Cannot delete department with existing students or courses");
    }

    const stmt = db.prepare("DELETE FROM departments WHERE id = ?");
    const result = stmt.run(id);
    return result.changes > 0;
  } catch (error) {
    console.error("Error in deleteDepartment:", error);
    throw error;
  }
}

// Student operations
export function getStudents() {
  try {
    return db
      .prepare(
        `
      SELECT s.*, d.name as department_name, d.code as department_code 
      FROM students s 
      JOIN departments d ON s.department_id = d.id 
      ORDER BY s.name
    `
      )
      .all();
  } catch (error) {
    console.error("Error in getStudents:", error);
    throw error;
  }
}

export function getStudentById(id) {
  try {
    return db
      .prepare(
        `
      SELECT s.*, d.name as department_name, d.code as department_code 
      FROM students s 
      JOIN departments d ON s.department_id = d.id 
      WHERE s.id = ?
    `
      )
      .get(id);
  } catch (error) {
    console.error("Error in getStudentById:", error);
    throw error;
  }
}

export function createStudent(student) {
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

    const stmt = db.prepare(`
      INSERT INTO students 
      (name, parent_name, phone, roll_number, registration_number, department_id, academic_session, current_year, current_semester) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      student.name,
      student.parent_name,
      student.phone,
      student.roll_number,
      student.registration_number,
      student.department_id,
      student.academic_session,
      student.current_year,
      student.current_semester
    );
    return getStudentById(result.lastInsertRowid);
  } catch (error) {
    console.error("Error in createStudent:", error);
    throw error;
  }
}

export function updateStudent(id, updates) {
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
    const setClause = fields.map((field) => `${field} = ?`).join(", ");

    if (fields.length === 0) {
      return getStudentById(id);
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

    const stmt = db.prepare(`UPDATE students SET ${setClause} WHERE id = ?`);
    const result = stmt.run(...values, id);

    if (result.changes === 0) {
      return null; // Student not found
    }

    return getStudentById(id);
  } catch (error) {
    console.error("Error in updateStudent:", error);
    throw error;
  }
}

export function deleteStudent(id) {
  try {
    // Check if student exists
    const student = db.prepare("SELECT id FROM students WHERE id = ?").get(id);
    if (!student) {
      return { success: false, error: "Student not found" };
    }

    // Check if student has any results
    const hasResults = db
      .prepare("SELECT COUNT(*) as count FROM results WHERE student_id = ?")
      .get(id);

    if (hasResults.count > 0) {
      return { success: false, error: "Cannot delete student with existing results" };
    }

    // Use transaction to ensure data consistency
    const transaction = db.transaction(() => {
      // Delete related records first
      db.prepare("DELETE FROM results WHERE student_id = ?").run(id);
      db.prepare("DELETE FROM course_registrations WHERE student_id = ?").run(id);
      db.prepare("DELETE FROM semester_progress WHERE student_id = ?").run(id);

      // Delete the student
      const result = db.prepare("DELETE FROM students WHERE id = ?").run(id);
      return result.changes > 0;
    });

    const deleted = transaction();
    return { success: deleted };
  } catch (error) {
    console.error("Error in deleteStudent:", error);
    throw error;
  }
}

// Course operations
export function getCourses() {
  try {
    return db
      .prepare(
        `
      SELECT c.*, d.name as department_name, d.code as department_code 
      FROM courses c 
      JOIN departments d ON c.department_id = d.id 
      ORDER BY d.name, c.year, c.semester, c.course_code
    `
      )
      .all();
  } catch (error) {
    console.error("Error in getCourses:", error);
    throw error;
  }
}

export function getCoursesByDepartment(departmentId) {
  try {
    return db
      .prepare(
        `
      SELECT c.*, d.name as department_name, d.code as department_code 
      FROM courses c 
      JOIN departments d ON c.department_id = d.id 
      WHERE c.department_id = ?
      ORDER BY c.year, c.semester, c.course_code
    `
      )
      .all(departmentId);
  } catch (error) {
    console.error("Error in getCoursesByDepartment:", error);
    throw error;
  }
}

export function createCourse(course) {
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

    const stmt = db.prepare(`
      INSERT INTO courses 
      (course_code, course_name, department_id, year, semester, cgpa_weight, credits) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      course.course_code,
      course.course_name,
      course.department_id,
      course.year,
      course.semester,
      course.cgpa_weight,
      course.credits
    );
    return db
      .prepare(
        `
      SELECT c.*, d.name as department_name 
      FROM courses c 
      JOIN departments d ON c.department_id = d.id 
      WHERE c.id = ?
    `
      )
      .get(result.lastInsertRowid);
  } catch (error) {
    console.error("Error in createCourse:", error);
    throw error;
  }
}

export function deleteCourse(courseId) {
  try {
    // Check if there are any registrations or results for this course
    const registrations = db
      .prepare("SELECT COUNT(*) as count FROM course_registrations WHERE course_id = ?")
      .get(courseId);

    const results = db
      .prepare("SELECT COUNT(*) as count FROM results WHERE course_id = ?")
      .get(courseId);

    if (registrations.count > 0 || results.count > 0) {
      return false; // Cannot delete course with existing data
    }

    const stmt = db.prepare("DELETE FROM courses WHERE id = ?");
    const result = stmt.run(courseId);
    return result.changes > 0;
  } catch (error) {
    console.error("Error deleting course:", error);
    return false;
  }
}

export function getCourseById(courseId) {
  try {
    return db
      .prepare(
        `
      SELECT c.*, d.name as department_name 
      FROM courses c 
      JOIN departments d ON c.department_id = d.id 
      WHERE c.id = ?
    `
      )
      .get(courseId);
  } catch (error) {
    console.error("Error fetching course:", error);
    return null;
  }
}

export function updateCourse(courseId, updates) {
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
    const setClause = fields.map((field) => `${field} = ?`).join(", ");

    if (fields.length === 0) {
      return getCourseById(courseId);
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

    const stmt = db.prepare(`UPDATE courses SET ${setClause} WHERE id = ?`);
    const result = stmt.run(...values, courseId);

    if (result.changes === 0) {
      return null;
    }

    return getCourseById(courseId);
  } catch (error) {
    console.error("Error updating course:", error);
    throw error;
  }
}

// Course registration operations
export function getStudentRegistrations(studentId, currentYear, currentSemester) {
  try {
    let query = `
      SELECT cr.*, c.course_code, c.course_name, c.year, c.semester, c.credits, c.cgpa_weight
      FROM course_registrations cr
      JOIN courses c ON cr.course_id = c.id
      WHERE cr.student_id = ?`;

    const params = [studentId];

    // If current year and semester are provided, filter by them
    if (currentYear !== undefined && currentSemester !== undefined) {
      query += ` AND c.year = ? AND c.semester = ?`;
      params.push(currentYear, currentSemester);
    }

    query += ` ORDER BY c.year, c.semester, c.course_code`;

    return db.prepare(query).all(...params);
  } catch (error) {
    console.error("Error in getStudentRegistrations:", error);
    throw error;
  }
}

export function getAvailableCoursesForStudent(
  studentId,
  departmentId,
  currentYear,
  currentSemester
) {
  try {
    return db
      .prepare(
        `
      SELECT c.*, d.name as department_name 
      FROM courses c 
      JOIN departments d ON c.department_id = d.id 
      WHERE c.department_id = ? 
        AND c.year = ?
        AND c.semester = ?
        AND c.id NOT IN (
          SELECT course_id FROM course_registrations WHERE student_id = ?
        )
      ORDER BY c.course_code
    `
      )
      .all(departmentId, currentYear, currentSemester, studentId);
  } catch (error) {
    console.error("Error in getAvailableCoursesForStudent:", error);
    throw error;
  }
}

export function registerStudentForCourse(studentId, courseId) {
  try {
    // Validate inputs
    if (!studentId || !courseId || isNaN(parseInt(studentId)) || isNaN(parseInt(courseId))) {
      throw new Error("Valid student ID and course ID are required");
    }

    // Check if already registered
    if (isStudentRegisteredForCourse(studentId, courseId)) {
      throw new Error("Student is already registered for this course");
    }

    // Check if student and course exist
    const student = getStudentById(studentId);
    if (!student) {
      throw new Error("Student not found");
    }

    const course = getCourseById(courseId);
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

    const stmt = db.prepare(
      "INSERT INTO course_registrations (student_id, course_id) VALUES (?, ?)"
    );
    const result = stmt.run(studentId, courseId);
    return db
      .prepare("SELECT * FROM course_registrations WHERE id = ?")
      .get(result.lastInsertRowid);
  } catch (error) {
    console.error("Error in registerStudentForCourse:", error);
    throw error;
  }
}

export function unregisterStudentFromCourse(studentId, courseId) {
  try {
    // Validate inputs
    if (!studentId || !courseId || isNaN(parseInt(studentId)) || isNaN(parseInt(courseId))) {
      throw new Error("Valid student ID and course ID are required");
    }

    const stmt = db.prepare(
      "DELETE FROM course_registrations WHERE student_id = ? AND course_id = ?"
    );
    const result = stmt.run(studentId, courseId);

    return result.changes > 0;
  } catch (error) {
    console.error("Error in unregisterStudentFromCourse:", error);
    throw error;
  }
}

export function isStudentRegisteredForCourse(studentId, courseId) {
  try {
    const registration = db
      .prepare("SELECT id FROM course_registrations WHERE student_id = ? AND course_id = ?")
      .get(studentId, courseId);
    return !!registration;
  } catch (error) {
    console.error("Error in isStudentRegisteredForCourse:", error);
    throw error;
  }
}

// Result operations
export function getStudentResults(studentId) {
  try {
    return db
      .prepare(
        `
      SELECT r.*, c.course_code, c.course_name, c.year, c.semester, c.credits, c.cgpa_weight
      FROM results r
      JOIN courses c ON r.course_id = c.id
      WHERE r.student_id = ? AND r.published = 1
      ORDER BY c.year, c.semester, c.course_code
    `
      )
      .all(studentId);
  } catch (error) {
    console.error("Error in getStudentResults:", error);
    throw error;
  }
}

// Get student results separated into regular and backlog
export function getStudentResultsWithBacklog(studentId) {
  try {
    const allResults = db
      .prepare(
        `
      SELECT r.*, c.course_code, c.course_name, c.year, c.semester, c.credits, c.cgpa_weight
      FROM results r
      JOIN courses c ON r.course_id = c.id
      WHERE r.student_id = ? AND r.published = 1
      ORDER BY r.is_backlog ASC, c.year, c.semester, c.course_code
    `
      )
      .all(studentId);

    const regularResults = allResults.filter((r) => !r.is_backlog);
    const backlogResults = allResults.filter((r) => r.is_backlog);

    return { regularResults, backlogResults };
  } catch (error) {
    console.error("Error in getStudentResultsWithBacklog:", error);
    throw error;
  }
}

// Get effective results for CGPA calculation (backlog results override failed originals)
export function getEffectiveStudentResults(studentId) {
  try {
    const { regularResults, backlogResults } = getStudentResultsWithBacklog(studentId);

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

export function getResults() {
  try {
    const results = db
      .prepare(
        `
      SELECT r.*, s.name as student_name, c.course_code, c.course_name
      FROM results r
      JOIN students s ON r.student_id = s.id
      JOIN courses c ON r.course_id = c.id
      ORDER BY r.created_at DESC
    `
      )
      .all();

    // Process each result to apply appropriate grading
    return results.map((result) => {
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
export function canAddBacklogResult(studentId, courseId) {
  try {
    // First check if student is registered for this course
    const isRegistered = isStudentRegisteredForCourse(studentId, courseId);
    if (!isRegistered) {
      return {
        canAdd: false,
        reason: "Student is not registered for this course",
      };
    }

    // Check if there's an existing result for this student-course combination
    const existingResult = db
      .prepare(
        `
        SELECT * FROM results 
        WHERE student_id = ? AND course_id = ?
        ORDER BY created_at DESC
        LIMIT 1
        `
      )
      .get(studentId, courseId);

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

export function createResult(result) {
  try {
    // Validate input
    if (!result.student_id || !result.course_id || result.marks === undefined) {
      throw new Error("Missing required fields: student_id, course_id, marks");
    }

    // Validate marks range
    if (result.marks < 0 || result.marks > 100) {
      throw new Error("Marks must be between 0 and 100");
    }

    // Use database transaction to prevent race conditions
    const transaction = db.transaction(() => {
      // Check if this is a valid backlog addition
      const backlogCheck = canAddBacklogResult(result.student_id, result.course_id);

      if (!backlogCheck.canAdd) {
        throw new Error(backlogCheck.reason || "Cannot add duplicate result");
      }

      // If there's an existing failed result, this will be a backlog entry
      const isBacklog = !!backlogCheck.existingResult;

      const stmt = db.prepare(`
        INSERT INTO results (student_id, course_id, marks, published, is_backlog) 
        VALUES (?, ?, ?, ?, ?)
      `);
      const insertResult = stmt.run(
        result.student_id,
        result.course_id,
        result.marks,
        result.published ? 1 : 0,
        isBacklog ? 1 : 0
      );

      return db.prepare("SELECT * FROM results WHERE id = ?").get(insertResult.lastInsertRowid);
    });

    return transaction();
  } catch (error) {
    console.error("Error in createResult:", error);
    throw error;
  }
}

export function getResultById(id) {
  try {
    const result = db
      .prepare(
        `
      SELECT r.*, s.name as student_name, c.course_code, c.course_name
      FROM results r
      JOIN students s ON r.student_id = s.id
      JOIN courses c ON r.course_id = c.id
      WHERE r.id = ?
    `
      )
      .get(id);

    if (result) {
      // Use appropriate grading function based on backlog status
      const gradeInfo = result.is_backlog
        ? getBacklogGradeFromMarks(result.marks)
        : getGradeFromMarks(result.marks);
      return {
        ...result,
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

export function updateResult(id, updates) {
  try {
    // Build dynamic update query with validation
    const fields = [];
    const values = [];

    if (updates.student_id !== undefined) {
      fields.push("student_id = ?");
      values.push(updates.student_id);
    }
    if (updates.course_id !== undefined) {
      fields.push("course_id = ?");
      values.push(updates.course_id);
    }
    if (updates.marks !== undefined) {
      // Validate marks range
      if (updates.marks < 0 || updates.marks > 100) {
        throw new Error("Marks must be between 0 and 100");
      }
      fields.push("marks = ?");
      values.push(updates.marks);
    }
    if (updates.published !== undefined) {
      fields.push("published = ?");
      values.push(updates.published ? 1 : 0);
    }

    if (fields.length === 0) {
      return getResultById(id) || null;
    }

    const stmt = db.prepare(`UPDATE results SET ${fields.join(", ")} WHERE id = ?`);
    const result = stmt.run(...values, id);

    if (result.changes === 0) {
      return null;
    }

    return getResultById(id) || null;
  } catch (error) {
    console.error("Error in updateResult:", error);
    throw error;
  }
}

export function deleteResult(id) {
  try {
    const stmt = db.prepare("DELETE FROM results WHERE id = ?");
    const result = stmt.run(id);
    return result.changes > 0;
  } catch (error) {
    console.error("Error in deleteResult:", error);
    throw error;
  }
}

// Calculate and get student CGPA
export function getStudentCGPA(studentId) {
  try {
    const { regularResults, backlogResults } = getStudentResultsWithBacklog(studentId);

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
export function getRegisteredCoursesForStudent(studentId, filters = {}) {
  try {
    let query = `
      SELECT c.*, d.name as department_name, d.code as department_code,
             r.marks, r.published, r.is_backlog,
             CASE WHEN r.id IS NULL THEN 0 ELSE 1 END as has_result
      FROM courses c 
      JOIN departments d ON c.department_id = d.id 
      JOIN course_registrations cr ON c.id = cr.course_id
      LEFT JOIN results r ON c.id = r.course_id AND r.student_id = ?
        AND r.id = (
          SELECT r2.id FROM results r2 
          WHERE r2.course_id = c.id AND r2.student_id = ?
          ORDER BY r2.marks DESC, r2.created_at DESC 
          LIMIT 1
        )
      WHERE cr.student_id = ?
    `;

    const params = [studentId, studentId, studentId];

    // Apply filters if provided
    if (filters.departmentId) {
      query += ` AND c.department_id = ?`;
      params.push(parseInt(filters.departmentId));
    }

    if (filters.year) {
      query += ` AND c.year = ?`;
      params.push(parseInt(filters.year));
    }

    if (filters.semester) {
      query += ` AND c.semester = ?`;
      params.push(filters.semester);
    }

    query += ` ORDER BY c.year, c.semester, c.course_code`;

    return db.prepare(query).all(...params);
  } catch (error) {
    console.error("Error in getRegisteredCoursesForStudent:", error);
    throw error;
  }
}

// Functions to get all possible filter values for admin pages
export function getAllYears() {
  try {
    // Get years from both students and courses tables, plus standard academic years
    const studentYears = db
      .prepare("SELECT DISTINCT current_year FROM students ORDER BY current_year")
      .all();

    const courseYears = db.prepare("SELECT DISTINCT year FROM courses ORDER BY year").all();

    // Combine all years and add standard academic years (1-4)
    const allYears = new Set();

    // Add standard academic years
    [1, 2, 3, 4].forEach((year) => allYears.add(year));

    // Add years from students
    studentYears.forEach((s) => allYears.add(s.current_year));

    // Add years from courses
    courseYears.forEach((c) => allYears.add(c.year));

    return Array.from(allYears).sort();
  } catch (error) {
    console.error("Error in getAllYears:", error);
    throw error;
  }
}

export function getAllSemesters() {
  // Get semesters from both students and courses tables, plus standard semesters
  const studentSemesters = db
    .prepare("SELECT DISTINCT current_semester FROM students ORDER BY current_semester")
    .all();

  const courseSemesters = db
    .prepare("SELECT DISTINCT semester FROM courses ORDER BY semester")
    .all();

  // Combine all semesters and add standard semesters (only even/odd)
  const allSemesters = new Set();

  // Add standard semesters - only even and odd
  ["even", "odd"].forEach((semester) => allSemesters.add(semester));

  // Add semesters from students
  studentSemesters.forEach((s) => allSemesters.add(s.current_semester));

  // Add semesters from courses
  courseSemesters.forEach((c) => allSemesters.add(c.semester));

  // Filter out null/undefined and sort
  return Array.from(allSemesters).filter(Boolean).sort();
}

export function getAllAcademicSessions() {
  const sessions = db
    .prepare("SELECT DISTINCT academic_session FROM students ORDER BY academic_session")
    .all();
  return sessions.map((s) => s.academic_session);
}

// Get all department codes for filter dropdowns
export function getAllDepartmentCodes() {
  const departments = db.prepare("SELECT DISTINCT code FROM departments ORDER BY code").all();
  return departments.map((d) => d.code);
}

// Get all filter options for students page
export function getStudentFilterOptions() {
  return {
    departments: getAllDepartmentCodes(),
    years: getAllYears(),
    semesters: getAllSemesters(),
    academicSessions: getAllAcademicSessions(),
  };
}

// Get all course years and semesters for results page filtering
export function getAllCourseYears() {
  const courseYears = db.prepare("SELECT DISTINCT year FROM courses ORDER BY year").all();

  // Combine with standard academic years to ensure completeness
  const allYears = new Set();
  [1, 2, 3, 4].forEach((year) => allYears.add(year));
  courseYears.forEach((c) => allYears.add(c.year));

  return Array.from(allYears).sort();
}

export function getAllCourseSemesters() {
  const courseSemesters = db
    .prepare("SELECT DISTINCT semester FROM courses ORDER BY semester")
    .all();

  // Combine with standard semesters to ensure completeness (only even/odd)
  const allSemesters = new Set();
  ["even", "odd"].forEach((semester) => allSemesters.add(semester));
  courseSemesters.forEach((c) => allSemesters.add(c.semester));

  return Array.from(allSemesters).filter(Boolean).sort();
}

// Get all filter options for results page
export function getResultsFilterOptions() {
  return {
    departments: getAllDepartmentCodes(),
    years: getAllCourseYears(),
    semesters: getAllCourseSemesters(),
  };
}

// Get student count for a specific course
export function getCourseStudentCount(courseId) {
  const result = db
    .prepare("SELECT COUNT(*) as count FROM course_registrations WHERE course_id = ?")
    .get(courseId);
  return result?.count || 0;
}

// Get all courses with student counts
export function getCoursesWithStudentCounts() {
  const courses = getCourses();
  return courses.map((course) => ({
    ...course,
    student_count: getCourseStudentCount(course.id),
  }));
}

// Get course count for a specific department
export function getDepartmentCourseCount(departmentId) {
  const result = db
    .prepare("SELECT COUNT(*) as count FROM courses WHERE department_id = ?")
    .get(departmentId);
  return result?.count || 0;
}

// Get student count for a specific department
export function getDepartmentStudentCount(departmentId) {
  const result = db
    .prepare("SELECT COUNT(*) as count FROM students WHERE department_id = ?")
    .get(departmentId);
  return result?.count || 0;
}

// Get all departments with course and student counts
export function getDepartmentsWithCounts() {
  const departments = getDepartments();
  return departments.map((department) => ({
    ...department,
    course_count: getDepartmentCourseCount(department.id),
    student_count: getDepartmentStudentCount(department.id),
  }));
}

// Function to promote students to next semester
export function promoteStudentsToNextSemester(studentIds) {
  const results = { success: 0, failed: [] };

  // Use transaction for data consistency
  const transaction = db.transaction(() => {
    for (const studentId of studentIds) {
      try {
        const student = getStudentById(studentId);
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
        const stmt = db.prepare(
          "UPDATE students SET current_year = ?, current_semester = ? WHERE id = ?"
        );
        const updateResult = stmt.run(newYear, newSemester, studentId);

        if (updateResult.changes === 0) {
          results.failed.push({ id: studentId, name: student.name, error: "Update failed" });
        } else {
          results.success++;
        }
      } catch (error) {
        console.error(`Failed to promote student ${studentId}:`, error);
        const student = getStudentById(studentId);
        results.failed.push({
          id: studentId,
          name: student?.name || "Unknown",
          error: "Database error",
        });
      }
    }
  });

  try {
    transaction();
    return results;
  } catch (error) {
    console.error("Transaction failed during student promotion:", error);
    throw new Error("Bulk promotion failed. No students were promoted.");
  }
}

// Function to take students down a semester
export function takeStudentsDownSemester(studentIds) {
  const results = {
    success: 0,
    failed: [],
  };

  // Use transaction for data consistency
  const transaction = db.transaction(() => {
    for (const studentId of studentIds) {
      try {
        const student = getStudentById(studentId);
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
        const stmt = db.prepare(
          "UPDATE students SET current_year = ?, current_semester = ? WHERE id = ?"
        );
        const updateResult = stmt.run(newYear, newSemester, studentId);

        if (updateResult.changes === 0) {
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
        const student = getStudentById(studentId);
        results.failed.push({
          id: studentId,
          name: student?.name || "Unknown",
          roll_number: student?.roll_number || "Unknown",
          error: "Database error",
        });
      }
    }
  });

  try {
    transaction();
    return results;
  } catch (error) {
    console.error("Transaction failed during student demotion:", error);
    throw new Error("Bulk demotion failed. No students were demoted.");
  }
}

// Function to get passed exams count for a student
export function getStudentPassedExamsCount(studentId) {
  try {
    // Validate input
    if (!studentId || isNaN(parseInt(studentId))) {
      throw new Error("Valid student ID is required");
    }

    // Get all registered courses for the student
    const registeredCourses = db
      .prepare(
        `
        SELECT cr.course_id
        FROM course_registrations cr
        WHERE cr.student_id = ?
        `
      )
      .all(studentId);

    const total = registeredCourses.length;

    // Get effective results (considering backlog improvements) and count passed ones
    const effectiveResults = getEffectiveStudentResults(studentId);
    const passed = effectiveResults.filter((result) => result.marks >= 40).length;

    return { passed, total };
  } catch (error) {
    console.error("Error in getStudentPassedExamsCount:", error);
    throw error;
  }
}

// Function to validate course unregistration business logic
export function canUnregisterStudentFromCourse(studentId, courseId) {
  try {
    // Validate inputs
    if (!studentId || !courseId || isNaN(parseInt(studentId)) || isNaN(parseInt(courseId))) {
      return { canUnregister: false, error: "Valid student ID and course ID are required" };
    }

    // Check if student is registered for this course
    if (!isStudentRegisteredForCourse(studentId, courseId)) {
      return { canUnregister: false, error: "Student is not registered for this course" };
    }

    // Check if student has a published result for this course
    const result = db
      .prepare("SELECT id FROM results WHERE student_id = ? AND course_id = ? AND published = 1")
      .get(studentId, courseId);

    if (result) {
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
