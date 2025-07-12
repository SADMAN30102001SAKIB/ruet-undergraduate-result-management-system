"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getGradeFromMarks } from "@/lib/utils";
import { GraduationCap, ArrowLeft, Trophy, TrendingUp, FileText, Award } from "lucide-react";
import styles from "./page.module.css";

export default function StudentResults() {
  const [resultsData, setResultsData] = useState(null);
  const [cgpaData, setCgpaData] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      await fetchResults();
      await fetchCGPAData();
    };
    fetchData();
  }, []);

  const fetchResults = async () => {
    try {
      const response = await fetch("/api/student/results");
      if (response.ok) {
        const data = await response.json();
        setResultsData(data);
      } else if (response.status === 401) {
        router.push("/student/login");
      }
    } catch (error) {
      console.error("Failed to fetch results:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCGPAData = async () => {
    try {
      const response = await fetch("/api/student/stats");
      if (response.ok) {
        const data = await response.json();
        setCgpaData({
          sgpas: data.sgpas || [],
          cgpa: data.overallCGPA || 0,
          totalCredits: data.totalCredits || 0,
          completedCredits: data.completedCredits || 0,
        });
      }
    } catch (error) {
      console.error("Failed to fetch CGPA data:", error);
    }
  };

  const getGradeBadgeColor = (gradePoint) => {
    if (gradePoint >= 4.0) return styles.gradeAPlus; // A+ (4.00)
    if (gradePoint >= 3.75) return styles.gradeA; // A (3.75)
    if (gradePoint >= 3.5) return styles.gradeAMinus; // A- (3.50)
    if (gradePoint >= 3.25) return styles.gradeBPlus; // B+ (3.25)
    if (gradePoint >= 3.0) return styles.gradeB; // B (3.00)
    if (gradePoint >= 2.75) return styles.gradeBMinus; // B- (2.75)
    if (gradePoint >= 2.5) return styles.gradeCPlus; // C+ (2.50)
    if (gradePoint >= 2.25) return styles.gradeC; // C (2.25)
    if (gradePoint >= 2.0) return styles.gradeD; // D (2.00)
    return styles.gradeF; // F (0.00)
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

  // Group regular results by semester
  const regularResults = resultsData?.regularResults || [];
  const backlogResults = resultsData?.backlogResults || [];

  const resultsBySemester = regularResults.reduce((acc, result) => {
    const key = `Year ${result.year} - ${result.semester}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(result);
    return acc;
  }, {});

  // Group backlog results by semester
  const backlogResultsBySemester = backlogResults.reduce((acc, result) => {
    const key = `Year ${result.year} - ${result.semester}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(result);
    return acc;
  }, {});

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerBrand}>
            <Link href="/student/dashboard" className={styles.backButton}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className={styles.backIcon} />
              </Button>
            </Link>
            <GraduationCap className={styles.brandIcon} />
            <div>
              <h1 className={styles.brandTitle}>Academic Results</h1>
              <p className={styles.brandSubtitle}>
                View your published course results and academic performance
              </p>
            </div>
          </div>
        </header>

        {/* CGPA Overview */}
        <div className={styles.statsGrid}>
          <Card>
            <CardHeader className={styles.statCardHeader}>
              <CardTitle className={styles.statTitle}>
                <Trophy className={`${styles.statIcon} ${styles.statIconYellow}`} />
                CGPA
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={styles.statValue}>{cgpaData?.cgpa.toFixed(2) || "0.00"}</div>
              <div className={styles.statSubtext}>
                Grade: {getGradeFromGradePoint(cgpaData?.cgpa || 0)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className={styles.statCardHeader}>
              <CardTitle className={styles.statTitle}>
                <TrendingUp className={`${styles.statIcon} ${styles.statIconBlue}`} />
                Current SGPA
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={styles.statValue}>
                {cgpaData?.sgpas && cgpaData.sgpas.length > 0
                  ? (() => {
                      // Sort SGPAs by year and semester to find the chronologically latest one
                      const sortedSGPAs = [...cgpaData.sgpas].sort((a, b) => {
                        if (a.year !== b.year) return b.year - a.year; // Latest year first
                        // For same year, even semester comes after odd semester
                        if (a.semester === b.semester) return 0;
                        return a.semester === "even" ? -1 : 1; // even semester is later than odd
                      });
                      return sortedSGPAs[0].sgpa.toFixed(2);
                    })()
                  : "0.00"}
              </div>
              <div className={styles.statSubtext}>Latest Semester</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className={styles.statCardHeader}>
              <CardTitle className={styles.statTitle}>
                <Award className={`${styles.statIcon} ${styles.statIconPurple}`} />
                Credits Earned
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={styles.statValue}>{cgpaData?.completedCredits || 0}</div>
              <div className={styles.statSubtext}>Total: {cgpaData?.totalCredits || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className={styles.statCardHeader}>
              <CardTitle className={styles.statTitle}>
                <FileText className={`${styles.statIcon} ${styles.statIconGreen}`} />
                Published Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={styles.statValue}>{regularResults.length}</div>
              <div className={styles.statSubtext}>Course Results</div>
            </CardContent>
          </Card>
        </div>

        {/* SGPA Trend */}
        {cgpaData?.sgpas && cgpaData.sgpas.length > 0 && (
          <Card className={styles.sgpaTrendCard}>
            <CardHeader>
              <CardTitle className={styles.sgpaTrendTitle}>
                <TrendingUp className={styles.sgpaTrendIcon} />
                Semester-wise Performance
              </CardTitle>
              <CardDescription>Your SGPA trend across semesters</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={styles.sgpaGrid}>
                {cgpaData.sgpas.map((semester, index) => (
                  <div key={index} className={styles.sgpaCard}>
                    <div className={styles.sgpaSemester}>
                      Year {semester.year} - {semester.semester}
                    </div>
                    <div className={styles.sgpaValue}>{semester.sgpa.toFixed(2)}</div>
                    <div className={`${styles.sgpaBadge} ${getGradeBadgeColor(semester.sgpa)}`}>
                      {getGradeFromGradePoint(semester.sgpa)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results by Semester */}
        {loading ? (
          <Card>
            <CardContent className={styles.loadingSection}>
              <div className={styles.loadingContainer}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className={styles.loadingItem}>
                    <div className={styles.loadingBar}></div>
                    <div className={styles.loadingBarShort}></div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : regularResults.length === 0 ? (
          <Card>
            <CardContent className={styles.noResultsSection}>
              <FileText className={styles.noResultsIcon} />
              <h3 className={styles.noResultsTitle}>No Results Published</h3>
              <p className={styles.noResultsDescription}>
                Your course results will appear here once they are published by the administration.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className={styles.resultsContainer}>
            {Object.entries(resultsBySemester).map(([semester, semesterResults]) => (
              <Card key={semester}>
                <CardHeader>
                  <CardTitle className={styles.semesterHeader}>
                    <span>{semester}</span>
                    <span className={styles.courseCount}>
                      {semesterResults.length} Course
                      {semesterResults.length !== 1 ? "s" : ""}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={styles.tableContainer}>
                    <table className={styles.resultsTable}>
                      <thead>
                        <tr className={styles.tableHeaderRow}>
                          <th className={styles.tableHeaderLeft}>Course Code</th>
                          <th className={styles.tableHeaderLeft}>Course Name</th>
                          <th className={styles.tableHeaderCenter}>Credits</th>
                          <th className={styles.tableHeaderCenter}>Grade</th>
                          <th className={styles.tableHeaderCenter}>Grade Point</th>
                        </tr>
                      </thead>
                      <tbody>
                        {semesterResults.map((result) => (
                          <tr key={result.id} className={styles.tableRow}>
                            <td className={styles.tableCellCode}>{result.course_code}</td>
                            <td className={styles.tableCell}>{result.course_name}</td>
                            <td className={styles.tableCellCenter}>{result.credits}</td>
                            <td className={styles.tableCellCenter}>
                              {(() => {
                                const gradeInfo = getGradeFromMarks(result.marks);
                                return (
                                  <span
                                    className={`${styles.gradeBadge} ${getGradeBadgeColor(
                                      gradeInfo.gradePoint
                                    )}`}
                                  >
                                    {gradeInfo.grade}
                                  </span>
                                );
                              })()}
                            </td>
                            <td className={styles.tableCellCenter}>
                              <span className={styles.gradePoint}>
                                {getGradeFromMarks(result.marks).gradePoint.toFixed(2)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Semester Summary */}
                  <div className={styles.semesterSummary}>
                    <div className={styles.summaryGrid}>
                      <div>
                        <span className={styles.summaryLabel}>Credits Earned:</span>
                        <span className={styles.summaryValue}>
                          {semesterResults.reduce((sum, r) => sum + r.credits, 0)}
                        </span>
                      </div>
                      <div>
                        <span className={styles.summaryLabel}>Courses:</span>
                        <span className={styles.summaryValue}>{semesterResults.length}</span>
                      </div>
                    </div>
                  </div>

                  {/* Backlog Results for this semester */}
                  {backlogResultsBySemester[semester] &&
                    backlogResultsBySemester[semester].length > 0 && (
                      <div className={styles.backlogSection}>
                        <div className={styles.backlogHeader}>
                          <div className={styles.backlogLine}></div>
                          <span className={styles.backlogLabel}>Backlog Exams</span>
                          <div className={styles.backlogLine}></div>
                        </div>
                        <div className={styles.backlogTableContainer}>
                          <table className={styles.resultsTable}>
                            <thead>
                              <tr className={styles.backlogTableHeaderRow}>
                                <th className={styles.tableHeaderLeft}>Course Code</th>
                                <th className={styles.tableHeaderLeft}>Course Name</th>
                                <th className={styles.tableHeaderCenter}>Credits</th>
                                <th className={styles.tableHeaderCenter}>Grade</th>
                                <th className={styles.tableHeaderCenter}>Grade Point</th>
                                <th className={styles.tableHeaderCenter}>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {backlogResultsBySemester[semester].map((result) => (
                                <tr key={result.id} className={styles.backlogTableRow}>
                                  <td className={styles.tableCellCode}>{result.course_code}</td>
                                  <td className={styles.tableCell}>{result.course_name}</td>
                                  <td className={styles.tableCellCenter}>{result.credits}</td>
                                  <td className={styles.tableCellCenter}>
                                    {(() => {
                                      const gradeInfo = getGradeFromMarks(result.marks);
                                      return (
                                        <span
                                          className={`${styles.gradeBadge} ${getGradeBadgeColor(
                                            gradeInfo.gradePoint
                                          )}`}
                                        >
                                          {gradeInfo.grade}
                                        </span>
                                      );
                                    })()}
                                  </td>
                                  <td className={styles.tableCellCenter}>
                                    <span className={styles.gradePoint}>
                                      {getGradeFromMarks(result.marks).gradePoint.toFixed(2)}
                                    </span>
                                  </td>
                                  <td className={styles.tableCellCenter}>
                                    {result.marks >= 40 ? (
                                      <span className={styles.statusPassed}>Cleared</span>
                                    ) : (
                                      <span className={styles.statusFailed}>Failed Again</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Academic Performance Notes */}
        <Card className={styles.gradingScaleCard}>
          <CardHeader>
            <CardTitle className={styles.gradingScaleTitle}>RUET Grading Scale</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={styles.gradingGrid}>
              <div className={styles.gradingItem}>
                <span className={`${styles.gradingSwatch} ${styles.gradeAPlus}`}></span>
                <span>A+ (80-100)</span>
              </div>
              <div className={styles.gradingItem}>
                <span className={`${styles.gradingSwatch} ${styles.gradeA}`}></span>
                <span>A (75-79)</span>
              </div>
              <div className={styles.gradingItem}>
                <span className={`${styles.gradingSwatch} ${styles.gradeAMinus}`}></span>
                <span>A- (70-74)</span>
              </div>
              <div className={styles.gradingItem}>
                <span className={`${styles.gradingSwatch} ${styles.gradeBPlus}`}></span>
                <span>B+ (65-69)</span>
              </div>
              <div className={styles.gradingItem}>
                <span className={`${styles.gradingSwatch} ${styles.gradeB}`}></span>
                <span>B (60-64)</span>
              </div>
            </div>
            <div className={`${styles.gradingGrid} ${styles.gradingGridSecond}`}>
              <div className={styles.gradingItem}>
                <span className={`${styles.gradingSwatch} ${styles.gradeBMinus}`}></span>
                <span>B- (55-59)</span>
              </div>
              <div className={styles.gradingItem}>
                <span className={`${styles.gradingSwatch} ${styles.gradeCPlus}`}></span>
                <span>C+ (50-54)</span>
              </div>
              <div className={styles.gradingItem}>
                <span className={`${styles.gradingSwatch} ${styles.gradeC}`}></span>
                <span>C (45-49)</span>
              </div>
              <div className={styles.gradingItem}>
                <span className={`${styles.gradingSwatch} ${styles.gradeD}`}></span>
                <span>D (40-44)</span>
              </div>
              <div className={styles.gradingItem}>
                <span className={`${styles.gradingSwatch} ${styles.gradeF}`}></span>
                <span>F (0-39)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
