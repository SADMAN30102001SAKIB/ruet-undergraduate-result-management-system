import { getCurrentUser } from "@/lib/auth";
import { deleteCourse, getCourseById, updateCourse } from "@/lib/data";

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    if (!user || user.role !== "admin") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const courseId = parseInt(id);
    if (isNaN(courseId)) {
      return Response.json({ error: "Invalid course ID" }, { status: 400 });
    }

    const course = await getCourseById(courseId);

    if (!course) {
      return Response.json({ error: "Course not found" }, { status: 404 });
    }

    return Response.json(course);
  } catch (error) {
    console.error("Error fetching course:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    if (!user || user.role !== "admin") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const courseId = parseInt(id);
    if (isNaN(courseId)) {
      return Response.json({ error: "Invalid course ID" }, { status: 400 });
    }

    const body = await request.json();
    const { course_code, course_name, department_id, year, semester, credits, cgpa_weight } = body;

    // Validate required fields
    if (
      !course_code ||
      !course_name ||
      !department_id ||
      !year ||
      !semester ||
      !credits ||
      cgpa_weight === undefined
    ) {
      return Response.json({ error: "All fields are required" }, { status: 400 });
    }

    // Update the course
    const updatedCourse = await updateCourse(courseId, {
      course_code,
      course_name,
      department_id,
      year,
      semester,
      credits,
      cgpa_weight,
    });

    if (!updatedCourse) {
      return Response.json({ error: "Course not found or could not be updated" }, { status: 404 });
    }

    return Response.json({ course: updatedCourse });
  } catch (error) {
    console.error("Error updating course:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    if (!user || user.role !== "admin") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const courseId = parseInt(id);
    if (isNaN(courseId)) {
      return Response.json({ error: "Invalid course ID" }, { status: 400 });
    }

    // Delete the course
    const deleted = await deleteCourse(courseId);

    if (!deleted) {
      return Response.json(
        {
          error:
            "Course not found or could not be deleted. This may be because there are existing registrations or results for this course.",
        },
        { status: 404 }
      );
    }

    return Response.json({ message: "Course deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting course:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
