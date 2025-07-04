import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { pool } from "./postgres";

// Hash password
export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

// Verify password
export async function verifyPassword(password, hashedPassword) {
  return bcrypt.compare(password, hashedPassword);
}

// Admin authentication
export async function authenticateAdmin(username, password) {
  try {
    const result = await pool.query("SELECT * FROM admin WHERE username = $1", [username]);
    const admin = result.rows[0];

    if (!admin) {
      return null;
    }

    const isValid = await verifyPassword(password, admin.password_hash);
    if (!isValid) {
      return null;
    }

    return {
      id: admin.id,
      username: admin.username,
      role: "admin",
    };
  } catch (error) {
    console.error("Admin authentication error:", error);
    return null;
  }
}

// Student authentication
export async function authenticateStudent(rollNumber, regNumber) {
  try {
    const result = await pool.query(
      `
      SELECT s.*, d.name as department_name 
      FROM students s 
      JOIN departments d ON s.department_id = d.id 
      WHERE s.roll_number = $1 AND s.registration_number = $2
    `,
      [rollNumber, regNumber]
    );

    const student = result.rows[0];

    if (!student) {
      return null;
    }

    return {
      id: student.id,
      roll_number: student.roll_number,
      registration_number: student.registration_number,
      role: "student",
      name: student.name,
    };
  } catch (error) {
    console.error("Student authentication error:", error);
    return null;
  }
}

// Set session cookie
export async function setSession(user) {
  const cookieStore = await cookies();
  const sessionData = JSON.stringify(user);

  cookieStore.set("session", sessionData, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 7, // 1 week
    path: "/",
  });
}

// Get current user from session
export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");

    if (!sessionCookie?.value) {
      return null;
    }

    const user = JSON.parse(sessionCookie.value);
    return user;
  } catch (error) {
    console.error("Get current user error:", error);
    return null;
  }
}

// Clear session
export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}

// Initialize admin account if not exists
export async function initializeAdmin() {
  try {
    const result = await pool.query("SELECT COUNT(*) FROM admin");
    const count = parseInt(result.rows[0].count);

    if (count === 0) {
      const hashedPassword = await hashPassword("admin123"); // Default admin password
      await pool.query("INSERT INTO admin (username, password_hash) VALUES ($1, $2)", [
        "admin",
        hashedPassword,
      ]);
      console.log("Default admin account created: username=admin, password=admin123");
    }
  } catch (error) {
    console.error("Initialize admin error:", error);
  }
}

// Call initialization
if (process.env.DATABASE_URL) {
  initializeAdmin();
}
