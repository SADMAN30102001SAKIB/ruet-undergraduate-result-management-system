import { NextResponse } from "next/server";
import { createBacklogGroup, addToBacklogGroup, getAllBacklogGroups } from "@/lib/data/backlog";

// GET /api/admin/backlog - Get all backlog groups
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const searchTerm = searchParams.get("search") || "";

    const groups = await getAllBacklogGroups(searchTerm);
    return NextResponse.json({ groups });
  } catch (error) {
    console.error("Error fetching backlog groups:", error);
    return NextResponse.json({ error: "Failed to fetch backlog groups" }, { status: 500 });
  }
}

// POST /api/admin/backlog - Create new backlog group or add to existing
export async function POST(request) {
  try {
    const { name, groupId, courseSelections } = await request.json();

    if (!courseSelections || courseSelections.length === 0) {
      return NextResponse.json({ error: "Course selections are required" }, { status: 400 });
    }

    if (groupId) {
      // Adding to existing group
      const result = await addToBacklogGroup(groupId, courseSelections);
      return NextResponse.json({
        ...result,
        message: `Successfully added ${result.addedCount} courses to existing group`,
      });
    } else if (name) {
      // Creating new group
      const result = await createBacklogGroup(name, courseSelections);
      return NextResponse.json(result);
    } else {
      return NextResponse.json(
        { error: "Either group name (for new group) or groupId (for existing group) is required" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error in backlog group operation:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process backlog group" },
      { status: 500 }
    );
  }
}
