import { pool, executeWithRetry } from "../postgres";
import { getGradeFromMarks, getBacklogGradeFromMarks, calculateSGPAWithBacklog } from "../utils";
import { isStudentRegisteredForCourse } from "./registrations";
import { getAllDepartmentCodes } from "./departments";
import { getAllCourseYears, getAllCourseSemesters } from "./courses";
import { isStudentCourseRegisteredInBacklogGroup } from "./backlog";

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

    const allResults = result.rows.map((row) => ({
      ...row,
      credits: parseFloat(row.credits || 0),
      cgpa_weight: parseFloat(row.cgpa_weight || 0),
      year: parseInt(row.year || 1),
      marks: parseFloat(row.marks || 0),
    }));

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

    console.log(`Semester groups:`, Object.keys(semesterGroups));

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

export async function getResults() {
  try {
    const result = await executeWithRetry(async () => {
      return await pool.query(`
        SELECT r.*, s.name as student_name, c.course_code, c.course_name
        FROM results r
        JOIN students s ON r.student_id = s.id
        JOIN courses c ON r.course_id = c.id
        ORDER BY r.created_at DESC
      `);
    });

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

    // Provide more specific error information for connection issues
    if (error.code === "ECONNRESET" || error.code === "ETIMEDOUT") {
      console.error(
        "Database connection issue detected. This may be due to network latency or Neon PostgreSQL connection limits."
      );
    }

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
    let client;
    try {
      client = await pool.connect();
    } catch (connectionError) {
      console.error("Database connection failed:", connectionError);
      throw new Error("Database connection failed. Please check your database configuration.");
    }

    try {
      await client.query("BEGIN");

      // Check if this is a valid backlog addition
      const backlogCheck = await canAddBacklogResult(result.student_id, result.course_id);

      if (!backlogCheck.canAdd) {
        throw new Error(backlogCheck.reason || "Cannot add duplicate result");
      }

      // If there's an existing failed result, this will be a backlog entry
      const isBacklog = !!backlogCheck.existingResult;

      // If this is a backlog result, validate group registration
      if (isBacklog) {
        if (!result.backlog_group_id) {
          throw new Error("Backlog group ID is required for backlog results");
        }

        const isRegisteredInGroup = await isStudentCourseRegisteredInBacklogGroup(
          result.backlog_group_id,
          result.student_id,
          result.course_id
        );

        if (!isRegisteredInGroup) {
          throw new Error(
            "Student is not registered for this course in the selected backlog group"
          );
        }
      }

      const insertResult = await client.query(
        `
        INSERT INTO results (student_id, course_id, marks, published, is_backlog, backlog_group_id) 
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `,
        [
          result.student_id,
          result.course_id,
          result.marks,
          result.published || false,
          isBacklog,
          isBacklog ? result.backlog_group_id : null,
        ]
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
      // PostgreSQL unique violation - indicates migration hasn't been applied yet
      throw new Error(
        "Database migration required: The unique constraint on results table needs to be removed to allow backlog entries. Please run the migration script or restart the application."
      );
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
    if (updates.backlog_group_id !== undefined) {
      fields.push(`backlog_group_id = $${paramCount++}`);
      values.push(updates.backlog_group_id);
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

// Get all filter options for results page
export async function getResultsFilterOptions() {
  try {
    // Get unique series from students' academic_session
    const seriesResult = await pool.query(`
      SELECT DISTINCT SUBSTRING(academic_session FROM 1 FOR 4) as series
      FROM students
      WHERE academic_session IS NOT NULL
      ORDER BY series DESC
    `);
    const series = seriesResult.rows.map((row) => parseInt(row.series));

    return {
      departments: await getAllDepartmentCodes(),
      years: await getAllCourseYears(),
      semesters: await getAllCourseSemesters(),
      series,
    };
  } catch (error) {
    console.error("Error in getResultsFilterOptions:", error);
    throw error;
  }
}
