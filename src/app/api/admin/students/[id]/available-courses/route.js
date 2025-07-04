import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getStudentById, getAvailableCoursesForStudent } from "@/lib/data";

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

    const student = await getStudentById(studentId);
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Get available courses for the student's current semester only
    const availableCourses = await getAvailableCoursesForStudent(
      studentId,
      student.department_id,
      student.current_year,
      student.current_semester
    );

    return NextResponse.json({ courses: availableCourses });
  } catch (error) {
    console.error("Error fetching available courses:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
