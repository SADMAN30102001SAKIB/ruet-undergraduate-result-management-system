"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { usePopup } from "@/components/ui/popup";
import { GraduationCap, ArrowLeft, BookOpen, CheckCircle, Clock, AlertCircle } from "lucide-react";
import styles from "./page.module.css";

export default function StudentRegister() {
  const [profile, setProfile] = useState(null);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [registeredCourses, setRegisteredCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(null);
  const { showError, showConfirm, PopupComponent } = usePopup();
  const router = useRouter();

  useEffect(() => {
    fetchProfile();
    fetchCourses();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch("/api/student/profile");
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
      } else {
        router.push("/student/login");
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error);
      router.push("/student/login");
    }
  };

  const fetchCourses = async () => {
    try {
      // Fetch available courses
      const availableResponse = await fetch("/api/student/courses");
      if (availableResponse.ok) {
        const availableData = await availableResponse.json();
        setAvailableCourses(availableData);
      }

      // Fetch registered courses
      const registeredResponse = await fetch("/api/student/registrations");
      if (registeredResponse.ok) {
        const registeredData = await registeredResponse.json();
        setRegisteredCourses(registeredData);
      }
    } catch (error) {
      console.error("Failed to fetch courses:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (courseId) => {
    showConfirm(
      "Confirm Course Registration",
      "Are you sure you want to register for this course? Once registered, you will not be able to unregister.",
      async () => {
        setRegistering(courseId);
        try {
          const response = await fetch("/api/student/courses", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ courseId }),
          });

          if (response.ok) {
            // Refresh courses - the UI update is sufficient feedback
            await fetchCourses();
          } else {
            const data = await response.json();
            // Handle specific error cases
            if (response.status === 403) {
              showError(
                "Registration Restricted",
                data.error || "You can only register for courses in your current semester"
              );
            } else if (response.status === 409) {
              showError(
                "Already Registered",
                data.error || "You are already registered for this course"
              );
            } else {
              showError("Error", data.error || "Failed to register for course");
            }
          }
        } catch (error) {
          console.error("Registration error:", error);
          showError("Error", "Failed to register for course");
        } finally {
          setRegistering(null);
        }
      }
    );
  };

  const getYearSuffix = (year) => {
    if (year === 1) return "st";
    if (year === 2) return "nd";
    if (year === 3) return "rd";
    return "th";
  };

  const totalCredits = registeredCourses.reduce((sum, course) => sum + course.credits, 0);

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
              <h1 className={styles.headerTitle}>Course Registration</h1>
              <p className={styles.headerSubtitle}>
                {profile &&
                  `${profile.current_year}${getYearSuffix(profile.current_year)} Year, ${
                    profile.current_semester.charAt(0).toUpperCase() +
                    profile.current_semester.slice(1)
                  } Semester`}
              </p>
            </div>
          </div>
          <ThemeToggle />
        </header>

        {/* Current Semester Notice */}
        {profile && (
          <Card className={`${styles.statusCard} ${styles.cardSpacing}`}>
            <CardContent>
              <div className={styles.statusContent}>
                <AlertCircle className={styles.statusIcon} />
                <div>
                  <h3 className={styles.statusTitle}>
                    Registration Restricted to Current Semester
                  </h3>
                  <p className={styles.statusDescription}>
                    You can only register/unregister for courses in your current semester:{" "}
                    <span className={styles.semiBold}>
                      Year {profile.current_year},{" "}
                      {profile.current_semester.charAt(0).toUpperCase() +
                        profile.current_semester.slice(1)}{" "}
                      Semester
                    </span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Registration Summary */}
        <Card className={styles.cardSpacing}>
          <CardHeader>
            <CardTitle className={styles.flexCenter}>
              <CheckCircle className={`${styles.icon5} mr-2`} style={{ color: "rgb(22 163 74)" }} />
              Registration Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={styles.statsGrid}>
              <div className={styles.statsItem}>
                <p className={styles.statsValueGreen}>{registeredCourses.length}</p>
                <p className={styles.statsLabel}>Registered Courses</p>
              </div>
              <div className={styles.statsItem}>
                <p className={styles.statsValueBlue}>{totalCredits}</p>
                <p className={styles.statsLabel}>Total Credits</p>
              </div>
              <div className={styles.statsItem}>
                <p className={styles.statsValuePurple}>{availableCourses.length}</p>
                <p className={styles.statsLabel}>Available Courses</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className={styles.mainGrid}>
          {/* Registered Courses */}
          <Card>
            <CardHeader>
              <CardTitle className={styles.flexCenter}>
                <CheckCircle
                  className={`${styles.icon5} mr-2`}
                  style={{ color: "rgb(22 163 74)" }}
                />
                Registered Courses
              </CardTitle>
              <CardDescription>Courses you are currently enrolled in</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className={styles.loadingContainer}>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className={styles.loadingItem}>
                      <div className={styles.loadingBar}></div>
                      <div className={styles.loadingBarShort}></div>
                    </div>
                  ))}
                </div>
              ) : registeredCourses.length === 0 ? (
                <div className={styles.emptyState}>
                  <Clock className={styles.emptyIcon} />
                  <p className={styles.emptyTitle}>No courses registered yet</p>
                  <p className={styles.emptyDescription}>
                    Select courses from the available courses list
                  </p>
                </div>
              ) : (
                <div className={styles.courseList}>
                  {registeredCourses.map((course) => (
                    <div key={course.id} className={styles.registeredCourse}>
                      <div className={styles.courseHeader}>
                        <div className={styles.courseInfo}>
                          <h3 className={styles.courseCode}>{course.course_code}</h3>
                          <p className={styles.courseName}>{course.course_name}</p>
                          <div className={styles.courseDetails}>
                            <span>Credits: {course.credits}</span>
                            <span>Year: {course.year}</span>
                            <span>Semester: {course.semester}</span>
                          </div>
                        </div>
                        <div className={styles.courseStatus}>
                          <CheckCircle className={styles.statusIcon} />
                          <span className={styles.statusText}>Registered</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Available Courses */}
          <Card>
            <CardHeader>
              <CardTitle className={styles.flexCenter}>
                <BookOpen className={`${styles.icon5} mr-2`} style={{ color: "rgb(37 99 235)" }} />
                Available Courses
              </CardTitle>
              <CardDescription>Courses available for your current semester</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className={styles.loadingContainer}>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className={styles.loadingItem}>
                      <div className={styles.loadingBar}></div>
                      <div className={styles.loadingBarShort}></div>
                    </div>
                  ))}
                </div>
              ) : availableCourses.length === 0 ? (
                <div className={styles.emptyState}>
                  <AlertCircle className={styles.emptyIcon} />
                  <p className={styles.emptyTitle}>No courses available</p>
                  <p className={styles.emptyDescription}>
                    Contact administration for course scheduling
                  </p>
                </div>
              ) : (
                <div className={styles.courseList}>
                  {availableCourses.map((course) => (
                    <div key={course.id} className={styles.availableCourse}>
                      <div className={styles.courseHeader}>
                        <div className={styles.courseInfo}>
                          <h3 className={styles.courseCode}>{course.course_code}</h3>
                          <p className={styles.courseName}>{course.course_name}</p>
                          <div className={styles.courseDetails}>
                            <span>Credits: {course.credits}</span>
                            <span>Year: {course.year}</span>
                            <span>Semester: {course.semester}</span>
                          </div>
                        </div>
                        <div className={styles.courseActions}>
                          <Button
                            size="sm"
                            onClick={() => handleRegister(course.id)}
                            disabled={registering === course.id}
                            className={styles.registerButton}
                          >
                            {registering === course.id ? "Registering..." : "Register"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Registration Guidelines */}
        <Card className={styles.cardSpacingTop}>
          <CardHeader>
            <CardTitle className={styles.flexCenter}>
              <AlertCircle className={`${styles.icon5} mr-2`} style={{ color: "rgb(234 88 12)" }} />
              Registration Guidelines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className={styles.guidelinesList}>
              <li>You can only register for courses in your current year and semester</li>
              <li>Make sure to register for all required courses for your semester</li>
              <li>You can unregister from courses before the registration deadline</li>
              <li>Contact your academic advisor if you have questions about course selection</li>
              <li>Results will be published after course completion and evaluation</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Popup Component */}
      <PopupComponent />
    </div>
  );
}
