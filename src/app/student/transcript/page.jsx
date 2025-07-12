"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePopup } from "@/components/ui/popup";
import { getGradeFromMarks } from "@/lib/utils";
import {
  GraduationCap,
  ArrowLeft,
  TrendingUp,
  Download,
  Award,
  Calendar,
  BookOpen,
} from "lucide-react";
import styles from "./page.module.css";

export default function StudentTranscript() {
  const [student, setStudent] = useState(null);
  const [results, setResults] = useState([]);
  const [effectiveResults, setEffectiveResults] = useState([]);
  const [cgpaData, setCgpaData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showError, PopupComponent } = usePopup();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [profileRes, resultsRes] = await Promise.all([
        fetch("/api/student/profile"),
        fetch("/api/student/results"),
      ]);

      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setStudent(profileData);
      } else {
        console.error("Failed to fetch profile:", profileRes.status);
        if (profileRes.status === 401) {
          showError("Authentication Error", "Please log in as a student to view your transcript.");
          return;
        }
      }

      if (resultsRes.ok) {
        const resultsData = await resultsRes.json();
        setResults(resultsData.results);
        setEffectiveResults(resultsData.effectiveResults || []);
        setCgpaData(resultsData.cgpa);
      } else {
        console.error("Failed to fetch results:", resultsRes.status);
        if (resultsRes.status === 401) {
          showError("Authentication Error", "Please log in as a student to view your results.");
          return;
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      showError("Error", "Failed to fetch transcript data");
    } finally {
      setLoading(false);
    }
  };

  const getGradeColor = (grade) => {
    switch (grade) {
      case "A+":
        return styles.gradeAPlus;
      case "A":
        return styles.gradeA;
      case "A-":
        return styles.gradeAMinus;
      case "B+":
        return styles.gradeBPlus;
      case "B":
        return styles.gradeB;
      case "B-":
        return styles.gradeBMinus;
      case "C+":
        return styles.gradeCPlus;
      case "C":
        return styles.gradeC;
      case "D":
        return styles.gradeD;
      case "F":
        return styles.gradeF;
      default:
        return styles.gradeDefault;
    }
  };

  const getGradeFromGradePoint = (gradePoint) => {
    if (gradePoint >= 4.0) return "A+";
    if (gradePoint >= 3.75) return "A";
    if (gradePoint >= 3.5) return "A-";
    if (gradePoint >= 3.25) return "B+";
    if (gradePoint >= 3.0) return "B";
    if (gradePoint >= 2.75) return "B-";
    if (gradePoint >= 2.5) return "C+";
    if (gradePoint >= 2.25) return "C";
    if (gradePoint >= 2.0) return "D";
    return "F";
  };

  // Group results by year and semester
  const groupedResults = (results || []).reduce((acc, result) => {
    const key = `${result.year}-${result.semester}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(result);
    return acc;
  }, {});

  const downloadTranscript = () => {
    // Create a printable version of the transcript
    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      showError("Error", "Please allow pop-ups to download the transcript");
      return;
    }

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Academic Transcript - ${student?.name}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            line-height: 1.6;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
          }
          .student-info {
            margin-bottom: 30px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }
          .semester-section {
            margin-bottom: 25px;
          }
          .semester-title {
            background: #f5f5f5;
            padding: 10px;
            margin-bottom: 15px;
            font-weight: bold;
            border-left: 4px solid #007bff;
          }
          .results-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
          }
          .results-table th,
          .results-table td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          .results-table th {
            background-color: #f2f2f2;
            font-weight: bold;
          }
          .summary {
            margin-top: 30px;
            padding: 20px;
            background: #f9f9f9;
            border: 1px solid #ddd;
          }
          .summary-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
          }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>ACADEMIC TRANSCRIPT</h1>
          <h2>Rajshahi University of Engineering & Technology (RUET)</h2>
        </div>
        
        <div class="student-info">
          <div><strong>Name:</strong> ${student?.name || "N/A"}</div>
          <div><strong>Roll Number:</strong> ${student?.roll_number || "N/A"}</div>
          <div><strong>Registration:</strong> ${student?.registration_number || "N/A"}</div>
          <div><strong>Department:</strong> ${student?.department_name || "N/A"}</div>
          <div><strong>Session:</strong> ${student?.academic_session || "N/A"}</div>
          <div><strong>Current Year:</strong> ${student?.current_year || "N/A"}</div>
        </div>
        
        ${Object.entries(groupedResults)
          .map(([key, semesterResults]) => {
            const [year, semester] = key.split("-");
            const sgpa =
              cgpaData?.sgpas.find((s) => s.year === parseInt(year) && s.semester === semester)
                ?.sgpa || 0;

            return `
            <div class="semester-section">
              <div class="semester-title">Year ${year} - ${
              semester.charAt(0).toUpperCase() + semester.slice(1)
            } Semester (SGPA: ${sgpa.toFixed(2)})</div>
              <table class="results-table">
                <thead>
                  <tr>
                    <th>Course Code</th>
                    <th>Course Name</th>
                    <th>Credits</th>
                    <th>Marks</th>
                    <th>Grade</th>
                    <th>Grade Point</th>
                  </tr>
                </thead>
                <tbody>
                  ${semesterResults
                    .sort((a, b) => {
                      // Primary sort: Pass/Fail status (passed courses first)
                      const aGrade = getGradeFromMarks(a.marks);
                      const bGrade = getGradeFromMarks(b.marks);
                      const aIsPassed = aGrade.gradePoint > 0;
                      const bIsPassed = bGrade.gradePoint > 0;

                      if (aIsPassed !== bIsPassed) {
                        return bIsPassed ? 1 : -1; // Passed courses first
                      }

                      // Secondary sort: Backlog status (regular results before backlog)
                      if (a.is_backlog !== b.is_backlog) {
                        return a.is_backlog ? 1 : -1; // Regular results first
                      }

                      // Tertiary sort: Course code (alphabetical)
                      const codeComparison = a.course_code.localeCompare(b.course_code);
                      if (codeComparison !== 0) return codeComparison;

                      // Final sort: Course name
                      return a.course_name.localeCompare(b.course_name);
                    })
                    .map((result) => {
                      const gradeInfo = getGradeFromMarks(result.marks);
                      return `
                      <tr>
                        <td>${result.course_code}</td>
                        <td>${result.course_name}${result.is_backlog ? " (Backlog)" : ""}</td>
                        <td>${result.credits}</td>
                        <td>${result.marks}</td>
                        <td>${gradeInfo.grade}</td>
                        <td>${gradeInfo.gradePoint}</td>
                      </tr>
                    `;
                    })
                    .join("")}
                </tbody>
              </table>
            </div>
          `;
          })
          .join("")}
        
        <div class="summary">
          <h3>Academic Summary</h3>
          <div class="summary-grid">
            <div><strong>Total Semesters Completed:</strong> ${cgpaData?.sgpas?.length || 0}</div>
            <div><strong>Cumulative GPA (CGPA):</strong> ${
              cgpaData?.cgpa?.toFixed(2) || "0.00"
            }</div>
            <div><strong>Final Grade:</strong> ${
              cgpaData?.cgpa ? getGradeFromGradePoint(cgpaData.cgpa) : "N/A"
            }</div>
            <div><strong>Generated on:</strong> ${new Date().toLocaleDateString()}</div>
          </div>
        </div>
        
        <div class="no-print" style="margin-top: 30px; text-align: center;">
          <button onclick="window.print()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Print / Save as PDF
          </button>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();

    // Auto-focus the print window
    printWindow.focus();
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingText}>Loading transcript...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <Link href="/student/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className={styles.icon5} />
              </Button>
            </Link>
            <GraduationCap className={styles.headerIcon} />
            <div>
              <h1 className={styles.headerTitle}>Academic Transcript</h1>
              <p className={styles.headerSubtitle}>Complete academic record</p>
            </div>
          </div>
          <div className={styles.headerRight}>
            <Button variant="outline" onClick={downloadTranscript}>
              <Download className={styles.downloadIcon} />
              Download PDF
            </Button>
          </div>
        </header>

        {/* Student Info */}
        {student && (
          <Card className={styles.cardSpacing}>
            <CardHeader>
              <CardTitle className={styles.flexCenter}>
                <Award className={styles.icon5} />
                Student Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={styles.studentInfoGrid}>
                <div className={styles.infoItem}>
                  <p className={styles.infoLabel}>Name</p>
                  <p className={styles.infoValue}>{student.name}</p>
                </div>
                <div className={styles.infoItem}>
                  <p className={styles.infoLabel}>Roll Number</p>
                  <p className={styles.infoValue}>{student.roll_number}</p>
                </div>
                <div className={styles.infoItem}>
                  <p className={styles.infoLabel}>Registration Number</p>
                  <p className={styles.infoValue}>{student.registration_number}</p>
                </div>
                <div className={styles.infoItem}>
                  <p className={styles.infoLabel}>Department</p>
                  <p className={styles.infoValue}>{student.department_name}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* CGPA Summary */}
        {cgpaData && (
          <Card className={styles.cardSpacing}>
            <CardHeader>
              <CardTitle className={styles.flexCenter}>
                <TrendingUp className={styles.icon5} />
                Academic Performance Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={styles.performanceGrid}>
                <div className={styles.performanceItem}>
                  <p className={styles.performanceLabel}>Overall CGPA</p>
                  <div className={styles.performanceValue}>{cgpaData.cgpa.toFixed(2)}</div>
                  <p
                    className={`${styles.gradeDisplay} ${getGradeColor(
                      getGradeFromGradePoint(cgpaData.cgpa)
                    )}`}
                  >
                    Grade: {getGradeFromGradePoint(cgpaData.cgpa)}
                  </p>
                </div>
                <div className={styles.performanceItem}>
                  <p className={styles.performanceLabel}>Total Credits</p>
                  <div className={styles.performanceValue}>
                    {effectiveResults?.reduce((sum, r) => sum + r.credits, 0) || 0}
                  </div>
                  <p className={styles.performanceSubtext}>Credits Completed</p>
                </div>
                <div className={styles.performanceItem}>
                  <p className={styles.performanceLabel}>Courses Completed</p>
                  <div className={styles.performanceValue}>{effectiveResults?.length || 0}</div>
                  <p className={styles.performanceSubtext}>Total Courses</p>
                </div>
              </div>

              {/* Semester-wise SGPA */}
              <div className={styles.semesterPerformance}>
                <h4 className={styles.semesterTitle}>Semester-wise Performance</h4>
                <div className={styles.semesterGrid}>
                  {cgpaData.sgpas.map((sgpa, index) => (
                    <div key={index} className={styles.semesterCard}>
                      <p className={styles.semesterLabel}>
                        Year {sgpa.year} -{" "}
                        {sgpa.semester.charAt(0).toUpperCase() + sgpa.semester.slice(1)}
                      </p>
                      <p className={styles.semesterSgpa}>{sgpa.sgpa.toFixed(2)}</p>
                      <p
                        className={`${styles.semesterGrade} ${getGradeColor(
                          getGradeFromGradePoint(sgpa.sgpa)
                        )}`}
                      >
                        {getGradeFromGradePoint(sgpa.sgpa)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Detailed Results */}
        <div className={styles.resultsSection}>
          {Object.entries(groupedResults)
            .sort(([a], [b]) => {
              const [yearA, semA] = a.split("-");
              const [yearB] = b.split("-");
              const yearDiff = parseInt(yearA) - parseInt(yearB);
              if (yearDiff !== 0) return yearDiff;
              return semA === "odd" ? -1 : 1;
            })
            .map(([key, semesterResults]) => {
              const [year, semester] = key.split("-");
              const semesterSGPA = cgpaData?.sgpas.find(
                (s) => s.year === parseInt(year) && s.semester === semester
              );

              return (
                <Card key={key} className={styles.resultCard}>
                  <CardHeader>
                    <CardTitle className={styles.resultCardHeader}>
                      <div className={styles.resultCardTitle}>
                        <Calendar className={styles.resultIcon} />
                        Year {year} - {semester.charAt(0).toUpperCase() + semester.slice(1)}{" "}
                        Semester
                      </div>
                      {semesterSGPA && (
                        <div className={styles.sgpaDisplay}>
                          SGPA:{" "}
                          <span className={styles.sgpaValue}>{semesterSGPA.sgpa.toFixed(2)}</span>
                        </div>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={styles.resultsTable}>
                      <table className={styles.table}>
                        <thead>
                          <tr className={styles.tableHeader}>
                            <th className={styles.tableHeaderCell}>Course Code</th>
                            <th className={styles.tableHeaderCell}>Course Name</th>
                            <th className={styles.tableHeaderCellCenter}>Credits</th>
                            <th className={styles.tableHeaderCellCenter}>Grade Point</th>
                            <th className={styles.tableHeaderCellCenter}>Grade</th>
                          </tr>
                        </thead>
                        <tbody>
                          {semesterResults
                            .sort((a, b) => {
                              // Primary sort: Pass/Fail status (passed courses first)
                              const aGrade = getGradeFromMarks(a.marks);
                              const bGrade = getGradeFromMarks(b.marks);
                              const aIsPassed = aGrade.gradePoint > 0;
                              const bIsPassed = bGrade.gradePoint > 0;

                              if (aIsPassed !== bIsPassed) {
                                return bIsPassed ? 1 : -1; // Passed courses first
                              }

                              // Secondary sort: Backlog status (regular results before backlog)
                              if (a.is_backlog !== b.is_backlog) {
                                return a.is_backlog ? 1 : -1; // Regular results first
                              }

                              // Tertiary sort: Course code (alphabetical)
                              const codeComparison = a.course_code.localeCompare(b.course_code);
                              if (codeComparison !== 0) return codeComparison;

                              // Final sort: Course name
                              return a.course_name.localeCompare(b.course_name);
                            })
                            .map((result) => {
                              const gradeInfo = getGradeFromMarks(result.marks);
                              return (
                                <tr key={result.id} className={styles.tableRow}>
                                  <td className={styles.tableCell}>
                                    <span className={styles.courseCode}>{result.course_code}</span>
                                  </td>
                                  <td className={styles.tableCell}>
                                    <span className={styles.courseName}>
                                      {result.course_name}
                                      {result.is_backlog && (
                                        <span className={styles.backlogIndicator}> (Backlog)</span>
                                      )}
                                    </span>
                                  </td>
                                  <td className={styles.tableCellCenter}>
                                    <span className={styles.credits}>{result.credits}</span>
                                  </td>
                                  <td className={styles.tableCellCenter}>
                                    <span className={styles.gradePoint}>
                                      {gradeInfo.gradePoint.toFixed(2)}
                                    </span>
                                  </td>
                                  <td className={styles.tableCellCenter}>
                                    <span
                                      className={`${styles.gradeBadge} ${getGradeColor(
                                        gradeInfo.grade
                                      )}`}
                                    >
                                      {gradeInfo.grade}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>

        {(results?.length || 0) === 0 && (
          <Card>
            <CardContent className={styles.noResults}>
              <BookOpen className={styles.noResultsIcon} />
              <p className={styles.noResultsTitle}>No results available yet</p>
              <p className={styles.noResultsSubtitle}>
                Your academic results will appear here once published by the administration
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Popup Component */}
      <PopupComponent />
    </div>
  );
}
