"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePopup } from "@/components/ui/popup";
import { GraduationCap, ArrowLeft, Save, User } from "lucide-react";
import styles from "./page.module.css";

export default function EditStudent({ params }) {
  const [studentId, setStudentId] = useState("");
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const router = useRouter();
  const { showError, PopupComponent } = usePopup();

  const [formData, setFormData] = useState({
    name: "",
    parent_name: "",
    phone: "",
    roll_number: "",
    registration_number: "",
    department_id: "",
    academic_session: "",
    current_year: "1",
    current_semester: "odd",
  });

  useEffect(() => {
    const initializeData = async () => {
      const resolvedParams = await params;
      setStudentId(resolvedParams.id);
      await Promise.all([fetchStudent(resolvedParams.id), fetchDepartments()]);
      setLoading(false);
    };

    initializeData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const fetchStudent = useCallback(
    async (id) => {
      try {
        const response = await fetch(`/api/admin/students/${id}`);
        if (response.ok) {
          const data = await response.json();
          setFormData({
            name: data.name,
            parent_name: data.parent_name,
            phone: data.phone,
            roll_number: data.roll_number,
            registration_number: data.registration_number,
            department_id: data.department_id.toString(),
            academic_session: data.academic_session,
            current_year: data.current_year.toString(),
            current_semester: data.current_semester,
          });
        } else {
          showError("Error", "Failed to fetch student data");
          router.push("/admin/students");
        }
      } catch (error) {
        console.error("Failed to fetch student:", error);
        showError("Error", "Failed to fetch student data");
        router.push("/admin/students");
      }
    },
    [router, showError]
  );

  const fetchDepartments = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/departments");
      if (response.ok) {
        const data = await response.json();
        setDepartments(data.departments || []);
      }
    } catch (error) {
      console.error("Failed to fetch departments:", error);
    }
  }, []);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.parent_name.trim()) newErrors.parent_name = "Parent name is required";
    if (!formData.phone.trim()) newErrors.phone = "Phone is required";
    else if (!/^[0-9]{10,11}$/.test(formData.phone)) newErrors.phone = "Invalid phone number";

    if (!formData.roll_number.trim()) newErrors.roll_number = "Roll number is required";
    else if (!/^[A-Z0-9]+$/.test(formData.roll_number.toUpperCase())) {
      newErrors.roll_number = "Roll number should contain only letters and numbers";
    }

    if (!formData.registration_number.trim())
      newErrors.registration_number = "Registration number is required";
    else if (!/^[A-Z0-9]+$/.test(formData.registration_number.toUpperCase())) {
      newErrors.registration_number = "Registration number should contain only letters and numbers";
    }

    if (!formData.department_id) newErrors.department_id = "Department is required";
    if (!formData.academic_session.trim())
      newErrors.academic_session = "Academic session is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    setErrors({});

    try {
      const response = await fetch(`/api/admin/students/${studentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          department_id: parseInt(formData.department_id),
          current_year: parseInt(formData.current_year),
        }),
      });
      if (response.ok) {
        // Redirect back to students list - the navigation is sufficient feedback
        router.push("/admin/students");
      } else {
        const data = await response.json();
        if (data.field && data.error) {
          setErrors({ [data.field]: data.error });
        } else {
          showError("Error", data.error || "Failed to update student");
        }
      }
    } catch (error) {
      console.error("Error updating student:", error);
      showError("Error", "Failed to update student");
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingContent}>
          <div className={styles.spinner}></div>
          <p className={styles.loadingText}>Loading student data...</p>
        </div>
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
                <GraduationCap className={styles.iconSize} />
              </div>
              <div>
                <h1 className={styles.headerTitle}>Student Management</h1>
                <p className={styles.headerSubtitle}>Edit student information</p>
              </div>
            </div>
            <div className={styles.headerRight}>
              <Link href="/admin/students">
                <Button variant="outline" size="sm">
                  <ArrowLeft className={styles.buttonIcon} />
                  Back to Students
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={styles.main}>
        <Card>
          <CardHeader>
            <CardTitle className={styles.cardTitle}>
              <User className={styles.titleIcon} />
              Edit Student
            </CardTitle>
            <CardDescription>Update student information and academic details</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGrid}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Student Name *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="Enter student name"
                    className={errors.name ? styles.errorInput : ""}
                  />
                  {errors.name && <p className={styles.errorText}>{errors.name}</p>}
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Parent Name *</label>
                  <Input
                    value={formData.parent_name}
                    onChange={(e) => handleInputChange("parent_name", e.target.value)}
                    placeholder="Enter parent name"
                    className={errors.parent_name ? styles.errorInput : ""}
                  />
                  {errors.parent_name && <p className={styles.errorText}>{errors.parent_name}</p>}
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Phone Number *</label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    placeholder="Enter phone number"
                    className={errors.phone ? styles.errorInput : ""}
                  />
                  {errors.phone && <p className={styles.errorText}>{errors.phone}</p>}
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Department *</label>
                  <select
                    value={formData.department_id}
                    onChange={(e) => handleInputChange("department_id", e.target.value)}
                    className={`${styles.select} ${errors.department_id ? styles.errorInput : ""}`}
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

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Roll Number *</label>
                  <Input
                    value={formData.roll_number}
                    onChange={(e) => handleInputChange("roll_number", e.target.value)}
                    placeholder="Enter roll number"
                    className={errors.roll_number ? styles.errorInput : ""}
                  />
                  {errors.roll_number && <p className={styles.errorText}>{errors.roll_number}</p>}
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Registration Number *</label>
                  <Input
                    value={formData.registration_number}
                    onChange={(e) => handleInputChange("registration_number", e.target.value)}
                    placeholder="Enter registration number"
                    className={errors.registration_number ? styles.errorInput : ""}
                  />
                  {errors.registration_number && (
                    <p className={styles.errorText}>{errors.registration_number}</p>
                  )}
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Academic Session *</label>
                  <Input
                    value={formData.academic_session}
                    onChange={(e) => handleInputChange("academic_session", e.target.value)}
                    placeholder="e.g., 2024-2025"
                    className={errors.academic_session ? styles.errorInput : ""}
                  />
                  {errors.academic_session && (
                    <p className={styles.errorText}>{errors.academic_session}</p>
                  )}
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Current Year</label>
                  <select
                    value={formData.current_year}
                    onChange={(e) => handleInputChange("current_year", e.target.value)}
                    className={styles.select}
                  >
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                  </select>
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Current Semester</label>
                  <select
                    value={formData.current_semester}
                    onChange={(e) => handleInputChange("current_semester", e.target.value)}
                    className={styles.select}
                  >
                    <option value="odd">Odd</option>
                    <option value="even">Even</option>
                  </select>
                </div>
              </div>

              <div className={styles.buttonGroup}>
                <Link href="/admin/students">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={saving}>
                  <Save className={styles.buttonIcon} />
                  {saving ? "Saving..." : "Save Changes"}
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
