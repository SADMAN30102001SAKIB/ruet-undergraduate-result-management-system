"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { usePopup } from "@/components/ui/popup";
import { getGradeFromMarks } from "@/lib/utils";
import { GraduationCap, ArrowLeft, Plus, AlertCircle } from "lucide-react";
import styles from "./page.module.css";

export default function AddResult() {
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

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    // Reset form if filters change
    setFormData((prev) => ({
      ...prev,
      student_id: "",
      course_id: "",
    }));
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

      // Get courses available for result entry (no result, unpublished, or failed results)
      const url = `/api/admin/students/${formData.student_id}/available-result-courses${
        queryParams.toString() ? `?${queryParams.toString()}` : ""
      }`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setFilteredCourses(data.courses || []);
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

    if (!formData.student_id.trim()) newErrors.student_id = "Student is required";
    if (!formData.course_id.trim()) newErrors.course_id = "Course is required";

    const marksValue = parseFloat(formData.marks);
    if (!formData.marks.trim()) {
      newErrors.marks = "Marks are required";
    } else if (isNaN(marksValue) || marksValue < 0 || marksValue > 100) {
      newErrors.marks = "Marks must be a number between 0 and 100";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      const marksValue = parseFloat(formData.marks);

      const response = await fetch("/api/admin/results", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          student_id: parseInt(formData.student_id),
          course_id: parseInt(formData.course_id),
          marks: marksValue,
          published: formData.published,
        }),
      });

      if (response.ok) {
        // Redirect back to results list - the navigation is sufficient feedback
        router.push("/admin/results");
      } else {
        const errorData = await response.json();
        showError("Error", `Failed to add result: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Error adding result:", error);
      showError("Error", "Failed to add result");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? e.target.checked : value,
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const selectedStudent = filteredStudents.find((s) => s.id.toString() === formData.student_id);
  const selectedCourse = Array.isArray(filteredCourses)
    ? filteredCourses.find((c) => c.id.toString() === formData.course_id)
    : null;

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
                <p className={styles.headerSubtitle}>Add new student result and grade</p>
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
                <Plus className={`${styles.iconMd} ${styles.iconWithMargin}`} />
                Result Information
              </CardTitle>
              <CardDescription>Enter the details for the new student result</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className={styles.form}>
                {/* Filters Section */}
                <div className={styles.filtersSection}>
                  <h3 className={styles.sectionTitle}>Student & Course Filters</h3>
                  <div className={styles.filtersGrid}>
                    {/* Department Filter */}
                    <div className={styles.filterField}>
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
                    <div className={styles.filterField}>
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
                    <div className={styles.filterField}>
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
                  <div className={styles.searchField}>
                    <Label htmlFor="rollSearch" className={styles.label}>
                      Search Student
                    </Label>
                    <Input
                      id="rollSearch"
                      type="text"
                      placeholder="Search by roll number, name, or registration number..."
                      value={rollSearchQuery}
                      onChange={(e) => setRollSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                {/* Student Selection */}
                <div className={styles.filterField}>
                  <Label htmlFor="student_id" className={styles.label}>
                    Student <span className={styles.required}>*</span>
                  </Label>
                  <select
                    id="student_id"
                    name="student_id"
                    value={formData.student_id}
                    onChange={handleInputChange}
                    className={`${styles.select} ${errors.student_id ? styles.selectError : ""}`}
                  >
                    <option value="">
                      {filteredStudents.length === 0
                        ? "No students found with current filters"
                        : "Select a student"}
                    </option>
                    {filteredStudents.map((student, index) => (
                      <option key={`student-${student.id}-${index}`} value={student.id.toString()}>
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
                <div className={styles.filterField}>
                  <Label htmlFor="course_id" className={styles.label}>
                    Registered Course <span className={styles.required}>*</span>
                  </Label>
                  <select
                    id="course_id"
                    name="course_id"
                    value={formData.course_id}
                    onChange={handleInputChange}
                    className={`${styles.select} ${errors.course_id ? styles.selectError : ""} ${
                      !formData.student_id ? styles.selectDisabled : ""
                    }`}
                    disabled={!formData.student_id}
                  >
                    <option value="">
                      {!formData.student_id
                        ? "Select a student first"
                        : !Array.isArray(filteredCourses) || filteredCourses.length === 0
                        ? selectedYear || selectedSemester
                          ? "No registered courses found for selected filters"
                          : "No registered courses found"
                        : "Select a course"}
                    </option>
                    {Array.isArray(filteredCourses) &&
                      filteredCourses.map((course, index) => (
                        <option key={`course-${course.id}-${index}`} value={course.id.toString()}>
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
                <div className={styles.filterField}>
                  <Label htmlFor="marks" className={styles.label}>
                    Marks (0 - 100) <span className={styles.required}>*</span>
                  </Label>
                  <Input
                    id="marks"
                    name="marks"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.marks}
                    onChange={handleInputChange}
                    className={errors.marks ? styles.inputError : ""}
                    placeholder="Enter marks (e.g., 85)"
                  />
                  {errors.marks && (
                    <p className={styles.errorMessage}>
                      <AlertCircle className={styles.errorIcon} />
                      {errors.marks}
                    </p>
                  )}
                  {formData.marks && !errors.marks && (
                    <p className={styles.gradeDisplay}>
                      Grade: {getGradeFromMarks(parseFloat(formData.marks)).grade} (
                      {getGradeFromMarks(parseFloat(formData.marks)).gradePoint} points)
                    </p>
                  )}
                </div>

                {/* Published Checkbox */}
                <div className={styles.checkboxContainer}>
                  <input
                    id="published"
                    name="published"
                    type="checkbox"
                    checked={formData.published}
                    onChange={handleInputChange}
                    className={styles.checkbox}
                  />
                  <Label htmlFor="published" className={styles.label}>
                    Publish result (students can view)
                  </Label>
                </div>

                {/* Preview */}
                {selectedStudent && selectedCourse && formData.marks && (
                  <div className={styles.previewSection}>
                    <h3 className={styles.previewTitle}>Preview</h3>
                    <div className={styles.previewContent}>
                      <p>
                        <strong>Student:</strong> {selectedStudent.name} (
                        {selectedStudent.roll_number})
                      </p>
                      <p>
                        <strong>Course:</strong> {selectedCourse.course_code} -{" "}
                        {selectedCourse.course_name}
                      </p>
                      <p>
                        <strong>Marks:</strong> {formData.marks}/100
                      </p>
                      <p>
                        <strong>Grade:</strong>{" "}
                        {getGradeFromMarks(parseFloat(formData.marks)).grade} (
                        {getGradeFromMarks(parseFloat(formData.marks)).gradePoint} points)
                      </p>
                      <p>
                        <strong>Status:</strong> {formData.published ? "Published" : "Draft"}
                      </p>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <div className={styles.buttonGroup}>
                  <Link href="/admin/results">
                    <Button type="button" variant="outline">
                      Cancel
                    </Button>
                  </Link>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Adding Result..." : "Add Result"}
                  </Button>
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
