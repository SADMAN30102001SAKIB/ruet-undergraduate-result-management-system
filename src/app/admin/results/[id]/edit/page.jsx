"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { usePopup } from "@/components/ui/popup";
import { getGradeFromMarks } from "@/lib/utils";
import { GraduationCap, ArrowLeft, Save, AlertCircle } from "lucide-react";
import styles from "./page.module.css";

export default function EditResult() {
  const [departments, setDepartments] = useState([]);
  const [students, setStudents] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const { showError, PopupComponent } = usePopup();
  const [formData, setFormData] = useState({
    student_id: "",
    course_id: "",
    marks: "",
    published: false,
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");
  const [rollSearchQuery, setRollSearchQuery] = useState("");
  const router = useRouter();
  const params = useParams();
  const resultLoadedRef = useRef(false);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (params.id && students.length > 0 && !resultLoadedRef.current) {
      // Call fetchResult directly instead of using it as dependency
      const loadResult = async () => {
        try {
          const response = await fetch(`/api/admin/results/${params.id}`);
          if (response.ok) {
            const resultData = await response.json(); // Pre-populate form with existing data
            setFormData({
              student_id: resultData.student_id.toString(),
              course_id: resultData.course_id.toString(),
              marks: resultData.marks.toString(),
              published: resultData.published,
            });

            // Set filters based on student's information to show context
            const student = students.find((s) => s.id === resultData.student_id);
            if (student) {
              setSelectedDepartment(student.department_id.toString());
              setSelectedYear(student.current_year.toString());
              setSelectedSemester(student.current_semester);
              // Optionally pre-populate search with student's roll number for easy identification
              setRollSearchQuery(student.roll_number);
            }

            resultLoadedRef.current = true; // Mark as loaded to prevent re-loading
          } else {
            showError("Error", "Failed to fetch result");
            router.push("/admin/results");
          }
        } catch (error) {
          console.error("Error fetching result:", error);
          showError("Error", "Failed to fetch result");
          router.push("/admin/results");
        }
      };

      loadResult();
    }
  }, [params.id, students, router, showError]);

  useEffect(() => {
    // Filter students by department, year, semester, and roll number search
    let filtered = students;

    if (selectedDepartment) {
      filtered = filtered.filter(
        (student) => student.department_id.toString() === selectedDepartment
      );
    }

    if (selectedYear) {
      filtered = filtered.filter((student) => student.current_year.toString() === selectedYear);
    }

    if (selectedSemester) {
      filtered = filtered.filter((student) => student.current_semester === selectedSemester);
    }

    if (rollSearchQuery.trim()) {
      filtered = filtered.filter(
        (student) =>
          student.roll_number.toLowerCase().includes(rollSearchQuery.toLowerCase()) ||
          student.name.toLowerCase().includes(rollSearchQuery.toLowerCase()) ||
          student.registration_number.toLowerCase().includes(rollSearchQuery.toLowerCase())
      );
    }

    setFilteredStudents(filtered);
  }, [selectedDepartment, selectedYear, selectedSemester, rollSearchQuery, students]);

  const filterCourses = useCallback(async () => {
    // Only filter courses if a student is selected
    if (!formData.student_id) {
      setFilteredCourses([]);
      return;
    }

    try {
      // Build query parameters for filtering
      const queryParams = new URLSearchParams();
      if (selectedDepartment) {
        queryParams.append("departmentId", selectedDepartment);
      }
      if (selectedYear) {
        queryParams.append("year", selectedYear);
      }
      if (selectedSemester) {
        queryParams.append("semester", selectedSemester);
      }

      // Get registered courses for the selected student with filters
      const url = `/api/admin/students/${formData.student_id}/courses${
        queryParams.toString() ? `?${queryParams.toString()}` : ""
      }`;
      const response = await fetch(url);
      if (response.ok) {
        const registeredCourses = await response.json();
        setFilteredCourses(registeredCourses);
      } else {
        setFilteredCourses([]);
      }
    } catch (error) {
      console.error("Error fetching student courses:", error);
      setFilteredCourses([]);
    }
  }, [formData.student_id, selectedDepartment, selectedYear, selectedSemester]);

  useEffect(() => {
    filterCourses();
  }, [filterCourses]);

  const fetchData = async () => {
    try {
      const [departmentsRes, studentsRes, coursesRes] = await Promise.all([
        fetch("/api/admin/departments"),
        fetch("/api/admin/students"),
        fetch("/api/admin/courses"),
      ]);

      if (departmentsRes.ok) {
        const departmentsData = await departmentsRes.json();
        setDepartments(departmentsData.departments || []);
      }

      if (studentsRes.ok) {
        const studentsData = await studentsRes.json();
        setStudents(studentsData.students || []);
        setFilteredStudents(studentsData.students || []);
      }

      if (coursesRes.ok) {
        const coursesData = await coursesRes.json();
        setAllCourses(coursesData.courses || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      showError("Error", "Failed to fetch data");
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.student_id) {
      newErrors.student_id = "Student is required";
    }

    if (!formData.course_id) {
      newErrors.course_id = "Course is required";
    }
    if (!formData.marks) {
      newErrors.marks = "Marks are required";
    } else {
      const marksValue = parseFloat(formData.marks);
      if (isNaN(marksValue) || marksValue < 0 || marksValue > 100) {
        newErrors.marks = "Marks must be a number between 0 and 100";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/results/${params.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          student_id: parseInt(formData.student_id),
          course_id: parseInt(formData.course_id),
          marks: parseFloat(formData.marks),
          published: formData.published,
        }),
      });
      if (response.ok) {
        // Redirect back to results list - the navigation is sufficient feedback
        router.push("/admin/results");
      } else {
        const error = await response.json();
        showError("Error", error.error || "Failed to update result");
      }
    } catch (error) {
      console.error("Error updating result:", error);
      showError("Error", "Failed to update result");
    } finally {
      setLoading(false);
    }
  };

  const currentMarks = parseFloat(formData.marks);
  const currentGradeInfo = isNaN(currentMarks) ? null : getGradeFromMarks(currentMarks);

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContainer}>
          <div className={styles.headerContent}>
            <div className={styles.headerInfo}>
              <div className={styles.headerIcon}>
                <GraduationCap className={`${styles.iconLg} ${styles.iconWhite}`} />
              </div>
              <div>
                <h1 className={styles.headerTitle}>Results Management</h1>
                <p className={styles.headerSubtitle}>Edit student result and grade</p>
              </div>
            </div>
            <div className={styles.headerActions}>
              <ThemeToggle />
              <Link href="/admin/results">
                <Button variant="outline" size="sm">
                  <ArrowLeft className={`${styles.iconSm} ${styles.iconWithMargin}`} />
                  Back to Results
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={styles.main}>
        <div className={styles.formContainer}>
          <Card>
            <CardHeader>
              <CardTitle className={styles.headerInfo}>
                <Save className={`${styles.iconMd} ${styles.iconWithMargin}`} />
                Result Information
              </CardTitle>
              <CardDescription>Update the details for the student result</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className={styles.form}>
                {/* Filters Section */}
                <div className={styles.filtersSection}>
                  <h3 className={styles.sectionTitle}>Student & Course Filters</h3>
                  <div className={styles.filtersGrid}>
                    {/* Department Filter */}
                    <div>
                      <Label htmlFor="department" className={styles.label}>
                        Department
                      </Label>
                      <select
                        id="department"
                        value={selectedDepartment}
                        onChange={(e) => setSelectedDepartment(e.target.value)}
                        className={styles.select}
                      >
                        <option value="">All Departments</option>
                        {departments.map((dept) => (
                          <option key={dept.id} value={dept.id.toString()}>
                            {dept.code}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Year Filter */}
                    <div>
                      <Label htmlFor="year" className={styles.label}>
                        Year
                      </Label>
                      <select
                        id="year"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className={styles.select}
                      >
                        <option value="">All Years</option>
                        <option value="1">1st Year</option>
                        <option value="2">2nd Year</option>
                        <option value="3">3rd Year</option>
                        <option value="4">4th Year</option>
                      </select>
                    </div>

                    {/* Semester Filter */}
                    <div>
                      <Label htmlFor="semester" className={styles.label}>
                        Semester
                      </Label>
                      <select
                        id="semester"
                        value={selectedSemester}
                        onChange={(e) => setSelectedSemester(e.target.value)}
                        className={styles.select}
                      >
                        <option value="">All Semesters</option>
                        <option value="odd">Odd</option>
                        <option value="even">Even</option>
                      </select>
                    </div>
                  </div>

                  {/* Student Search */}
                  <div style={{ marginTop: "1rem" }}>
                    <Label htmlFor="rollSearch" className={styles.label}>
                      Search Students
                    </Label>
                    <Input
                      id="rollSearch"
                      type="text"
                      value={rollSearchQuery}
                      onChange={(e) => setRollSearchQuery(e.target.value)}
                      placeholder="Search by roll number, name, or registration number..."
                    />
                  </div>
                </div>

                {/* Student Selection */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <Label htmlFor="student_id" className={styles.label}>
                    Student <span className={styles.required}>*</span>
                  </Label>
                  <select
                    id="student_id"
                    value={formData.student_id}
                    onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                    className={styles.select}
                    required
                  >
                    <option value="">
                      {filteredStudents.length === 0
                        ? "No students found with current filters"
                        : "Select a student"}
                    </option>
                    {filteredStudents.map((student, index) => (
                      <option key={`student-${student.id}-${index}`} value={student.id}>
                        {student.name} ({student.roll_number}) - Year {student.current_year},{" "}
                        {student.current_semester.charAt(0).toUpperCase() +
                          student.current_semester.slice(1)}
                      </option>
                    ))}
                  </select>
                  {errors.student_id && (
                    <p className={styles.errorMessage}>
                      <AlertCircle className={styles.errorIcon} />
                      {errors.student_id}
                    </p>
                  )}
                </div>

                {/* Course Selection */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <Label htmlFor="course_id" className={styles.label}>
                    Registered Course <span className={styles.required}>*</span>
                  </Label>
                  <select
                    id="course_id"
                    value={formData.course_id}
                    onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                    className={styles.select}
                    disabled={!formData.student_id}
                    required
                  >
                    <option value="">
                      {!formData.student_id
                        ? "Select a student first"
                        : filteredCourses.length === 0
                        ? selectedYear || selectedSemester
                          ? "No registered courses found for selected filters"
                          : "No registered courses found"
                        : "Select a course"}
                    </option>
                    {filteredCourses.map((course, index) => (
                      <option key={`course-${course.id}-${index}`} value={course.id}>
                        {course.course_code} - {course.course_name} (Year {course.year},{" "}
                        {course.semester})
                      </option>
                    ))}
                  </select>
                  {errors.course_id && (
                    <p className={styles.errorMessage}>
                      <AlertCircle className={styles.errorIcon} />
                      {errors.course_id}
                    </p>
                  )}
                </div>

                {/* Marks Input */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <Label htmlFor="marks" className={styles.label}>
                    Marks (0 - 100) <span className={styles.required}>*</span>
                  </Label>
                  <Input
                    id="marks"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.marks}
                    onChange={(e) => setFormData({ ...formData, marks: e.target.value })}
                    placeholder="Enter marks (0-100)"
                    required
                  />
                  {errors.marks && (
                    <p className={styles.errorMessage}>
                      <AlertCircle className={styles.errorIcon} />
                      {errors.marks}
                    </p>
                  )}
                  {currentGradeInfo && (
                    <p className={styles.gradeDisplay}>
                      Grade: <span style={{ fontWeight: "600" }}>{currentGradeInfo.grade}</span> (
                      {currentGradeInfo.gradePoint} points)
                    </p>
                  )}
                </div>

                {/* Published Status */}
                <div className={styles.checkboxContainer}>
                  <input
                    type="checkbox"
                    id="published"
                    checked={formData.published}
                    onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                    className={styles.checkbox}
                  />
                  <Label htmlFor="published" className={styles.label}>
                    Publish result
                  </Label>
                </div>

                {/* Submit Button */}
                <div className={styles.buttonGroup}>
                  <Button type="submit" disabled={loading} style={{ flex: 1 }}>
                    {loading ? "Updating..." : "Update Result"}
                  </Button>
                  <Link href="/admin/results">
                    <Button type="button" variant="outline">
                      Cancel
                    </Button>
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Popup Component */}
      <PopupComponent />
    </div>
  );
}
