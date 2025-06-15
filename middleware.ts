import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // Check if accessing admin routes
  if (request.nextUrl.pathname.startsWith("/admin")) {
    const sessionCookie = request.cookies.get("admin_session")

    if (!sessionCookie) {
      // Redirect to login page
      return NextResponse.redirect(new URL("/login", request.url))
    }

    try {
      // Validate session
      const sessionData = JSON.parse(Buffer.from(sessionCookie.value, "base64").toString())

      // Check if session is expired
      if (new Date(sessionData.expiresAt) < new Date()) {
        // Clear expired session and redirect to login
        const response = NextResponse.redirect(new URL("/login", request.url))
        response.cookies.delete("admin_session")
        return response
      }
    } catch (error) {
      // Invalid session, redirect to login
      const response = NextResponse.redirect(new URL("/login", request.url))
      response.cookies.delete("admin_session")
      return response
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*"],
}
