import { NextResponse } from "next/server"
import { tokenStorage } from "@/lib/token-storage"

export async function POST() {
  try {
    const tokens = tokenStorage.get()

    // Revoke access token with Zoho
    if (tokens.access_token) {
      try {
        const revokeResponse = await fetch("https://accounts.zoho.com/oauth/v2/token/revoke", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            token: tokens.access_token,
          }),
        })

        if (!revokeResponse.ok) {
          console.warn("Token revocation failed, but continuing with logout")
        } else {
          console.log("Token revoked successfully")
        }
      } catch (error) {
        console.warn("Token revocation error:", error)
        // Continue with logout even if revocation fails
      }
    }

    // Clear stored tokens
    tokenStorage.clear()

    const response = NextResponse.json({
      success: true,
      message: "Logout successful - Zoho CRM bağlantısı kesildi",
    })

    // Clear cookies
    response.cookies.delete("zoho_access_token")
    response.cookies.delete("zoho_refresh_token")
    response.cookies.delete("zoho_expires_at")
    response.cookies.delete("zoho_org_id")
    response.cookies.delete("zoho_user_email")

    return response
  } catch (error) {
    console.error("Logout error:", error)

    // Clear tokens even if there's an error
    tokenStorage.clear()

    const response = NextResponse.json({
      success: true,
      message: "Logout completed with errors",
    })

    // Clear cookies
    response.cookies.delete("zoho_access_token")
    response.cookies.delete("zoho_refresh_token")
    response.cookies.delete("zoho_expires_at")
    response.cookies.delete("zoho_org_id")
    response.cookies.delete("zoho_user_email")

    return response
  }
}
