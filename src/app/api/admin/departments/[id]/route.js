import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDepartmentById, updateDepartment, deleteDepartment } from "@/lib/data";

export async function GET(request, { params }) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const departmentId = parseInt(id);
    if (isNaN(departmentId)) {
      return NextResponse.json({ error: "Invalid department ID" }, { status: 400 });
    }

    const department = await getDepartmentById(departmentId);
    if (!department) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }

    return NextResponse.json(department);
  } catch (error) {
    console.error("Get department error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const departmentId = parseInt(id);

    if (isNaN(departmentId)) {
      return NextResponse.json({ error: "Invalid department ID" }, { status: 400 });
    }

    const { name, code } = await request.json();

    // Validate required fields
    if (!name || !code) {
      return NextResponse.json({ error: "Name and code are required" }, { status: 400 });
    }

    // Validate code format
    if (!/^[A-Z0-9]+$/.test(code.toUpperCase())) {
      return NextResponse.json(
        { error: "Department code should contain only letters and numbers" },
        { status: 400 }
      );
    }

    try {
      const department = await updateDepartment(departmentId, {
        name: name.trim(),
        code: code.toUpperCase(),
      });

      if (!department) {
        return NextResponse.json({ error: "Department not found" }, { status: 404 });
      }

      return NextResponse.json({ department });
    } catch (error) {
      if (error.message && error.message.includes("already exists")) {
        return NextResponse.json(
          { error: "Department name or code already exists" },
          { status: 409 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error("Update department error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const departmentId = parseInt(id);
    if (isNaN(departmentId)) {
      return NextResponse.json({ error: "Invalid department ID" }, { status: 400 });
    }

    try {
      const success = await deleteDepartment(departmentId);

      if (!success) {
        return NextResponse.json({ error: "Department not found" }, { status: 404 });
      }

      return NextResponse.json({ message: "Department deleted successfully" });
    } catch (error) {
      if (error.message && error.message.includes("Cannot delete department")) {
        return NextResponse.json(
          {
            error: "Cannot delete department with existing students or courses",
          },
          { status: 409 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error("Delete department error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
