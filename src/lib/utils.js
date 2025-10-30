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
    // Ensure credits is a number
    const credits = parseFloat(result.credits || 0);
    const gradeInfo = getGradeFromMarks(result.marks);

    // Only include passed courses (D and above, exclude F)
    if (gradeInfo.gradePoint > 0 && credits > 0) {
      totalCredits += credits;
      totalGradePoints += gradeInfo.gradePoint * credits;
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
    // Ensure credits is a number
    const credits = parseFloat(result.credits || 0);

    // Use appropriate grading function based on backlog status
    const gradeInfo = result.is_backlog
      ? getBacklogGradeFromMarks(result.marks)
      : getGradeFromMarks(result.marks);

    // Only include passed courses (D and above, exclude F)
    if (gradeInfo.gradePoint > 0 && credits > 0) {
      totalCredits += credits;
      totalGradePoints += gradeInfo.gradePoint * credits;
    }
  }

  const sgpa = totalCredits > 0 ? Number((totalGradePoints / totalCredits).toFixed(2)) : 0;

  return sgpa;
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

/**
 * Graph coloring algorithm for exam scheduling
 * Uses greedy coloring to assign exam days to courses based on student conflicts
 * @param {Array} courses - Array of course objects with student_id and course_id
 * @returns {Object} - Object with color assignments and conflict graph info
 */
export function generateExamSchedule(courses) {
  // Create conflict graph: courses that share students cannot be on same day
  const courseMap = new Map();
  const studentCourses = new Map();

  // Group courses by course_id and collect students for each course
  courses.forEach((course) => {
    if (!courseMap.has(course.course_id)) {
      courseMap.set(course.course_id, {
        id: course.course_id,
        code: course.course_code,
        name: course.course_name,
        students: new Set(),
      });
    }
    courseMap.get(course.course_id).students.add(course.student_id);

    // Also track which courses each student is taking
    if (!studentCourses.has(course.student_id)) {
      studentCourses.set(course.student_id, new Set());
    }
    studentCourses.get(course.student_id).add(course.course_id);
  });

  // Create adjacency list for conflict graph
  const courseIds = Array.from(courseMap.keys());
  const adjacencyList = new Map();

  courseIds.forEach((courseId) => {
    adjacencyList.set(courseId, new Set());
  });

  // Build conflicts efficiently using studentCourses map (O(n) instead of O(n²))
  for (const courses of studentCourses.values()) {
    const arr = Array.from(courses);
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        adjacencyList.get(arr[i]).add(arr[j]);
        adjacencyList.get(arr[j]).add(arr[i]);
      }
    }
  }

  // Greedy graph coloring
  const colorAssignment = new Map();
  const availableColors = new Set();

  // Sort courses by degree (number of conflicts) for better coloring, with deterministic secondary sort
  const sortedCourses = courseIds.sort((a, b) => {
    const diff = adjacencyList.get(b).size - adjacencyList.get(a).size;
    return diff !== 0 ? diff : String(a).localeCompare(String(b));
  });

  sortedCourses.forEach((courseId) => {
    const neighbors = adjacencyList.get(courseId);
    const usedColors = new Set();

    // Find colors used by neighbors
    neighbors.forEach((neighborId) => {
      if (colorAssignment.has(neighborId)) {
        usedColors.add(colorAssignment.get(neighborId));
      }
    });

    // Assign smallest available color
    let color = 0;
    while (usedColors.has(color)) {
      color++;
    }

    colorAssignment.set(courseId, color);
    availableColors.add(color);
  });

  // Group courses by exam day (color)
  const examDays = {};
  Array.from(availableColors)
    .sort()
    .forEach((color) => {
      examDays[color] = courseIds
        .filter((courseId) => colorAssignment.get(courseId) === color)
        .map((courseId) => courseMap.get(courseId));
    });

  return {
    examDays,
    numDays: availableColors.size,
    courseColors: Object.fromEntries(
      [...colorAssignment.entries()].map(([k, v]) => [String(k), v])
    ),
    conflicts: Object.fromEntries(
      [...adjacencyList.entries()].map(([k, v]) => [String(k), Array.from(v)])
    ),
  };
}

/**
 * Generate exam routine data for PDF creation
 * @param {Object} schedule - Result from generateExamSchedule
 * @param {Array} examDates - Array of date strings for each exam day
 * @param {Array} originalCourses - Original courses array with student details
 * @returns {Array} - Array of exam entries for PDF
 */
export function generateExamRoutineData(schedule, examDates, originalCourses) {
  const routine = [];

  Object.entries(schedule.examDays).forEach(([dayIndex, courses]) => {
    const examDate = examDates[parseInt(dayIndex)];
    if (!examDate) return;

    courses.forEach((course) => {
      // Get roll numbers for students in this course from original courses data
      const courseStudents = originalCourses.filter((c) => c.course_id === course.id);
      const rollNumbers = courseStudents
        .map((c) => c.roll_number)
        .filter(Boolean)
        .sort();

      routine.push({
        courseCode: course.code,
        courseName: course.name,
        date: examDate,
        rollNumbers: rollNumbers.join(", "),
      });
    });
  });

  // Sort by date, then by course code
  return routine.sort((a, b) => {
    if (a.date !== b.date) return new Date(a.date) - new Date(b.date);
    return a.courseCode.localeCompare(b.courseCode);
  });
}
