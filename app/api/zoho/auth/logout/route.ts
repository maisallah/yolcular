import { NextResponse } from "next/server"

// In-memory token storage (should match other auth routes)
let authTokens = {
  access_token: "",
  refresh_token: "",
  expires_at: "",
  organization_id: "",
  user_email: "",
}

export async function POST() {
  try {
    // Revoke access token with Zoho
    if (authTokens.access_token) {
      try {
        const revokeResponse = await fetch("https://accounts.zoho.com/oauth/v2/token/revoke", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            token: authTokens.access_token,
          }),
        })

        if (!revokeResponse.ok) {
          console.warn("Token revocation failed, but continuing with logout")
        }
      } catch (error) {
        console.warn("Token revocation error:", error)
        // Continue with logout even if revocation fails
      }
    }

    // Clear stored tokens
    authTokens = {
      access_token: "",
      refresh_token: "",
      expires_at: "",
      organization_id: "",
      user_email: "",
    }

    return NextResponse.json({
      success: true,
      message: "Logout successful - Zoho CRM bağlantısı kesildi",
    })
  } catch (error) {
    console.error("Logout error:", error)

    // Clear tokens even if there's an error
    authTokens = {
      access_token: "",
      refresh_token: "",
      expires_at: "",
      organization_id: "",
      user_email: "",
    }

    return NextResponse.json({
      success: true,
      message: "Logout completed with errors",
    })
  }
}
