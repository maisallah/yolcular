import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
  try {
    console.log("=== ZOHO DEBUG ENDPOINT ===")

    // Get all cookies
    const cookieStore = cookies()
    const allCookies = cookieStore.getAll()

    console.log(
      "All cookies:",
      allCookies.map((c) => ({ name: c.name, hasValue: !!c.value })),
    )

    // Check specific Zoho cookies
    const zohoCookies = {
      access_token: cookieStore.get("zoho_access_token")?.value || "NOT_FOUND",
      refresh_token: cookieStore.get("zoho_refresh_token")?.value || "NOT_FOUND",
      expires_at: cookieStore.get("zoho_expires_at")?.value || "NOT_FOUND",
      org_id: cookieStore.get("zoho_org_id")?.value || "NOT_FOUND",
      user_email: cookieStore.get("zoho_user_email")?.value || "NOT_FOUND",
    }

    console.log("Zoho cookies:", {
      access_token: zohoCookies.access_token !== "NOT_FOUND" ? "EXISTS" : "NOT_FOUND",
      refresh_token: zohoCookies.refresh_token !== "NOT_FOUND" ? "EXISTS" : "NOT_FOUND",
      expires_at: zohoCookies.expires_at,
      org_id: zohoCookies.org_id,
      user_email: zohoCookies.user_email,
    })

    // Check if token is expired
    let isExpired = false
    if (zohoCookies.expires_at !== "NOT_FOUND") {
      const expiresAt = new Date(zohoCookies.expires_at)
      const now = new Date()
      isExpired = expiresAt <= now
      console.log("Token expiry check:", {
        expiresAt: expiresAt.toISOString(),
        now: now.toISOString(),
        isExpired,
      })
    }

    return NextResponse.json({
      success: true,
      cookies: {
        total: allCookies.length,
        zoho: {
          access_token: zohoCookies.access_token !== "NOT_FOUND" ? "EXISTS" : "NOT_FOUND",
          refresh_token: zohoCookies.refresh_token !== "NOT_FOUND" ? "EXISTS" : "NOT_FOUND",
          expires_at: zohoCookies.expires_at,
          org_id: zohoCookies.org_id,
          user_email: zohoCookies.user_email,
          isExpired,
        },
      },
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
        hasClientId: !!process.env.ZOHO_CLIENT_ID,
        hasClientSecret: !!process.env.ZOHO_CLIENT_SECRET,
      },
    })
  } catch (error) {
    console.error("Debug endpoint error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
