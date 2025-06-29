import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  unregisterStudentFromCourse,
  canUnregisterStudentFromCourse,
  getStudentById,
  getCourseById,
} from "@/lib/data";

export async function DELETE(request, { params }) {
  try {
    const { courseId } = await params;
    const user = await getCurrentUser();

    if (!user || user.role !== "student") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const courseIdNum = parseInt(courseId);
    if (isNaN(courseIdNum)) {
      return NextResponse.json({ error: "Invalid course ID" }, { status: 400 });
    }

    // Get student details to check current year/semester
    const student = getStudentById(user.id);
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Get course details to validate year/semester
    const course = getCourseById(courseIdNum);
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Validate that the course belongs to the student's current year and semester
    if (course.year !== student.current_year || course.semester !== student.current_semester) {
      return NextResponse.json(
        {
          error: `You can only unregister from courses in your current semester (Year ${student.current_year}, ${student.current_semester} semester)`,
        },
        { status: 403 }
      );
    }

    // Check if unregistration is allowed based on business rules
    const unregisterCheck = canUnregisterStudentFromCourse(user.id, courseIdNum);

    if (!unregisterCheck.canUnregister) {
      return NextResponse.json({ error: unregisterCheck.error }, { status: 400 });
    }

    const success = unregisterStudentFromCourse(user.id, courseIdNum);

    if (!success) {
      return NextResponse.json({ error: "Course registration not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Successfully unregistered from course",
    });
  } catch (error) {
    console.error("Course unregistration error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
