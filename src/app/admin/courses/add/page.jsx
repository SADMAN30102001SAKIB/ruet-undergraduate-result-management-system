"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { usePopup } from "@/components/ui/popup";
import { GraduationCap, ArrowLeft, BookOpen, Save, AlertCircle } from "lucide-react";
import styles from "./page.module.css";

export default function AddCourse() {
  const [departments, setDepartments] = useState([]);
  const { showError, PopupComponent } = usePopup();
  const [formData, setFormData] = useState({
    course_code: "",
    course_name: "",
    department_id: "",
    year: "1",
    semester: "odd",
    credits: "3",
    cgpa_weight: "4.0",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await fetch("/api/admin/departments");
      if (response.ok) {
        const data = await response.json();
        setDepartments(data.departments || []);
      }
    } catch (error) {
      console.error("Failed to fetch departments:", error);
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

    setLoading(true);

    try {
      const response = await fetch("/api/admin/courses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          course_code: formData.course_code.toUpperCase(),
          department_id: parseInt(formData.department_id),
          year: parseInt(formData.year),
          credits: parseFloat(formData.credits),
          cgpa_weight: parseFloat(formData.cgpa_weight),
        }),
      });

      if (response.ok) {
        // Redirect back to courses list - the navigation is sufficient feedback
        router.push("/admin/courses");
      } else {
        const data = await response.json();
        if (data.field && data.error) {
          setErrors({ [data.field]: data.error });
        } else {
          showError("Error", data.error || "Failed to add course");
        }
      }
    } catch (error) {
      console.error("Add course error:", error);
      showError("Error", "Failed to add course");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

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
                <h1 className={styles.headerTitle}>Course Management</h1>
                <p className={styles.headerSubtitle}>Add new course to the academic curriculum</p>
              </div>
            </div>
            <div className={styles.headerActions}>
              <ThemeToggle />
              <Link href="/admin/courses">
                <Button variant="outline" size="sm">
                  <ArrowLeft className={`${styles.iconSm} ${styles.iconWithMargin}`} />
                  Back to Courses
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
                <BookOpen className={`${styles.iconMd} ${styles.iconWithMargin}`} />
                Course Information
              </CardTitle>
              <CardDescription>Enter the details for the new course</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className={styles.form}>
                {/* Course Code and Department */}
                <div className={styles.gridRow}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>
                      Course Code <span className={styles.required}>*</span>
                    </label>
                    <Input
                      value={formData.course_code}
                      onChange={(e) => handleChange("course_code", e.target.value)}
                      placeholder="e.g., CSE101"
                      className={errors.course_code ? styles.inputError : ""}
                    />
                    {errors.course_code && (
                      <p className={styles.errorMessage}>
                        <AlertCircle className={styles.iconSm} />
                        {errors.course_code}
                      </p>
                    )}
                  </div>

                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>
                      Department <span className={styles.required}>*</span>
                    </label>
                    <select
                      value={formData.department_id}
                      onChange={(e) => handleChange("department_id", e.target.value)}
                      className={`${styles.select} ${
                        errors.department_id ? styles.inputError : ""
                      }`}
                    >
                      <option value="">Select Department</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.code}
                        </option>
                      ))}
                    </select>
                    {errors.department_id && (
                      <p className={styles.errorMessage}>
                        <AlertCircle className={styles.iconSm} />
                        {errors.department_id}
                      </p>
                    )}
                  </div>
                </div>

                {/* Course Name */}
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>
                    Course Name <span className={styles.required}>*</span>
                  </label>
                  <Input
                    value={formData.course_name}
                    onChange={(e) => handleChange("course_name", e.target.value)}
                    placeholder="e.g., Programming Fundamentals"
                    className={errors.course_name ? styles.inputError : ""}
                  />
                  {errors.course_name && (
                    <p className={styles.errorMessage}>
                      <AlertCircle className={styles.iconSm} />
                      {errors.course_name}
                    </p>
                  )}
                </div>

                {/* Year and Semester */}
                <div className={styles.gridRow}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>
                      Academic Year <span className={styles.required}>*</span>
                    </label>
                    <select
                      value={formData.year}
                      onChange={(e) => handleChange("year", e.target.value)}
                      className={styles.select}
                    >
                      <option value="1">1st Year</option>
                      <option value="2">2nd Year</option>
                      <option value="3">3rd Year</option>
                      <option value="4">4th Year</option>
                    </select>
                  </div>

                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>
                      Semester <span className={styles.required}>*</span>
                    </label>
                    <select
                      value={formData.semester}
                      onChange={(e) => handleChange("semester", e.target.value)}
                      className={styles.select}
                    >
                      <option value="odd">Odd</option>
                      <option value="even">Even</option>
                    </select>
                  </div>
                </div>

                {/* Credits and CGPA Weight */}
                <div className={styles.gridRow}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>
                      Credits <span className={styles.required}>*</span>
                    </label>
                    <Input
                      type="number"
                      min="0.75"
                      max="6"
                      step="0.75"
                      value={formData.credits}
                      onChange={(e) => handleChange("credits", e.target.value)}
                      className={errors.credits ? styles.inputError : ""}
                    />
                    {errors.credits && (
                      <p className={styles.errorMessage}>
                        <AlertCircle className={styles.iconSm} />
                        {errors.credits}
                      </p>
                    )}
                  </div>

                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>
                      CGPA Weight <span className={styles.required}>*</span>
                    </label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="4"
                      value={formData.cgpa_weight}
                      onChange={(e) => handleChange("cgpa_weight", e.target.value)}
                      className={errors.cgpa_weight ? styles.inputError : ""}
                    />
                    {errors.cgpa_weight && (
                      <p className={styles.errorMessage}>
                        <AlertCircle className={styles.iconSm} />
                        {errors.cgpa_weight}
                      </p>
                    )}
                  </div>
                </div>

                {/* Guidelines */}
                <div className={styles.infoSection}>
                  <h4 className={styles.infoTitle}>Course Guidelines:</h4>
                  <ul className={styles.infoList}>
                    <li>• Course codes should follow department naming conventions</li>
                    <li>• Credits typically range from 1-6 depending on course type</li>
                    <li>• CGPA weight is usually 4.0 for most courses</li>
                    <li>• Ensure the course doesn&#39;t already exist in the department</li>
                  </ul>
                </div>

                {/* Form Actions */}
                <div className={styles.formActions}>
                  <Link href="/admin/courses">
                    <Button type="button" variant="outline">
                      Cancel
                    </Button>
                  </Link>
                  <Button type="submit" disabled={loading}>
                    <Save className={`${styles.iconSm} ${styles.iconWithMargin}`} />
                    {loading ? "Adding..." : "Add Course"}
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
