"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePopup } from "@/components/ui/popup";
import {
  GraduationCap,
  ArrowLeft,
  Search,
  ToggleLeft,
  ToggleRight,
  Eye,
  Edit,
  Trash2,
  X,
} from "lucide-react";
import styles from "./page.module.css";

export default function BacklogManagement() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameGroupId, setRenameGroupId] = useState(null);
  const [renameGroupName, setRenameGroupName] = useState("");
  const { showConfirm, showError, PopupComponent } = usePopup();

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const response = await fetch("/api/admin/backlog");
      if (response.ok) {
        const data = await response.json();
        setGroups(data.groups || []);
      }
    } catch (error) {
      console.error("Failed to fetch backlog groups:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredGroups = useMemo(() => {
    return groups.filter((group) =>
      group.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [groups, searchTerm]);

  const handleToggleRegistration = async (groupId, isOpen) => {
    try {
      const response = await fetch(`/api/admin/backlog/${groupId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isOpen }),
      });

      if (response.ok) {
        // Update local state
        setGroups(
          groups.map((group) => (group.id === groupId ? { ...group, is_open: isOpen } : group))
        );
      } else {
        const errorData = await response.json();
        showError("Toggle Failed", errorData.error || "Failed to update registration status");
        // Revert the UI change since the API call failed
        setGroups(
          groups.map((group) => (group.id === groupId ? { ...group, is_open: !isOpen } : group))
        );
      }
    } catch (error) {
      console.error("Failed to toggle registration:", error);
      showError("Toggle Failed", "An unexpected error occurred while updating registration status");
      // Revert the UI change since the API call failed
      setGroups(
        groups.map((group) => (group.id === groupId ? { ...group, is_open: !isOpen } : group))
      );
    }
  };

  const handleRenameGroup = async () => {
    if (!renameGroupName.trim()) {
      showError("Invalid Input", "Please enter a group name");
      return;
    }

    try {
      const response = await fetch(`/api/admin/backlog/${renameGroupId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: renameGroupName.trim() }),
      });

      if (response.ok) {
        // Update local state
        setGroups(
          groups.map((group) =>
            group.id === renameGroupId ? { ...group, name: renameGroupName.trim() } : group
          )
        );
        setShowRenameModal(false);
        setRenameGroupId(null);
        setRenameGroupName("");
      } else {
        const errorData = await response.json();
        showError("Rename Failed", errorData.error || "Failed to rename backlog group");
      }
    } catch (error) {
      console.error("Failed to rename group:", error);
      showError("Rename Failed", "An unexpected error occurred while renaming the group");
    }
  };

  const handleDeleteGroup = async (groupId) => {
    const group = groups.find((g) => g.id === groupId);

    showConfirm(
      "Delete Backlog Group",
      `Are you sure you want to delete "${group?.name}"? This action cannot be undone and will remove all associated course registrations.`,
      async () => {
        try {
          const response = await fetch(`/api/admin/backlog/${groupId}`, {
            method: "DELETE",
          });

          if (response.ok) {
            // Remove from local state
            setGroups(groups.filter((group) => group.id !== groupId));
          } else {
            const errorData = await response.json();
            showError("Delete Failed", errorData.error || "Failed to delete backlog group");
          }
        } catch (error) {
          console.error("Failed to delete group:", error);
          showError("Delete Failed", "An unexpected error occurred while deleting the group");
        }
      },
      "Delete",
      "Cancel"
    );
  };

  const openRenameModal = (group) => {
    setRenameGroupId(group.id);
    setRenameGroupName(group.name);
    setShowRenameModal(true);
  };


  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <Link href="/admin/results">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <GraduationCap className={styles.headerIcon} />
            <div>
              <h1 className={styles.headerTitle}>Backlog Management</h1>
              <p className={styles.headerSubtitle}>Manage backlog exam groups and registrations</p>
            </div>
          </div>
        </header>

        {/* Search */}
        <div className={styles.searchContainer}>
          <div className="relative">
            <Search className={styles.searchIcon} />
            <Input
              placeholder="Search groups by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>
        </div>

        {/* Groups List */}
        <Card>
          <CardHeader>
            <CardTitle className={styles.cardTitle}>
              <Eye className={styles.cardIcon} />
              Backlog Groups {loading ? (
                <span className={styles.skeletonTableRow} style={{ width: '40px', display: 'inline-block', verticalAlign: 'middle', marginLeft: '0.5rem' }}></span>
              ) : (
                <span>({filteredGroups.length})</span>
              )}
            </CardTitle>
            <CardDescription>
              {filteredGroups.length === 0 && !loading 
                ? "No backlog groups found" 
                : "Manage registration status and view group details"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredGroups.length === 0 && !loading ? (
              <div className={styles.emptyState}>
                <Eye className={styles.emptyIcon} />
                <p className={styles.emptyText}>No backlog groups found</p>
              </div>
            ) : (
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr className={styles.tableHeader}>
                      <th className={styles.tableHeaderCell}>Group Name</th>
                      <th className={styles.tableHeaderCellCenter}>Total Courses</th>
                      <th className={styles.tableHeaderCellCenter}>Registered</th>
                      <th className={styles.tableHeaderCellCenter}>Registration</th>
                      <th className={styles.tableHeaderCellCenter}>Created</th>
                      <th className={styles.tableHeaderCellCenter}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className={styles.tableRow}>
                          <td className={styles.tableCell}><div className={styles.skeletonTableRow}></div></td>
                          <td className={styles.tableCellCenter}><div className={styles.skeletonTableRow} style={{ width: "40px", margin: "0 auto" }}></div></td>
                          <td className={styles.tableCellCenter}><div className={styles.skeletonTableRow} style={{ width: "40px", margin: '0 auto' }}></div></td>
                          <td className={styles.tableCellCenter}><div className={styles.skeletonTableRow} style={{ width: "60px", margin: '0 auto' }}></div></td>
                          <td className={styles.tableCellCenter}><div className={styles.skeletonTableRow} style={{ width: "80px", margin: '0 auto' }}></div></td>
                          <td className={styles.tableCellCenter}>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                              <div className={styles.skeletonTableRow} style={{ width: '32px', height: '32px' }}></div>
                              <div className={styles.skeletonTableRow} style={{ width: '32px', height: '32px' }}></div>
                              <div className={styles.skeletonTableRow} style={{ width: '32px', height: '32px' }}></div>
                              <div className={styles.skeletonTableRow} style={{ width: '32px', height: '32px' }}></div>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      filteredGroups.map((group) => (
                      <tr key={group.id} className={styles.tableRow}>
                        <td className={styles.tableCell}>
                          <div className={styles.groupInfo}>
                            <p className={styles.groupName}>{group.name}</p>
                            <p className={styles.groupId}>ID: {group.id}</p>
                          </div>
                        </td>
                        <td className={styles.tableCellCenter}>{group.total_courses || 0}</td>
                        <td className={styles.tableCellCenter}>{group.registered_courses || 0}</td>
                        <td className={styles.tableCellCenter}>
                          <span
                            className={`${styles.statusBadge} ${
                              group.is_open ? styles.statusOpen : styles.statusClosed
                            }`}
                          >
                            {group.is_open ? "Open" : "Closed"}
                          </span>
                        </td>
                        <td className={styles.tableCellCenter}>
                          {new Date(group.created_at).toLocaleDateString()}
                        </td>
                        <td className={styles.tableCellCenter}>
                          <div className={styles.actions}>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleToggleRegistration(group.id, !group.is_open)}
                              title={group.is_open ? "Close Registration" : "Open Registration"}
                            >
                              {group.is_open ? (
                                <ToggleRight className="h-4 w-4 text-green-600" />
                              ) : (
                                <ToggleLeft className="h-4 w-4 text-red-600" />
                              )}
                            </Button>
                            <Link href={`/admin/backlog/${group.id}`}>
                              <Button size="sm" variant="outline" title="View Details">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openRenameModal(group)}
                              title="Rename Group"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteGroup(group.id)}
                              title="Delete Group"
                              className={styles.deleteButton}
                            >
                              <Trash2 className="h-4 w-4" />
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

        {/* Rename Group Modal */}
        {showRenameModal && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalBackdrop} onClick={() => setShowRenameModal(false)} />
            <div className={styles.modal}>
              <div className={styles.modalContent}>
                <div className={styles.modalHeader}>
                  <div className={styles.modalHeaderContent}>
                    <Edit className={styles.modalIcon} />
                    <h3 className={styles.modalTitle}>Rename Backlog Group</h3>
                  </div>
                  <button
                    onClick={() => setShowRenameModal(false)}
                    className={styles.modalCloseButton}
                  >
                    <X className={styles.modalCloseIcon} />
                  </button>
                </div>
                <div className={styles.modalBody}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>New Group Name *</label>
                    <Input
                      value={renameGroupName}
                      onChange={(e) => setRenameGroupName(e.target.value)}
                      placeholder="Enter new group name"
                      className={styles.modalInput}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          handleRenameGroup();
                        }
                      }}
                    />
                  </div>
                  <div className={styles.modalActions}>
                    <Button variant="outline" onClick={() => setShowRenameModal(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleRenameGroup} disabled={!renameGroupName.trim()}>
                      Rename Group
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <PopupComponent />
    </div>
  );
}
