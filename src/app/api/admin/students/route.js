import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getStudents, createStudent } from "@/lib/data";
import { validateRollNumber, validateRegistrationNumber, validatePhone } from "@/lib/utils";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const students = getStudents();
    return NextResponse.json(students);
  } catch (error) {
    console.error("Admin students fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();

    // Validate required fields including year and semester
    if (
      !data.name ||
      !data.parent_name ||
      !data.phone ||
      !data.roll_number ||
      !data.registration_number ||
      !data.department_id ||
      !data.academic_session ||
      data.current_year === undefined ||
      data.current_semester === undefined
    ) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate year and semester values
    if (data.current_year < 1 || data.current_year > 4) {
      return NextResponse.json(
        { error: "Current year must be between 1 and 4", field: "current_year" },
        { status: 400 }
      );
    }

    if (!["odd", "even"].includes(data.current_semester)) {
      return NextResponse.json(
        { error: "Current semester must be either 'odd' or 'even'", field: "current_semester" },
        { status: 400 }
      );
    }

    // Validate formats
    if (!validatePhone(data.phone)) {
      return NextResponse.json(
        { error: "Invalid phone number format", field: "phone" },
        { status: 400 }
      );
    }

    if (!validateRollNumber(data.roll_number)) {
      return NextResponse.json(
        { error: "Invalid roll number format", field: "roll_number" },
        { status: 400 }
      );
    }

    if (!validateRegistrationNumber(data.registration_number)) {
      return NextResponse.json(
        {
          error: "Invalid registration number format",
          field: "registration_number",
        },
        { status: 400 }
      );
    }

    try {
      const student = createStudent({
        name: data.name.trim(),
        parent_name: data.parent_name.trim(),
        phone: data.phone.trim(),
        roll_number: data.roll_number.toUpperCase().trim(),
        registration_number: data.registration_number.toUpperCase().trim(),
        department_id: data.department_id,
        academic_session: data.academic_session.trim(),
        current_year: data.current_year,
        current_semester: data.current_semester,
      });

      return NextResponse.json(student, { status: 201 });
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof error.message === "string"
      ) {
        const message = error.message;
        if (message.includes("UNIQUE constraint failed")) {
          if (message.includes("roll_number")) {
            return NextResponse.json(
              { error: "Roll number already exists", field: "roll_number" },
              { status: 409 }
            );
          }
          if (message.includes("registration_number")) {
            return NextResponse.json(
              {
                error: "Registration number already exists",
                field: "registration_number",
              },
              { status: 409 }
            );
          }
        }
      }
      throw error;
    }
  } catch (error) {
    console.error("Add student error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
