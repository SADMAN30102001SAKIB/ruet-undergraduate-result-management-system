import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getStudentCGPA } from "@/lib/data";

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

    const cgpaData = await getStudentCGPA(studentId);
    return NextResponse.json(cgpaData);
  } catch (error) {
    console.error("Error fetching student CGPA:", error);
    return NextResponse.json({ error: "Failed to fetch student CGPA" }, { status: 500 });
  }
}
