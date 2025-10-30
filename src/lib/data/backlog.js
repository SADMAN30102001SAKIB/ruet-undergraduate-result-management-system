import { pool } from "../postgres";

// Backlog group operations
export async function createBacklogGroup(name, courseSelections) {
  try {
    // Start transaction
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Create the backlog group
      const groupResult = await client.query(
        "INSERT INTO backlog_groups (name, is_open, created_at) VALUES ($1, false, NOW()) RETURNING id",
        [name]
      );

      const groupId = groupResult.rows[0].id;

      // Insert all selected courses for this group
      const courseValues = courseSelections
        .map((selection) => `(${groupId}, ${selection.studentId}, ${selection.courseId}, false)`)
        .join(", ");

      if (courseValues) {
        await client.query(`
          INSERT INTO backlog_group_courses (group_id, student_id, course_id, is_registered)
          VALUES ${courseValues}
        `);
      }

      await client.query("COMMIT");
      return { success: true, groupId };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error in createBacklogGroup:", error);
    throw error;
  }
}

export async function addToBacklogGroup(groupId, courseSelections) {
  try {
    // Start transaction
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Check if the group exists
      const groupCheck = await client.query("SELECT id FROM backlog_groups WHERE id = $1", [
        groupId,
      ]);

      if (groupCheck.rows.length === 0) {
        throw new Error("Backlog group not found");
      }

      // Insert selected courses, but avoid duplicates
      for (const selection of courseSelections) {
        // Check if this student-course combination already exists in the group
        const existingCheck = await client.query(
          "SELECT 1 FROM backlog_group_courses WHERE group_id = $1 AND student_id = $2 AND course_id = $3 LIMIT 1",
          [groupId, selection.studentId, selection.courseId]
        );

        // Only insert if it doesn't already exist
        if (existingCheck.rows.length === 0) {
          await client.query(
            "INSERT INTO backlog_group_courses (group_id, student_id, course_id, is_registered) VALUES ($1, $2, $3, false)",
            [groupId, selection.studentId, selection.courseId]
          );
        }
      }

      await client.query("COMMIT");
      return { success: true, addedCount: courseSelections.length };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error in addToBacklogGroup:", error);
    throw error;
  }
}

export async function renameBacklogGroup(groupId, newName) {
  try {
    const result = await pool.query(
      "UPDATE backlog_groups SET name = $1 WHERE id = $2 RETURNING *",
      [newName, groupId]
    );

    if (result.rows.length === 0) {
      throw new Error("Backlog group not found");
    }

    return { success: true, group: result.rows[0] };
  } catch (error) {
    console.error("Error in renameBacklogGroup:", error);
    throw error;
  }
}

export async function deleteBacklogGroup(groupId) {
  try {
    // Check if the group contains any registrations that have results
    const resultCheck = await pool.query(
      `
      SELECT COUNT(*) as result_count
      FROM backlog_group_courses bgc
      JOIN results r ON bgc.student_id = r.student_id 
        AND bgc.course_id = r.course_id 
        AND bgc.group_id = r.backlog_group_id
      WHERE bgc.group_id = $1 AND bgc.is_registered = true AND r.is_backlog = true
    `,
      [groupId]
    );

    if (resultCheck.rows[0].result_count > 0) {
      throw new Error(
        "Cannot delete backlog group that contains registrations with existing results. Delete the results first."
      );
    }

    // Start transaction to ensure data consistency
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Delete group courses first (due to foreign key constraint)
      await client.query("DELETE FROM backlog_group_courses WHERE group_id = $1", [groupId]);

      // Delete the group
      const result = await client.query("DELETE FROM backlog_groups WHERE id = $1 RETURNING *", [
        groupId,
      ]);

      if (result.rows.length === 0) {
        throw new Error("Backlog group not found");
      }

      await client.query("COMMIT");
      return { success: true, deletedGroup: result.rows[0] };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error in deleteBacklogGroup:", error);
    throw error;
  }
}

