import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createDepartment, getDepartmentsWithCounts } from "@/lib/data";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const departments = getDepartmentsWithCounts();
    return NextResponse.json(departments);
  } catch (error) {
    console.error("Admin departments fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, code } = await request.json();

    // Validate required fields
    if (!name || !code) {
      return NextResponse.json({ error: "Name and code are required" }, { status: 400 });
    }

    // Validate code format (should be uppercase letters/numbers)
    if (!/^[A-Z0-9]+$/.test(code.toUpperCase())) {
      return NextResponse.json(
        { error: "Department code should contain only letters and numbers" },
        { status: 400 }
      );
    }

    try {
      const department = createDepartment(name.trim(), code.toUpperCase());
      return NextResponse.json(department, { status: 201 });
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof error.message === "string" &&
        error.message.includes("UNIQUE constraint failed")
      ) {
        return NextResponse.json({ error: "Department code already exists" }, { status: 409 });
      }
      throw error;
    }
  } catch (error) {
    console.error("Create department error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
