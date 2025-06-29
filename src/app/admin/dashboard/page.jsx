"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  GraduationCap,
  LogOut,
  Users,
  BookOpen,
  Building2,
  TrendingUp,
  UserPlus,
  BookPlus,
} from "lucide-react";
import styles from "./page.module.css";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/admin/stats");
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else if (response.status === 401) {
        // Redirect to login if unauthorized
        router.push("/admin/login");
      } else {
        console.error("Failed to fetch stats:", response.status);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const managementItems = [
    {
      title: "Students",
      description: "Manage student records",
      icon: Users,
      href: "/admin/students",
      containerClass: styles.managementIconContainerBlue,
      iconClass: styles.managementIconBlue,
    },
    {
      title: "Departments",
      description: "Manage academic departments",
      icon: Building2,
      href: "/admin/departments",
      containerClass: styles.managementIconContainerGreen,
      iconClass: styles.managementIconGreen,
    },
    {
      title: "Courses",
      description: "Manage courses and curriculum",
      icon: BookOpen,
      href: "/admin/courses",
      containerClass: styles.managementIconContainerPurple,
      iconClass: styles.managementIconPurple,
    },
    {
      title: "Results",
      description: "Manage student results and grades",
      icon: TrendingUp,
      href: "/admin/results",
      containerClass: styles.managementIconContainerOrange,
      iconClass: styles.managementIconOrange,
    },
  ];

  const quickActions = [
    {
      title: "Add Student",
      icon: UserPlus,
      href: "/admin/students/add",
      variant: "default",
    },
    {
      title: "Add Course",
      icon: BookPlus,
      href: "/admin/courses/add",
      variant: "outline",
    },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerBrand}>
            <GraduationCap className={styles.brandIcon} />
            <div>
              <h1 className={styles.brandTitle}>Admin Dashboard</h1>
              <p className={styles.brandSubtitle}>Student Result Management System</p>
            </div>
          </div>
          <div className={styles.headerActions}>
            <ThemeToggle />
            <Button onClick={handleLogout} variant="outline" size="sm">
              <LogOut className={styles.logoutIcon} />
              Logout
            </Button>
          </div>
        </header>

        {/* Stats Cards */}
        <div className={styles.statsGrid}>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className={styles.loadingCard}>
                <CardContent className={styles.loadingCardContent}>
                  <div className={styles.loadingBar}></div>
                  <div className={styles.loadingBarLarge}></div>
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              <Card>
                <CardContent className={styles.statCard}>
                  <div className={styles.statCardContent}>
                    <div className={styles.statInfo}>
                      <p className={styles.statLabel}>Total Students</p>
                      <p className={styles.statValue}>{stats?.totalStudents || 0}</p>
                    </div>
                    <Users className={`${styles.statIcon} ${styles.statIconBlue}`} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className={styles.statCard}>
                  <div className={styles.statCardContent}>
                    <div className={styles.statInfo}>
                      <p className={styles.statLabel}>Total Courses</p>
                      <p className={styles.statValue}>{stats?.totalCourses || 0}</p>
                    </div>
                    <BookOpen className={`${styles.statIcon} ${styles.statIconGreen}`} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className={styles.statCard}>
                  <div className={styles.statCardContent}>
                    <div className={styles.statInfo}>
                      <p className={styles.statLabel}>Departments</p>
                      <p className={styles.statValue}>{stats?.totalDepartments || 0}</p>
                    </div>
                    <Building2 className={`${styles.statIcon} ${styles.statIconPurple}`} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className={styles.statCard}>
                  <div className={styles.statCardContent}>
                    <div className={styles.statInfo}>
                      <p className={styles.statLabel}>Published Results</p>
                      <p className={styles.statValue}>{stats?.publishedResults || 0}</p>
                    </div>
                    <TrendingUp className={`${styles.statIcon} ${styles.statIconOrange}`} />
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Quick Actions */}
        <div className={styles.quickActions}>
          <h2 className={styles.quickActionsTitle}>Quick Actions</h2>
          <div className={styles.quickActionsGrid}>
            {quickActions.map((action) => (
              <Link key={action.title} href={action.href}>
                <Button variant={action.variant} size="lg">
                  <action.icon className={styles.actionIcon} />
                  {action.title}
                </Button>
              </Link>
            ))}
          </div>
        </div>

        {/* Management Grid */}
        <div className={styles.managementGrid}>
          {managementItems.map((item) => (
            <Link key={item.title} href={item.href} className={styles.managementCard}>
              <Card>
                <CardHeader className={styles.managementCardHeader}>
                  <div className={`${styles.managementIconContainer} ${item.containerClass}`}>
                    <item.icon className={`${styles.managementIcon} ${item.iconClass}`} />
                  </div>
                  <CardTitle className={styles.managementTitle}>{item.title}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>

        {/* Footer */}
        <footer className={styles.footer}>
          <p>&copy; 2025 Student Result Management System. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
