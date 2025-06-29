import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { GraduationCap, ShieldCheck, Users, BookOpen } from "lucide-react";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerBrand}>
            <GraduationCap className={styles.brandIcon} />
            <h1 className={styles.brandTitle}>Student Result Management System</h1>
          </div>
          <ThemeToggle />
        </header>

        {/* Hero Section */}
        <section className={styles.hero}>
          <h2 className={styles.heroTitle}>Manage Academic Excellence</h2>
          <p className={styles.heroDescription}>
            A comprehensive platform for managing student records, course enrollment, and academic
            results with automated CGPA calculation.
          </p>
        </section>

        {/* Login Cards */}
        <div className={styles.loginCards}>
          <Card className={styles.loginCard}>
            <CardHeader className={styles.cardHeader}>
              <div className={styles.iconContainer}>
                <ShieldCheck className={styles.cardIcon} />
              </div>
              <CardTitle className={styles.cardTitle}>Admin Portal</CardTitle>
              <CardDescription>Manage students, departments, courses, and results</CardDescription>
            </CardHeader>
            <CardContent className={styles.cardContent}>
              <ul className={styles.featureList}>
                <li>• Add and manage student profiles</li>
                <li>• Create departments and courses</li>
                <li>• Update academic results</li>
                <li>• Track semester progression</li>
              </ul>
              <Link href="/admin/login">
                <Button className={styles.fullWidthButton} size="lg">
                  Admin Login
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className={styles.loginCard}>
            <CardHeader className={styles.cardHeader}>
              <div className={styles.studentIconContainer}>
                <Users className={styles.studentIcon} />
              </div>
              <CardTitle className={styles.cardTitle}>Student Portal</CardTitle>
              <CardDescription>View your profile, courses, and academic results</CardDescription>
            </CardHeader>
            <CardContent className={styles.cardContent}>
              <ul className={styles.featureList}>
                <li>• View personal profile and details</li>
                <li>• Register for new semester courses</li>
                <li>• Check academic results</li>
                <li>• Track CGPA and performance</li>
              </ul>
              <Link href="/student/login">
                <Button variant="outline" className={styles.fullWidthButton} size="lg">
                  Student Login
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Features Section */}
        <section className={styles.features}>
          <h3 className={styles.featuresTitle}>Key Features</h3>
          <div className={styles.featuresGrid}>
            <div className={styles.feature}>
              <BookOpen className={styles.featureIcon} />
              <h4 className={styles.featureTitle}>Course Management</h4>
              <p className={styles.featureDescription}>
                Comprehensive course registration system with semester-based enrollment
              </p>
            </div>
            <div className={styles.feature}>
              <GraduationCap className={styles.featureIcon} />
              <h4 className={styles.featureTitle}>Result Tracking</h4>
              <p className={styles.featureDescription}>
                Automated SGPA and CGPA calculation with detailed performance analytics
              </p>
            </div>
            <div className={styles.feature}>
              <Users className={styles.featureIcon} />
              <h4 className={styles.featureTitle}>User Management</h4>
              <p className={styles.featureDescription}>
                Secure role-based access for administrators and students
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className={styles.footer}>
          <p>&copy; 2025 Student Result Management System. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
