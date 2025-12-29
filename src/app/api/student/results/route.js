import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getStudentResultsWithBacklog,
  getStudentCGPA,
  getEffectiveStudentResults,
  getStudentTotalCredits,
} from "@/lib/data";
import { getGradeFromMarks, getBacklogGradeFromMarks } from "@/lib/utils";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "student") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resultsData = await getStudentResultsWithBacklog(user.id);
    const cgpaData = await getStudentCGPA(user.id);
    const effectiveResults = await getEffectiveStudentResults(user.id);

    // Helper to strip marks and add grade info
    const sanitizeResult = (result) => {
      const { marks, ...rest } = result;
      const gradeInfo = result.is_backlog 
        ? getBacklogGradeFromMarks(marks) 
        : getGradeFromMarks(marks);
      return {
        ...rest,
        grade: gradeInfo.grade,
        gradePoint: gradeInfo.gradePoint,
      };
    };

    const responseData = {
      results: [...resultsData.regularResults, ...resultsData.backlogResults].map(sanitizeResult),
      cgpa: cgpaData,
      regularResults: resultsData.regularResults.map(sanitizeResult),
      backlogResults: resultsData.backlogResults.map(sanitizeResult),
      effectiveResults: effectiveResults.map(sanitizeResult),
      totalCredits: await getStudentTotalCredits(user.id),
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Get student results error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
