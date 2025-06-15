import { NextResponse } from "next/server"

// Simple in-memory token storage
let serverTokens: any = null

export async function GET() {
  try {
    console.log("=== TOKEN GET REQUEST ===")
    console.log("Current tokens:", {
      hasTokens: !!serverTokens,
      hasAccessToken: serverTokens?.access_token ? "YES" : "NO",
      hasRefreshToken: serverTokens?.refresh_token ? "YES" : "NO",
      expiresAt: serverTokens?.expires_at || "N/A",
      apiDomain: serverTokens?.api_domain || "N/A",
      scope: serverTokens?.scope || "N/A",
    })

    if (!serverTokens) {
      return NextResponse.json(
        {
          authenticated: false,
          reason: "No tokens stored",
        },
        { status: 401 },
      )
    }

    return NextResponse.json({
      authenticated: true,
      tokens: serverTokens,
    })
  } catch (error) {
    console.error("Error getting tokens:", error)
    return NextResponse.json({ error: "Failed to get tokens" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const tokens = await request.json()
    console.log("=== TOKEN POST REQUEST ===")
    console.log("Storing tokens:", {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiresAt: tokens.expires_at,
      userEmail: tokens.user_email,
      apiDomain: tokens.api_domain,
      scope: tokens.scope,
      tokenType: tokens.token_type,
    })

    serverTokens = tokens
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error storing tokens:", error)
    return NextResponse.json({ error: "Failed to store tokens" }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    console.log("=== TOKEN DELETE REQUEST ===")
    serverTokens = null
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error clearing tokens:", error)
    return NextResponse.json({ error: "Failed to clear tokens" }, { status: 500 })
  }
}
