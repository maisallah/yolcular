import { NextResponse } from "next/server"

// In-memory token storage (should match the callback route)
// In production, use database or secure session storage
const authTokens = {
  access_token: "",
  refresh_token: "",
  expires_at: "",
  organization_id: "",
  user_email: "",
}

export async function GET() {
  try {
    // Check if we have valid tokens
    if (!authTokens.access_token || !authTokens.expires_at) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }

    // Check if token is expired
    const expiresAt = new Date(authTokens.expires_at)
    const now = new Date()

    if (expiresAt <= now) {
      // Try to refresh token
      if (authTokens.refresh_token) {
        try {
          await refreshAccessToken()
        } catch (error) {
          console.error("Token refresh failed:", error)
          return NextResponse.json({ authenticated: false }, { status: 401 })
        }
      } else {
        return NextResponse.json({ authenticated: false }, { status: 401 })
      }
    }

    // Validate token with Zoho
    try {
      const userResponse = await fetch("https://accounts.zoho.com/oauth/user/info", {
        headers: {
          Authorization: `Zoho-oauthtoken ${authTokens.access_token}`,
        },
      })

      if (!userResponse.ok) {
        throw new Error("Token validation failed")
      }

      const userInfo = await userResponse.json()

      return NextResponse.json({
        authenticated: true,
        organization: userInfo.Display_Name || "Zoho Organization",
        user: userInfo.Email || authTokens.user_email,
        expiresAt: authTokens.expires_at,
        scopes: ["ZohoCRM.modules.deals.READ", "ZohoCRM.modules.contacts.READ"],
      })
    } catch (error) {
      console.error("Token validation error:", error)
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }
  } catch (error) {
    console.error("Authentication check failed:", error)
    return NextResponse.json({ error: "Authentication check failed" }, { status: 500 })
  }
}

export async function POST() {
  try {
    // Manual token refresh
    if (!authTokens.refresh_token) {
      return NextResponse.json({ error: "No refresh token available" }, { status: 401 })
    }

    await refreshAccessToken()

    return NextResponse.json({
      access_token: authTokens.access_token,
      expires_in: Math.floor((new Date(authTokens.expires_at).getTime() - Date.now()) / 1000),
      token_type: "Bearer",
    })
  } catch (error) {
    console.error("Token refresh failed:", error)
    return NextResponse.json({ error: "Token refresh failed" }, { status: 500 })
  }
}

async function refreshAccessToken() {
  const ZOHO_CLIENT_ID = process.env.ZOHO_CLIENT_ID || "your_zoho_client_id"
  const ZOHO_CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET || "your_zoho_client_secret"

  const refreshResponse = await fetch("https://accounts.zoho.com/oauth/v2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: ZOHO_CLIENT_ID,
      client_secret: ZOHO_CLIENT_SECRET,
      refresh_token: authTokens.refresh_token,
    }),
  })

  if (!refreshResponse.ok) {
    const errorData = await refreshResponse.text()
    console.error("Token refresh failed:", errorData)
    throw new Error("Failed to refresh access token")
  }

  const tokenData = await refreshResponse.json()

  // Update stored tokens
  authTokens.access_token = tokenData.access_token
  authTokens.expires_at = new Date(Date.now() + tokenData.expires_in * 1000).toISOString()

  // Refresh token might be updated
  if (tokenData.refresh_token) {
    authTokens.refresh_token = tokenData.refresh_token
  }
}
