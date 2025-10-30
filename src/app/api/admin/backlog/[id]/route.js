import { NextResponse } from "next/server";
import {
  toggleBacklogGroupRegistration,
  getBacklogGroupDetails,
  renameBacklogGroup,
  deleteBacklogGroup,
} from "@/lib/data/backlog";

// GET /api/admin/backlog/[id] - Get backlog group details
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const details = await getBacklogGroupDetails(id);
    return NextResponse.json(details);
  } catch (error) {
    console.error("Error fetching backlog group details:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch backlog group details" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/backlog/[id] - Update group (toggle registration or rename)
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (body.isOpen !== undefined) {
      // Toggle registration status
      if (typeof body.isOpen !== "boolean") {
        return NextResponse.json({ error: "isOpen must be a boolean" }, { status: 400 });
      }
      const result = await toggleBacklogGroupRegistration(id, body.isOpen);
      return NextResponse.json(result);
    } else if (body.name !== undefined) {
      // Rename group
      if (typeof body.name !== "string" || !body.name.trim()) {
        return NextResponse.json({ error: "name must be a non-empty string" }, { status: 400 });
      }
      const result = await renameBacklogGroup(id, body.name.trim());
      return NextResponse.json(result);
    } else {
      return NextResponse.json(
        { error: "Either isOpen or name must be provided" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error updating backlog group:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update backlog group" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/backlog/[id] - Delete backlog group
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const result = await deleteBacklogGroup(id);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error deleting backlog group:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete backlog group" },
      { status: 500 }
    );
  }
}
