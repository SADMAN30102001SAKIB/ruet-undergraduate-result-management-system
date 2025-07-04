"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  GraduationCap,
  LogOut,
  User,
  BookOpen,
  TrendingUp,
  FileText,
  Calendar,
  Award,
} from "lucide-react";
import styles from "./page.module.css";

export default function StudentDashboard() {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchProfile();
    fetchStats();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch("/api/student/profile");
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
      } else if (response.status === 401) {
        // Redirect to login if unauthorized
        router.push("/student/login");
      } else {
        console.error("Failed to fetch profile:", response.status);
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/student/stats");
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else if (response.status === 401) {
        // Redirect to login if unauthorized
        router.push("/student/login");
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

  const getGradeColor = (cgpa) => {
    if (cgpa >= 3.7) return styles.gradeGreen;
    if (cgpa >= 3.0) return styles.gradeBlue;
    if (cgpa >= 2.0) return styles.gradeYellow;
    return styles.gradeRed;
  };

  const quickActions = [
    {
      title: "Course Registration",
      description: "Register for new semester courses",
      icon: BookOpen,
      href: "/student/register",
      containerColor: styles.actionIconContainerBlue,
      iconColor: styles.actionIconBlue,
    },
    {
      title: "View Results",
      description: "Check your academic results",
      icon: TrendingUp,
      href: "/student/results",
      containerColor: styles.actionIconContainerGreen,
      iconColor: styles.actionIconGreen,
    },
    {
      title: "Academic Transcript",
      description: "View complete academic record",
      icon: FileText,
      href: "/student/transcript",
      containerColor: styles.actionIconContainerPurple,
      iconColor: styles.actionIconPurple,
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
              <h1 className={styles.brandTitle}>Student Dashboard</h1>
              <p className={styles.brandSubtitle}>Welcome, {profile?.name || "Student"}</p>
            </div>
          </div>
          <div className={styles.headerActions}>            <Button onClick={handleLogout} variant="outline" size="sm">
              <LogOut className={styles.logoutIcon} />
              Logout
            </Button>
          </div>
        </header>

        {/* Profile Card */}
        {profile && (
          <Card className={styles.profileCard}>
            <CardHeader>
              <CardTitle className={styles.profileTitle}>
                <User className={styles.profileIcon} />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={styles.profileGrid}>
                <div className={styles.profileField}>
                  <p className={styles.profileLabel}>Name</p>
                  <p className={styles.profileValue}>{profile.name}</p>
                </div>
                <div className={styles.profileField}>
                  <p className={styles.profileLabel}>Roll Number</p>
                  <p className={styles.profileValueMono}>{profile.roll_number}</p>
                </div>
                <div className={styles.profileField}>
                  <p className={styles.profileLabel}>Registration Number</p>
                  <p className={styles.profileValueMono}>{profile.registration_number}</p>
                </div>
                <div className={styles.profileField}>
                  <p className={styles.profileLabel}>Department</p>
                  <p className={styles.profileValue}>{profile.department_name}</p>
                </div>
                <div className={styles.profileField}>
                  <p className={styles.profileLabel}>Parent Name</p>
                  <p className={styles.profileValue}>{profile.parent_name}</p>
                </div>
                <div className={styles.profileField}>
                  <p className={styles.profileLabel}>Academic Session</p>
                  <p className={styles.profileValue}>{profile.academic_session}</p>
                </div>
                <div className={styles.profileField}>
                  <p className={styles.profileLabel}>Current Semester</p>
                  <p className={styles.profileValue}>
                    {profile.current_year}
                    {profile.current_year === 1
                      ? "st"
                      : profile.current_year === 2
                      ? "nd"
                      : profile.current_year === 3
                      ? "rd"
                      : "th"}{" "}
                    Year, {profile.current_semester} Semester
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
                      <p className={styles.statLabel}>Course Registrations</p>
                      <p className={styles.statValue}>{stats?.totalRegistrations || 0}</p>
                    </div>
                    <BookOpen className={`${styles.statIcon} ${styles.statIconBlue}`} />
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
                    <FileText className={`${styles.statIcon} ${styles.statIconGreen}`} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className={styles.statCard}>
                  <div className={styles.statCardContent}>
                    <div className={styles.statInfo}>
                      <p className={styles.statLabel}>Current SGPA</p>
                      <p
                        className={`${styles.statValue} ${getGradeColor(stats?.currentSGPA || 0)}`}
                      >
                        {stats?.currentSGPA?.toFixed(2) || "N/A"}
                      </p>
                    </div>
                    <Calendar className={`${styles.statIcon} ${styles.statIconPurple}`} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className={styles.statCard}>
                  <div className={styles.statCardContent}>
                    <div className={styles.statInfo}>
                      <p className={styles.statLabel}>Overall CGPA</p>
                      <p
                        className={`${styles.statValue} ${getGradeColor(stats?.overallCGPA || 0)}`}
                      >
                        {stats?.overallCGPA?.toFixed(2) || "N/A"}
                      </p>
                    </div>
                    <Award className={`${styles.statIcon} ${styles.statIconOrange}`} />
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Quick Actions Grid */}
        <div className={styles.quickActionsGrid}>
          {quickActions.map((action) => (
            <Link key={action.title} href={action.href} className={styles.actionCard}>
              <Card className={styles.actionCard}>
                <CardHeader className={styles.actionCardHeader}>
                  <div className={`${styles.actionIconContainer} ${action.containerColor}`}>
                    <action.icon className={`${styles.actionIcon} ${action.iconColor}`} />
                  </div>
                  <CardTitle className={styles.actionTitle}>{action.title}</CardTitle>
                  <CardDescription>{action.description}</CardDescription>
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
