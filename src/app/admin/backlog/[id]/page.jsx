"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePopup } from "@/components/ui/popup";
import { GraduationCap, ArrowLeft, Search, UserCheck, UserX, Trash2, Eye } from "lucide-react";
import styles from "./page.module.css";

export default function BacklogGroupDetail() {
  const params = useParams();
  const router = useRouter();
  const [groupData, setGroupData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("");
  const { showConfirm, showError, PopupComponent } = usePopup();

  useEffect(() => {
    if (params.id) {
      fetchGroupDetails();
    }
  }, [params.id]);

  const fetchGroupDetails = async () => {
    try {
      const response = await fetch(`/api/admin/backlog/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setGroupData(data);
      } else if (response.status === 404) {
        router.push("/admin/backlog");
      }
    } catch (error) {
      console.error("Failed to fetch group details:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRegistration = async (studentId, courseId, isRegistered) => {
    try {
      const response = await fetch(`/api/admin/backlog/registration/${courseId}/${studentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ groupId: params.id, isRegistered }),
      });

      if (response.ok) {
        // Update local state
        setGroupData((prev) => ({
          ...prev,
          courses: prev.courses.map((course) =>
            course.student_id === studentId && course.course_id === courseId
              ? { ...course, is_registered: isRegistered }
              : course
          ),
        }));
      } else {
        // Handle error response
        const errorData = await response.json();
        showError("Registration Failed", errorData.error || "Failed to update course registration");
      }
    } catch (error) {
      console.error("Failed to toggle registration:", error);
      showError(
        "Registration Failed",
        "An unexpected error occurred while updating the registration"
      );
    }
  };

  const handleDeleteCourse = async (studentId, courseId) => {
    const course = groupData.courses.find(
      (c) => c.student_id === studentId && c.course_id === courseId
    );

    showConfirm(
      "Delete Course from Group",
      `Are you sure you want to remove "${course?.course_code} - ${course?.course_name}" for student "${course?.student_name}" (${course?.roll_number}) from this backlog group?`,
      async () => {
        try {
          const response = await fetch(`/api/admin/backlog/registration/${courseId}/${studentId}`, {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ groupId: params.id }),
          });

          if (response.ok) {
            // Remove from local state
            setGroupData((prev) => ({
              ...prev,
              courses: prev.courses.filter(
                (course) => !(course.student_id === studentId && course.course_id === courseId)
              ),
            }));
          } else {
            const errorData = await response.json();
            showError("Delete Failed", errorData.error || "Failed to delete course from group");
          }
        } catch (error) {
          console.error("Failed to delete course:", error);
          showError("Delete Failed", "An unexpected error occurred while deleting the course");
        }
      },
      "Delete",
      "Cancel"
    );
  };

  const filteredCourses =
    groupData?.courses.filter((course) => {
      const matchesSearch =
        course.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.roll_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.course_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.course_name?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDepartment = !departmentFilter || course.department_code === departmentFilter;
      const matchesYear = !yearFilter || course.year.toString() === yearFilter;
      const matchesSemester = !semesterFilter || course.semester === semesterFilter;

      return matchesSearch && matchesDepartment && matchesYear && matchesSemester;
    }) || [];

  // Get unique values for filters
  const departments = [...new Set(groupData?.courses.map((c) => c.department_code) || [])];
  const years = [...new Set(groupData?.courses.map((c) => c.year) || [])];
  const semesters = [...new Set(groupData?.courses.map((c) => c.semester) || [])];

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingText}>Loading group details...</div>
      </div>
    );
  }

  if (!groupData) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.error}>
            <p>Group not found</p>
            <Link href="/admin/backlog">
              <Button>Back to Groups</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <Link href="/admin/backlog">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <GraduationCap className={styles.headerIcon} />
            <div>
              <h1 className={styles.headerTitle}>{groupData.group.name}</h1>
              <p className={styles.headerSubtitle}>
                Manage backlog exam registrations • {filteredCourses.length} courses
              </p>
            </div>
          </div>
          <div className={styles.headerStatus}>
            <span
              className={`${styles.statusBadge} ${
                groupData.group.is_open ? styles.statusOpen : styles.statusClosed
              }`}
            >
              Registration {groupData.group.is_open ? "Open" : "Closed"}
            </span>
          </div>
        </header>

        {/* Filters */}
        <div className={styles.filters}>
          <div className={styles.searchContainer}>
            <div className="relative">
              <Search className={styles.searchIcon} />
              <Input
                placeholder="Search by student name, roll number, or course..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.searchInput}
              />
            </div>
          </div>

          <div className={styles.filterControls}>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className={styles.select}
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className={styles.select}
            >
              <option value="">All Years</option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year === 1 ? "1st" : year === 2 ? "2nd" : year === 3 ? "3rd" : `${year}th`} Year
                </option>
              ))}
            </select>
            <select
              value={semesterFilter}
              onChange={(e) => setSemesterFilter(e.target.value)}
              className={styles.select}
            >
              <option value="">All Semesters</option>
              {semesters.map((semester) => (
                <option key={semester} value={semester}>
                  {semester.charAt(0).toUpperCase() + semester.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Courses Table */}
        <Card>
          <CardHeader>
            <CardTitle className={styles.cardTitle}>
              <Eye className={styles.cardIcon} />
              Backlog Courses ({filteredCourses.length})
            </CardTitle>
            <CardDescription>Manage student registrations for backlog exams</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredCourses.length === 0 ? (
              <div className={styles.emptyState}>
                <Eye className={styles.emptyIcon} />
                <p className={styles.emptyText}>No courses found</p>
              </div>
            ) : (
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr className={styles.tableHeader}>
                      <th className={styles.tableHeaderCell}>Student</th>
                      <th className={styles.tableHeaderCell}>Course</th>
                      <th className={styles.tableHeaderCellCenter}>Department</th>
                      <th className={styles.tableHeaderCellCenter}>Year/Sem</th>
                      <th className={styles.tableHeaderCellCenter}>Status</th>
                      <th className={styles.tableHeaderCellCenter}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCourses.map((course) => (
                      <tr
                        key={`${course.student_id}-${course.course_id}`}
                        className={styles.tableRow}
                      >
                        <td className={styles.tableCell}>
                          <div className={styles.studentInfo}>
                            <p className={styles.studentName}>{course.student_name}</p>
                            <p className={styles.studentDetails}>
                              {course.roll_number} • {course.academic_session}
                            </p>
                          </div>
                        </td>
                        <td className={styles.tableCell}>
                          <div className={styles.courseInfo}>
                            <p className={styles.courseCode}>{course.course_code}</p>
                            <p className={styles.courseName}>{course.course_name}</p>
                          </div>
                        </td>
                        <td className={styles.tableCellCenter}>{course.department_code}</td>
                        <td className={styles.tableCellCenter}>
                          {course.year}
                          {course.year === 1
                            ? "st"
                            : course.year === 2
                            ? "nd"
                            : course.year === 3
                            ? "rd"
                            : "th"}{" "}
                          Year
                          <br />
                          <span className={styles.semester}>
                            {course.semester.charAt(0).toUpperCase() + course.semester.slice(1)}
                          </span>
                        </td>
                        <td className={styles.tableCellCenter}>
                          <span
                            className={`${styles.statusBadge} ${
                              course.is_registered
                                ? styles.statusRegistered
                                : styles.statusNotRegistered
                            }`}
                          >
                            {course.is_registered ? "Registered" : "Not Registered"}
                          </span>
                        </td>
                        <td className={styles.tableCellCenter}>
                          <div className={styles.actions}>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleToggleRegistration(
                                  course.student_id,
                                  course.course_id,
                                  !course.is_registered
                                )
                              }
                              disabled={!groupData.group.is_open}
                            >
                              {course.is_registered ? (
                                <UserX className="h-4 w-4 text-red-600" />
                              ) : (
                                <UserCheck className="h-4 w-4 text-green-600" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleDeleteCourse(course.student_id, course.course_id)
                              }
                              disabled={course.is_registered}
                              className={styles.deleteButton}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
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
