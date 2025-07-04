import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createCourse, getDepartments, getCoursesWithStudentCounts } from "@/lib/data";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const courses = await getCoursesWithStudentCounts();
    return NextResponse.json({ courses });
  } catch (error) {
    console.error("Get courses error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { course_code, course_name, department_id, year, semester, credits, cgpa_weight } =
      await request.json();

    // Validation
    if (!course_code || !course_name || !department_id || !year || !semester) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (![1, 2, 3, 4].includes(parseInt(year))) {
      return NextResponse.json({ error: "Year must be 1, 2, 3, or 4" }, { status: 400 });
    }

    if (!["odd", "even"].includes(semester)) {
      return NextResponse.json({ error: "Semester must be 'odd' or 'even'" }, { status: 400 });
    }

    // Check if department exists
    const departments = await getDepartments();
    const departmentExists = departments.some((d) => d.id === parseInt(department_id));

    if (!departmentExists) {
      return NextResponse.json({ error: "Invalid department" }, { status: 400 });
    }

    try {
      const course = await createCourse({
        course_code: course_code.toUpperCase(),
        course_name,
        department_id: parseInt(department_id),
        year: parseInt(year),
        semester,
        credits: parseFloat(credits) || 3,
        cgpa_weight: parseFloat(cgpa_weight) || 4.0,
      });

      return NextResponse.json({ course }, { status: 201 });
    } catch (error) {
      if (error.message && error.message.includes("already exists")) {
        return NextResponse.json(
          { error: "Course code already exists for this department" },
          { status: 409 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error("Create course error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
