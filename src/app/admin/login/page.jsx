"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { GraduationCap, ShieldCheck, Eye, EyeOff } from "lucide-react";
import styles from "./page.module.css";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        router.push("/admin/dashboard");
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
          </Link>        </header>

        {/* Login Form */}
        <div className={styles.formContainer}>
          <Card className={styles.loginCard}>
            <CardHeader className={styles.cardHeader}>
              <div className={styles.iconContainer}>
                <ShieldCheck className={styles.cardIcon} />
              </div>
              <h2 className={styles.cardTitle}>Admin Login</h2>
              <p>Access the administrative dashboard</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.formGroup}>
                  <label htmlFor="username" className={styles.label}>
                    Username
                  </label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter admin username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="password" className={styles.label}>
                    Password
                  </label>
                  <div className={styles.passwordContainer}>
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter admin password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={styles.passwordToggle}
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className={styles.passwordIcon} />
                      ) : (
                        <Eye className={styles.passwordIcon} />
                      )}
                    </Button>
                  </div>
                </div>

                {error && <div className={styles.error}>{error}</div>}

                <Button type="submit" className={styles.fullWidth} size="lg" disabled={isLoading}>
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>
              </form>

              <div className={styles.credentialsInfo}>
                <p className={styles.credentialsText}>Default credentials for testing:</p>
                <p className={styles.credentialsCode}>
                  Username: <code>admin</code>
                  <br />
                  Password: <code>admin123</code>
                </p>
              </div>

              <div className={styles.studentLink}>
                <Link href="/student/login" className={styles.studentLinkText}>
                  Student Login →
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
