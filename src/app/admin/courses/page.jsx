"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePopup } from "@/components/ui/popup";
import {
  GraduationCap,
  ArrowLeft,
  BookOpen,
  Plus,
  Search,
  Edit,
  Trash2,
  Award,
  Trophy,
  Crown,
} from "lucide-react";
import styles from "./page.module.css";

export default function AdminCourses() {
  const [courses, setCourses] = useState([]);
  const { showError, showConfirm, PopupComponent } = usePopup();
  const [loading, setLoading] = useState(true);
  const [filterOptions, setFilterOptions] = useState({
    departments: [],
    years: [],
    semesters: [],
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("");
  const router = useRouter();

  const fetchCourses = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/courses");
      if (response.ok) {
        const data = await response.json();
        setCourses(data.courses || []);
      } else if (response.status === 401) {
        router.push("/admin/login");
      }
    } catch (error) {
      console.error("Failed to fetch courses:", error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  const filteredCourses = useMemo(() => {
    let filtered = courses;

    if (searchTerm) {
      filtered = filtered.filter(
        (course) =>
          course.course_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          course.course_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (departmentFilter) {
      filtered = filtered.filter((course) => course.department_code === departmentFilter);
    }

    if (yearFilter) {
      filtered = filtered.filter((course) => course.year.toString() === yearFilter);
    }

    if (semesterFilter) {
      filtered = filtered.filter((course) => course.semester === semesterFilter);
    }
    return filtered;
  }, [courses, searchTerm, departmentFilter, yearFilter, semesterFilter]);

  useEffect(() => {
    Promise.all([fetchCourses(), fetchFilterOptions()]);
  }, [fetchCourses]);

  const fetchFilterOptions = async () => {
    try {
      const response = await fetch("/api/admin/results/filter-options");
      if (response.ok) {
        const options = await response.json();
        setFilterOptions(options);
      }
    } catch (error) {
      console.error("Failed to fetch filter options:", error);
    }
  };

  const handleDelete = async (id, courseCode) => {
    showConfirm(
      "Delete Course",
      `Are you sure you want to delete course "${courseCode}"?`,
      async () => {
        try {
          const response = await fetch(`/api/admin/courses/${id}`, {
            method: "DELETE",
          });
          if (response.ok) {
            // Update courses list - the UI update is sufficient feedback
            setCourses(courses.filter((course) => course.id !== id));
          } else {
            const error = await response.json();
            showError("Error", error.error || "Failed to delete course");
          }
        } catch (error) {
          console.error("Delete error:", error);
          showError("Error", "Failed to delete course");
        }
      },
      "Delete",
      "Cancel"
    );
  };

  const handleEdit = (id) => {
    router.push(`/admin/courses/${id}/edit`);
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <Link href="/admin/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className={styles.backIcon} />
              </Button>
            </Link>
            <GraduationCap className={styles.headerIcon} />
            <div>
              <h1 className={styles.headerTitle}>Course Management</h1>
              <p className={styles.headerSubtitle}>Manage academic courses and curriculum</p>
            </div>
          </div>
        </header>

        {/* Actions Bar */}
        <div className={styles.actionsBar}>
          <div className={styles.filtersSection}>
            <div className={styles.searchContainer}>
              <Search className={styles.searchIcon} />
              <Input
                placeholder="Search courses by code or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.searchInput}
              />
            </div>

            <div className={styles.filterControls}>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className={styles.filterSelect}
              >
                <option value="">All Departments</option>
                {filterOptions.departments.map((deptCode) => (
                  <option key={deptCode} value={deptCode}>
                    {deptCode}
                  </option>
                ))}
              </select>

              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className={styles.filterSelect}
              >
                <option value="">All Years</option>
                {filterOptions.years.map((year) => (
                  <option key={year} value={year}>
                    {year === 1 ? "1st" : year === 2 ? "2nd" : year === 3 ? "3rd" : `${year}th`}{" "}
                    Year
                  </option>
                ))}
              </select>

              <select
                value={semesterFilter}
                onChange={(e) => setSemesterFilter(e.target.value)}
                className={styles.filterSelect}
              >
                <option value="">All Semesters</option>
                {filterOptions.semesters.map((semester) => (
                  <option key={semester} value={semester}>
                    {semester.charAt(0).toUpperCase() + semester.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Link href="/admin/courses/add">
            <Button className={styles.addButton}>
              <Plus className={styles.addIcon} />
              Add Course
            </Button>
          </Link>
        </div>

        {/* Stats Cards - Year-wise Course Distribution */}
        <div className={styles.statsGrid}>
          <Card>
            <CardHeader className={styles.statCardHeader}>
              <CardTitle className={styles.statCardTitle}>
                <BookOpen className={`${styles.statIcon} ${styles.statIconBlue}`} />
                1st Year Courses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={styles.statValue}>
                {loading ? <div className={styles.skeletonValue} style={{ height: '2rem', width: '40px' }}></div> : filteredCourses.filter((c) => c.year === 1).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className={styles.statCardHeader}>
              <CardTitle className={styles.statCardTitle}>
                <Award className={`${styles.statIcon} ${styles.statIconGreen}`} />
                2nd Year Courses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={styles.statValue}>
                {loading ? <div className={styles.skeletonValue} style={{ height: '2rem', width: '40px' }}></div> : filteredCourses.filter((c) => c.year === 2).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className={styles.statCardHeader}>
              <CardTitle className={styles.statCardTitle}>
                <Trophy className={`${styles.statIcon} ${styles.statIconOrange}`} />
                3rd Year Courses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={styles.statValue}>
                {loading ? <div className={styles.skeletonValue} style={{ height: '2rem', width: '40px' }}></div> : filteredCourses.filter((c) => c.year === 3).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className={styles.statCardHeader}>
              <CardTitle className={styles.statCardTitle}>
                <Crown className={`${styles.statIcon} ${styles.statIconPurple}`} />
                4th Year Courses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={styles.statValue}>
                {loading ? <div className={styles.skeletonValue} style={{ height: '2rem', width: '40px' }}></div> : filteredCourses.filter((c) => c.year === 4).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtering Summary */}
        {(searchTerm || departmentFilter || yearFilter || semesterFilter) && (
          <div className={styles.filterSummary}>
            <div className={styles.filterSummaryContent}>
              <span className={styles.filterSummaryLabel}>Filtered Results:</span>
              <span className={styles.filterSummaryBadge}>{filteredCourses.length} courses</span>
              <span className={styles.filterSummaryBadge}>
                {[...new Set(filteredCourses.map((c) => c.department_name))].length}
                departments
              </span>
              {searchTerm && (
                <span className={styles.filterSummaryItem}>Search: &ldquo;{searchTerm}&rdquo;</span>
              )}
              {departmentFilter && (
                <span className={styles.filterSummaryItem}>Department: {departmentFilter}</span>
              )}
              {yearFilter && <span className={styles.filterSummaryItem}>Year: {yearFilter}</span>}
              {semesterFilter && (
                <span className={styles.filterSummaryItem}>Semester: {semesterFilter}</span>
              )}
            </div>
          </div>
        )}

        {/* Courses Table */}
        <Card>
          <CardHeader>
            <CardTitle className={styles.tableCardTitle}>
              <BookOpen className={styles.tableCardIcon} />
              Courses {loading ? (
                <span className={styles.skeletonTableRow} style={{ width: '60px', display: 'inline-block', verticalAlign: 'middle', marginLeft: '0.5rem' }}></span>
              ) : (
                <span className={styles.tableCardCount}>
                  {filteredCourses.length !== courses.length 
                    ? `(${filteredCourses.length} of ${courses.length})` 
                    : `(${courses.length})`}
                </span>
              )}
            </CardTitle>
            <CardDescription>Manage course curriculum and academic structure</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredCourses.length === 0 && !loading ? (
              <div className={styles.emptyState}>
                <BookOpen className={styles.emptyStateIcon} />
                <h3 className={styles.emptyStateTitle}>No Courses Found</h3>
                <p className={styles.emptyStateDescription}>
                  {searchTerm || departmentFilter || yearFilter || semesterFilter
                    ? "No courses match your current filters."
                    : "Start by adding your first course."}
                </p>
                <Link href="/admin/courses/add">
                  <Button>
                    <Plus className={styles.emptyStateButtonIcon} />
                    Add Course
                  </Button>
                </Link>
              </div>
            ) : (
              <div className={styles.tableContainer}>
                <table className={styles.coursesTable}>
                  <thead>
                    <tr className={styles.tableHeader}>
                      <th className={styles.tableHeaderCell}>Course Details</th>
                      <th className={styles.tableHeaderCell}>Department Code</th>
                      <th className={styles.tableHeaderCellCenter}>Year/Semester</th>
                      <th className={styles.tableHeaderCellCenter}>Credits</th>
                      <th className={styles.tableHeaderCellCenter}>Students</th>
                      <th className={styles.tableHeaderCellCenter}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className={styles.tableRow}>
                          <td className={styles.tableCellDetails}><div className={styles.skeletonTableRow}></div></td>
                          <td className={styles.tableCell}><div className={styles.skeletonTableRow} style={{ width: '60px' }}></div></td>
                          <td className={styles.tableCellCenter}><div className={styles.skeletonTableRow} style={{ width: '80px', margin: '0 auto' }}></div></td>
                          <td className={styles.tableCellCenter}><div className={styles.skeletonTableRow} style={{ width: '40px', margin: '0 auto' }}></div></td>
                          <td className={styles.tableCellCenter}><div className={styles.skeletonTableRow} style={{ width: '40px', margin: '0 auto' }}></div></td>
                          <td className={styles.tableCellCenter}><div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                            <div className={styles.skeletonTableRow} style={{ width: '32px', height: '32px' }}></div>
                            <div className={styles.skeletonTableRow} style={{ width: '32px', height: '32px' }}></div>
                          </div></td>
                        </tr>
                      ))
                    ) : (
                      filteredCourses.map((course) => (
                      <tr key={course.id} className={styles.tableRow}>
                        <td className={styles.tableCellDetails}>
                          <div>
                            <p className={styles.courseCode}>{course.course_code}</p>
                            <p className={styles.courseName}>{course.course_name}</p>
                          </div>
                        </td>
                        <td className={styles.tableCell}>
                          <span className={styles.departmentBadge}>
                            {course.department_code || "N/A"}
                          </span>
                        </td>
                        <td className={styles.tableCellCenter}>
                          <div>
                            <p className={styles.yearInfo}>
                              {course.year === 1
                                ? "1st"
                                : course.year === 2
                                ? "2nd"
                                : course.year === 3
                                ? "3rd"
                                : `${course.year}th`}{" "}
                              Year
                            </p>
                            <p className={styles.semesterInfo}>{course.semester}</p>
                          </div>
                        </td>
                        <td className={styles.tableCellCenter}>
                          <span className={styles.creditsValue}>
                            {Number(course.credits).toFixed(2)}
                          </span>
                        </td>
                        <td className={styles.tableCellCenter}>
                          <div className={styles.studentCountContainer}>
                            <span className={styles.studentCount}>{course.student_count || 0}</span>
                          </div>
                        </td>
                        <td className={styles.tableCellCenter}>
                          <div className={styles.actionsContainer}>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(course.id)}
                            >
                              <Edit className={styles.actionIcon} />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(course.id, course.course_code)}
                              className={styles.deleteButton}
                            >
                              <Trash2 className={styles.actionIcon} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                      ))
                    )}
                  </tbody>
                </table>
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
