import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getRegisteredCoursesForStudent,
  registerStudentForCourse,
  isStudentRegisteredForCourse,
} from "@/lib/data";

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

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const filters = {
      departmentId: searchParams.get("departmentId"),
      year: searchParams.get("year"),
      semester: searchParams.get("semester"),
    };

    const courses = await getRegisteredCoursesForStudent(studentId, filters);
    return NextResponse.json({ courses });
  } catch (error) {
    console.error("Error fetching student courses:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request, { params }) {
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

    const body = await request.json();
    const { courseId } = body;

    if (!courseId || isNaN(parseInt(courseId))) {
      return NextResponse.json({ error: "Invalid course ID" }, { status: 400 });
    }

    // Check if already registered
    if (await isStudentRegisteredForCourse(studentId, parseInt(courseId))) {
      return NextResponse.json(
        { error: "Student is already registered for this course" },
        { status: 400 }
      );
    }

    const registration = await registerStudentForCourse(studentId, parseInt(courseId));
    return NextResponse.json(registration);
  } catch (error) {
    console.error("Error registering student for course:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
