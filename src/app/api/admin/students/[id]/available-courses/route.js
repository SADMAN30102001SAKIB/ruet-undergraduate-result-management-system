import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getStudentById } from "@/lib/data";
import { db } from "@/lib/database";

export async function GET(request, { params }) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const studentId = parseInt(id);

    if (isNaN(studentId)) {
      return NextResponse.json({ error: "Invalid student ID" }, { status: 400 });
    }

    const student = getStudentById(studentId);
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    } // Get available courses for the student's current semester only
    // Only courses from the same department, same year and semester that are NOT registered
    const availableCourses = db
      .prepare(
        `
        SELECT c.*, d.name as department_name, d.code as department_code
        FROM courses c
        JOIN departments d ON c.department_id = d.id
        WHERE c.department_id = ? 
          AND c.year = ? 
          AND c.semester = ?
          AND c.id NOT IN (
            SELECT course_id 
            FROM course_registrations 
            WHERE student_id = ?
          )
        ORDER BY c.course_code
        `
      )
      .all(student.department_id, student.current_year, student.current_semester, studentId);

    return NextResponse.json(availableCourses);
  } catch (error) {
    console.error("Error fetching available courses:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
