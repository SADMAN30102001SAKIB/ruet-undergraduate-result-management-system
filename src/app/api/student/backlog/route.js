import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { pool } from "@/lib/postgres";
import {
  getAvailableBacklogCoursesForStudent,
  registerStudentForBacklogCourse,
  getStudentBacklogRegistrations,
} from "@/lib/data/backlog";

// GET /api/student/backlog - Get available backlog courses and registrations
export async function GET(request) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "student") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // 'available' or 'registered'

    if (type === "available") {
      const courses = await getAvailableBacklogCoursesForStudent(user.id);
      return NextResponse.json({ courses });
    } else if (type === "registered") {
      const registrations = await getStudentBacklogRegistrations(user.id);
      return NextResponse.json({ registrations });
    } else {
      // Return both
      const [courses, registrations] = await Promise.all([
        getAvailableBacklogCoursesForStudent(user.id),
        getStudentBacklogRegistrations(user.id),
      ]);
      return NextResponse.json({ courses, registrations });
    }
  } catch (error) {
    console.error("Error fetching student backlog data:", error);
    return NextResponse.json({ error: "Failed to fetch backlog data" }, { status: 500 });
  }
}

// POST /api/student/backlog - Register for backlog course
export async function POST(request) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "student") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { groupId, courseId } = await request.json();

    if (!groupId || !courseId) {
      return NextResponse.json({ error: "Group ID and Course ID are required" }, { status: 400 });
    }

    const result = await registerStudentForBacklogCourse(groupId, user.id, courseId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error registering for backlog course:", error);
    return NextResponse.json(
      { error: error.message || "Failed to register for backlog course" },
      { status: 500 }
    );
  }
}

// DELETE /api/student/backlog - Unregister from backlog course
export async function DELETE(request) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "student") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get("groupId");
    const courseId = searchParams.get("courseId");

    if (!groupId || !courseId) {
      return NextResponse.json({ error: "Group ID and Course ID are required" }, { status: 400 });
    }

    // Check if the course is registered by this student
    const checkResult = await pool.query(
      `
      SELECT is_registered FROM backlog_group_courses
      WHERE group_id = $1 AND student_id = $2 AND course_id = $3
    `,
      [groupId, user.id, courseId]
    );

    if (checkResult.rows.length === 0) {
      return NextResponse.json({ error: "Course not found in backlog group" }, { status: 404 });
    }

    if (!checkResult.rows[0].is_registered) {
      return NextResponse.json({ error: "Course is not registered" }, { status: 400 });
    }

    // Check if there's a backlog result for this course
    const resultCheck = await pool.query(
      `
      SELECT id FROM results
      WHERE student_id = $1 AND course_id = $2 AND backlog_group_id = $3 AND is_backlog = true
    `,
      [user.id, courseId, groupId]
    );

    if (resultCheck.rows.length > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot unregister from backlog course that has an existing result. Contact administrator to delete the result first.",
        },
        { status: 400 }
      );
    }

    // Unregister the course
    await pool.query(
      `
      UPDATE backlog_group_courses
      SET is_registered = false, registered_at = NULL
      WHERE group_id = $1 AND student_id = $2 AND course_id = $3
    `,
      [groupId, user.id, courseId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error unregistering from backlog course:", error);
    return NextResponse.json(
      { error: error.message || "Failed to unregister from backlog course" },
      { status: 500 }
    );
  }
}
