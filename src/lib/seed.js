import { db } from "./database";
import { createDepartment, createCourse } from "./data";
import { hashPassword } from "./auth";

let hasSeeded = false;

export async function seedDatabase() {
  try {
    // Prevent multiple seeding attempts
    if (hasSeeded) {
      return;
    }

    // Check if already seeded
    const deptCount = db.prepare("SELECT COUNT(*) FROM departments").get();

    if (deptCount.count > 0) {
      hasSeeded = true;
      return;
    }

    console.log("Seeding database with sample data...");

    // Create default admin user
    const adminExists = db.prepare("SELECT COUNT(*) FROM admin").get();
    if (adminExists.count === 0) {
      const adminPassword = await hashPassword("password123"); // Default password
      db.prepare("INSERT INTO admin (username, password_hash) VALUES (?, ?)").run(
        "admin",
        adminPassword
      );
      console.log("Default admin created: username=admin, password=password123");
    }

    // Create departments (only if they don't exist)
    const departments = [
      { name: "Computer Science and Engineering", code: "CSE" },
      { name: "Electrical and Electronics Engineering", code: "EEE" },
      { name: "Mechanical Engineering", code: "ME" },
      { name: "Civil Engineering", code: "CE" },
      { name: "Electronics and Communication Engineering", code: "ECE" },
    ];

    const createdDepartments = [];
    for (const dept of departments) {
      // Check if department already exists
      const existing = db.prepare("SELECT * FROM departments WHERE code = ?").get(dept.code);
      if (existing) {
        createdDepartments.push(existing);
      } else {
        const newDept = createDepartment(dept.name, dept.code);
        createdDepartments.push(newDept);
      }
    }

    // Create sample courses for CSE department
    const cseDept = createdDepartments.find((d) => d.code === "CSE");
    if (cseDept) {
      const courses = [
        // 1st Year Courses
        {
          course_code: "CSE101",
          course_name: "Programming Fundamentals",
          year: 1,
          semester: "odd",
          credits: 3,
          cgpa_weight: 1.0,
        },
        {
          course_code: "MATH101",
          course_name: "Engineering Mathematics I",
          year: 1,
          semester: "odd",
          credits: 3,
          cgpa_weight: 1.0,
        },
        {
          course_code: "PHY101",
          course_name: "Engineering Physics",
          year: 1,
          semester: "odd",
          credits: 3,
          cgpa_weight: 1.0,
        },
        {
          course_code: "ENG101",
          course_name: "Technical English",
          year: 1,
          semester: "odd",
          credits: 3,
          cgpa_weight: 1.0,
        },

        {
          course_code: "CSE102",
          course_name: "Data Structures",
          year: 1,
          semester: "even",
          credits: 3,
          cgpa_weight: 1.0,
        },
        {
          course_code: "MATH102",
          course_name: "Engineering Mathematics II",
          year: 1,
          semester: "even",
          credits: 3,
          cgpa_weight: 1.0,
        },
        {
          course_code: "CHEM101",
          course_name: "Engineering Chemistry",
          year: 1,
          semester: "even",
          credits: 3,
          cgpa_weight: 1.0,
        },
        {
          course_code: "EE101",
          course_name: "Basic Electrical Engineering",
          year: 1,
          semester: "even",
          credits: 3,
          cgpa_weight: 1.0,
        },

        // 2nd Year Courses
        {
          course_code: "CSE201",
          course_name: "Algorithms",
          year: 2,
          semester: "odd",
          credits: 3,
          cgpa_weight: 1.0,
        },
        {
          course_code: "CSE202",
          course_name: "Object Oriented Programming",
          year: 2,
          semester: "odd",
          credits: 3,
          cgpa_weight: 1.0,
        },
        {
          course_code: "MATH201",
          course_name: "Discrete Mathematics",
          year: 2,
          semester: "odd",
          credits: 3,
          cgpa_weight: 1.0,
        },
        {
          course_code: "CSE203",
          course_name: "Computer Organization",
          year: 2,
          semester: "odd",
          credits: 3,
          cgpa_weight: 1.0,
        },

        {
          course_code: "CSE204",
          course_name: "Database Management Systems",
          year: 2,
          semester: "even",
          credits: 3,
          cgpa_weight: 1.0,
        },
        {
          course_code: "CSE205",
          course_name: "Operating Systems",
          year: 2,
          semester: "even",
          credits: 3,
          cgpa_weight: 1.0,
        },
        {
          course_code: "CSE206",
          course_name: "Computer Networks",
          year: 2,
          semester: "even",
          credits: 3,
          cgpa_weight: 1.0,
        },
        {
          course_code: "STAT201",
          course_name: "Statistics and Probability",
          year: 2,
          semester: "even",
          credits: 3,
          cgpa_weight: 1.0,
        },

        // 3rd Year Courses
        {
          course_code: "CSE301",
          course_name: "Software Engineering",
          year: 3,
          semester: "odd",
          credits: 3,
          cgpa_weight: 1.0,
        },
        {
          course_code: "CSE302",
          course_name: "Theory of Computation",
          year: 3,
          semester: "odd",
          credits: 3,
          cgpa_weight: 1.0,
        },
        {
          course_code: "CSE303",
          course_name: "Compiler Design",
          year: 3,
          semester: "odd",
          credits: 3,
          cgpa_weight: 1.0,
        },
        {
          course_code: "CSE304",
          course_name: "Artificial Intelligence",
          year: 3,
          semester: "odd",
          credits: 3,
          cgpa_weight: 1.0,
        },

        {
          course_code: "CSE305",
          course_name: "Machine Learning",
          year: 3,
          semester: "even",
          credits: 3,
          cgpa_weight: 1.0,
        },
        {
          course_code: "CSE306",
          course_name: "Computer Graphics",
          year: 3,
          semester: "even",
          credits: 3,
          cgpa_weight: 1.0,
        },
        {
          course_code: "CSE307",
          course_name: "Web Technologies",
          year: 3,
          semester: "even",
          credits: 3,
          cgpa_weight: 1.0,
        },
        {
          course_code: "CSE308",
          course_name: "Information Security",
          year: 3,
          semester: "even",
          credits: 3,
          cgpa_weight: 1.0,
        },

        // 4th Year Courses
        {
          course_code: "CSE401",
          course_name: "Project I",
          year: 4,
          semester: "odd",
          credits: 3,
          cgpa_weight: 1.0,
        },
        {
          course_code: "CSE402",
          course_name: "Advanced Algorithms",
          year: 4,
          semester: "odd",
          credits: 3,
          cgpa_weight: 1.0,
        },
        {
          course_code: "CSE403",
          course_name: "Distributed Systems",
          year: 4,
          semester: "odd",
          credits: 3,
          cgpa_weight: 1.0,
        },

        {
          course_code: "CSE404",
          course_name: "Project II",
          year: 4,
          semester: "even",
          credits: 3,
          cgpa_weight: 1.0,
        },
        {
          course_code: "CSE405",
          course_name: "Industrial Training",
          year: 4,
          semester: "even",
          credits: 3,
          cgpa_weight: 1.0,
        },
      ];

      // Create courses only if they don't exist
      courses.forEach((course) => {
        // Check if course already exists
        const existing = db
          .prepare("SELECT * FROM courses WHERE course_code = ? AND department_id = ?")
          .get(course.course_code, cseDept.id);
        if (!existing) {
          createCourse({
            ...course,
            department_id: cseDept.id,
          });
        }
      });
    }

    // Create sample courses for EEE department
    const eeeDept = createdDepartments.find((d) => d.code === "EEE");
    if (eeeDept) {
      const eeeFirstYearCourses = [
        {
          course_code: "EEE101",
          course_name: "Circuit Analysis I",
          year: 1,
          semester: "odd",
          credits: 3,
          cgpa_weight: 1.0,
        },
        {
          course_code: "EEE102",
          course_name: "Electronic Devices",
          year: 1,
          semester: "even",
          credits: 3,
          cgpa_weight: 1.0,
        },
        {
          course_code: "EEE201",
          course_name: "Circuit Analysis II",
          year: 2,
          semester: "odd",
          credits: 3,
          cgpa_weight: 1.0,
        },
        {
          course_code: "EEE202",
          course_name: "Digital Electronics",
          year: 2,
          semester: "even",
          credits: 3,
          cgpa_weight: 1.0,
        },
      ];

      // Create EEE courses only if they don't exist
      eeeFirstYearCourses.forEach((course) => {
        const existing = db
          .prepare("SELECT * FROM courses WHERE course_code = ? AND department_id = ?")
          .get(course.course_code, eeeDept.id);
        if (!existing) {
          createCourse({
            ...course,
            department_id: eeeDept.id,
          });
        }
      });
    }

    // Create sample students for CSE department
    const students = [
      {
        name: "John Doe",
        parent_name: "Robert Doe",
        phone: "01712345678",
        roll_number: "2019001",
        registration_number: "2019001",
        department_id: cseDept?.id || 1,
        academic_session: "2019-20",
        current_year: 4,
        current_semester: "odd",
      },
      {
        name: "Jane Smith",
        parent_name: "Michael Smith",
        phone: "01798765432",
        roll_number: "2019002",
        registration_number: "2019002",
        department_id: cseDept?.id || 1,
        academic_session: "2019-20",
        current_year: 4,
        current_semester: "odd",
      },
      {
        name: "Alice Johnson",
        parent_name: "David Johnson",
        phone: "01756789012",
        roll_number: "2020001",
        registration_number: "2020001",
        department_id: cseDept?.id || 1,
        academic_session: "2020-21",
        current_year: 3,
        current_semester: "even",
      },
      {
        name: "Bob Wilson",
        parent_name: "James Wilson",
        phone: "01734567890",
        roll_number: "2020002",
        registration_number: "2020002",
        department_id: cseDept?.id || 1,
        academic_session: "2020-21",
        current_year: 3,
        current_semester: "even",
      },
    ];

    // Create students only if they don't exist
    students.forEach((student) => {
      // Check if student already exists
      const existing = db
        .prepare("SELECT * FROM students WHERE roll_number = ?")
        .get(student.roll_number);
      if (!existing) {
        const stmt = db.prepare(`
          INSERT INTO students 
          (name, parent_name, phone, roll_number, registration_number, department_id, academic_session, current_year, current_semester) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(
          student.name,
          student.parent_name,
          student.phone,
          student.roll_number,
          student.registration_number,
          student.department_id,
          student.academic_session,
          student.current_year,
          student.current_semester
        );
      }
    });

    // Create sample results for testing
    const sampleResults = [
      {
        student_id: 5, // John Doe (first student created)
        course_id: 1, // First course created
        marks: 85,
        is_backlog: false,
        published: true,
      },
      {
        student_id: 5, // John Doe
        course_id: 2, // Second course
        marks: 35, // Failed
        is_backlog: false,
        published: true,
      },
      {
        student_id: 5, // John Doe
        course_id: 3, // Third course
        marks: 25, // Backlog
        is_backlog: true,
        published: true,
      },
      {
        student_id: 6, // Jane Smith (second student)
        course_id: 1,
        marks: 75,
        is_backlog: false,
        published: true,
      },
      {
        student_id: 6, // Jane Smith
        course_id: 2,
        marks: 30, // Backlog
        is_backlog: true,
        published: false,
      },
    ];

    sampleResults.forEach((result) => {
      // Check if result already exists
      const existing = db
        .prepare("SELECT * FROM results WHERE student_id = ? AND course_id = ?")
        .get(result.student_id, result.course_id);
      if (!existing) {
        const stmt = db.prepare(`
          INSERT INTO results 
          (student_id, course_id, marks, is_backlog, published) 
          VALUES (?, ?, ?, ?, ?)
        `);
        stmt.run(
          result.student_id,
          result.course_id,
          result.marks,
          result.is_backlog ? 1 : 0, // Convert boolean to integer
          result.published ? 1 : 0 // Convert boolean to integer
        );
      }
    });

    hasSeeded = true;
    console.log("Database seeded successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}

// Auto-seed if not in production
if (process.env.NODE_ENV === "production") {
  setTimeout(() => {
    seedDatabase();
  }, 1000);
}
