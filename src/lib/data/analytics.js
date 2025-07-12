import { pool } from "../postgres";
import { getEffectiveStudentResults } from "./results";

// Functions to get all possible filter values for admin pages
export async function getAllYears() {
  try {
    // Get years from both students and courses, plus standard academic years
    const studentYears = await pool.query(
      "SELECT DISTINCT current_year FROM students ORDER BY current_year"
    );

    const courseYears = await pool.query("SELECT DISTINCT year FROM courses ORDER BY year");

    // Combine all years and add standard academic years (1-4)
    const allYears = new Set();

    // Add standard academic years
    [1, 2, 3, 4].forEach((year) => allYears.add(year));

    // Add years from students
    studentYears.rows.forEach((s) => allYears.add(s.current_year));

    // Add years from courses
    courseYears.rows.forEach((c) => allYears.add(c.year));

    return Array.from(allYears).sort();
  } catch (error) {
    console.error("Error in getAllYears:", error);
    throw error;
  }
}

export async function getAllSemesters() {
  try {
    // Get semesters from both students and courses tables, plus standard semesters
    const studentSemesters = await pool.query(
      "SELECT DISTINCT current_semester FROM students ORDER BY current_semester"
    );

    const courseSemesters = await pool.query(
      "SELECT DISTINCT semester FROM courses ORDER BY semester"
    );

    // Combine all semesters and add standard semesters - only even/odd
    const allSemesters = new Set();

    ["even", "odd"].forEach((semester) => allSemesters.add(semester));

    // Add semesters from students
    studentSemesters.rows.forEach((s) => allSemesters.add(s.current_semester));

    // Add semesters from courses
    courseSemesters.rows.forEach((c) => allSemesters.add(c.semester));

    // Filter out null/undefined and sort
    return Array.from(allSemesters).filter(Boolean).sort();
  } catch (error) {
    console.error("Error in getAllSemesters:", error);
    throw error;
  }
}

export async function getAllAcademicSessions() {
  try {
    const result = await pool.query(
      "SELECT DISTINCT academic_session FROM students ORDER BY academic_session"
    );
    return result.rows.map((s) => s.academic_session);
  } catch (error) {
    console.error("Error in getAllAcademicSessions:", error);
    throw error;
  }
}

// Function to get passed exams count for a student
export async function getStudentPassedExamsCount(studentId) {
  try {
    // Validate input
    if (!studentId || isNaN(parseInt(studentId))) {
      throw new Error("Valid student ID is required");
    }

    // Get all registered courses for the student
    const registeredCourses = await pool.query(
      `
      SELECT cr.course_id
      FROM student_courses cr
      WHERE cr.student_id = $1
    `,
      [studentId]
    );

    const total = registeredCourses.rows.length;

    // Get effective results (considering backlog improvements) and count passed ones
    const effectiveResults = await getEffectiveStudentResults(studentId);
    const passed = effectiveResults.filter((result) => result.marks >= 40).length;

    return { passed, total };
  } catch (error) {
    console.error("Error in getStudentPassedExamsCount:", error);
    throw error;
  }
}

// Get total credits for a student
export async function getStudentTotalCredits(studentId) {
  try {
    const result = await pool.query(
      `SELECT SUM(c.credits) as total
       FROM student_courses cr
       JOIN courses c ON cr.course_id = c.id
       WHERE cr.student_id = $1`,
      [studentId]
    );
    return parseFloat(result.rows[0].total) || 0;
  } catch (error) {
    console.error("Error in getStudentTotalCredits:", error);
    throw error;
  }
}

// Get published results count for a student
export async function getStudentPublishedResultsCount(studentId) {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) as count 
       FROM results 
       WHERE student_id = $1 AND published = true`,
      [studentId]
    );
    return parseInt(result.rows[0].count) || 0;
  } catch (error) {
    console.error("Error in getStudentPublishedResultsCount:", error);
    throw error;
  }
}

// Get admin statistics
export async function getAdminStats() {
  try {
    const totalStudents = await pool.query("SELECT COUNT(*) as count FROM students");
    const totalCourses = await pool.query("SELECT COUNT(*) as count FROM courses");
    const totalDepartments = await pool.query("SELECT COUNT(*) as count FROM departments");
    const publishedResults = await pool.query(
      "SELECT COUNT(*) as count FROM results WHERE published = true"
    );

    return {
      totalStudents: parseInt(totalStudents.rows[0].count),
      totalCourses: parseInt(totalCourses.rows[0].count),
      totalDepartments: parseInt(totalDepartments.rows[0].count),
      publishedResults: parseInt(publishedResults.rows[0].count),
    };
  } catch (error) {
    console.error("Error in getAdminStats:", error);
    throw error;
  }
}
