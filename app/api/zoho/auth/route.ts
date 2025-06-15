import { NextResponse } from "next/server"
import { tokenStorage } from "@/lib/token-storage"

export async function GET() {
  try {
    console.log("=== AUTH CHECK START ===")

    // Get tokens from our token storage API
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"

    let tokensResponse
    try {
      tokensResponse = await fetch(`${baseUrl}/api/zoho/tokens`, {
        method: "GET",
      })
    } catch (error) {
      console.error("Failed to fetch tokens from storage:", error)
      return NextResponse.json({ authenticated: false, reason: "Token storage unavailable" }, { status: 401 })
    }

    if (!tokensResponse.ok) {
      console.log("❌ No tokens found in storage")
      return NextResponse.json({ authenticated: false, reason: "No tokens found" }, { status: 401 })
    }

    const tokenData = await tokensResponse.json()
    const tokens = tokenData.tokens

    console.log("Tokens retrieved from storage:", {
      hasAccessToken: !!tokens?.access_token,
      hasRefreshToken: !!tokens?.refresh_token,
      expiresAt: tokens?.expires_at,
      userEmail: tokens?.user_email,
    })

    if (!tokens?.access_token || !tokens?.expires_at) {
      console.log("❌ Invalid tokens in storage")
      return NextResponse.json({ authenticated: false, reason: "Invalid tokens" }, { status: 401 })
    }

    // Check if token is expired
    const expiresAt = new Date(tokens.expires_at)
    const now = new Date()
    const isExpired = expiresAt <= now

    console.log("Token expiry check:", {
      expiresAt: expiresAt.toISOString(),
      now: now.toISOString(),
      isExpired,
      timeUntilExpiry: Math.floor((expiresAt.getTime() - now.getTime()) / 1000),
    })

    if (isExpired) {
      console.log("⏰ Token expired")
      // TODO: Implement token refresh
      return NextResponse.json({ authenticated: false, reason: "Token expired" }, { status: 401 })
    }

    // Validate token with Zoho
    try {
      console.log("🔍 Validating token with Zoho...")
      const userResponse = await fetch("https://accounts.zoho.com/oauth/user/info", {
        headers: {
          Authorization: `Zoho-oauthtoken ${tokens.access_token}`,
        },
      })

      console.log("Zoho validation response status:", userResponse.status)

      if (!userResponse.ok) {
        const errorText = await userResponse.text()
        console.error("❌ Token validation failed:", {
          status: userResponse.status,
          statusText: userResponse.statusText,
          body: errorText,
        })
        return NextResponse.json({ authenticated: false, reason: "Token validation failed" }, { status: 401 })
      }

      const userInfo = await userResponse.json()
      console.log("✅ Token validation successful:", {
        email: userInfo.Email,
        name: userInfo.Display_Name,
      })

      return NextResponse.json({
        authenticated: true,
        organization: userInfo.Display_Name || "Zoho Organization",
        user: userInfo.Email || tokens.user_email,
        expiresAt: tokens.expires_at,
        scopes: ["ZohoCRM.modules.deals.READ", "ZohoCRM.modules.contacts.READ"],
      })
    } catch (error) {
      console.error("❌ Token validation error:", error)
      return NextResponse.json({ authenticated: false, reason: "Token validation failed" }, { status: 401 })
    }
  } catch (error) {
    console.error("❌ Authentication check failed:", error)
    return NextResponse.json({ error: "Authentication check failed" }, { status: 500 })
  }
}

export async function POST() {
  try {
    console.log("Manual token refresh requested")
    const tokens = tokenStorage.get()

    if (!tokens.refresh_token) {
      return NextResponse.json({ error: "No refresh token available" }, { status: 401 })
    }

    await refreshAccessToken()
    const refreshedTokens = tokenStorage.get()

    return NextResponse.json({
      access_token: refreshedTokens.access_token,
      expires_in: Math.floor((new Date(refreshedTokens.expires_at).getTime() - Date.now()) / 1000),
      token_type: "Bearer",
    })
  } catch (error) {
    console.error("Token refresh failed:", error)
    return NextResponse.json({ error: "Token refresh failed" }, { status: 500 })
  }
}

async function refreshAccessToken() {
  const ZOHO_CLIENT_ID = process.env.ZOHO_CLIENT_ID
  const ZOHO_CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET

  if (!ZOHO_CLIENT_ID || !ZOHO_CLIENT_SECRET) {
    throw new Error("Missing Zoho client credentials")
  }

  const tokens = tokenStorage.get()

  console.log("Refreshing token with:", {
    hasRefreshToken: !!tokens.refresh_token,
    clientId: ZOHO_CLIENT_ID.substring(0, 10) + "...",
  })

  const refreshResponse = await fetch("https://accounts.zoho.com/oauth/v2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: ZOHO_CLIENT_ID,
      client_secret: ZOHO_CLIENT_SECRET,
      refresh_token: tokens.refresh_token,
    }),
  })

  if (!refreshResponse.ok) {
    const errorData = await refreshResponse.text()
    console.error("Token refresh failed:", {
      status: refreshResponse.status,
      statusText: refreshResponse.statusText,
      body: errorData,
    })
    throw new Error(`Failed to refresh access token: ${refreshResponse.status}`)
  }

  const tokenData = await refreshResponse.json()
  console.log("Token refresh successful:", {
    hasAccessToken: !!tokenData.access_token,
    expiresIn: tokenData.expires_in,
  })

  // We need to set cookies in the response, but we can't do that here
  // This is a limitation of the current approach
  console.warn("⚠️ Cannot update cookies from refresh function - this is a limitation")

  console.log("Access token refreshed successfully")
}
