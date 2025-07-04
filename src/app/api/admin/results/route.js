import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getResults, createResult } from "@/lib/data";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const results = await getResults();
    return NextResponse.json({ results });
  } catch (error) {
    console.error("Error fetching results:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const { student_id, course_id, marks, published } = body;

    // Validate required fields
    if (!student_id || !course_id || marks === undefined) {
      return NextResponse.json(
        { error: "Student ID, Course ID, and marks are required" },
        { status: 400 }
      );
    }

    // Validate marks range
    if (marks < 0 || marks > 100) {
      return NextResponse.json({ error: "Marks must be between 0 and 100" }, { status: 400 });
    } // Create the result
    try {
      const result = await createResult({
        student_id,
        course_id,
        marks,
        published: published || false,
      });

      return NextResponse.json({ result }, { status: 201 });
    } catch (error) {
      console.error("Error creating result:", error);

      // Handle specific error types
      if (error instanceof Error) {
        if (
          error.message.includes("Cannot add duplicate result") ||
          error.message.includes("Cannot add result for a course that has already been passed")
        ) {
          return NextResponse.json({ error: error.message }, { status: 400 });
        }
      }

      return NextResponse.json({ error: "Failed to create result" }, { status: 500 });
    }
  } catch (error) {
    console.error("Error creating result:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
