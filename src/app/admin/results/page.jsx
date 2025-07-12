"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePopup } from "@/components/ui/popup";
import { getGradeFromMarks } from "@/lib/utils";
import {
  GraduationCap,
  ArrowLeft,
  TrendingUp,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";
import styles from "./page.module.css";

export default function AdminResults() {
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showError, showConfirm, PopupComponent } = usePopup();
  const [filterOptions, setFilterOptions] = useState({
    departments: [],
    years: [],
    semesters: [],
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [publishedFilter, setPublishedFilter] = useState("");
  const [resultStatusFilter, setResultStatusFilter] = useState("");

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

  const fetchData = async () => {
    try {
      const [studentsRes, coursesRes, resultsRes] = await Promise.all([
        fetch("/api/admin/students"),
        fetch("/api/admin/courses"),
        fetch("/api/admin/results"),
      ]);

      if (studentsRes.ok) {
        const studentsResponse = await studentsRes.json();
        setStudents(studentsResponse.students || []);
      }

      if (coursesRes.ok) {
        const coursesResponse = await coursesRes.json();
        setCourses(coursesResponse.courses || []);
      }

      if (resultsRes.ok) {
        const resultsResponse = await resultsRes.json();
        setResults(resultsResponse.results || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      showError("Error", "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchAllData = async () => {
      await Promise.all([fetchData(), fetchFilterOptions()]);
    };
    fetchAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleStatus = async (resultId, currentStatus) => {
    try {
      const response = await fetch(`/api/admin/results/${resultId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ published: !currentStatus }),
      });
      if (response.ok) {
        await fetchData(); // Refresh results
      } else {
        const error = await response.json();
        showError("Error", error.error || "Failed to update result status");
      }
    } catch (error) {
      console.error("Error updating result status:", error);
      showError("Error", "Failed to update result status");
    }
  };

  const handleDeleteResult = async (resultId) => {
    showConfirm("Delete Result", "Are you sure you want to delete this result?", async () => {
      try {
        const response = await fetch(`/api/admin/results/${resultId}`, {
          method: "DELETE",
        });
        if (response.ok) {
          // Refresh results - the UI update is sufficient feedback
          await fetchData();
        } else {
          const error = await response.json();
          showError("Error", error.error || "Failed to delete result");
        }
      } catch (error) {
        console.error("Error deleting result:", error);
        showError("Error", "Failed to delete result");
      }
    });
  };

  const filteredResults = results.filter((result) => {
    const student = students.find((s) => s.id === result.student_id);
    const course = courses.find((c) => c.id === result.course_id);

    const matchesSearch =
      result.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student?.roll_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.course_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.course_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDepartment = !departmentFilter || course?.department_code === departmentFilter;

    const matchesYear = !yearFilter || course?.year.toString() === yearFilter;

    const matchesSemester = !semesterFilter || course?.semester === semesterFilter;

    const matchesCourse = !courseFilter || result.course_id.toString() === courseFilter;

    const matchesPublished =
      !publishedFilter || (publishedFilter === "published" ? result.published : !result.published);

    // Result status filtering based on marks and backlog status
    const matchesResultStatus =
      !resultStatusFilter ||
      (() => {
        const isPassed = result.marks >= 40; // Passing mark threshold
        const isBacklog = result.is_backlog === true || result.is_backlog === 1;

        if (resultStatusFilter === "passed") return isPassed && !isBacklog;
        if (resultStatusFilter === "failed") return !isPassed && !isBacklog;
        if (resultStatusFilter === "backlog") return isBacklog;
        return true;
      })();

    return (
      matchesSearch &&
      matchesDepartment &&
      matchesYear &&
      matchesSemester &&
      matchesCourse &&
      matchesPublished &&
      matchesResultStatus
    );
  });

  // Dynamic filtering for dropdowns based on current selections
  const getFilteredCourses = () => {
    return courses.filter((course) => {
      const matchesDepartment = !departmentFilter || course.department_code === departmentFilter;
      const matchesYear = !yearFilter || course.year.toString() === yearFilter;
      const matchesSemester = !semesterFilter || course.semester === semesterFilter;

      return matchesDepartment && matchesYear && matchesSemester;
    });
  };
  const filteredCourses = getFilteredCourses();

  const getGradeColor = (grade) => {
    switch (grade) {
      case "A+":
      case "A":
        return styles.gradeA;
      case "B+":
      case "B":
        return styles.gradeB;
      case "C+":
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

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingText}>Loading results...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <Link href="/admin/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <GraduationCap className={styles.headerIcon} />
            <div>
              <h1 className={styles.headerTitle}>Results Management</h1>
              <p className={styles.headerSubtitle}>Manage student results and grades</p>
            </div>
          </div>
        </header>

        {/* Controls */}
        <div className={styles.controls}>
          <div className={styles.searchContainer}>
            <div className="relative">
              <Search className={styles.searchIcon} />
              <Input
                placeholder="Search by student name or course..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.searchInput}
              />
            </div>
          </div>

          <div className={styles.filters}>
            <select
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
            </select>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className={styles.select}
            >
              <option value="">All Years</option>
              {filterOptions.years.map((year) => (
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
              {filterOptions.semesters.map((semester) => (
                <option key={semester} value={semester}>
                  {semester.charAt(0).toUpperCase() + semester.slice(1)}
                </option>
              ))}
            </select>
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className={styles.select}
            >
              <option value="">All Courses</option>
              {filteredCourses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.course_code}
                </option>
              ))}
            </select>
            <select
              value={publishedFilter}
              onChange={(e) => setPublishedFilter(e.target.value)}
              className={styles.select}
            >
              <option value="">All Results</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
            <select
              value={resultStatusFilter}
              onChange={(e) => setResultStatusFilter(e.target.value)}
              className={styles.select}
            >
              <option value="">All Status</option>
              <option value="passed">Passed</option>
              <option value="failed">Failed</option>
              <option value="backlog">Backlog</option>
            </select>
          </div>

          <Link href="/admin/results/add">
            <Button className={styles.addButton}>
              <Plus className="h-4 w-4 mr-2" />
              Add Result
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className={styles.statsGrid}>
          <Card>
            <CardHeader className={styles.statCard}>
              <CardTitle className={styles.statTitle}>Total Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={styles.statValue}>{filteredResults.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className={styles.statCard}>
              <CardTitle className={styles.statTitle}>Published Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={styles.statValue}>
                {filteredResults.filter((r) => r.published).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className={styles.statCard}>
              <CardTitle className={styles.statTitle}>Pass Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={styles.statValue}>
                {filteredResults.length > 0
                  ? (() => {
                      const allResults = filteredResults;
                      const allPassed = allResults.filter((r) => r.marks >= 40); // Both regular + backlog passes
                      return allResults.length > 0
                        ? ((allPassed.length / allResults.length) * 100).toFixed(1) + "%"
                        : "0.0%";
                    })()
                  : "0.0%"}
              </div>
              <div className={styles.statInfo}>
                {(() => {
                  const allResults = filteredResults;
                  const allPassed = allResults.filter((r) => r.marks >= 40);
                  const allFailed = allResults.filter((r) => r.marks < 40);
                  return `${allPassed.length} passed, ${allFailed.length} failed`;
                })()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className={styles.statCard}>
              <CardTitle className={styles.statTitle}>Courses with Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={styles.statValue}>
                {new Set(filteredResults.map((r) => r.course_id)).size}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results List */}
        <Card>
          <CardHeader>
            <CardTitle className={styles.cardTitle}>
              <TrendingUp className={styles.cardIcon} />
              Results ({filteredResults.length})
            </CardTitle>
            <CardDescription>
              {filteredResults.length === results.length
                ? "All student results in the system"
                : "Filtered student results"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredResults.length === 0 ? (
              <div className={styles.emptyState}>
                <TrendingUp className={styles.emptyIcon} />
                <p className={styles.emptyText}>No results found</p>
                <Link href="/admin/results/add">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Result
                  </Button>
                </Link>
              </div>
            ) : (
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr className={styles.tableHeader}>
                      <th className={styles.tableHeaderCell}>Student</th>
                      <th className={styles.tableHeaderCell}>Course</th>
                      <th className={styles.tableHeaderCellCenter}>Marks</th>
                      <th className={styles.tableHeaderCellCenter}>Grade</th>
                      <th className={styles.tableHeaderCellCenter}>Type</th>
                      <th className={styles.tableHeaderCellCenter}>Status</th>
                      <th className={styles.tableHeaderCellCenter}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredResults.map((result) => (
                      <tr key={result.id} className={styles.tableRow}>
                        <td className={styles.tableCell}>
                          <div className={styles.studentInfo}>
                            <p>{result.student_name}</p>
                            <p>{students.find((s) => s.id === result.student_id)?.roll_number}</p>
                          </div>
                        </td>
                        <td className={styles.tableCell}>
                          <div className={styles.courseInfo}>
                            <p>{result.course_code}</p>
                            <p>{result.course_name}</p>
                          </div>
                        </td>
                        <td className={styles.tableCellCenter}>
                          <span className={styles.marks}>{result.marks}/100</span>
                        </td>
                        <td className={styles.tableCellCenter}>
                          {(() => {
                            const gradeInfo = getGradeFromMarks(result.marks);
                            return (
                              <span
                                className={`${styles.gradeBadge} ${getGradeColor(gradeInfo.grade)}`}
                              >
                                {gradeInfo.grade}
                              </span>
                            );
                          })()}
                        </td>
                        <td className={styles.tableCellCenter}>
                          <span
                            className={`${styles.statusBadge} ${
                              result.is_backlog ? styles.statusBacklog : styles.statusRegular
                            }`}
                          >
                            {result.is_backlog ? "Backlog" : "Regular"}
                          </span>
                        </td>
                        <td className={styles.tableCellCenter}>
                          <span
                            className={`${styles.statusBadge} ${
                              result.published ? styles.statusPublished : styles.statusDraft
                            }`}
                          >
                            {result.published ? "Published" : "Draft"}
                          </span>
                        </td>
                        <td className={styles.tableCell}>
                          <div className={styles.actions}>
                            <Link href={`/admin/results/${result.id}/edit`}>
                              <Button size="sm" variant="outline">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleToggleStatus(result.id, result.published)}
                            >
                              {result.published ? (
                                <span className={styles.actionButton}>
                                  <EyeOff className="h-4 w-4" />
                                  <span>Unpublish</span>
                                </span>
                              ) : (
                                <span className={styles.actionButton}>
                                  <Eye className="h-4 w-4" />
                                  <span>Publish</span>
                                </span>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className={styles.actionButtonDelete}
                              onClick={() => handleDeleteResult(result.id)}
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

      {/* Popup Component */}
      <PopupComponent />
    </div>
  );
}
