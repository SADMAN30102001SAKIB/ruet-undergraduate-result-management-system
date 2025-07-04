import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getStudentById } from "@/lib/data";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "student") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getStudentById(user.id);

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Student profile error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
