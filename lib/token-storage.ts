import { cookies } from "next/headers"

interface AuthTokens {
  access_token: string
  refresh_token: string
  expires_at: string
  organization_id: string
  user_email: string
}

// Cookie-based token storage for serverless compatibility
export const tokenStorage = {
  // Get tokens from cookies
  get(): AuthTokens {
    try {
      const cookieStore = cookies()

      const tokens = {
        access_token: cookieStore.get("zoho_access_token")?.value || "",
        refresh_token: cookieStore.get("zoho_refresh_token")?.value || "",
        expires_at: cookieStore.get("zoho_expires_at")?.value || "",
        organization_id: cookieStore.get("zoho_org_id")?.value || "",
        user_email: cookieStore.get("zoho_user_email")?.value || "",
      }

      console.log("Retrieved tokens from cookies:", {
        hasAccessToken: !!tokens.access_token,
        hasRefreshToken: !!tokens.refresh_token,
        expiresAt: tokens.expires_at,
        userEmail: tokens.user_email,
      })

      return tokens
    } catch (error) {
      console.error("Error reading tokens from cookies:", error)
      return {
        access_token: "",
        refresh_token: "",
        expires_at: "",
        organization_id: "",
        user_email: "",
      }
    }
  },

  // Check if tokens are valid (not expired)
  isValid(): boolean {
    try {
      const tokens = this.get()

      if (!tokens.access_token || !tokens.expires_at) {
        console.log("Token validation failed: missing access_token or expires_at")
        return false
      }

      const expiresAt = new Date(tokens.expires_at)
      const now = new Date()
      const isValid = expiresAt > now

      console.log("Token validation:", {
        expiresAt: expiresAt.toISOString(),
        now: now.toISOString(),
        isValid,
        timeUntilExpiry: Math.floor((expiresAt.getTime() - now.getTime()) / 1000),
      })

      return isValid
    } catch (error) {
      console.error("Error checking token validity:", error)
      return false
    }
  },

  // Get time until expiry in seconds
  getTimeUntilExpiry(): number {
    try {
      const tokens = this.get()

      if (!tokens.expires_at) {
        return 0
      }

      const expiresAt = new Date(tokens.expires_at)
      const now = new Date()

      return Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000))
    } catch (error) {
      console.error("Error calculating time until expiry:", error)
      return 0
    }
  },
}
