import { pool } from "../postgres";

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
