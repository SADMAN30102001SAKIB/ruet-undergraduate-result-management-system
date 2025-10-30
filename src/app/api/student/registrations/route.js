import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getStudentRegistrations, getStudentById } from "@/lib/data";

export async function GET(request) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "student") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get student details to get current year and semester
    const student = await getStudentById(user.id);
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Check if we should return all registrations or just current semester
    const { searchParams } = new URL(request.url);
    const getAll = searchParams.get("all") === "true";

    let registrations;
    if (getAll) {
      // Get all registrations for the student
      registrations = await getStudentRegistrations(user.id);
    } else {
      // Only get registrations for the student's current year and semester
      registrations = await getStudentRegistrations(
        user.id,
        student.current_year,
        student.current_semester
      );
    }

    return NextResponse.json({ courses: registrations });
  } catch (error) {
    console.error("Get student registrations error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
