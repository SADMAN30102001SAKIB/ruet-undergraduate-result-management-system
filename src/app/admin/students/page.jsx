"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePopup } from "@/components/ui/popup";
import {
  GraduationCap,
  ArrowLeft,
  Search,
  Plus,
  Edit,
  Trash2,
  Users,
  Filter,
  Eye,
  AlertTriangle,
} from "lucide-react";
import styles from "./page.module.css";

export default function AdminStudents() {
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showError, showConfirm, PopupComponent } = usePopup();
  const [filterOptions, setFilterOptions] = useState({
    departments: [],
    years: [],
    semesters: [],
    academicSessions: [],
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("");

  const [selectedStudents, setSelectedStudents] = useState(new Set());
  const [isPromoting, setIsPromoting] = useState(false);
  const [isDemoting, setIsDemoting] = useState(false);

  useEffect(() => {
    Promise.all([fetchStudents(), fetchFilterOptions()]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchFilterOptions = async () => {
    try {
      const response = await fetch("/api/admin/students/filter-options");
      if (response.ok) {
        const options = await response.json();
        setFilterOptions(options);
      }
    } catch (error) {
      console.error("Failed to fetch filter options:", error);
    }
  };

  const filterStudents = useCallback(() => {
    let filtered = students;

    if (searchTerm) {
      filtered = filtered.filter(
        (student) =>
          student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.roll_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.registration_number.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (departmentFilter) {
      filtered = filtered.filter((student) => student.department_code === departmentFilter);
    }
    if (yearFilter) {
      filtered = filtered.filter((student) => student.current_year.toString() === yearFilter);
    }
    if (semesterFilter) {
      filtered = filtered.filter((student) => student.current_semester === semesterFilter);
    }

    setFilteredStudents(filtered);
  }, [students, searchTerm, departmentFilter, yearFilter, semesterFilter]);

  useEffect(() => {
    filterStudents();
  }, [students, searchTerm, departmentFilter, yearFilter, semesterFilter, filterStudents]);

  const fetchStudents = async () => {
    try {
      const [studentsRes, coursesRes] = await Promise.all([
        fetch("/api/admin/students"),
        fetch("/api/admin/courses"),
      ]);

      if (studentsRes.ok && coursesRes.ok) {
        const studentsResponse = await studentsRes.json();
        const coursesResponse = await coursesRes.json();
        const studentsData = studentsResponse.students || [];
        const coursesData = coursesResponse.courses || [];

        // Calculate course registration data for each student
        const studentsWithCourseData = await Promise.all(
          studentsData.map(async (student) => {
            // Get available courses for this student (courses for their department, up to their current year/semester)
            const availableCourses = coursesData.filter((course) => {
              // Check if course is from same department - match by department name for now
              const isFromSameDepartment = course.department_name === student.department_name;

              // For 1st year students, only show courses for year 1
              // For higher years, show courses up to their current year
              const isUpToCurrentYear = course.year <= student.current_year;

              // For current year, only show courses up to current semester
              const isCurrentSemesterOrBefore =
                course.year < student.current_year ||
                (course.year === student.current_year &&
                  getSemesterOrder(course.semester) <= getSemesterOrder(student.current_semester));

              return isFromSameDepartment && isUpToCurrentYear && isCurrentSemesterOrBefore;
            });

            // Get registered courses count and CGPA
            try {
              const [regRes, cgpaRes, passedRes] = await Promise.all([
                fetch(`/api/admin/students/${student.id}/courses`),
                fetch(`/api/admin/students/${student.id}/cgpa`),
                fetch(`/api/admin/students/${student.id}/passed-exams`),
              ]);
              const registeredData = regRes.ok ? await regRes.json() : { courses: [] };
              const cgpaData = cgpaRes.ok ? await cgpaRes.json() : { cgpa: 0 };
              const passedData = passedRes.ok ? await passedRes.json() : { passed: 0, total: 0 };

              // Extract the courses array from the wrapped response
              const registeredCourses = registeredData.courses || [];

              // Count unique courses (not counting backlog as separate registration)
              // Since the API returns separate rows for regular and backlog results of the same course,
              // we need to count unique course IDs to avoid double-counting
              const uniqueCourseIds = new Set(registeredCourses.map((course) => course.id));
              const uniqueRegisteredCoursesCount = uniqueCourseIds.size;

              return {
                ...student,
                registered_courses: uniqueRegisteredCoursesCount,
                available_courses: availableCourses.length,
                has_unregistered_courses: uniqueRegisteredCoursesCount < availableCourses.length,
                cgpa: cgpaData.cgpa || 0,
                passed_exams: passedData.passed || 0,
                total_registered: passedData.total || 0,
              };
            } catch {
              return {
                ...student,
                registered_courses: 0,
                available_courses: availableCourses.length,
                has_unregistered_courses: true,
                cgpa: 0,
                passed_exams: 0,
                total_registered: 0,
              };
            }
          })
        );

        setStudents(studentsWithCourseData);
      }
    } catch (error) {
      console.error("Failed to fetch students:", error);
    } finally {
      setLoading(false);
    }
  };

  const getSemesterOrder = (semester) => {
    const order = {
      odd: 1,
      even: 2,
    };
    return order[semester] || 0;
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedStudents(new Set(filteredStudents.map((s) => s.id)));
    } else {
      setSelectedStudents(new Set());
    }
  };

  const handleSelectStudent = (studentId, checked) => {
    const newSelected = new Set(selectedStudents);
    if (checked) {
      newSelected.add(studentId);
    } else {
      newSelected.delete(studentId);
    }
    setSelectedStudents(newSelected);
  };

  const handleBulkPromote = async () => {
    if (selectedStudents.size === 0) {
      showError("No Selection", "Please select at least one student to promote.");
      return;
    }

    showConfirm(
      "Promote Students",
      `Are you sure you want to promote ${selectedStudents.size} selected student(s) to the next semester?`,
      async () => {
        setIsPromoting(true);
        try {
          const response = await fetch("/api/admin/students/promote", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ studentIds: Array.from(selectedStudents) }),
          });

          if (response.ok) {
            const result = await response.json();
            if (result.failed.length > 0) {
              showError(
                "Promotion Results",
                `Successfully promoted ${result.success} students. Failed to promote ${
                  result.failed.length
                } students: ${result.failed.map((f) => f.name).join(", ")}`
              );
            } else {
              // Refresh the students list
              await fetchStudents();
              setSelectedStudents(new Set());
              showConfirm("Success", `Successfully promoted ${result.success} students.`, () => {});
            }
          } else {
            const error = await response.json();
            showError("Error", error.error || "Failed to promote students");
          }
        } catch (error) {
          console.error("Promotion error:", error);
          showError("Error", "Failed to promote students");
        } finally {
          setIsPromoting(false);
        }
      }
    );
  };

  const handleBulkDemote = async () => {
    if (selectedStudents.size === 0) {
      showError("No Selection", "Please select at least one student to take down a semester.");
      return;
    }

    showConfirm(
      "Take Students Down a Semester",
      `Are you sure you want to take ${selectedStudents.size} selected student(s) down a semester? This action will fail for students who have results in their current or higher semesters.`,
      async () => {
        setIsDemoting(true);
        try {
          const response = await fetch("/api/admin/students/demote", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ studentIds: Array.from(selectedStudents) }),
          });

          if (response.ok) {
            const result = await response.json();
            if (result.failed.length > 0) {
              const failedStudents = result.failed
                .map((f) => `${f.roll_number}: ${f.error}`)
                .join("\\n");

              showError(
                "Demotion Results",
                `Successfully took down ${result.success} students. Failed for ${result.failed.length} students:\\n\\n${failedStudents}`
              );
            } else {
              // Refresh the students list
              await fetchStudents();
              setSelectedStudents(new Set());
              showConfirm(
                "Success",
                `Successfully took down ${result.success} students.`,
                () => {}
              );
            }
          } else {
            const error = await response.json();
            showError("Error", error.error || "Failed to take students down");
          }
        } catch (error) {
          console.error("Demotion error:", error);
          showError("Error", "Failed to take students down");
        } finally {
          setIsDemoting(false);
        }
      }
    );
  };

  const handleDelete = async (id, name) => {
    showConfirm(
      "Delete Student",
      `Are you sure you want to delete student "${name}"?`,
      async () => {
        try {
          const response = await fetch(`/api/admin/students/${id}`, {
            method: "DELETE",
          });
          if (response.ok) {
            // Update students list - the UI update is sufficient feedback
            setStudents(students.filter((student) => student.id !== id));
          } else {
            const error = await response.json();
            showError("Error", error.error || "Failed to delete student");
          }
        } catch (error) {
          console.error("Delete error:", error);
          showError("Error", "Failed to delete student");
        }
      },
      "Delete",
      "Cancel"
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <Link href="/admin/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className={styles.headerIcon} />
              </Button>
            </Link>
            <GraduationCap className={styles.brandIcon} />
            <div>
              <h1 className={styles.brandTitle}>Manage Students</h1>
              <p className={styles.brandSubtitle}>Add, edit, and manage student records</p>
            </div>
          </div>
          <div className={styles.headerActions}>
            <Link href="/admin/students/add">
              <Button>
                <Plus className={styles.addIcon} />
                Add Student
              </Button>
            </Link>
          </div>
        </header>

        {/* Filters */}
        <Card className={styles.filtersCard}>
          <CardHeader>
            <CardTitle className={styles.cardTitle}>
              <Filter className={styles.cardIcon} />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={styles.filtersGrid}>
              <div className={styles.searchWrapper}>
                <Search className={styles.searchIcon} />
                <Input
                  placeholder="Search by name, roll number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={styles.searchInput}
                />
              </div>
              <Select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className={styles.select}
              >
                <option value="">All Departments</option>
                {filterOptions.departments.map((deptCode) => (
                  <option key={deptCode} value={deptCode}>
                    {deptCode}
                  </option>
                ))}
              </Select>
              <Select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className={styles.select}
              >
                <option value="">All Years</option>
                {filterOptions.years.map((year) => (
                  <option key={year} value={year}>
                    {year === 1 ? "1st" : year === 2 ? "2nd" : year === 3 ? "3rd" : `${year}th`}{" "}
                    Year
                  </option>
                ))}
              </Select>
              <Select
                value={semesterFilter}
                onChange={(e) => setSemesterFilter(e.target.value)}
                className={styles.select}
              >
                <option value="">All Semesters</option>
                {filterOptions.semesters.map((semester) => (
                  <option key={semester} value={semester}>
                    {semester.charAt(0).toUpperCase() + semester.slice(1)}
                  </option>
                ))}
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Students Table */}
        <Card>
          <CardHeader>
            <CardTitle className={styles.cardTitle}>
              <Users className={styles.cardIcon} />
              Students ({filteredStudents.length})
            </CardTitle>
            <CardDescription>Manage all student records and profiles</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className={styles.loadingContainer}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className={styles.loadingCard}>
                    <div className={styles.loadingBar}></div>
                    <div className={styles.loadingBar}></div>
                    <div className={styles.loadingBar}></div>
                    <div className={styles.loadingBar}></div>
                  </div>
                ))}
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className={styles.emptyState}>
                <Users className={styles.emptyIcon} />
                <p className={styles.emptyText}>No students found</p>
                <Link href="/admin/students/add">
                  <Button className={styles.emptyButton}>
                    <Plus className={styles.buttonIcon} />
                    Add First Student
                  </Button>
                </Link>
              </div>
            ) : (
              <div className={styles.studentsSection}>
                {/* Bulk Actions */}
                {selectedStudents.size > 0 && (
                  <div className={styles.bulkActions}>
                    <span className={styles.bulkText}>
                      {selectedStudents.size} student(s) selected
                    </span>
                    <div className={styles.bulkButtons}>
                      <Button
                        onClick={handleBulkPromote}
                        disabled={isPromoting}
                        className={styles.promoteButton}
                      >
                        {isPromoting ? "Promoting..." : "Promote to Next Semester"}
                      </Button>
                      <Button
                        onClick={handleBulkDemote}
                        disabled={isDemoting}
                        variant="outline"
                        className={styles.demoteButton}
                      >
                        {isDemoting ? "Taking Down..." : "Take Down a Semester"}
                      </Button>
                    </div>
                  </div>
                )}

                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr className={styles.tableHeaderRow}>
                        <th className={styles.checkboxHeader}>
                          <input
                            type="checkbox"
                            checked={
                              filteredStudents.length > 0 &&
                              selectedStudents.size === filteredStudents.length
                            }
                            onChange={(e) => handleSelectAll(e.target.checked)}
                            className={styles.checkbox}
                          />
                        </th>
                        <th className={styles.th}>Name</th>
                        <th className={styles.th}>Roll Number</th>
                        <th className={styles.th}>Department Code</th>
                        <th className={styles.th}>Year/Semester</th>
                        <th className={styles.thCenter}>Courses Registered</th>
                        <th className={styles.thCenter}>Passed Exams</th>
                        <th className={styles.thCenter}>CGPA</th>
                        <th className={styles.thCenter}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((student) => (
                        <tr key={student.id} className={styles.tableRow}>
                          <td className={styles.checkboxCell}>
                            <input
                              type="checkbox"
                              checked={selectedStudents.has(student.id)}
                              onChange={(e) => handleSelectStudent(student.id, e.target.checked)}
                              className={styles.checkbox}
                            />
                          </td>
                          <td className={styles.td}>
                            <div>
                              <p className={styles.studentName}>{student.name}</p>
                              <p className={styles.studentPhone}>{student.phone}</p>
                            </div>
                          </td>
                          <td className={styles.td}>
                            <div>
                              <p className={styles.rollNumber}>{student.roll_number}</p>
                              <p className={styles.regNumber}>{student.registration_number}</p>
                            </div>
                          </td>
                          <td className={styles.td}>
                            <span className={styles.departmentBadge}>
                              {student.department_code || "N/A"}
                            </span>
                          </td>
                          <td className={styles.td}>
                            <div>
                              <p className={styles.yearText}>
                                {student.current_year}
                                {student.current_year === 1
                                  ? "st"
                                  : student.current_year === 2
                                  ? "nd"
                                  : student.current_year === 3
                                  ? "rd"
                                  : "th"}{" "}
                                Year
                              </p>
                              <p className={styles.semesterText}>
                                {student.current_semester} semester
                              </p>
                            </div>
                          </td>
                          <td className={styles.tdCenter}>
                            <div className={styles.statusWrapper}>
                              <div
                                className={`${styles.statusBadge} ${
                                  student.has_unregistered_courses
                                    ? styles.statusWarning
                                    : styles.statusGood
                                }`}
                              >
                                <span
                                  className={
                                    student.has_unregistered_courses
                                      ? styles.numberWarning
                                      : styles.numberGood
                                  }
                                >
                                  {student.registered_courses}
                                </span>
                                <span className={styles.separator}>/</span>
                                <span className={styles.numberMuted}>
                                  {student.available_courses}
                                </span>
                                {student.has_unregistered_courses && (
                                  <AlertTriangle className={styles.warningIcon} />
                                )}
                              </div>
                            </div>
                          </td>
                          <td className={styles.tdCenter}>
                            <div className={styles.statusWrapper}>
                              <div
                                className={`${styles.statusBadge} ${
                                  student.passed_exams < student.total_registered &&
                                  student.total_registered > 0
                                    ? styles.statusDanger
                                    : styles.statusSuccess
                                }`}
                              >
                                <span
                                  className={
                                    student.passed_exams < student.total_registered &&
                                    student.total_registered > 0
                                      ? styles.numberDanger
                                      : styles.numberSuccess
                                  }
                                >
                                  {student.passed_exams}
                                </span>
                                <span className={styles.separator}>/</span>
                                <span className={styles.numberMuted}>
                                  {student.total_registered}
                                </span>
                                {student.passed_exams < student.total_registered &&
                                  student.total_registered > 0 && (
                                    <AlertTriangle className={styles.warningIcon} />
                                  )}
                              </div>
                            </div>
                          </td>
                          <td className={styles.tdCenter}>
                            <div className={styles.statusWrapper}>
                              <span className={styles.cgpaText}>
                                {student.cgpa > 0 ? student.cgpa.toFixed(2) : "N/A"}
                              </span>
                            </div>
                          </td>
                          <td className={styles.td}>
                            <div className={styles.actionButtons}>
                              <Link href={`/admin/students/${student.id}/courses`}>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  title="Manage course registrations"
                                >
                                  <Eye className={styles.buttonIcon} />
                                </Button>
                              </Link>
                              <Link href={`/admin/students/${student.id}/edit`}>
                                <Button size="sm" variant="outline">
                                  <Edit className={styles.buttonIcon} />
                                </Button>
                              </Link>
                              <Button
                                size="sm"
                                variant="outline"
                                className={styles.deleteButton}
                                onClick={() => handleDelete(student.id, student.name)}
                              >
                                <Trash2 className={styles.buttonIcon} />
                              </Button>
                            </div>
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
      </div>

      {/* Popup Component */}
      <PopupComponent />
    </div>
  );
}
