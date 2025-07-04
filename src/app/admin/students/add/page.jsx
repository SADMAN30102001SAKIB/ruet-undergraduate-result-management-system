"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePopup } from "@/components/ui/popup";
import { GraduationCap, ArrowLeft, UserPlus, Save, User } from "lucide-react";
import styles from "./page.module.css";

export default function AddStudent() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
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
    academic_session: "2024-2025",
    current_year: "1",
    current_semester: "odd",
  });

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

    setLoading(true);

    try {
      const response = await fetch("/api/admin/students", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          roll_number: formData.roll_number.toUpperCase(),
          registration_number: formData.registration_number.toUpperCase(),
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
          showError("Error", data.error || "Failed to add student");
        }
      }
    } catch (error) {
      console.error("Add student error:", error);
      showError("Error", "Failed to add student");
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
        <div className={styles.headerContent}>
          <div className={styles.headerNav}>
            <div className={styles.headerLeft}>
              <div className={styles.headerIcon}>
                <GraduationCap className={`${styles.icon6} ${styles.textWhite}`} />
              </div>
              <div>
                <h1 className={styles.headerTitle}>Student Management</h1>
                <p className={styles.headerSubtitle}>Add new student to the academic system</p>
              </div>
            </div>
            <div className={styles.headerRight}>              <Link href="/admin/students">
                <Button variant="outline" size="sm">
                  <ArrowLeft className={`${styles.icon4} ${styles.mr2}`} />
                  Back to Students
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={styles.main}>
        {/* Form */}
        <div className={styles.formContainer}>
          <Card>
            <CardHeader>
              <CardTitle className={styles.cardTitle}>
                <UserPlus className={`${styles.icon5} ${styles.mr2}`} />
                Student Information
              </CardTitle>
              <CardDescription>Fill in the details to create a new student profile</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className={styles.form}>
                {/* Personal Information */}
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>
                    <User className={`${styles.icon5} ${styles.mr2}`} />
                    Personal Information
                  </h3>

                  <div className={styles.grid}>
                    <div className={styles.fieldGroup}>
                      <label htmlFor="name" className={styles.label}>
                        Student Name *
                      </label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleChange("name", e.target.value)}
                        placeholder="Enter student's full name"
                        className={errors.name ? styles.errorInput : ""}
                      />
                      {errors.name && <p className={styles.error}>{errors.name}</p>}
                    </div>

                    <div className={styles.fieldGroup}>
                      <label htmlFor="parent_name" className={styles.label}>
                        Parent/Guardian Name *
                      </label>
                      <Input
                        id="parent_name"
                        value={formData.parent_name}
                        onChange={(e) => handleChange("parent_name", e.target.value)}
                        placeholder="Enter parent's name"
                        className={errors.parent_name ? styles.errorInput : ""}
                      />
                      {errors.parent_name && <p className={styles.error}>{errors.parent_name}</p>}
                    </div>

                    <div className={styles.fieldGroup}>
                      <label htmlFor="phone" className={styles.label}>
                        Phone Number *
                      </label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => handleChange("phone", e.target.value)}
                        placeholder="Enter phone number"
                        className={errors.phone ? styles.errorInput : ""}
                      />
                      {errors.phone && <p className={styles.error}>{errors.phone}</p>}
                    </div>

                    <div className={styles.fieldGroup}>
                      <label htmlFor="department_id" className={styles.label}>
                        Department *
                      </label>
                      <select
                        id="department_id"
                        value={formData.department_id}
                        onChange={(e) => handleChange("department_id", e.target.value)}
                        className={`${styles.select} ${
                          errors.department_id ? styles.errorInput : ""
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
                        <p className={styles.error}>{errors.department_id}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Academic Information */}
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>Academic Information</h3>

                  <div className={styles.grid}>
                    <div className={styles.fieldGroup}>
                      <label htmlFor="roll_number" className={styles.label}>
                        Roll Number *
                      </label>
                      <Input
                        id="roll_number"
                        value={formData.roll_number}
                        onChange={(e) => handleChange("roll_number", e.target.value.toUpperCase())}
                        placeholder="Enter roll number"
                        className={`${styles.uppercase} ${
                          errors.roll_number ? styles.errorInput : ""
                        }`}
                      />
                      {errors.roll_number && <p className={styles.error}>{errors.roll_number}</p>}
                    </div>

                    <div className={styles.fieldGroup}>
                      <label htmlFor="registration_number" className={styles.label}>
                        Registration Number *
                      </label>
                      <Input
                        id="registration_number"
                        value={formData.registration_number}
                        onChange={(e) =>
                          handleChange("registration_number", e.target.value.toUpperCase())
                        }
                        placeholder="Enter registration number"
                        className={`${styles.uppercase} ${
                          errors.registration_number ? styles.errorInput : ""
                        }`}
                      />
                      {errors.registration_number && (
                        <p className={styles.error}>{errors.registration_number}</p>
                      )}
                    </div>

                    <div className={styles.fieldGroup}>
                      <label htmlFor="academic_session" className={styles.label}>
                        Academic Session *
                      </label>
                      <Input
                        id="academic_session"
                        value={formData.academic_session}
                        onChange={(e) => handleChange("academic_session", e.target.value)}
                        placeholder="e.g., 2024-2025"
                        className={errors.academic_session ? styles.errorInput : ""}
                      />
                      {errors.academic_session && (
                        <p className={styles.error}>{errors.academic_session}</p>
                      )}
                    </div>

                    <div className={styles.fieldGroup}>
                      <label htmlFor="current_year" className={styles.label}>
                        Current Year
                      </label>
                      <select
                        id="current_year"
                        value={formData.current_year}
                        onChange={(e) => handleChange("current_year", e.target.value)}
                        className={styles.select}
                      >
                        <option value="1">1st Year</option>
                        <option value="2">2nd Year</option>
                        <option value="3">3rd Year</option>
                        <option value="4">4th Year</option>
                      </select>
                    </div>

                    <div className={styles.fieldGroup}>
                      <label htmlFor="current_semester" className={styles.label}>
                        Current Semester
                      </label>
                      <select
                        id="current_semester"
                        value={formData.current_semester}
                        onChange={(e) => handleChange("current_semester", e.target.value)}
                        className={styles.select}
                      >
                        <option value="odd">Odd</option>
                        <option value="even">Even</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className={styles.actions}>
                  <Link href="/admin/students">
                    <Button type="button" variant="outline">
                      Cancel
                    </Button>
                  </Link>
                  <Button type="submit" disabled={loading}>
                    <Save className={`${styles.icon4} ${styles.mr2}`} />
                    {loading ? "Adding..." : "Add Student"}
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
