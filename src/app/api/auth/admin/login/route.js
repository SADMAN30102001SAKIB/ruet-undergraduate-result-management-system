import { NextResponse } from "next/server";
import { authenticateAdmin, setSession } from "@/lib/auth";

export async function POST(request) {
  try {
    console.log("Admin login POST request received");
    const { username, password } = await request.json();
    console.log("Login attempt for username:", username);

    if (!username || !password) {
      console.log("Missing username or password");
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
    }

    const user = await authenticateAdmin(username, password);
    console.log("Authentication result:", user ? "success" : "failed");

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    await setSession(user);
    console.log("Session set successfully");

    return NextResponse.json(
      {
        message: "Login successful",
        user: { id: user.id, username: user.username, role: user.role },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Admin login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Explicitly handle other methods
export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
