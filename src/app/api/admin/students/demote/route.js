import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { takeStudentsDownSemester } from "@/lib/data";

export async function POST(request) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { studentIds } = body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json({ error: "Student IDs array is required" }, { status: 400 });
    }

    // Validate all IDs are numbers
    const validIds = studentIds.filter((id) => Number.isInteger(id));
    if (validIds.length !== studentIds.length) {
      return NextResponse.json(
        { error: "All student IDs must be valid integers" },
        { status: 400 }
      );
    }

    const results = takeStudentsDownSemester(validIds);

    return NextResponse.json({
      success: results.success,
      failed: results.failed,
      total: validIds.length,
    });
  } catch (error) {
    console.error("Error taking students down:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
