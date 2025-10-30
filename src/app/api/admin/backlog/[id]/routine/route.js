import { NextResponse } from "next/server";
import { getBacklogGroupDetails } from "@/lib/data/backlog";
import { generateExamSchedule } from "@/lib/utils";

// POST /api/admin/backlog/[id]/routine - Generate exam routine for backlog group
export async function POST(request, { params }) {
  try {
    const { id } = await params;

    // Get backlog group details
    const groupDetails = await getBacklogGroupDetails(id);

    // Filter to only include registered courses
    const registeredCourses = groupDetails.courses.filter((course) => course.is_registered);

    if (!registeredCourses || registeredCourses.length === 0) {
      return NextResponse.json(
        { error: "No registered courses found in this backlog group" },
        { status: 400 }
      );
    }

    // Generate exam schedule using graph coloring
    const schedule = generateExamSchedule(registeredCourses);

    return NextResponse.json({
      success: true,
      schedule,
      groupName: groupDetails.group.name,
      totalCourses: registeredCourses.length,
      totalStudents: new Set(registeredCourses.map((c) => c.student_id)).size,
    });
  } catch (error) {
    console.error("Error generating exam routine:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate exam routine" },
      { status: 500 }
    );
  }
}
