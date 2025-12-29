"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePopup } from "@/components/ui/popup";
import { GraduationCap, ArrowLeft, Building2, Plus, Edit, Trash2, X, Search } from "lucide-react";
import styles from "./page.module.css";
import { Input } from "@/components/ui/input";

export default function AdminDepartments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [formData, setFormData] = useState({ name: "", code: "" });
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
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

  const openAddModal = () => {
    setEditingDept(null);
    setFormData({ name: "", code: "" });
    setShowModal(true);
  };

  const openEditModal = (department) => {
    setEditingDept(department);
    setFormData({ name: department.name, code: department.code });
    setShowModal(true);
  };

  const handleSaveDepartment = async () => {
    if (!formData.name.trim() || !formData.code.trim()) {
      showError("Invalid Input", "Please fill in all fields");
      return;
    }

    setSaving(true);
    try {
      const url = editingDept
        ? `/api/admin/departments/${editingDept.id}`
        : "/api/admin/departments";
      const method = editingDept ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
        credentials: "include",
      });

      if (response.ok) {
        await fetchDepartments();
        setShowModal(false);
      } else {
        const error = await response.json();
        showError("Error", error.error || "Failed to save department");
      }
    } catch (error) {
      console.error("Save error:", error);
      showError("Error", "An unexpected error occurred");
    } finally {
      setSaving(false);
    }
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

  const filteredDepartments = departments.filter(
    (dept) =>
      dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dept.code.toLowerCase().includes(searchTerm.toLowerCase())
  );


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
        </header>

        {/* Controls Section */}
        <div className={styles.addButtonSection}>
          <div className={styles.searchContainer}>
            <Search className={styles.searchIcon} />
            <Input
              className={styles.searchInput}
              placeholder="Search departments by name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button className={styles.addButton} onClick={openAddModal}>
            <Plus className={styles.addIcon} />
            Add Department
          </Button>
        </div>

        {/* Departments List */}
        <Card>
          <CardHeader>
            <CardTitle className={styles.cardTitle}>
              <Building2 className={styles.cardTitleIcon} />
              Departments {loading ? (
                <span className={styles.skeletonTableRow} style={{ width: '40px', display: 'inline-block', verticalAlign: 'middle', marginLeft: '0.5rem' }}></span>
              ) : (
                <span>({filteredDepartments.length})</span>
              )}
            </CardTitle>
            <CardDescription>
              All academic departments in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredDepartments.length === 0 && !loading ? (
              <div className={styles.emptyState}>
                <Building2 className={styles.emptyStateIcon} />
                <p className={styles.emptyStateText}>
                  {searchTerm ? "No matching departments found" : "No departments found"}
                </p>
                {!searchTerm && (
                  <Button className={styles.emptyStateButton} onClick={openAddModal}>
                    <Plus className={styles.emptyStateButtonIcon} />
                    Add First Department
                  </Button>
                )}
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
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className={styles.tableRow}>
                          <td className={styles.tableCell}><div className={styles.skeletonTableRow}></div></td>
                          <td className={styles.tableCell}><div className={styles.skeletonTableRow} style={{ width: '60px' }}></div></td>
                          <td className={styles.tableCellCenter}><div className={styles.skeletonTableRow} style={{ width: '40px', margin: '0 auto' }}></div></td>
                          <td className={styles.tableCellCenter}><div className={styles.skeletonTableRow} style={{ width: '40px', margin: '0 auto' }}></div></td>
                          <td className={styles.tableCell}><div className={styles.skeletonTableRow} style={{ width: '100px' }}></div></td>
                          <td className={styles.tableCellCenter}><div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                            <div className={styles.skeletonTableRow} style={{ width: '32px', height: '32px' }}></div>
                            <div className={styles.skeletonTableRow} style={{ width: '32px', height: '32px' }}></div>
                          </div></td>
                        </tr>
                      ))
                    ) : (
                      filteredDepartments.map((department) => (
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
                              onClick={() => openEditModal(department)}
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
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal UI */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBackdrop} onClick={() => setShowModal(false)} />
          <div className={styles.modal}>
            <div className={styles.modalContent}>
              <div className={styles.modalHeader}>
                <div className={styles.modalHeaderContent}>
                  {editingDept ? (
                    <Edit className={styles.modalIcon} />
                  ) : (
                    <Plus className={styles.modalIcon} />
                  )}
                  <h3 className={styles.modalTitle}>
                    {editingDept ? "Edit Department" : "Add Department"}
                  </h3>
                </div>
                <button onClick={() => setShowModal(false)} className={styles.modalCloseButton}>
                  <X className={styles.modalCloseIcon} />
                </button>
              </div>
              <div className={styles.modalBody}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Department Name *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Computer Science & Engineering"
                    className={styles.modalInput}
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Department Code *</label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g. CSE"
                    className={styles.modalInput}
                  />
                </div>
                <div className={styles.modalActions}>
                  <Button variant="outline" onClick={() => setShowModal(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveDepartment}
                    disabled={saving || !formData.name.trim() || !formData.code.trim()}
                  >
                    {saving ? "Saving..." : editingDept ? "Update Department" : "Add Department"}
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
