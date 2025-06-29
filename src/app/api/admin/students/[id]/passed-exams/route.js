import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getStudentPassedExamsCount } from "@/lib/data";

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

    const passedExams = getStudentPassedExamsCount(studentId);
    return NextResponse.json(passedExams);
  } catch (error) {
    console.error("Error fetching passed exams:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
