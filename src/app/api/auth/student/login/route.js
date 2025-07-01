import { NextResponse } from "next/server";
import { authenticateStudent, setSession } from "@/lib/auth";

export async function POST(request) {
  try {
    const { rollNumber, registrationNumber } = await request.json();

    if (!rollNumber || !registrationNumber) {
      return NextResponse.json(
        { error: "Roll number and registration number are required" },
        { status: 400 }
      );
    }

    const user = await authenticateStudent(rollNumber, registrationNumber);

    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials or student not found" },
        { status: 401 }
      );
    }

    await setSession(user);

    return NextResponse.json(
      {
        message: "Login successful",
        user: {
          id: user.id,
          roll_number: user.roll_number,
          registration_number: user.registration_number,
          name: user.name,
          role: user.role,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Student login error:", error);
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
