import { NextResponse } from "next/server";

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Get session cookie
  const session = request.cookies.get("session")?.value;

  // Parse user from session
  let user = null;
  if (session) {
    try {
      user = JSON.parse(session);
    } catch {
      // Invalid session cookie
    }
  }

  // Protect admin routes
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!user || user.role !== "admin") {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  } // Protect student routes
  if (pathname.startsWith("/student") && pathname !== "/student/login") {
    if (!user || user.role !== "student") {
      return NextResponse.redirect(new URL("/student/login", request.url));
    }
  }

  // Redirect authenticated users away from login pages
  if (user) {
    if (pathname === "/admin/login" && user.role === "admin") {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
    if (pathname === "/student/login" && user.role === "student") {
      return NextResponse.redirect(new URL("/student/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/student/:path*"],
};
