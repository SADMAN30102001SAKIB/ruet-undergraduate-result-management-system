// Simple utility function for combining class names
export function cn(...inputs) {
  return inputs.filter(Boolean).join(" ");
}

/**
 * Convert marks (out of 100) to RUET grade and grade point
 */
export function getGradeFromMarks(marks) {
  if (marks >= 80) return { grade: "A+", gradePoint: 4.0 };
  if (marks >= 75) return { grade: "A", gradePoint: 3.75 };
  if (marks >= 70) return { grade: "A-", gradePoint: 3.5 };
  if (marks >= 65) return { grade: "B+", gradePoint: 3.25 };
  if (marks >= 60) return { grade: "B", gradePoint: 3.0 };
  if (marks >= 55) return { grade: "B-", gradePoint: 2.75 };
  if (marks >= 50) return { grade: "C+", gradePoint: 2.5 };
  if (marks >= 45) return { grade: "C", gradePoint: 2.25 };
  if (marks >= 40) return { grade: "D", gradePoint: 2.0 };
  return { grade: "F", gradePoint: 0.0 };
}

/**
 * Convert marks (out of 100) to backlog/supplementary exam grade and grade point
 * Maximum grade point for backlog exams is capped at B+ (3.25)
 */
export function getBacklogGradeFromMarks(marks) {
  if (marks >= 65) return { grade: "B+", gradePoint: 3.25 }; // Capped at B+
  if (marks >= 60) return { grade: "B", gradePoint: 3.0 };
  if (marks >= 55) return { grade: "B-", gradePoint: 2.75 };
  if (marks >= 50) return { grade: "C+", gradePoint: 2.5 };
  if (marks >= 45) return { grade: "C", gradePoint: 2.25 };
  if (marks >= 40) return { grade: "D", gradePoint: 2.0 };
  return { grade: "F", gradePoint: 0.0 };
}

/**
 * Calculate SGPA for a semester using RUET system
 * Only includes passed courses (D and above, excluding F)
 */
export function calculateSGPA(results) {
  if (results.length === 0) return 0;

  let totalCredits = 0;
  let totalGradePoints = 0;

  for (const result of results) {
    const gradeInfo = getGradeFromMarks(result.marks);

    // Only include passed courses (D and above, exclude F)
    if (gradeInfo.gradePoint > 0) {
      totalCredits += result.credits;
      totalGradePoints += gradeInfo.gradePoint * result.credits;
    }
  }

  return totalCredits > 0 ? Number((totalGradePoints / totalCredits).toFixed(2)) : 0;
}

/**
 * Calculate CGPA across all semesters using RUET system
 * Only includes passed courses (D and above, excluding F)
 */
export function calculateCGPA(allResults) {
  if (allResults.length === 0) return 0;

  let totalCredits = 0;
  let totalGradePoints = 0;

  for (const result of allResults) {
    const gradeInfo = getGradeFromMarks(result.marks);

    // Only include passed courses (D and above, exclude F)
    if (gradeInfo.gradePoint > 0) {
      totalCredits += result.credits;
      totalGradePoints += gradeInfo.gradePoint * result.credits;
    }
  }

  return totalCredits > 0 ? Number((totalGradePoints / totalCredits).toFixed(2)) : 0;
}

/**
 * Calculate SGPA for a semester with backlog-aware grading
 * Uses different grading scales for regular vs backlog results
 */
export function calculateSGPAWithBacklog(results) {
  if (results.length === 0) return 0;

  let totalCredits = 0;
  let totalGradePoints = 0;

  for (const result of results) {
    // Use appropriate grading function based on backlog status
    const gradeInfo = result.is_backlog
      ? getBacklogGradeFromMarks(result.marks)
      : getGradeFromMarks(result.marks);

    // Only include passed courses (D and above, exclude F)
    if (gradeInfo.gradePoint > 0) {
      totalCredits += result.credits;
      totalGradePoints += gradeInfo.gradePoint * result.credits;
    }
  }

  return totalCredits > 0 ? Number((totalGradePoints / totalCredits).toFixed(2)) : 0;
}

// Format utilities
export function formatAcademicSession(session) {
  return session.replace("-", " - ");
}

export function formatSemester(semester) {
  return semester.charAt(0).toUpperCase() + semester.slice(1);
}

export function formatYear(year) {
  const suffix = ["st", "nd", "rd", "th"];
  return `${year}${suffix[year - 1] || "th"}`;
}

// Validation utilities
export function validateRollNumber(rollNumber) {
  return /^[A-Z0-9]+$/.test(rollNumber) && rollNumber.length >= 4;
}

export function validateRegistrationNumber(regNumber) {
  return /^[A-Z0-9]+$/.test(regNumber) && regNumber.length >= 3;
}

export function validatePhone(phone) {
  return /^[0-9]{10,11}$/.test(phone);
}

export function validateGPA(gpa) {
  return gpa >= 0 && gpa <= 4.0;
}