export async function getAllBacklogGroups(searchTerm = "") {
  try {
    let query = `
      SELECT bg.*,
             COUNT(*) as total_courses,
             COUNT(CASE WHEN bgc.is_registered THEN 1 END) as registered_courses
      FROM backlog_groups bg
      LEFT JOIN backlog_group_courses bgc ON bg.id = bgc.group_id
    `;

    const params = [];
    if (searchTerm) {
      query += " WHERE bg.name ILIKE $1";
      params.push(`%${searchTerm}%`);
    }

    query += " GROUP BY bg.id ORDER BY bg.created_at DESC";

    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    console.error("Error in getAllBacklogGroups:", error);
    throw error;
  }
}

export async function toggleBacklogGroupRegistration(groupId, isOpen) {
  try {
    await pool.query("UPDATE backlog_groups SET is_open = $1 WHERE id = $2", [isOpen, groupId]);
    return { success: true };
  } catch (error) {
    console.error("Error in toggleBacklogGroupRegistration:", error);
    throw error;
  }
}

export async function getBacklogGroupDetails(groupId) {
  try {
    // Get group info
    const groupResult = await pool.query("SELECT * FROM backlog_groups WHERE id = $1", [groupId]);

    if (groupResult.rows.length === 0) {
      throw new Error("Backlog group not found");
    }

    // Get all courses in this group with student and course details
    const coursesResult = await pool.query(
      `
      SELECT
        bgc.*,
        s.name as student_name,
        s.roll_number,
        s.registration_number,
        s.academic_session,
        c.course_code,
        c.course_name,
        c.year,
        c.semester,
        c.credits,
        d.name as department_name,
        d.code as department_code
      FROM backlog_group_courses bgc
      JOIN students s ON bgc.student_id = s.id
      JOIN courses c ON bgc.course_id = c.id
      JOIN departments d ON s.department_id = d.id
      WHERE bgc.group_id = $1
      ORDER BY s.roll_number, c.course_code
    `,
      [groupId]
    );

    return {
      group: groupResult.rows[0],
      courses: coursesResult.rows,
    };
  } catch (error) {
    console.error("Error in getBacklogGroupDetails:", error);
    throw error;
  }
}

export async function toggleBacklogCourseRegistration(groupId, studentId, courseId, isRegistered) {
  try {
    // Check if trying to unregister and there's a backlog result
    if (!isRegistered) {
      const resultCheck = await pool.query(
        `
        SELECT id FROM results
        WHERE student_id = $1 AND course_id = $2 AND backlog_group_id = $3 AND is_backlog = true
      `,
        [studentId, courseId, groupId]
      );

      if (resultCheck.rows.length > 0) {
        throw new Error(
          "Cannot unregister from backlog course that has an existing result. Delete the result first."
        );
      }
    }

    // Check if student already has 5 registered backlog courses in this group
    if (isRegistered) {
      const countResult = await pool.query(
        `
        SELECT COUNT(*) as registered_count
        FROM backlog_group_courses
        WHERE group_id = $1 AND student_id = $2 AND is_registered = true
      `,
        [groupId, studentId]
      );

      if (countResult.rows[0].registered_count >= 5) {
        throw new Error("Student cannot register for more than 5 backlog courses in this group");
      }
    }

    await pool.query(
      `
      UPDATE backlog_group_courses
      SET is_registered = $1, registered_at = CASE WHEN $1 THEN NOW() ELSE NULL END
      WHERE group_id = $2 AND student_id = $3 AND course_id = $4
    `,
      [isRegistered, groupId, studentId, courseId]
    );

    return { success: true };
  } catch (error) {
    console.error("Error in toggleBacklogCourseRegistration:", error);
    throw error;
  }
}

export async function deleteBacklogCourse(groupId, studentId, courseId) {
  try {
    // Check if course is already registered
    const checkResult = await pool.query(
      `
      SELECT is_registered FROM backlog_group_courses
      WHERE group_id = $1 AND student_id = $2 AND course_id = $3
    `,
      [groupId, studentId, courseId]
    );

    if (checkResult.rows.length > 0 && checkResult.rows[0].is_registered) {
      throw new Error("Cannot delete a course that has been registered");
    }

    await pool.query(
      `
      DELETE FROM backlog_group_courses
      WHERE group_id = $1 AND student_id = $2 AND course_id = $3
    `,
      [groupId, studentId, courseId]
    );

    return { success: true };
  } catch (error) {
    console.error("Error in deleteBacklogCourse:", error);
    throw error;
  }
}

