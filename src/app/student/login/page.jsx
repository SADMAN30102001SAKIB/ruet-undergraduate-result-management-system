"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { GraduationCap, Users } from "lucide-react";
import styles from "./page.module.css";

export default function StudentLogin() {
  const [rollNumber, setRollNumber] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/student/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rollNumber: rollNumber.toUpperCase(),
          registrationNumber: registrationNumber.toUpperCase(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        router.push("/student/dashboard");
        router.refresh();
      } else {
        setError(data.error || "Login failed");
      }
    } catch {
      setError("An error occurred during login");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* Header */}
        <header className={styles.header}>
          <Link href="/" className={styles.headerBrand}>
            <GraduationCap className={styles.brandIcon} />
            <h1 className={styles.brandTitle}>SRMS</h1>
          </Link>
          <ThemeToggle />
        </header>

        {/* Login Form */}
        <div className={styles.formContainer}>
          <Card className={styles.loginCard}>
            <CardHeader className={styles.cardHeader}>
              <div className={styles.iconContainer}>
                <Users className={styles.cardIcon} />
              </div>
              <CardTitle className={styles.cardTitle}>Student Login</CardTitle>
              <CardDescription>Access your academic records and results</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.formGroup}>
                  <Label htmlFor="rollNumber" className={styles.label}>
                    Roll Number
                  </Label>
                  <Input
                    id="rollNumber"
                    type="text"
                    placeholder="Enter your roll number"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    required
                    className={styles.uppercaseInput}
                  />
                </div>

                <div className={styles.formGroup}>
                  <Label htmlFor="registrationNumber" className={styles.label}>
                    Registration Number
                  </Label>
                  <Input
                    id="registrationNumber"
                    type="text"
                    placeholder="Enter your registration number"
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                    required
                    className={styles.uppercaseInput}
                  />
                </div>

                {error && <div className={styles.error}>{error}</div>}

                <Button
                  type="submit"
                  variant="outline"
                  className={styles.fullWidthButton}
                  size="lg"
                  disabled={isLoading}
                >
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>
              </form>

              <div className={styles.infoText}>
                <p className={styles.infoTextContent}>
                  Use the roll number and registration number provided by your administrator
                </p>
              </div>

              <div className={styles.adminLink}>
                <Link href="/admin/login" className={styles.adminLinkText}>
                  Admin Login →
                </Link>
              </div>
            </CardContent>
          </Card>

          <div className={styles.backLink}>
            <Link href="/" className={styles.backLinkText}>
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
