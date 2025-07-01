import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { db } from "./database";

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
    const admin = db.prepare("SELECT * FROM admin WHERE username = ?").get(username);

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
    const student = db
      .prepare(
        `
      SELECT s.*, d.name 
      FROM students s 
      JOIN departments d ON s.department_id = d.id 
      WHERE s.roll_number = ? AND s.registration_number = ?
    `
      )
      .get(rollNumber, regNumber);

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
    const adminExists = db.prepare("SELECT COUNT(*) FROM admin").get();

    if (adminExists.count === 0) {
      const hashedPassword = await hashPassword("admin123"); // Default admin password
      db.prepare("INSERT INTO admin (username, password_hash) VALUES (?, ?)").run(
        "admin",
        hashedPassword
      );
      console.log("Default admin account created=admin, password=admin123");
    }
  } catch (error) {
    console.error("Initialize admin error:", error);
  }
}

// Call initialization
initializeAdmin();
