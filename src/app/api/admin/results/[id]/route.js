import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { updateResult, deleteResult, getResultById } from "@/lib/data";

// GET /api/admin/results/[id] - Get individual result
export async function GET(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const resultId = parseInt(id);

    if (isNaN(resultId)) {
      return NextResponse.json({ error: "Invalid result ID" }, { status: 400 });
    }

    const result = getResultById(resultId);
    if (!result) {
      return NextResponse.json({ error: "Result not found" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Get result error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/admin/results/[id] - Update result (e.g., toggle published status)
export async function PATCH(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const resultId = parseInt(id);

    if (isNaN(resultId)) {
      return NextResponse.json({ error: "Invalid result ID" }, { status: 400 });
    }

    const body = await request.json();
    const updates = body;

    const updatedResult = updateResult(resultId, updates);
    if (!updatedResult) {
      return NextResponse.json({ error: "Result not found" }, { status: 404 });
    }

    return NextResponse.json(updatedResult);
  } catch (error) {
    console.error("Update result error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/admin/results/[id] - Delete result
export async function DELETE(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const resultId = parseInt(id);

    if (isNaN(resultId)) {
      return NextResponse.json({ error: "Invalid result ID" }, { status: 400 });
    }

    const success = deleteResult(resultId);
    if (!success) {
      return NextResponse.json({ error: "Result not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Result deleted successfully" });
  } catch (error) {
    console.error("Delete result error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
