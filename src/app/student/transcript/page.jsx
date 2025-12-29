"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePopup } from "@/components/ui/popup";
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
  const [registeredCourses, setRegisteredCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showError, PopupComponent } = usePopup();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [profileRes, resultsRes, registrationsRes] = await Promise.all([
        fetch("/api/student/profile"),
        fetch("/api/student/results"),
        fetch("/api/student/registrations?all=true"),
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

      if (registrationsRes.ok) {
        const registrationsData = await registrationsRes.json();
        setRegisteredCourses(registrationsData.courses || []);
      } else {
        console.error("Failed to fetch registrations:", registrationsRes.status);
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

  const downloadTranscript = async () => {
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({
        orientation: "p",
        unit: "mm",
        format: "a4"
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      let yPosition = 0;

      const drawHeader = (pageNumber) => {
        // --- RUET HEADER ---
        doc.setFont("times", "normal");
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0); // Changed from 60, 60, 60
        doc.text("Rajshahi University of Engineering & Technology (RUET)", pageWidth / 2, 15, { align: "center" });
        
        doc.setFont("times", "bold");
        doc.setFontSize(22);
        doc.setTextColor(0, 0, 0);
        doc.text("OFFICE OF THE REGISTRAR", pageWidth / 2, 25, { align: "center" });
        
        doc.setFont("times", "italic");
        doc.setFontSize(9);
        doc.setTextColor(20, 20, 20); // Very dark grey, almost black
        doc.text("Kazla, Rajshahi-6204, Bangladesh", pageWidth / 2, 31, { align: "center" });
        
        doc.setLineWidth(0.5);
        doc.setDrawColor(0);
        doc.line(margin, 36, pageWidth - margin, 36);

        doc.setFont("times", "bold");
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text("OFFICIAL ACADEMIC TRANSCRIPT", pageWidth / 2, 45, { align: "center" });
        
        return 55; // Next yPosition
      };

      yPosition = drawHeader(1);

      // --- STUDENT INFO ---
      const infoRows = [
        {
          left: { label: "Student Name:", value: student?.name?.toUpperCase() || "N/A" },
          right: { label: "Department:", value: student?.department_name || "N/A" }
        },
        {
          left: { label: "Roll Number:", value: student?.roll_number || "N/A" },
          right: { label: "Academic Session:", value: student?.academic_session || "N/A" }
        },
        {
          left: { label: "Registration No:", value: student?.registration_number || "N/A" },
          right: { label: "Degree Sought:", value: "Bachelor of Science in Engineering" }
        }
      ];

      infoRows.forEach((row) => {
        doc.setFont("times", "bold");
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0); // Pure black labels
        
        // Split text to sizes
        const leftValLines = doc.splitTextToSize(row.left.value, pageWidth / 2 - margin - 35);
        const rightValLines = doc.splitTextToSize(row.right.value, pageWidth - margin - (pageWidth / 2 + 45));
        
        // Calculate row height based on max lines - Tightened spacing
        const rowHeight = Math.max(leftValLines.length, rightValLines.length) * 4.2 + 2;

        // Draw Left Column
        doc.setFont("times", "bold");
        doc.text(row.left.label, margin, yPosition);
        doc.setFont("times", "normal");
        doc.setTextColor(0, 0, 0); // Pure black values
        doc.text(leftValLines, margin + 35, yPosition);

        // Draw Right Column
        doc.setFont("times", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text(row.right.label, pageWidth / 2 + 5, yPosition);
        doc.setFont("times", "normal");
        doc.text(rightValLines, pageWidth / 2 + 45, yPosition);

        yPosition += rowHeight;
      });

      yPosition += 6;

      // --- RESULTS TABLES ---
      const sortedSemesterKeys = Object.keys(groupedResults).sort((a, b) => {
        const [yA, sA] = a.split("-");
        const [yB] = b.split("-");
        const yDiff = parseInt(yA) - parseInt(yB);
        if (yDiff !== 0) return yDiff;
        return sA === "odd" ? -1 : 1;
      });

      for (const key of sortedSemesterKeys) {
        const semesterResults = groupedResults[key];
        const [year, semester] = key.split("-");
        const sgpa = cgpaData?.sgpas.find((s) => s.year === parseInt(year) && s.semester === semester)?.sgpa || 0;

        // Check for page break before semester header
        if (yPosition + 30 > pageHeight - margin) {
          doc.addPage();
          yPosition = drawHeader();
        }

        // Semester Header
        doc.setDrawColor(0);
        doc.setTextColor(0, 0, 0);
        doc.rect(margin, yPosition, pageWidth - (margin * 2), 8, "D");
        
        doc.setFont("times", "bold");
        doc.setFontSize(10);
        doc.text(`YEAR ${year}, ${semester.toUpperCase()} SEMESTER`, margin + 3, yPosition + 5.5);
        doc.text(`SGPA: ${sgpa.toFixed(2)}`, pageWidth - margin - 3, yPosition + 5.5, { align: "right" });
        
        yPosition += 8;

        // Table Header
        const colWidths = [25, 85, 20, 20, 20]; // Code, Title, Credits, Grade, Points
        const colStarts = [margin, margin + 25, margin + 110, margin + 130, margin + 150];
        const headers = ["CODE", "COURSE TITLE", "CREDITS", "GRADE", "POINTS"];

        doc.rect(margin, yPosition, pageWidth - (margin * 2), 8, "D");
        
        headers.forEach((h, i) => {
          doc.setFontSize(8);
          doc.setTextColor(0, 0, 0);
          if (i >= 2) {
            doc.text(h, colStarts[i] + (colWidths[i] / 2), yPosition + 5.5, { align: "center" });
          } else {
            doc.text(h, colStarts[i] + 3, yPosition + 5.5);
          }
        });

        yPosition += 8;
        doc.setFont("times", "normal");

        // Table Rows
        const sortedResults = [...semesterResults].sort((a, b) => {
          const aIsPassed = a.gradePoint > 0;
          const bIsPassed = b.gradePoint > 0;
          if (aIsPassed !== bIsPassed) return bIsPassed ? 1 : -1;
          if (a.is_backlog !== b.is_backlog) return a.is_backlog ? 1 : -1;
          return a.course_code.localeCompare(b.course_code);
        });

        for (const result of sortedResults) {
          const titleLines = doc.splitTextToSize(
            result.course_name + (result.is_backlog ? " (Backlog)" : ""), 
            colWidths[1] - 6
          );
          const rowHeight = Math.max(7, titleLines.length * 4.5 + 2);

          if (yPosition + rowHeight > pageHeight - margin - 20) {
            doc.addPage();
            yPosition = drawHeader();
            // Re-draw table header on new page
            doc.rect(margin, yPosition, pageWidth - (margin * 2), 8, "D");
            headers.forEach((h, i) => {
              doc.setFontSize(8);
              doc.setTextColor(0, 0, 0);
              if (i >= 2) doc.text(h, colStarts[i] + (colWidths[i] / 2), yPosition + 5.5, { align: "center" });
              else doc.text(h, colStarts[i] + 3, yPosition + 5.5);
            });
            yPosition += 8;
            doc.setFont("times", "normal");
          }

          doc.rect(margin, yPosition, pageWidth - (margin * 2), rowHeight, "D");
          doc.setFontSize(9);
          doc.setTextColor(0, 0, 0);
          doc.text(result.course_code, colStarts[0] + 3, yPosition + 5);
          doc.text(titleLines, colStarts[1] + 3, yPosition + 5);
          doc.text(parseFloat(result.credits).toFixed(2), colStarts[2] + (colWidths[2] / 2), yPosition + 5, { align: "center" });
          doc.setFont("times", "bold");
          doc.text(result.grade, colStarts[3] + (colWidths[3] / 2), yPosition + 5, { align: "center" });
          doc.setFont("times", "normal");
          doc.text(result.gradePoint.toFixed(2), colStarts[4] + (colWidths[4] / 2), yPosition + 5, { align: "center" });

          yPosition += rowHeight;
        }

        yPosition += 10; // Space between semesters
      }

      // --- SUMMARY BOX ---
      if (yPosition + 35 > pageHeight - margin - 40) {
        doc.addPage();
        yPosition = drawHeader();
      }

      doc.setDrawColor(0);
      doc.setTextColor(0, 0, 0);
      doc.setLineWidth(0.3);
      doc.rect(margin, yPosition, pageWidth - (margin * 2), 25, "D");

      doc.setFont("times", "bold");
      doc.setFontSize(10);
      doc.text(`TOTAL COMPLETED SEMESTERS: ${cgpaData?.sgpas?.length || 0}`, margin + 5, yPosition + 8);
      doc.text(`CUMULATIVE GPA (CGPA): ${cgpaData?.cgpa?.toFixed(2) || "0.00"}`, pageWidth - margin - 5, yPosition + 8, { align: "right" });
      
      const totalCredits = effectiveResults?.reduce((sum, r) => r.grade !== "F" ? sum + r.credits : sum, 0) || 0;
      doc.text(`TOTAL CREDITS EARNED: ${totalCredits.toFixed(2)}`, margin + 5, yPosition + 17);
      doc.text(`TRANSCRIPT DATE: ${new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()}`, pageWidth - margin - 5, yPosition + 17, { align: "right" });

      yPosition += 45;

      // --- SIGNATURES ---
      const sigWidth = 45;
      const sigY = pageHeight - 35;
      
      const sigs = ["Prepared By", "Verified By", "Controller of Examinations"];
      const sigPositions = [margin, pageWidth / 2 - (sigWidth / 2), pageWidth - margin - sigWidth];

      sigs.forEach((label, i) => {
        doc.setLineWidth(0.3);
        doc.line(sigPositions[i], sigY, sigPositions[i] + sigWidth, sigY);
        doc.setFont("times", "bold");
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0); // Black signatures
        doc.text(label, sigPositions[i] + (sigWidth / 2), sigY + 5, { align: "center" });
      });

      doc.save(`Transcript_${student?.roll_number || "RUET"}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      showError("PDF Error", "Failed to generate transcript PDF. Please try again.");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* Header - Always visible */}
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
            <Button variant="outline" onClick={downloadTranscript} disabled={loading}>
              <Download className={styles.downloadIcon} />
              Download PDF
            </Button>
          </div>
        </header>

        {loading ? (
          <div className={styles.loadingContainer}>
            {/* Profile Skeleton */}
            <div className={styles.loadingCardSkeleton}>
              <div className={styles.skeletonHeader}></div>
              <div className={styles.profileGrid} style={{ gap: "1rem" }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className={styles.skeletonText} style={{ height: "1.5rem" }}></div>
                ))}
              </div>
            </div>

            {/* Performance Summary Skeleton */}
            <div className={styles.loadingCardSkeleton} style={{ padding: "2rem" }}>
              <div className={styles.skeletonHeader} style={{ margin: "0 auto 1.5rem" }}></div>
              <div className={styles.performanceGrid} style={{ gap: "2rem" }}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <div className={styles.skeletonText} style={{ width: "80px", height: "1rem" }}></div>
                    <div className={styles.skeletonText} style={{ width: "100px", height: "2.5rem" }}></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Semester Performance Skeleton */}
            <div className={styles.loadingCardSkeleton}>
              <div className={styles.skeletonHeader}></div>
              <div className={styles.semesterGrid} style={{ gap: "1.5rem" }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className={styles.semesterCard} style={{ backgroundColor: 'rgb(0 0 0 / 0.05)', padding: "1.5rem" }}>
                    <div className={styles.skeletonText} style={{ height: "1.25rem", marginBottom: "0.5rem" }}></div>
                    <div className={styles.skeletonText} style={{ height: "2rem", width: "60%", margin: "0 auto" }}></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Results Table Skeleton */}
            <div className={styles.loadingCardSkeleton} style={{ marginTop: "2rem" }}>
              <div className={styles.skeletonHeader} style={{ width: "300px" }}></div>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className={styles.skeletonText} style={{ height: "1.5rem" }}></div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
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

            {/* Academic Performance Summary */}
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
                      <p className={styles.performanceLabel}>Cumulative GPA</p>
                      <div className={styles.performanceValue}>{cgpaData.cgpa.toFixed(2)}</div>
                    </div>
                    <div className={styles.performanceItem}>
                      <p className={styles.performanceLabel}>Credits Earned</p>
                      <div className={styles.performanceValue}>
                        {effectiveResults?.reduce((sum, r) => {
                          return r.grade !== "F" ? sum + r.credits : sum;
                        }, 0) || 0}
                      </div>
                      <p className={styles.performanceSubtext}>Credits Completed</p>
                    </div>
                    <div className={styles.performanceItem}>
                      <p className={styles.performanceLabel}>Courses Completed</p>
                      <div className={styles.performanceValue}>{effectiveResults?.length || 0}</div>
                      <p className={styles.performanceSubtext}>Total Courses</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Semester-wise Performance */}
            {cgpaData && cgpaData.sgpas && cgpaData.sgpas.length > 0 && (
              <Card className={styles.cardSpacing}>
                <CardHeader>
                  <CardTitle className={styles.flexCenter}>
                    <TrendingUp className={styles.icon5} />
                    Semester-wise Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
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
                                <th className={styles.tableHeaderCellCenter}>Grade</th>
                                <th className={styles.tableHeaderCellCenter}>Grade Point</th>
                              </tr>
                            </thead>
                            <tbody>
                              {semesterResults
                                .sort((a, b) => {
                                  const aIsPassed = a.gradePoint > 0;
                                  const bIsPassed = b.gradePoint > 0;

                                  if (aIsPassed !== bIsPassed) {
                                    return bIsPassed ? 1 : -1;
                                  }

                                  if (a.is_backlog !== b.is_backlog) {
                                    return a.is_backlog ? 1 : -1;
                                  }

                                  const codeComparison = a.course_code.localeCompare(b.course_code);
                                  if (codeComparison !== 0) return codeComparison;

                                  return a.course_name.localeCompare(b.course_name);
                                })
                                .map((result) => {
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
                                        <span className={styles.credits}>{parseFloat(result.credits).toFixed(2)}</span>
                                      </td>
                                      <td className={styles.tableCellCenter}>
                                        <span
                                          className={`${styles.gradeBadge} ${getGradeColor(
                                            result.grade
                                          )}`}
                                        >
                                          {result.grade}
                                        </span>
                                      </td>
                                      <td className={styles.tableCellCenter}>
                                        <span className={styles.gradePoint}>
                                          {result.gradePoint.toFixed(2)}
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
          </>
        )}
      </div>

      {/* Popup Component */}
      <PopupComponent />
    </div>
  );
}
