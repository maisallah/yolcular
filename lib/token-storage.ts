import { writeFileSync, readFileSync, existsSync, unlinkSync } from "fs"

interface AuthTokens {
  access_token: string
  refresh_token: string
  expires_at: string
  organization_id: string
  user_email: string
  api_domain?: string
  scope?: string
  token_type?: string
}

// Use /tmp directory for serverless persistence
const TOKEN_FILE_PATH = "/tmp/zoho_tokens.json"

export const tokenStorage = {
  // Get current tokens from file
  get(): AuthTokens {
    try {
      if (existsSync(TOKEN_FILE_PATH)) {
        const fileContent = readFileSync(TOKEN_FILE_PATH, "utf8")
        const tokens = JSON.parse(fileContent)

        console.log("Retrieved tokens from file:", {
          hasAccessToken: !!tokens.access_token,
          hasRefreshToken: !!tokens.refresh_token,
          expiresAt: tokens.expires_at,
          userEmail: tokens.user_email,
          filePath: TOKEN_FILE_PATH,
        })

        return tokens
      }
    } catch (error) {
      console.error("Error reading tokens from file:", error)
    }

    // Return empty tokens if file doesn't exist or error
    return {
      access_token: "",
      refresh_token: "",
      expires_at: "",
      organization_id: "",
      user_email: "",
    }
  },

  // Set tokens (save to file)
  set(tokens: Partial<AuthTokens>): void {
    try {
      let existingTokens: AuthTokens = {
        access_token: "",
        refresh_token: "",
        expires_at: "",
        organization_id: "",
        user_email: "",
      }

      // Read existing tokens if file exists
      if (existsSync(TOKEN_FILE_PATH)) {
        try {
          const fileContent = readFileSync(TOKEN_FILE_PATH, "utf8")
          existingTokens = JSON.parse(fileContent)
        } catch (error) {
          console.warn("Could not read existing tokens, creating new:", error)
        }
      }

      // Merge with new tokens
      const updatedTokens = { ...existingTokens, ...tokens }

      // Write to file
      writeFileSync(TOKEN_FILE_PATH, JSON.stringify(updatedTokens, null, 2), "utf8")

      console.log("Tokens saved to file:", {
        hasAccessToken: !!updatedTokens.access_token,
        hasRefreshToken: !!updatedTokens.refresh_token,
        expiresAt: updatedTokens.expires_at,
        userEmail: updatedTokens.user_email,
        filePath: TOKEN_FILE_PATH,
      })
    } catch (error) {
      console.error("Error saving tokens to file:", error)
    }
  },

  // Clear all tokens (delete file)
  clear(): void {
    try {
      if (existsSync(TOKEN_FILE_PATH)) {
        unlinkSync(TOKEN_FILE_PATH)
        console.log("Tokens file deleted:", TOKEN_FILE_PATH)
      }
    } catch (error) {
      console.error("Error deleting tokens file:", error)
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
