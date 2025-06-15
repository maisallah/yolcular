import { NextResponse } from "next/server"
import { tokenStorage } from "@/lib/token-storage"

export async function GET() {
  try {
    console.log("Auth check requested")

    const tokens = tokenStorage.get()
    console.log("Current tokens:", {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiresAt: tokens.expires_at,
      userEmail: tokens.user_email,
    })

    // Check if we have valid tokens
    if (!tokens.access_token || !tokens.expires_at) {
      console.log("No tokens found")
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }

    // Check if token is expired
    if (!tokenStorage.isValid()) {
      console.log("Token expired, attempting refresh...")
      // Try to refresh token
      if (tokens.refresh_token) {
        try {
          await refreshAccessToken()
          console.log("Token refresh successful")
        } catch (error) {
          console.error("Token refresh failed:", error)
          return NextResponse.json({ authenticated: false }, { status: 401 })
        }
      } else {
        console.log("No refresh token available")
        return NextResponse.json({ authenticated: false }, { status: 401 })
      }
    }

    // Get updated tokens after potential refresh
    const currentTokens = tokenStorage.get()

    // Validate token with Zoho
    try {
      console.log("Validating token with Zoho...")
      const userResponse = await fetch("https://accounts.zoho.com/oauth/user/info", {
        headers: {
          Authorization: `Zoho-oauthtoken ${currentTokens.access_token}`,
        },
      })

      if (!userResponse.ok) {
        console.error("Token validation failed:", userResponse.status)
        throw new Error("Token validation failed")
      }

      const userInfo = await userResponse.json()
      console.log("Token validation successful:", userInfo.Email)

      return NextResponse.json({
        authenticated: true,
        organization: userInfo.Display_Name || "Zoho Organization",
        user: userInfo.Email || currentTokens.user_email,
        expiresAt: currentTokens.expires_at,
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
    const tokens = tokenStorage.get()
    if (!tokens.refresh_token) {
      return NextResponse.json({ error: "No refresh token available" }, { status: 401 })
    }

    await refreshAccessToken()

    const updatedTokens = tokenStorage.get()

    return NextResponse.json({
      access_token: updatedTokens.access_token,
      expires_in: Math.floor((new Date(updatedTokens.expires_at).getTime() - Date.now()) / 1000),
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

  const tokens = tokenStorage.get()

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
    console.error("Token refresh failed:", errorData)
    throw new Error("Failed to refresh access token")
  }

  const tokenData = await refreshResponse.json()

  // Update stored tokens
  tokenStorage.set({
    access_token: tokenData.access_token,
    expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
    // Refresh token might be updated
    ...(tokenData.refresh_token && { refresh_token: tokenData.refresh_token }),
  })

  console.log("Access token refreshed successfully")
}
