import { NextResponse } from "next/server";
import { toggleBacklogCourseRegistration, deleteBacklogCourse } from "@/lib/data/backlog";

// PATCH /api/admin/backlog/registration/[courseId]/[studentId] - Toggle course registration
export async function PATCH(request, { params }) {
  try {
    const { courseId, studentId } = await params;
    const { groupId, isRegistered } = await request.json();

    if (!groupId) {
      return NextResponse.json({ error: "groupId is required" }, { status: 400 });
    }

    if (typeof isRegistered !== "boolean") {
      return NextResponse.json({ error: "isRegistered must be a boolean" }, { status: 400 });
    }

    const result = await toggleBacklogCourseRegistration(
      groupId,
      studentId,
      courseId,
      isRegistered
    );
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error updating course registration:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update course registration" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/backlog/registration/[courseId]/[studentId] - Delete course from group
export async function DELETE(request, { params }) {
  try {
    const { courseId, studentId } = await params;
    const { groupId } = await request.json();

    if (!groupId) {
      return NextResponse.json({ error: "groupId is required" }, { status: 400 });
    }

    const result = await deleteBacklogCourse(groupId, studentId, courseId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error deleting course:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete course" },
      { status: 500 }
    );
  }
}
