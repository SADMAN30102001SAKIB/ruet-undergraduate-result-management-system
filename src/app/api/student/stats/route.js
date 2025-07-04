import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getStudentRegistrations,
  getStudentCGPA,
  getEffectiveStudentResults,
  getStudentPublishedResultsCount,
  getStudentTotalCredits,
} from "@/lib/data";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "student") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get student registrations (all semesters for stats)
    const registrations = await getStudentRegistrations(user.id);

    // Get published results count
    const publishedResultsCount = await getStudentPublishedResultsCount(user.id);

    // Get CGPA data
    const cgpaData = await getStudentCGPA(user.id);

    // Get current semester SGPA based on the latest semester with published results
    let currentSGPA = 0;

    if (cgpaData.sgpas.length > 0) {
      // Sort SGPAs by year and semester to find the chronologically latest one
      const sortedSGPAs = cgpaData.sgpas.sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year; // Latest year first
        // For same year, even semester comes after odd semester
        if (a.semester === b.semester) return 0;
        return a.semester === "even" ? -1 : 1; // even semester is later than odd
      });

      currentSGPA = sortedSGPAs[0].sgpa; // Take the latest semester's SGPA
    } // Calculate total and completed credits using effective results
    const totalCredits = await getStudentTotalCredits(user.id);

    // Get effective results (uses backlog if passed, otherwise regular)
    const effectiveResults = await getEffectiveStudentResults(user.id);
    const completedCredits = effectiveResults
      .filter((result) => result.marks >= 40)
      .reduce((sum, result) => sum + result.credits, 0);

    return NextResponse.json({
      totalRegistrations: registrations.length,
      publishedResults: publishedResultsCount,
      currentSGPA: currentSGPA,
      overallCGPA: cgpaData.cgpa,
      sgpas: cgpaData.sgpas,
      totalCredits: totalCredits,
      completedCredits: completedCredits,
    });
  } catch (error) {
    console.error("Student stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
