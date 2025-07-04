"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePopup } from "@/components/ui/popup";
import { getGradeFromMarks } from "@/lib/utils";
import {
  GraduationCap,
  ArrowLeft,
  BookOpen,
  CheckCircle,
  User,
  Calendar,
  Award,
  Plus,
  Minus,
} from "lucide-react";
import styles from "./page.module.css";

export default function StudentCoursesManagement({ params }) {
  const [student, setStudent] = useState(null);
  const [registeredCourses, setRegisteredCourses] = useState([]);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const { showError, showConfirm, PopupComponent } = usePopup();

  const [resolvedParams, setResolvedParams] = useState(null);

  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  const fetchStudentData = async () => {
    if (!resolvedParams?.id) return;

    try {
      const response = await fetch(`/api/admin/students/${resolvedParams.id}`);
      if (response.ok) {
        const data = await response.json();
        setStudent(data);
      } else {
        showError("Error", "Failed to fetch student data");
      }
    } catch (error) {
      console.error("Failed to fetch student:", error);
      showError("Error", "Failed to fetch student data");
    }
  };

  const fetchCourses = async () => {
    if (!resolvedParams?.id) return;

    try {
      setLoading(true);

      // Fetch registered courses
      const registeredResponse = await fetch(`/api/admin/students/${resolvedParams.id}/courses`);
      if (registeredResponse.ok) {
        const registeredData = await registeredResponse.json();
        setRegisteredCourses(registeredData.courses || []);
      }

      // Fetch available courses for current semester
      const availableResponse = await fetch(
        `/api/admin/students/${resolvedParams.id}/available-courses`
      );
      if (availableResponse.ok) {
        const availableData = await availableResponse.json();
        setAvailableCourses(availableData.courses || []);
      }
    } catch (error) {
      console.error("Failed to fetch courses:", error);
      showError("Error", "Failed to fetch courses");
    } finally {
      setLoading(false);
    }
  };

  const refreshCoursesData = async () => {
    if (!resolvedParams?.id) return;

    try {
      // Fetch registered courses without loading state
      const registeredResponse = await fetch(`/api/admin/students/${resolvedParams.id}/courses`);
      if (registeredResponse.ok) {
        const registeredData = await registeredResponse.json();
        setRegisteredCourses(registeredData.courses || []);
      }

      // Fetch available courses for current semester
      const availableResponse = await fetch(
        `/api/admin/students/${resolvedParams.id}/available-courses`
      );
      if (availableResponse.ok) {
        const availableData = await availableResponse.json();
        setAvailableCourses(availableData.courses || []);
      }
    } catch (error) {
      console.error("Failed to refresh courses:", error);
      showError("Error", "Failed to refresh courses");
    }
  };

  useEffect(() => {
    if (resolvedParams?.id) {
      fetchStudentData();
      fetchCourses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedParams?.id]);

  const handleRegister = async (courseId, courseName) => {
    if (!resolvedParams?.id) return;

    showConfirm(
      "Register Student for Course",
      `Are you sure you want to register ${student?.name} for "${courseName}"?`,
      async () => {
        setActionLoading(courseId);
        try {
          const response = await fetch(`/api/admin/students/${resolvedParams.id}/courses`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ courseId }),
          });

          if (response.ok) {
            await refreshCoursesData(); // Refresh courses without loading state
          } else {
            const data = await response.json();
            showError("Error", data.error || "Failed to register for course");
          }
        } catch (error) {
          console.error("Registration error:", error);
          showError("Error", "Failed to register for course");
        } finally {
          setActionLoading(null);
        }
      }
    );
  };

  const handleUnregister = async (courseId, courseName, hasResult) => {
    if (!resolvedParams?.id) return;

    if (hasResult) {
      showError("Cannot Unregister", "Cannot unregister from courses that have published results.");
      return;
    }

    showConfirm(
      "Unregister Student from Course",
      `Are you sure you want to unregister ${student?.name} from "${courseName}"?`,
      async () => {
        setActionLoading(courseId);
        try {
          const response = await fetch(
            `/api/admin/students/${resolvedParams.id}/courses/${courseId}`,
            {
              method: "DELETE",
            }
          );

          if (response.ok) {
            await refreshCoursesData(); // Refresh courses without loading state
          } else {
            const data = await response.json();
            showError("Error", data.error || "Failed to unregister from course");
          }
        } catch (error) {
          console.error("Unregistration error:", error);
          showError("Error", "Failed to unregister from course");
        } finally {
          setActionLoading(null);
        }
      }
    );
  };

  // Group courses by semester and year
  const groupCoursesBySemester = (courses) => {
    return courses.reduce((acc, course) => {
      const key = `Year ${course.year} - ${course.semester}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(course);
      return acc;
    }, {});
  };

  const isCurrentSemester = (year, semester) => {
    return student && year === student.current_year && semester === student.current_semester;
  };

  if (loading || !student) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingText}>Loading...</div>
      </div>
    );
  }

  const registeredGrouped = groupCoursesBySemester(registeredCourses);

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <Link href="/admin/students">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <GraduationCap className={styles.headerIcon} />
            <div>
              <h1 className={styles.headerTitle}>Course Management</h1>
              <p className={styles.headerSubtitle}>
                Manage course registrations for {student.name}
              </p>
            </div>
          </div>
        </header>

        {/* Student Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className={styles.cardTitle}>
              <User className="h-5 w-5 mr-2" />
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
                <p className={styles.infoLabel}>Current Semester</p>
                <p className={styles.infoValue}>
                  Year {student.current_year} - {student.current_semester}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Registered Courses */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className={styles.cardTitle}>
              <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
              Registered Courses
            </CardTitle>
            <CardDescription>Courses the student is currently registered for</CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(registeredGrouped).length === 0 ? (
              <p className={styles.emptyState}>No registered courses found.</p>
            ) : (
              <div className={styles.sectionSpacing}>
                {Object.entries(registeredGrouped)
                  .sort(([a], [b]) => {
                    const [yearA, semA] = a.split(" - ");
                    const [yearB] = b.split(" - ");
                    const yearDiff = parseInt(yearA.split(" ")[1]) - parseInt(yearB.split(" ")[1]);
                    if (yearDiff !== 0) return yearDiff;
                    return semA === "odd" ? -1 : 1;
                  })
                  .map(([semester, courses]) => {
                    const [year, sem] = semester.split(" - ");
                    const yearNum = parseInt(year.split(" ")[1]);
                    const isCurrent = isCurrentSemester(yearNum, sem);

                    return (
                      <div key={semester}>
                        <h3 className={styles.semesterHeader}>
                          <Calendar className="h-4 w-4 mr-2" />
                          {semester}
                          {isCurrent && <span className={styles.currentBadge}>Current</span>}
                        </h3>
                        <div className={styles.tableContainer}>
                          <table className={styles.table}>
                            <thead>
                              <tr className={styles.tableHeader}>
                                <th className={styles.tableHeaderCell}>Course Code</th>
                                <th className={styles.tableHeaderCell}>Course Name</th>
                                <th className={styles.tableHeaderCellCenter}>Credits</th>
                                <th className={styles.tableHeaderCellCenter}>Type</th>
                                <th className={styles.tableHeaderCellCenter}>Status</th>
                                {isCurrent && (
                                  <th className={styles.tableHeaderCellCenter}>Actions</th>
                                )}
                              </tr>
                            </thead>
                            <tbody>
                              {courses.map((course, index) => {
                                const gradeInfo =
                                  course.marks !== undefined
                                    ? getGradeFromMarks(course.marks)
                                    : null;
                                const isPassing = gradeInfo ? gradeInfo.gradePoint > 0 : false;
                                const showUnregisterBtn = !course.has_result && isCurrent;

                                return (
                                  <tr
                                    key={`${course.id}-${course.is_backlog || "regular"}-${index}`}
                                    className={`${styles.tableRow} ${
                                      course.is_backlog ? styles.tableRowBacklog : ""
                                    }`}
                                  >
                                    <td className={styles.tableCell}>
                                      <span className={styles.courseCode}>
                                        {course.course_code}
                                      </span>
                                    </td>
                                    <td className={styles.tableCell}>{course.course_name}</td>
                                    <td className={styles.tableCellCenter}>{course.credits}</td>
                                    <td className={styles.tableCellCenter}>
                                      {course.has_result ? (
                                        <span
                                          className={`${styles.badge} ${
                                            course.is_backlog
                                              ? styles.badgeBacklog
                                              : styles.badgeRegular
                                          }`}
                                        >
                                          {course.is_backlog ? "Backlog" : "Regular"}
                                        </span>
                                      ) : (
                                        <span className={`${styles.badge} ${styles.badgeRegular}`}>
                                          Regular
                                        </span>
                                      )}
                                    </td>
                                    <td className={styles.tableCellCenter}>
                                      {course.published && course.marks !== undefined ? (
                                        <span
                                          className={`${styles.statusContainer} ${
                                            isPassing ? styles.statusPassing : styles.statusFailing
                                          }`}
                                        >
                                          <Award className="h-4 w-4 mr-1" />
                                          {gradeInfo?.grade}
                                        </span>
                                      ) : course.has_result ? (
                                        <span className={styles.statusPending}>Pending</span>
                                      ) : (
                                        <span className={styles.statusNotAttempted}>
                                          Not Attempted
                                        </span>
                                      )}
                                    </td>
                                    {isCurrent && (
                                      <td className={styles.tableCellCenter}>
                                        {showUnregisterBtn ? (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className={styles.buttonDanger}
                                            onClick={() =>
                                              handleUnregister(
                                                course.course_id || course.id,
                                                course.course_name,
                                                !!course.has_result
                                              )
                                            }
                                            disabled={
                                              actionLoading === (course.course_id || course.id)
                                            }
                                          >
                                            {actionLoading === (course.course_id || course.id) ? (
                                              "Removing..."
                                            ) : (
                                              <>
                                                <Minus className="h-4 w-4 mr-1" />
                                                Unregister
                                              </>
                                            )}
                                          </Button>
                                        ) : (
                                          <span className={styles.disabledAction}>
                                            {course.has_result ? "Has Result" : "N/A"}
                                          </span>
                                        )}
                                      </td>
                                    )}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Available Courses */}
        <Card>
          <CardHeader>
            <CardTitle className={styles.cardTitle}>
              <BookOpen className="h-5 w-5 mr-2 text-blue-600" />
              Available Courses
            </CardTitle>
            <CardDescription>Courses available for current semester registration</CardDescription>
          </CardHeader>
          <CardContent>
            {availableCourses.length === 0 ? (
              <p className={styles.emptyState}>No available courses found for registration.</p>
            ) : (
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr className={styles.tableHeader}>
                      <th className={styles.tableHeaderCell}>Course Code</th>
                      <th className={styles.tableHeaderCell}>Course Name</th>
                      <th className={styles.tableHeaderCellCenter}>Credits</th>
                      <th className={styles.tableHeaderCellCenter}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {availableCourses.map((course, index) => (
                      <tr key={`available-${course.id}-${index}`} className={styles.tableRow}>
                        <td className={styles.tableCell}>
                          <span className={styles.courseCode}>{course.course_code}</span>
                        </td>
                        <td className={styles.tableCell}>{course.course_name}</td>
                        <td className={styles.tableCellCenter}>{course.credits}</td>
                        <td className={styles.tableCellCenter}>
                          <Button
                            size="sm"
                            onClick={() => handleRegister(course.id, course.course_name)}
                            disabled={actionLoading === course.id}
                          >
                            {actionLoading === course.id ? (
                              "Registering..."
                            ) : (
                              <>
                                <Plus className="h-4 w-4 mr-1" />
                                Register
                              </>
                            )}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <PopupComponent />
    </div>
  );
}