export async function getAvailableBacklogCoursesForStudent(studentId) {
  try {
    const result = await pool.query(
      `
      SELECT
        bgc.*,
        bg.name as group_name,
        bg.id as group_id,
        c.course_code,
        c.course_name,
        c.year,
        c.semester,
        c.credits,
        d.name as department_name
      FROM backlog_group_courses bgc
      JOIN backlog_groups bg ON bgc.group_id = bg.id
      JOIN courses c ON bgc.course_id = c.id
      JOIN students s ON bgc.student_id = s.id
      JOIN departments d ON s.department_id = d.id
      WHERE bgc.student_id = $1 AND bg.is_open = true
      ORDER BY c.year, c.semester, c.course_code
    `,
      [studentId]
    );

    // Group courses by backlog group
    const groupedCourses = {};
    result.rows.forEach((row) => {
      const groupId = row.group_id;
      if (!groupedCourses[groupId]) {
        groupedCourses[groupId] = {
          id: groupId,
          name: row.group_name,
          year: row.year,
          semester: row.semester,
          courses: [],
        };
      }
      groupedCourses[groupId].courses.push({
        id: row.course_id,
        course_code: row.course_code,
        course_name: row.course_name,
        credits: row.credits,
        department_name: row.department_name,
        is_registered: row.is_registered,
        registered_at: row.registered_at,
      });
    });

    return Object.values(groupedCourses);
  } catch (error) {
    console.error("Error in getAvailableBacklogCoursesForStudent:", error);
    throw error;
  }
}

export async function registerStudentForBacklogCourse(groupId, studentId, courseId) {
  try {
    // Check if student already has 5 registered backlog courses in this group
    const countResult = await pool.query(
      `
      SELECT COUNT(*) as registered_count
      FROM backlog_group_courses
      WHERE group_id = $1 AND student_id = $2 AND is_registered = true
    `,
      [groupId, studentId]
    );

    if (countResult.rows[0].registered_count >= 5) {
      throw new Error("You cannot register for more than 5 backlog courses in this group");
    }

    await pool.query(
      `
      UPDATE backlog_group_courses
      SET is_registered = true, registered_at = NOW()
      WHERE group_id = $1 AND student_id = $2 AND course_id = $3
    `,
      [groupId, studentId, courseId]
    );

    return { success: true };
  } catch (error) {
    console.error("Error in registerStudentForBacklogCourse:", error);
    throw error;
  }
}

export async function getStudentBacklogRegistrations(studentId) {
  try {
    const result = await pool.query(
      `
      SELECT
        bgc.*,
        bg.name as group_name,
        c.course_code,
        c.course_name,
        c.year,
        c.semester,
        c.credits,
        d.name as department_name
      FROM backlog_group_courses bgc
      JOIN backlog_groups bg ON bgc.group_id = bg.id
      JOIN courses c ON bgc.course_id = c.id
      JOIN students s ON bgc.student_id = s.id
      JOIN departments d ON s.department_id = d.id
      WHERE bgc.student_id = $1 AND bgc.is_registered = true
      ORDER BY bg.created_at DESC
    `,
      [studentId]
    );

    return result.rows;
  } catch (error) {
    console.error("Error in getStudentBacklogRegistrations:", error);
    throw error;
  }
}

export async function isStudentCourseRegisteredInBacklogGroup(groupId, studentId, courseId) {
  try {
    const result = await pool.query(
      `SELECT id FROM backlog_group_courses 
       WHERE group_id = $1 AND student_id = $2 AND course_id = $3 AND is_registered = true`,
      [groupId, studentId, courseId]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error("Error in isStudentCourseRegisteredInBacklogGroup:", error);
    throw error;
  }
}

export async function getAvailableBacklogGroupsForStudentCourse(studentId, courseId) {
  try {
    const result = await pool.query(
      `SELECT bg.id, bg.name, bg.is_open, bg.created_at
       FROM backlog_groups bg
       JOIN backlog_group_courses bgc ON bg.id = bgc.group_id
       WHERE bgc.student_id = $1 AND bgc.course_id = $2 AND bgc.is_registered = true
       ORDER BY bg.created_at DESC`,
      [studentId, courseId]
    );
    return result.rows;
  } catch (error) {
    console.error("Error in getAvailableBacklogGroupsForStudentCourse:", error);
    throw error;
  }
}
