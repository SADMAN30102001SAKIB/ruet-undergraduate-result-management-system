import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/database";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get statistics
    const totalStudents = db.prepare("SELECT COUNT(*) as count FROM students").get();
    const totalCourses = db.prepare("SELECT COUNT(*) as count FROM courses").get();
    const totalDepartments = db.prepare("SELECT COUNT(*) as count FROM departments").get();
    const publishedResults = db
      .prepare("SELECT COUNT(*) as count FROM results WHERE published = 1")
      .get();

    return NextResponse.json({
      totalStudents: totalStudents.count,
      totalCourses: totalCourses.count,
      totalDepartments: totalDepartments.count,
      publishedResults: publishedResults.count,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
