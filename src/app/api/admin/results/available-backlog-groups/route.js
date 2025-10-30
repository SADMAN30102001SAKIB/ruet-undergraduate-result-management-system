import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAvailableBacklogGroupsForStudentCourse } from "@/lib/data";

export async function GET(request) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");
    const courseId = searchParams.get("courseId");

    if (!studentId || !courseId) {
      return NextResponse.json({ error: "Student ID and Course ID are required" }, { status: 400 });
    }

    const groups = await getAvailableBacklogGroupsForStudentCourse(
      parseInt(studentId),
      parseInt(courseId)
    );

    return NextResponse.json({ groups });
  } catch (error) {
    console.error("Error fetching available backlog groups:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
