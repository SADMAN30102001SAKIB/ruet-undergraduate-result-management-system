"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { usePopup } from "@/components/ui/popup";
import { GraduationCap, ArrowLeft, Building2, Plus, Edit, Trash2 } from "lucide-react";
import styles from "./page.module.css";

export default function AdminDepartments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const router = useRouter();
  const { showError, showConfirm, PopupComponent } = usePopup();

  useEffect(() => {
    fetchDepartments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await fetch("/api/admin/departments", {
        credentials: "include", // Ensure cookies are sent
      });
      if (response.ok) {
        const data = await response.json();
        setDepartments(data.departments || []);
      } else {
        console.error("Failed to fetch departments:", response.status, response.statusText);
        showError("Error", "Failed to fetch departments");
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
      showError("Error", "Failed to fetch departments");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (department) => {
    router.push(`/admin/departments/${department.id}/edit`);
  };

  const handleDelete = async (id) => {
    showConfirm(
      "Delete Department",
      "Are you sure you want to delete this department? This action cannot be undone.",
      async () => {
        setDeleting(id);

        try {
          const response = await fetch(`/api/admin/departments/${id}`, {
            method: "DELETE",
            credentials: "include",
          });

          if (response.ok) {
            // Update departments list - the UI update is sufficient feedback
            setDepartments(departments.filter((dept) => dept.id !== id));
          } else {
            console.error("Response not ok:", response.status, response.statusText);
            const error = await response.json();
            console.error("API Error:", error);
            showError("Error", error.error || `Failed to delete department (${response.status})`);
          }
        } catch (error) {
          console.error("Error deleting department:", error);
          showError(
            "Error",
            `Failed to delete department: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
        } finally {
          setDeleting(null);
        }
      },
      "Delete",
      "Cancel"
    );
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingText}>Loading departments...</div>
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
                <ArrowLeft className={styles.backIcon} />
              </Button>
            </Link>
            <GraduationCap className={styles.headerIcon} />
            <div>
              <h1 className={styles.headerTitle}>Department Management</h1>
              <p className={styles.headerSubtitle}>Manage academic departments</p>
            </div>
          </div>
          <ThemeToggle />
        </header>

        {/* Add Department Button */}
        <div className={styles.addButtonSection}>
          <Link href="/admin/departments/add">
            <Button className={styles.addButton}>
              <Plus className={styles.addIcon} />
              Add Department
            </Button>
          </Link>
        </div>

        {/* Departments List */}
        <Card>
          <CardHeader>
            <CardTitle className={styles.cardTitle}>
              <Building2 className={styles.cardTitleIcon} />
              Departments ({departments.length})
            </CardTitle>
            <CardDescription>All academic departments in the system</CardDescription>
          </CardHeader>
          <CardContent>
            {departments.length === 0 ? (
              <div className={styles.emptyState}>
                <Building2 className={styles.emptyStateIcon} />
                <p className={styles.emptyStateText}>No departments found</p>
                <Link href="/admin/departments/add">
                  <Button className={styles.emptyStateButton}>
                    <Plus className={styles.emptyStateButtonIcon} />
                    Add First Department
                  </Button>
                </Link>
              </div>
            ) : (
              <div className={styles.tableContainer}>
                <table className={styles.departmentsTable}>
                  <thead>
                    <tr className={styles.tableHeader}>
                      <th className={styles.tableHeaderCell}>Department</th>
                      <th className={styles.tableHeaderCell}>Code</th>
                      <th className={styles.tableHeaderCellCenter}>Courses</th>
                      <th className={styles.tableHeaderCellCenter}>Students</th>
                      <th className={styles.tableHeaderCell}>Created</th>
                      <th className={styles.tableHeaderCellCenter}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departments.map((department) => (
                      <tr key={department.id} className={styles.tableRow}>
                        <td className={styles.tableCell}>
                          <div className={styles.departmentInfo}>
                            <Building2 className={styles.departmentInfoIcon} />
                            <div>
                              <p className={styles.departmentName}>{department.name}</p>
                            </div>
                          </div>
                        </td>
                        <td className={styles.tableCell}>
                          <span className={styles.departmentCode}>{department.code}</span>
                        </td>
                        <td className={styles.tableCellCenter}>
                          <div className={styles.courseCountContainer}>
                            <span className={styles.courseCount}>
                              {department.course_count || 0}
                            </span>
                          </div>
                        </td>
                        <td className={styles.tableCellCenter}>
                          <div className={styles.studentCountContainer}>
                            <span className={styles.studentCount}>
                              {department.student_count || 0}
                            </span>
                          </div>
                        </td>
                        <td className={styles.tableCell}>
                          <span className={styles.createdDate}>
                            {new Date(department.created_at).toLocaleDateString()}
                          </span>
                        </td>
                        <td className={styles.tableCellCenter}>
                          <div className={styles.actionsContainer}>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(department)}
                            >
                              <Edit className={styles.actionIcon} />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className={styles.deleteButton}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDelete(department.id);
                              }}
                              disabled={deleting === department.id}
                            >
                              <Trash2 className={styles.actionIcon} />
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
