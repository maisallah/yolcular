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

      return {
        access_token: cookieStore.get("zoho_access_token")?.value || "",
        refresh_token: cookieStore.get("zoho_refresh_token")?.value || "",
        expires_at: cookieStore.get("zoho_expires_at")?.value || "",
        organization_id: cookieStore.get("zoho_org_id")?.value || "",
        user_email: cookieStore.get("zoho_user_email")?.value || "",
      }
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

  // Set tokens in cookies (for server-side use)
  setServerSide(tokens: Partial<AuthTokens>): void {
    try {
      const cookieStore = cookies()

      if (tokens.access_token !== undefined) {
        cookieStore.set("zoho_access_token", tokens.access_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 7, // 7 days
        })
      }

      if (tokens.refresh_token !== undefined) {
        cookieStore.set("zoho_refresh_token", tokens.refresh_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 30, // 30 days
        })
      }

      if (tokens.expires_at !== undefined) {
        cookieStore.set("zoho_expires_at", tokens.expires_at, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 7, // 7 days
        })
      }

      if (tokens.organization_id !== undefined) {
        cookieStore.set("zoho_org_id", tokens.organization_id, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 30, // 30 days
        })
      }

      if (tokens.user_email !== undefined) {
        cookieStore.set("zoho_user_email", tokens.user_email, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 30, // 30 days
        })
      }

      console.log("Tokens stored in cookies:", {
        hasAccessToken: !!tokens.access_token,
        hasRefreshToken: !!tokens.refresh_token,
        expiresAt: tokens.expires_at,
        userEmail: tokens.user_email,
      })
    } catch (error) {
      console.error("Error storing tokens in cookies:", error)
    }
  },

  // Clear all tokens
  clear(): void {
    try {
      const cookieStore = cookies()

      cookieStore.delete("zoho_access_token")
      cookieStore.delete("zoho_refresh_token")
      cookieStore.delete("zoho_expires_at")
      cookieStore.delete("zoho_org_id")
      cookieStore.delete("zoho_user_email")

      console.log("Tokens cleared from cookies")
    } catch (error) {
      console.error("Error clearing tokens from cookies:", error)
    }
  },

  // Check if tokens are valid (not expired)
  isValid(): boolean {
    try {
      const tokens = this.get()

      if (!tokens.access_token || !tokens.expires_at) {
        return false
      }

      const expiresAt = new Date(tokens.expires_at)
      const now = new Date()

      return expiresAt > now
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

// Client-side token storage using Response.cookies for setting
export const setTokensInResponse = (response: Response, tokens: Partial<AuthTokens>): Response => {
  const headers = new Headers(response.headers)

  if (tokens.access_token !== undefined) {
    headers.append(
      "Set-Cookie",
      `zoho_access_token=${tokens.access_token}; HttpOnly; Secure=${process.env.NODE_ENV === "production"}; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}; Path=/`,
    )
  }

  if (tokens.refresh_token !== undefined) {
    headers.append(
      "Set-Cookie",
      `zoho_refresh_token=${tokens.refresh_token}; HttpOnly; Secure=${process.env.NODE_ENV === "production"}; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}; Path=/`,
    )
  }

  if (tokens.expires_at !== undefined) {
    headers.append(
      "Set-Cookie",
      `zoho_expires_at=${tokens.expires_at}; HttpOnly; Secure=${process.env.NODE_ENV === "production"}; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}; Path=/`,
    )
  }

  if (tokens.organization_id !== undefined) {
    headers.append(
      "Set-Cookie",
      `zoho_org_id=${tokens.organization_id}; HttpOnly; Secure=${process.env.NODE_ENV === "production"}; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}; Path=/`,
    )
  }

  if (tokens.user_email !== undefined) {
    headers.append(
      "Set-Cookie",
      `zoho_user_email=${tokens.user_email}; HttpOnly; Secure=${process.env.NODE_ENV === "production"}; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}; Path=/`,
    )
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}
