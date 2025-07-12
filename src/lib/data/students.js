import { pool } from "../postgres";

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
