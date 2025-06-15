import { NextResponse } from "next/server"
import { tokenStorage } from "@/lib/token-storage"

export async function GET() {
  try {
    console.log("=== AUTH CHECK START ===")
    console.log("Timestamp:", new Date().toISOString())

    // Add a small delay to ensure any file writes are complete
    await new Promise((resolve) => setTimeout(resolve, 100))

    const tokens = tokenStorage.get()
    console.log("Tokens retrieved from file storage:", {
      hasAccessToken: !!tokens.access_token,
      accessTokenLength: tokens.access_token?.length || 0,
      hasRefreshToken: !!tokens.refresh_token,
      refreshTokenLength: tokens.refresh_token?.length || 0,
      expiresAt: tokens.expires_at,
      userEmail: tokens.user_email,
      apiDomain: tokens.api_domain,
      accountsDomain: tokens.accounts_domain,
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
            timestamp: new Date().toISOString(),
          },
        },
        { status: 401 },
      )
    }

    // Check if token is expired
    const expiresAt = new Date(tokens.expires_at)
    const now = new Date()
    const timeUntilExpiry = Math.floor((expiresAt.getTime() - now.getTime()) / 1000)

    console.log("Token expiry check:", {
      expiresAt: expiresAt.toISOString(),
      now: now.toISOString(),
      timeUntilExpiry,
      isExpired: timeUntilExpiry <= 0,
    })

    if (timeUntilExpiry <= 0) {
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
      accessTokenPreview: currentTokens.access_token?.substring(0, 10) + "...",
      userEmail: currentTokens.user_email,
    })

    // Validate token with Zoho
    try {
      console.log("🔍 Validating token with Zoho...")
      const accountsDomain = currentTokens.accounts_domain || "https://accounts.zoho.com"

      const userResponse = await fetch(`${accountsDomain}/oauth/user/info`, {
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

        // If validation fails, clear tokens and return unauthenticated
        tokenStorage.clear()

        throw new Error(`Token validation failed: ${userResponse.status}`)
      }

      const userInfo = await userResponse.json()
      console.log("✅ Token validation successful:", {
        email: userInfo.Email,
        name: userInfo.Display_Name,
        orgId: userInfo.ZUID,
      })

      const response = {
        authenticated: true,
        organization: userInfo.Display_Name || currentTokens.organization_id || "Zoho Organization",
        user: userInfo.Email || currentTokens.user_email,
        expiresAt: currentTokens.expires_at,
        scopes: ["ZohoCRM.modules.deals.READ", "ZohoCRM.modules.contacts.READ"],
        debug: {
          tokenValidated: true,
          timestamp: new Date().toISOString(),
          timeUntilExpiry: Math.floor((new Date(currentTokens.expires_at).getTime() - Date.now()) / 1000),
        },
      }

      console.log("✅ Returning authenticated response:", response)
      return NextResponse.json(response)
    } catch (error) {
      console.error("❌ Token validation error:", error)
      return NextResponse.json(
        {
          authenticated: false,
          reason: "Token validation failed",
          error: error instanceof Error ? error.message : "Unknown error",
          debug: {
            timestamp: new Date().toISOString(),
          },
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
        debug: {
          timestamp: new Date().toISOString(),
        },
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
  const accountsDomain = tokens.accounts_domain || "https://accounts.zoho.com"

  console.log("Refreshing token with:", {
    hasRefreshToken: !!tokens.refresh_token,
    clientId: ZOHO_CLIENT_ID.substring(0, 10) + "...",
    accountsDomain,
  })

  const refreshResponse = await fetch(`${accountsDomain}/oauth/v2/token`, {
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

  // Calculate expiry time with buffer
  const expiresAt = new Date(Date.now() + (tokenData.expires_in - 300) * 1000).toISOString() // 5 min buffer

  // Update tokens in file storage
  tokenStorage.set({
    access_token: tokenData.access_token,
    expires_at: expiresAt,
    // Refresh token might be updated
    ...(tokenData.refresh_token && { refresh_token: tokenData.refresh_token }),
  })

  console.log("Access token refreshed and saved to file successfully")
}
