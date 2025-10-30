"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePopup } from "@/components/ui/popup";
import { GraduationCap, ArrowLeft, Save, BookOpen } from "lucide-react";
import styles from "./page.module.css";

export default function EditCourse() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showError, PopupComponent } = usePopup();
  const [formData, setFormData] = useState({
    course_code: "",
    course_name: "",
    department_id: "",
    year: "",
    semester: "",
    credits: "",
    cgpa_weight: "",
  });
  const [errors, setErrors] = useState({});
  const router = useRouter();
  const params = useParams();
  const courseId = params.id;

  useEffect(() => {
    const fetchData = async () => {
      await fetchCourse();
      await fetchDepartments();
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const fetchCourse = async () => {
    try {
      const response = await fetch(`/api/admin/courses/${courseId}`);
      if (response.ok) {
        const courseData = await response.json();
        setFormData({
          course_code: courseData.course_code,
          course_name: courseData.course_name,
          department_id: courseData.department_id.toString(),
          year: courseData.year.toString(),
          semester: courseData.semester,
          credits: courseData.credits.toString(),
          cgpa_weight: courseData.cgpa_weight.toString(),
        });
      } else {
        showError("Error", "Course not found");
        router.push("/admin/courses");
      }
    } catch (error) {
      console.error("Error fetching course:", error);
      showError("Error", "Failed to fetch course");
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await fetch("/api/admin/departments");
      if (response.ok) {
        const data = await response.json();
        setDepartments(data.departments || []);
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.course_code.trim()) {
      newErrors.course_code = "Course code is required";
    } else if (!/^[A-Z0-9]+$/.test(formData.course_code.toUpperCase())) {
      newErrors.course_code = "Course code should contain only letters and numbers";
    }

    if (!formData.course_name.trim()) {
      newErrors.course_name = "Course name is required";
    }

    if (!formData.department_id) {
      newErrors.department_id = "Department is required";
    }

    const credits = parseFloat(formData.credits);
    if (isNaN(credits) || credits <= 0 || credits > 6) {
      newErrors.credits = "Credits must be a positive number up to 6";
    }

    const cgpaWeight = parseFloat(formData.cgpa_weight);
    if (isNaN(cgpaWeight) || cgpaWeight < 0 || cgpaWeight > 4) {
      newErrors.cgpa_weight = "CGPA weight must be between 0 and 4";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSaving(true);

    try {
      const response = await fetch(`/api/admin/courses/${courseId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          course_code: formData.course_code,
          course_name: formData.course_name,
          department_id: parseInt(formData.department_id),
          year: parseInt(formData.year),
          semester: formData.semester,
          credits: parseFloat(formData.credits),
          cgpa_weight: parseFloat(formData.cgpa_weight),
        }),
      });

      if (response.ok) {
        // Redirect back to courses list - the navigation is sufficient feedback
        router.push("/admin/courses");
      } else {
        const error = await response.json();
        showError("Error", error.error || "Failed to update course");
      }
    } catch (error) {
      console.error("Error updating course:", error);
      showError("Error", "Failed to update course");
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingText}>Loading course...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerFlex}>
            <div className={styles.headerLeft}>
              <div className={styles.headerIcon}>
                <GraduationCap className={`${styles.icon6} ${styles.textWhite}`} />
              </div>
              <div>
                <h1 className={styles.headerTitle}>Course Management</h1>
                <p className={styles.headerSubtitle}>Edit course information</p>
              </div>
            </div>
            <div className={styles.headerRight}>
              <Link href="/admin/courses">
                <Button variant="outline" size="sm">
                  <ArrowLeft className={styles.buttonIcon} />
                  Back to Courses
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={styles.main}>
        {/* Edit Form */}
        <Card className={styles.card}>
          <CardHeader>
            <CardTitle className={styles.headerInfo}>
              <BookOpen className={`${styles.iconMd} ${styles.iconWithMargin}`} />
              Course Information
            </CardTitle>
            <CardDescription>Modify the course information below</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.gridTwo}>
                <div>
                  <label htmlFor="course_code" className={styles.label}>
                    Course Code *
                  </label>
                  <Input
                    id="course_code"
                    name="course_code"
                    value={formData.course_code}
                    onChange={handleInputChange}
                    placeholder="e.g., CS101"
                    required
                    error={errors.course_code}
                  />
                  {errors.course_code && <p className={styles.errorText}>{errors.course_code}</p>}
                </div>

                <div>
                  <label htmlFor="department_id" className={styles.label}>
                    Department *
                  </label>
                  <select
                    id="department_id"
                    name="department_id"
                    value={formData.department_id}
                    onChange={handleInputChange}
                    className={styles.select}
                    required
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.code}
                      </option>
                    ))}
                  </select>
                  {errors.department_id && (
                    <p className={styles.errorText}>{errors.department_id}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="course_name" className={styles.label}>
                  Course Name *
                </label>
                <Input
                  id="course_name"
                  name="course_name"
                  value={formData.course_name}
                  onChange={handleInputChange}
                  placeholder="e.g., Introduction to Computer Science"
                  required
                  error={errors.course_name}
                />
                {errors.course_name && <p className={styles.errorText}>{errors.course_name}</p>}
              </div>

              <div className={styles.gridThree}>
                <div>
                  <label htmlFor="year" className={styles.label}>
                    Academic Year *
                  </label>
                  <select
                    id="year"
                    name="year"
                    value={formData.year}
                    onChange={handleInputChange}
                    className={styles.select}
                    required
                  >
                    <option value="">Select Year</option>
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="semester" className={styles.label}>
                    Semester *
                  </label>
                  <select
                    id="semester"
                    name="semester"
                    value={formData.semester}
                    onChange={handleInputChange}
                    className={styles.select}
                    required
                  >
                    <option value="">Select Semester</option>
                    <option value="odd">Odd</option>
                    <option value="even">Even</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="credits" className={styles.label}>
                    Credits *
                  </label>
                  <Input
                    id="credits"
                    name="credits"
                    type="number"
                    min="0.75"
                    max="6"
                    step="0.75"
                    value={formData.credits}
                    onChange={handleInputChange}
                    placeholder="3"
                    required
                    error={errors.credits}
                  />
                  {errors.credits && <p className={styles.errorText}>{errors.credits}</p>}
                </div>
              </div>

              <div>
                <label htmlFor="cgpa_weight" className={styles.label}>
                  CGPA Weight *
                </label>
                <Input
                  id="cgpa_weight"
                  name="cgpa_weight"
                  type="number"
                  step="0.1"
                  min="0"
                  max="4"
                  value={formData.cgpa_weight}
                  onChange={handleInputChange}
                  placeholder="4.0"
                  required
                  error={errors.cgpa_weight}
                />
                {errors.cgpa_weight && <p className={styles.errorText}>{errors.cgpa_weight}</p>}
                <p className={styles.helpText}>Weight of this course in CGPA calculation (0-4)</p>
              </div>

              <div className={styles.buttonGroup}>
                <Link href="/admin/courses">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={saving}>
                  <Save className={styles.buttonIcon} />
                  {saving ? "Updating..." : "Update Course"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>

      {/* Popup Component */}
      <PopupComponent />
    </div>
  );
}
