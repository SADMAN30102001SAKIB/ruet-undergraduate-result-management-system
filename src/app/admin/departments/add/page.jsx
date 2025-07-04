"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePopup } from "@/components/ui/popup";
import { GraduationCap, ArrowLeft, Save, Building2 } from "lucide-react";
import styles from "./page.module.css";

export default function AddDepartment() {
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const { showError, PopupComponent } = usePopup();
  const [formData, setFormData] = useState({
    name: "",
    code: "",
  });
  const router = useRouter();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Department name is required";
    }

    if (!formData.code.trim()) {
      newErrors.code = "Department code is required";
    } else if (!/^[A-Z0-9]+$/.test(formData.code.toUpperCase())) {
      newErrors.code = "Department code should contain only letters and numbers";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSaving(true);

    try {
      const response = await fetch("/api/admin/departments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          ...formData,
          code: formData.code.toUpperCase(),
        }),
      });

      if (response.ok) {
        // Redirect back to departments list - the navigation is sufficient feedback
        router.push("/admin/departments");
      } else {
        const error = await response.json();
        showError("Error", error.error || "Failed to create department");
      }
    } catch (error) {
      console.error("Error creating department:", error);
      showError("Error", "Failed to create department");
    } finally {
      setSaving(false);
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
                <h1 className={styles.headerTitle}>Department Management</h1>
                <p className={styles.headerSubtitle}>
                  Add new department to the academic structure
                </p>
              </div>
            </div>
            <div className={styles.headerActions}>              <Link href="/admin/departments">
                <Button variant="outline" size="sm">
                  <ArrowLeft className={`${styles.iconSm} ${styles.iconWithMargin}`} />
                  Back to Departments
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
            <CardTitle className={styles.headerInfo}>
              <Building2 className={`${styles.iconMd} ${styles.iconWithMargin}`} />
              Department Details
            </CardTitle>
            <CardDescription>Enter the department name and code below</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.gridRow}>
                {/* Department Name */}
                <div className={styles.fieldGroup}>
                  <Label htmlFor="name">Department Name</Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="e.g., Computer Science"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    disabled={saving}
                  />
                  {errors.name && <p className={styles.errorText}>{errors.name}</p>}
                </div>

                {/* Department Code */}
                <div className={styles.fieldGroup}>
                  <Label htmlFor="code">Department Code</Label>
                  <Input
                    id="code"
                    name="code"
                    type="text"
                    placeholder="e.g., CS"
                    value={formData.code}
                    onChange={handleInputChange}
                    required
                    disabled={saving}
                  />
                  {errors.code && <p className={styles.errorText}>{errors.code}</p>}
                </div>
              </div>

              {/* Action Buttons */}
              <div className={styles.formActions}>
                <Link href="/admin/departments">
                  <Button type="button" variant="outline" disabled={saving}>
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={saving}>
                  <Save className={`${styles.iconSm} ${styles.iconWithMargin}`} />
                  {saving ? "Creating..." : "Create Department"}
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
