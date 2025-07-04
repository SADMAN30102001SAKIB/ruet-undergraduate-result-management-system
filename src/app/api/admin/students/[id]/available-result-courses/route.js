import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getCoursesAvailableForResultEntry } from "@/lib/data";

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

    const courses = await getCoursesAvailableForResultEntry(studentId, filters);
    return NextResponse.json({ courses });
  } catch (error) {
    console.error("Error fetching courses available for result entry:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
