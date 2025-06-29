import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getResultsFilterOptions } from "@/lib/data";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const filterOptions = getResultsFilterOptions();
    return NextResponse.json(filterOptions);
  } catch (error) {
    console.error("Error fetching results filter options:", error);
    return NextResponse.json({ error: "Failed to fetch filter options" }, { status: 500 });
  }
}
