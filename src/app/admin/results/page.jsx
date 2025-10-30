"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePopup } from "@/components/ui/popup";
import { getGradeFromMarks, getBacklogGradeFromMarks } from "@/lib/utils";
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
  AlertTriangle,
  X,
  FileText,
  Award,
  Database,
  CheckCircle,
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
    series: [],
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [publishedFilter, setPublishedFilter] = useState("");
  const [resultStatusFilter, setResultStatusFilter] = useState("");
  const [examTypeFilter, setExamTypeFilter] = useState("");
  const [seriesFilter, setSeriesFilter] = useState("");
  const [showActiveFailedModal, setShowActiveFailedModal] = useState(false);
  const [selectedCourses, setSelectedCourses] = useState(new Set());
  const [showCreateBacklogModal, setShowCreateBacklogModal] = useState(false);
  const [backlogGroupName, setBacklogGroupName] = useState("");
  const [backlogAction, setBacklogAction] = useState("create"); // "create" or "add"
  const [selectedExistingGroup, setSelectedExistingGroup] = useState("");
  const [existingGroups, setExistingGroups] = useState([]);

  const fetchExistingGroups = async () => {
    try {
      const response = await fetch("/api/admin/backlog");
      if (response.ok) {
        const data = await response.json();
        setExistingGroups(data.groups || []);
      }
    } catch (error) {
      console.error("Failed to fetch existing groups:", error);
    }
  };

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
      await Promise.all([fetchData(), fetchFilterOptions(), fetchExistingGroups()]);
    };
    fetchAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset selected courses when any filter is applied
  useEffect(() => {
    setSelectedCourses(new Set());
  }, [
    searchTerm,
    departmentFilter,
    yearFilter,
    semesterFilter,
    courseFilter,
    seriesFilter,
    publishedFilter,
    resultStatusFilter,
    examTypeFilter,
  ]);

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
    const result = results.find((r) => r.id === resultId);
    if (!result) {
      showError("Error", "Result not found");
      return;
    }

    // Check if it's a regular result with an associated backlog
    if (!result.is_backlog) {
      const hasBacklog = results.some(
        (r) =>
          r.student_id === result.student_id && r.course_id === result.course_id && r.is_backlog
      );
      if (hasBacklog) {
        showError(
          "Cannot Delete",
          "This regular result cannot be deleted because it has an associated backlog result. Delete the backlog result first."
        );
        return;
      }
    }

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

    const matchesSeries = !seriesFilter || student?.academic_session?.startsWith(seriesFilter);

    const matchesPublished =
      !publishedFilter || (publishedFilter === "published" ? result.published : !result.published);

    const matchesResultStatus =
      !resultStatusFilter ||
      (result.marks >= 40 ? resultStatusFilter === "passed" : resultStatusFilter === "failed");

    const matchesExamType =
      !examTypeFilter ||
      (result.is_backlog ? examTypeFilter === "backlog" : examTypeFilter === "regular");

    return (
      matchesSearch &&
      matchesDepartment &&
      matchesYear &&
      matchesSemester &&
      matchesCourse &&
      matchesSeries &&
      matchesPublished &&
      matchesResultStatus &&
      matchesExamType
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

  const activeFailedResults = (() => {
    const activeFailedMap = new Map();
    filteredResults.forEach((result) => {
      if (result.marks >= 40) return;
      const key = `${result.student_id}-${result.course_id}`;
      const backlogResult = results.find(
        (r) =>
          r.student_id === result.student_id && r.course_id === result.course_id && r.is_backlog
      );
      if (backlogResult && backlogResult.marks >= 40) return;
      // If not already in map, add it; prefer backlog over regular
      if (!activeFailedMap.has(key)) {
        activeFailedMap.set(key, result);
      } else {
        const existing = activeFailedMap.get(key);
        if (result.is_backlog && !existing.is_backlog) {
          activeFailedMap.set(key, result);
        }
      }
    });
    return Array.from(activeFailedMap.values());
  })();

  const handleCourseSelection = (resultId, isSelected) => {
    const newSelected = new Set(selectedCourses);
    if (isSelected) {
      newSelected.add(resultId);
    } else {
      newSelected.delete(resultId);
    }
    setSelectedCourses(newSelected);
  };

  const handleSelectAllCourses = (isSelected) => {
    if (isSelected) {
      setSelectedCourses(new Set(activeFailedResults.map((r) => r.id)));
    } else {
      setSelectedCourses(new Set());
    }
  };

  const handleCreateBacklogGroup = async () => {
    // Validation based on action type
    if (backlogAction === "create" && !backlogGroupName.trim()) {
      showError("Error", "Please enter a group name");
      return;
    }

    if (backlogAction === "add" && !selectedExistingGroup) {
      showError("Error", "Please select an existing group");
      return;
    }

    if (selectedCourses.size === 0) {
      showError("Error", "Please select at least one course");
      return;
    }

    try {
      const courseSelections = Array.from(selectedCourses).map((resultId) => {
        const result = activeFailedResults.find((r) => r.id === resultId);
        return {
          studentId: result.student_id,
          courseId: result.course_id,
        };
      });

      const requestBody = {
        courseSelections,
      };

      if (backlogAction === "create") {
        requestBody.name = backlogGroupName.trim();
      } else {
        requestBody.groupId = selectedExistingGroup;
      }

      const response = await fetch("/api/admin/backlog", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const result = await response.json();
        setShowCreateBacklogModal(false);
        setBacklogGroupName("");
        setSelectedExistingGroup("");
        setBacklogAction("create");
        setSelectedCourses(new Set());
        setShowActiveFailedModal(false);
        // Refresh data to show updated groups
        fetchData();
        // Could show success message here
      } else {
        const error = await response.json();
        showError("Error", error.error || "Failed to process backlog group");
      }
    } catch (error) {
      console.error("Error processing backlog group:", error);
      showError("Error", "Failed to process backlog group");
    }
  };

  const openCreateBacklogModal = () => {
    setBacklogAction("create");
    setBacklogGroupName("");
    setSelectedExistingGroup("");
    setShowCreateBacklogModal(true);
  };

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
                  {year === 1 ? "1st" : year === 2 ? "2nd" : year === 3 ? "3rd" : `${year}th`} Year
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
            <Select
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
            </Select>
            <Select
              value={seriesFilter}
              onChange={(e) => setSeriesFilter(e.target.value)}
              className={styles.select}
            >
              <option value="">All Series</option>
              {filterOptions.series.map((series) => (
                <option key={series} value={series}>
                  {series}
                </option>
              ))}
            </Select>
            <Select
              value={publishedFilter}
              onChange={(e) => setPublishedFilter(e.target.value)}
              className={styles.select}
            >
              <option value="">All Results</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </Select>
            <Select
              value={resultStatusFilter}
              onChange={(e) => setResultStatusFilter(e.target.value)}
              className={styles.select}
            >
              <option value="">All Status</option>
              <option value="passed">Passed</option>
              <option value="failed">Failed</option>
            </Select>
            <Select
              value={examTypeFilter}
              onChange={(e) => setExamTypeFilter(e.target.value)}
              className={styles.select}
            >
              <option value="">All Types</option>
              <option value="regular">Regular</option>
              <option value="backlog">Backlog</option>
            </Select>
          </div>
        </div>

        {/* Stats Cards */}
        <div className={styles.statsGrid}>
          <Card>
            <CardHeader className={styles.statCard}>
              <CardTitle className={styles.statTitle}>
                <Database className={`${styles.statIcon} ${styles.statIconBlue}`} />
                Total Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={styles.statValue}>{filteredResults.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className={styles.statCard}>
              <CardTitle className={styles.statTitle}>
                <CheckCircle className={`${styles.statIcon} ${styles.statIconGreen}`} />
                Published Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={styles.statValue}>
                {filteredResults.filter((r) => r.published).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className={styles.statCard}>
              <CardTitle className={styles.statTitle}>
                <Award className={`${styles.statIcon} ${styles.statIconOrange}`} />
                Pass Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={styles.statValue}>
                {filteredResults.length > 0
                  ? (() => {
                      const allResults = filteredResults;
                      const allPassed = allResults.filter((r) => r.marks >= 40); // Both regular + backlog passes
                      const percentage =
                        allResults.length > 0
                          ? ((allPassed.length / allResults.length) * 100).toFixed(1) + "%"
                          : "0.0%";
                      const passed = allPassed.length;
                      const failed = allResults.filter((r) => r.marks < 40).length;
                      return <>{percentage}</>;
                    })()
                  : "0.0%"}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className={styles.statCard}>
              <CardTitle className={styles.statTitle}>
                <FileText className={`${styles.statIcon} ${styles.statIconPurple}`} />
                Courses with Results
              </CardTitle>
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
          <CardHeader className={styles.resultsCardHeader}>
            <div className={styles.titleSection}>
              <div className={styles.titleWithActions}>
                <CardTitle className={styles.cardTitle}>
                  <TrendingUp className={styles.cardIcon} />
                  Results <span>({filteredResults.length})</span>
                </CardTitle>
                <div className={styles.titleActions}>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setShowActiveFailedModal(true)}
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Active Failed <span>({activeFailedResults.length})</span>
                  </Button>
                  <Link href="/admin/backlog">
                    <Button variant="outline" size="sm" className={styles.backlogButton}>
                      <Edit className="h-4 w-4 mr-2" />
                      Backlog Management
                    </Button>
                  </Link>
                </div>
              </div>
              <CardDescription>
                Manage student results, grades, and academic performance records
              </CardDescription>
            </div>
            <div className={styles.rightActions}>
              <Link href="/admin/results/add">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Result
                </Button>
              </Link>
            </div>
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
                            const gradeInfo = result.is_backlog
                              ? getBacklogGradeFromMarks(result.marks)
                              : getGradeFromMarks(result.marks);
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
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (result.published) {
                                  showError(
                                    "Cannot Edit",
                                    "Result needs to be unpublished before it can be edited"
                                  );
                                  return;
                                }
                                window.location.href = `/admin/results/${result.id}/edit`;
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
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
                              className={styles.deleteButton}
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

      {/* Active Failed Modal */}
      {showActiveFailedModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBackdrop} onClick={() => setShowActiveFailedModal(false)} />
          <div className={styles.modal}>
            <div className={styles.modalContent}>
              <div className={styles.modalHeader}>
                <div className={styles.modalHeaderContent}>
                  <AlertTriangle className={styles.modalIcon} />
                  <h3 className={styles.modalTitle}> &nbsp;Active Failed Students</h3>
                </div>
                <div className={styles.modalHeaderActions}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openCreateBacklogModal}
                    disabled={selectedCourses.size === 0}
                  >
                    Create Backlog Group
                  </Button>
                  <button
                    onClick={() => setShowActiveFailedModal(false)}
                    className={styles.modalCloseButton}
                  >
                    <X className={styles.modalCloseIcon} />
                  </button>
                </div>
              </div>
              <div className={styles.modalBody}>
                {activeFailedResults.length === 0 ? (
                  <p className={styles.modalEmpty}>No active failed students found.</p>
                ) : (
                  <div className={styles.modalTableContainer}>
                    <table className={styles.modalTable}>
                      <thead>
                        <tr className={styles.modalTableHeader}>
                          <th className={styles.modalTableHeaderCellCenter}>
                            <input
                              type="checkbox"
                              checked={
                                selectedCourses.size === activeFailedResults.length &&
                                activeFailedResults.length > 0
                              }
                              onChange={(e) => handleSelectAllCourses(e.target.checked)}
                            />
                          </th>
                          <th className={styles.modalTableHeaderCell}>Student</th>
                          <th className={styles.modalTableHeaderCell}>Course</th>
                          <th className={styles.modalTableHeaderCellCenter}>Marks</th>
                          <th className={styles.modalTableHeaderCellCenter}>Grade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeFailedResults.map((result) => (
                          <tr key={`modal-${result.id}`} className={styles.modalTableRow}>
                            <td className={styles.modalTableCellCenter}>
                              <input
                                type="checkbox"
                                checked={selectedCourses.has(result.id)}
                                onChange={(e) => handleCourseSelection(result.id, e.target.checked)}
                              />
                            </td>
                            <td className={styles.modalTableCell}>
                              <div className={styles.studentInfo}>
                                <p>{result.student_name}</p>
                                <p>
                                  {students.find((s) => s.id === result.student_id)?.roll_number}
                                </p>
                              </div>
                            </td>
                            <td className={styles.modalTableCell}>
                              <div className={styles.courseInfo}>
                                <p>{result.course_code}</p>
                                <p>{result.course_name}</p>
                              </div>
                            </td>
                            <td className={styles.modalTableCellCenter}>
                              <span className={styles.marks}>{result.marks}/100</span>
                            </td>
                            <td className={styles.modalTableCellCenter}>
                              <span
                                className={`${styles.gradeBadge} ${getGradeColor(
                                  (result.is_backlog
                                    ? getBacklogGradeFromMarks(result.marks)
                                    : getGradeFromMarks(result.marks)
                                  ).grade
                                )}`}
                              >
                                {
                                  (result.is_backlog
                                    ? getBacklogGradeFromMarks(result.marks)
                                    : getGradeFromMarks(result.marks)
                                  ).grade
                                }
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Backlog Group Modal */}
      {showCreateBacklogModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBackdrop} onClick={() => setShowCreateBacklogModal(false)} />
          <div className={styles.modal}>
            <div className={styles.modalContent}>
              <div className={styles.modalHeader}>
                <div className={styles.modalHeaderContent}>
                  <Plus className={styles.modalIcon} />
                  <h3 className={styles.modalTitle}>
                    &nbsp;
                    {backlogAction === "create" ? "Create Backlog Group" : "Add to Backlog Group"}
                  </h3>
                </div>
                <button
                  onClick={() => setShowCreateBacklogModal(false)}
                  className={styles.modalCloseButton}
                >
                  <X className={styles.modalCloseIcon} />
                </button>
              </div>
              <div className={styles.modalBody}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Action *</label>
                  <div className={styles.radioGroup}>
                    <label
                      className={`${styles.radioOption} ${
                        backlogAction === "create" ? styles.radioOptionActive : ""
                      }`}
                    >
                      <input
                        type="radio"
                        value="create"
                        checked={backlogAction === "create"}
                        onChange={(e) => setBacklogAction(e.target.value)}
                        className={styles.radioInput}
                      />
                      <div className={styles.radioContent}>
                        <div className={styles.radioIcon}>
                          <Plus className="h-5 w-5" />
                        </div>
                        <div>
                          <div className={styles.radioTitle}>Create New Group</div>
                          <div className={styles.radioDescription}>
                            Create a new backlog group for these courses
                          </div>
                        </div>
                      </div>
                    </label>
                    <label
                      className={`${styles.radioOption} ${
                        backlogAction === "add" ? styles.radioOptionActive : ""
                      }`}
                    >
                      <input
                        type="radio"
                        value="add"
                        checked={backlogAction === "add"}
                        onChange={(e) => setBacklogAction(e.target.value)}
                        className={styles.radioInput}
                      />
                      <div className={styles.radioContent}>
                        <div className={styles.radioIcon}>
                          <Eye className="h-5 w-5" />
                        </div>
                        <div>
                          <div className={styles.radioTitle}>Add to Existing Group</div>
                          <div className={styles.radioDescription}>
                            Add these courses to an existing backlog group
                          </div>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {backlogAction === "create" ? (
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>Group Name *</label>
                    <Input
                      value={backlogGroupName}
                      onChange={(e) => setBacklogGroupName(e.target.value)}
                      placeholder="Enter backlog group name (e.g., Spring 2024 Backlog)"
                      className={styles.modalInput}
                    />
                  </div>
                ) : (
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>Select Existing Group *</label>
                    <Select
                      value={selectedExistingGroup}
                      onChange={(e) => setSelectedExistingGroup(e.target.value)}
                      className={styles.modalInput}
                    >
                      <option value="">Choose a group...</option>
                      {existingGroups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}

                <div className={styles.modalActions}>
                  <Button variant="outline" onClick={() => setShowCreateBacklogModal(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateBacklogGroup}
                    disabled={
                      (backlogAction === "create" && !backlogGroupName.trim()) ||
                      (backlogAction === "add" && !selectedExistingGroup) ||
                      selectedCourses.size === 0
                    }
                  >
                    {backlogAction === "create" ? "Create Group" : "Add to Group"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Popup Component */}
      <PopupComponent />
    </div>
  );
}
