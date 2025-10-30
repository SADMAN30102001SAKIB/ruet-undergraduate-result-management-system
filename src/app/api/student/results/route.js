import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getStudentResultsWithBacklog,
  getStudentCGPA,
  getEffectiveStudentResults,
  getStudentTotalCredits,
} from "@/lib/data";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "student") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resultsData = await getStudentResultsWithBacklog(user.id);
    const cgpaData = await getStudentCGPA(user.id);
    const effectiveResults = await getEffectiveStudentResults(user.id); // Combine regular and backlog results into a single array for transcript
    const allResults = [...resultsData.regularResults, ...resultsData.backlogResults];
    const totalCredits = await getStudentTotalCredits(user.id);
    const responseData = {
      results: allResults,
      cgpa: cgpaData,
      regularResults: resultsData.regularResults,
      backlogResults: resultsData.backlogResults,
      effectiveResults: effectiveResults,
      totalCredits: totalCredits,
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Get student results error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
