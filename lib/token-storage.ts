// Simple token storage using environment variables and memory
// In production, this should be replaced with database storage

interface AuthTokens {
  access_token: string
  refresh_token: string
  expires_at: string
  organization_id: string
  user_email: string
}

// Global token storage (in-memory for now)
let globalTokens: AuthTokens | null = null

export const tokenStorage = {
  // Get current tokens
  get(): AuthTokens {
    if (globalTokens) {
      console.log("Retrieved tokens from memory:", {
        hasAccessToken: !!globalTokens.access_token,
        hasRefreshToken: !!globalTokens.refresh_token,
        expiresAt: globalTokens.expires_at,
        userEmail: globalTokens.user_email,
      })
      return { ...globalTokens }
    }

    // Return empty tokens if none exist
    return {
      access_token: "",
      refresh_token: "",
      expires_at: "",
      organization_id: "",
      user_email: "",
    }
  },

  // Set tokens (partial update supported)
  set(tokens: Partial<AuthTokens>): void {
    if (!globalTokens) {
      globalTokens = {
        access_token: "",
        refresh_token: "",
        expires_at: "",
        organization_id: "",
        user_email: "",
      }
    }

    globalTokens = { ...globalTokens, ...tokens }
    console.log("Tokens updated in memory:", {
      hasAccessToken: !!globalTokens.access_token,
      hasRefreshToken: !!globalTokens.refresh_token,
      expiresAt: globalTokens.expires_at,
      userEmail: globalTokens.user_email,
    })
  },

  // Clear all tokens
  clear(): void {
    globalTokens = null
    console.log("Tokens cleared from memory")
  },

  // Check if tokens are valid (not expired)
  isValid(): boolean {
    if (!globalTokens || !globalTokens.access_token || !globalTokens.expires_at) {
      console.log("Token validation failed: no tokens or missing data")
      return false
    }

    const expiresAt = new Date(globalTokens.expires_at)
    const now = new Date()
    const isValid = expiresAt > now

    console.log("Token validation:", {
      expiresAt: expiresAt.toISOString(),
      now: now.toISOString(),
      isValid,
      timeUntilExpiry: Math.floor((expiresAt.getTime() - now.getTime()) / 1000),
    })

    return isValid
  },

  // Get time until expiry in seconds
  getTimeUntilExpiry(): number {
    if (!globalTokens || !globalTokens.expires_at) {
      return 0
    }

    const expiresAt = new Date(globalTokens.expires_at)
    const now = new Date()

    return Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000))
  },
}
