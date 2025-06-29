import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { unregisterStudentFromCourse, canUnregisterStudentFromCourse } from "@/lib/data";

export async function DELETE(request, { params }) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, courseId } = await params;
    const studentId = parseInt(id);
    const courseIdNum = parseInt(courseId);

    if (isNaN(studentId) || isNaN(courseIdNum)) {
      return NextResponse.json({ error: "Invalid student or course ID" }, { status: 400 });
    }

    // Check if unregistration is allowed
    const unregisterCheck = canUnregisterStudentFromCourse(studentId, courseIdNum);

    if (!unregisterCheck.canUnregister) {
      return NextResponse.json({ error: unregisterCheck.error }, { status: 400 });
    }

    const success = unregisterStudentFromCourse(studentId, courseIdNum);

    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: "Failed to unregister student from course" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error unregistering student from course:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
