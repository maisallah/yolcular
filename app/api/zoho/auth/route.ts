import { NextResponse } from "next/server"
import { tokenStorage } from "@/lib/token-storage"
import { cookies } from "next/headers"

export async function GET() {
  try {
    console.log("=== AUTH CHECK START ===")

    // Debug: Check all cookies first
    const cookieStore = cookies()
    const allCookies = cookieStore.getAll()
    console.log(
      "All available cookies:",
      allCookies.map((c) => ({ name: c.name, hasValue: !!c.value })),
    )

    const tokens = tokenStorage.get()
    console.log("Tokens retrieved:", {
      hasAccessToken: !!tokens.access_token,
      accessTokenLength: tokens.access_token.length,
      hasRefreshToken: !!tokens.refresh_token,
      refreshTokenLength: tokens.refresh_token.length,
      expiresAt: tokens.expires_at,
      userEmail: tokens.user_email,
    })

    // Check if we have valid tokens
    if (!tokens.access_token || !tokens.expires_at) {
      console.log("❌ No tokens found - returning 401")
      return NextResponse.json(
        {
          authenticated: false,
          reason: "No tokens found",
          debug: {
            hasAccessToken: !!tokens.access_token,
            hasExpiresAt: !!tokens.expires_at,
          },
        },
        { status: 401 },
      )
    }

    // Check if token is expired
    if (!tokenStorage.isValid()) {
      console.log("⏰ Token expired, attempting refresh...")

      if (tokens.refresh_token) {
        try {
          await refreshAccessToken()
          console.log("✅ Token refresh successful")
        } catch (error) {
          console.error("❌ Token refresh failed:", error)
          return NextResponse.json(
            {
              authenticated: false,
              reason: "Token refresh failed",
              error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 401 },
          )
        }
      } else {
        console.log("❌ No refresh token available")
        return NextResponse.json(
          {
            authenticated: false,
            reason: "No refresh token available",
          },
          { status: 401 },
        )
      }
    }

    // Get updated tokens after potential refresh
    const currentTokens = tokenStorage.get()
    console.log("Using tokens for validation:", {
      hasAccessToken: !!currentTokens.access_token,
      accessTokenPreview: currentTokens.access_token.substring(0, 10) + "...",
    })

    // Validate token with Zoho
    try {
      console.log("🔍 Validating token with Zoho...")
      const userResponse = await fetch("https://accounts.zoho.com/oauth/user/info", {
        headers: {
          Authorization: `Zoho-oauthtoken ${currentTokens.access_token}`,
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
        throw new Error(`Token validation failed: ${userResponse.status}`)
      }

      const userInfo = await userResponse.json()
      console.log("✅ Token validation successful:", {
        email: userInfo.Email,
        name: userInfo.Display_Name,
      })

      return NextResponse.json({
        authenticated: true,
        organization: userInfo.Display_Name || "Zoho Organization",
        user: userInfo.Email || currentTokens.user_email,
        expiresAt: currentTokens.expires_at,
        scopes: ["ZohoCRM.modules.deals.READ", "ZohoCRM.modules.contacts.READ"],
      })
    } catch (error) {
      console.error("❌ Token validation error:", error)
      return NextResponse.json(
        {
          authenticated: false,
          reason: "Token validation failed",
          error: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 401 },
      )
    }
  } catch (error) {
    console.error("❌ Authentication check failed:", error)
    return NextResponse.json(
      {
        error: "Authentication check failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
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
