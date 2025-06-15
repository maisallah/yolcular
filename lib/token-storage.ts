// Shared token storage for Zoho authentication
// In production, this should be replaced with database storage

interface AuthTokens {
  access_token: string
  refresh_token: string
  expires_at: string
  organization_id: string
  user_email: string
}

// Global token storage (in-memory for now)
let globalTokens: AuthTokens = {
  access_token: "",
  refresh_token: "",
  expires_at: "",
  organization_id: "",
  user_email: "",
}

export const tokenStorage = {
  // Get current tokens
  get(): AuthTokens {
    return { ...globalTokens }
  },

  // Set tokens (partial update supported)
  set(tokens: Partial<AuthTokens>): void {
    globalTokens = { ...globalTokens, ...tokens }
    console.log("Tokens updated:", {
      hasAccessToken: !!globalTokens.access_token,
      hasRefreshToken: !!globalTokens.refresh_token,
      expiresAt: globalTokens.expires_at,
      userEmail: globalTokens.user_email,
    })
  },

  // Clear all tokens
  clear(): void {
    globalTokens = {
      access_token: "",
      refresh_token: "",
      expires_at: "",
      organization_id: "",
      user_email: "",
    }
    console.log("Tokens cleared")
  },

  // Check if tokens are valid (not expired)
  isValid(): boolean {
    if (!globalTokens.access_token || !globalTokens.expires_at) {
      return false
    }

    const expiresAt = new Date(globalTokens.expires_at)
    const now = new Date()

    return expiresAt > now
  },

  // Get time until expiry in seconds
  getTimeUntilExpiry(): number {
    if (!globalTokens.expires_at) {
      return 0
    }

    const expiresAt = new Date(globalTokens.expires_at)
    const now = new Date()

    return Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000))
  },
}
