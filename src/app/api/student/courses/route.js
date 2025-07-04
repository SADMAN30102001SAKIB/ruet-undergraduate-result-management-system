import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getAvailableCoursesForStudent,
  getStudentById,
  registerStudentForCourse,
  getCourseById,
} from "@/lib/data";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "student") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get student details
    const student = await getStudentById(user.id);
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Get available courses for the student
    const availableCourses = await getAvailableCoursesForStudent(
      student.id,
      student.department_id,
      student.current_year,
      student.current_semester
    );

    return NextResponse.json({ courses: availableCourses });
  } catch (error) {
    console.error("Get available courses error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "student") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { courseId } = await request.json();

    if (!courseId || isNaN(parseInt(courseId))) {
      return NextResponse.json({ error: "Valid course ID is required" }, { status: 400 });
    }

    // Get student details to check current year/semester
    const student = await getStudentById(user.id);
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Get course details to validate year/semester
    const course = await getCourseById(parseInt(courseId));
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Validate that the course belongs to the student's current year and semester
    if (course.year !== student.current_year || course.semester !== student.current_semester) {
      return NextResponse.json(
        {
          error: `You can only register for courses in your current semester (Year ${student.current_year}, ${student.current_semester} semester)`,
        },
        { status: 403 }
      );
    }

    try {
      const registration = await registerStudentForCourse(user.id, parseInt(courseId));
      return NextResponse.json({
        message: "Successfully registered for course",
        registration,
      });
    } catch (error) {
      if (error.message && error.message.includes("already registered")) {
        return NextResponse.json({ error: "Already registered for this course" }, { status: 409 });
      }
      throw error;
    }
  } catch (error) {
    console.error("Course registration error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
