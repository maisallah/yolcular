import { type NextRequest, NextResponse } from "next/server"
import { tokenStorage } from "@/lib/token-storage"

export async function GET(request: NextRequest) {
  try {
    console.log("=== ZOHO CALLBACK START ===")
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")
    const error = searchParams.get("error")
    const location = searchParams.get("location")

    console.log("Callback params:", { code: !!code, error, location })

    if (error) {
      console.error("OAuth error:", error)
      return new NextResponse(
        `
        <html>
          <body>
            <script>
              window.opener?.postMessage({
                type: 'ZOHO_AUTH_ERROR',
                error: '${error}'
              }, '${process.env.NEXT_PUBLIC_BASE_URL}');
              window.close();
            </script>
            <p>Authentication failed: ${error}</p>
          </body>
        </html>
        `,
        { headers: { "Content-Type": "text/html" } },
      )
    }

    if (!code) {
      console.error("No authorization code received")
      return new NextResponse(
        `
        <html>
          <body>
            <script>
              window.opener?.postMessage({
                type: 'ZOHO_AUTH_ERROR',
                error: 'No authorization code received'
              }, '${process.env.NEXT_PUBLIC_BASE_URL}');
              window.close();
            </script>
            <p>No authorization code received</p>
          </body>
        </html>
        `,
        { headers: { "Content-Type": "text/html" } },
      )
    }

    // Exchange code for tokens
    const ZOHO_CLIENT_ID = process.env.ZOHO_CLIENT_ID
    const ZOHO_CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET
    const ZOHO_REDIRECT_URI = process.env.ZOHO_REDIRECT_URI

    if (!ZOHO_CLIENT_ID || !ZOHO_CLIENT_SECRET || !ZOHO_REDIRECT_URI) {
      throw new Error("Missing Zoho environment variables")
    }

    console.log("Exchanging code for tokens...")
    console.log("Using redirect URI:", ZOHO_REDIRECT_URI)

    // Determine the correct accounts domain based on location
    let accountsDomain = "https://accounts.zoho.com"
    let apiDomain = "https://www.zohoapis.com"

    if (location) {
      switch (location.toLowerCase()) {
        case "eu":
          accountsDomain = "https://accounts.zoho.eu"
          apiDomain = "https://www.zohoapis.eu"
          break
        case "in":
          accountsDomain = "https://accounts.zoho.in"
          apiDomain = "https://www.zohoapis.in"
          break
        case "au":
          accountsDomain = "https://accounts.zoho.com.au"
          apiDomain = "https://www.zohoapis.com.au"
          break
        case "jp":
          accountsDomain = "https://accounts.zoho.jp"
          apiDomain = "https://www.zohoapis.jp"
          break
      }
    }

    console.log("Using domains:", { accountsDomain, apiDomain })

    const tokenResponse = await fetch(`${accountsDomain}/oauth/v2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: ZOHO_CLIENT_ID,
        client_secret: ZOHO_CLIENT_SECRET,
        redirect_uri: ZOHO_REDIRECT_URI,
        code: code,
      }),
    })

    console.log("Token response status:", tokenResponse.status)

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error("Token exchange failed:", {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        body: errorText,
      })
      throw new Error(`Token exchange failed: ${tokenResponse.status} - ${errorText}`)
    }

    const tokenData = await tokenResponse.json()
    console.log("Token data received:", {
      hasAccessToken: !!tokenData.access_token,
      hasRefreshToken: !!tokenData.refresh_token,
      expiresIn: tokenData.expires_in,
      scope: tokenData.scope,
    })

    // Get user info to validate token and get user details
    console.log("Fetching user info...")
    const userResponse = await fetch(`${accountsDomain}/oauth/user/info`, {
      headers: {
        Authorization: `Zoho-oauthtoken ${tokenData.access_token}`,
      },
    })

    if (!userResponse.ok) {
      const errorText = await userResponse.text()
      console.error("User info fetch failed:", {
        status: userResponse.status,
        body: errorText,
      })
      throw new Error(`Failed to get user info: ${userResponse.status}`)
    }

    const userInfo = await userResponse.json()
    console.log("User info received:", {
      email: userInfo.Email,
      name: userInfo.Display_Name,
      orgId: userInfo.ZUID,
    })

    // Calculate expiry time with buffer
    const expiresAt = new Date(Date.now() + (tokenData.expires_in - 300) * 1000).toISOString() // 5 min buffer

    // Store tokens with all necessary information
    const tokensToStore = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: expiresAt,
      organization_id: userInfo.ZUID || "unknown",
      user_email: userInfo.Email || "unknown",
      api_domain: apiDomain,
      accounts_domain: accountsDomain,
      scope: tokenData.scope,
      token_type: tokenData.token_type || "Bearer",
    }

    console.log("Storing tokens:", {
      hasAccessToken: !!tokensToStore.access_token,
      hasRefreshToken: !!tokensToStore.refresh_token,
      expiresAt: tokensToStore.expires_at,
      userEmail: tokensToStore.user_email,
      apiDomain: tokensToStore.api_domain,
    })

    tokenStorage.set(tokensToStore)

    // Verify tokens were stored correctly
    const storedTokens = tokenStorage.get()
    console.log("Verification - tokens stored:", {
      hasAccessToken: !!storedTokens.access_token,
      hasRefreshToken: !!storedTokens.refresh_token,
      expiresAt: storedTokens.expires_at,
      userEmail: storedTokens.user_email,
    })

    // Wait a moment to ensure file write is complete
    await new Promise((resolve) => setTimeout(resolve, 500))

    console.log("✅ Authentication successful, sending success message to parent")

    return new NextResponse(
      `
      <html>
        <head>
          <title>Authentication Successful</title>
        </head>
        <body>
          <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2 style="color: green;">✅ Authentication Successful!</h2>
            <p>Zoho CRM connection established successfully.</p>
            <p>You can close this window.</p>
          </div>
          <script>
            console.log('Sending success message to parent window...');
            
            // Send success message to parent
            if (window.opener) {
              window.opener.postMessage({
                type: 'ZOHO_AUTH_SUCCESS',
                organization: '${userInfo.Display_Name || "Zoho Organization"}',
                user: '${userInfo.Email}',
                timestamp: new Date().toISOString()
              }, '${process.env.NEXT_PUBLIC_BASE_URL}');
              
              console.log('Success message sent, closing window in 2 seconds...');
              setTimeout(() => {
                window.close();
              }, 2000);
            } else {
              console.log('No parent window found');
            }
          </script>
        </body>
      </html>
      `,
      { headers: { "Content-Type": "text/html" } },
    )
  } catch (error) {
    console.error("❌ Callback error:", error)

    return new NextResponse(
      `
      <html>
        <body>
          <script>
            window.opener?.postMessage({
              type: 'ZOHO_AUTH_ERROR',
              error: '${error instanceof Error ? error.message : "Unknown error"}'
            }, '${process.env.NEXT_PUBLIC_BASE_URL}');
            window.close();
          </script>
          <p>Authentication failed: ${error instanceof Error ? error.message : "Unknown error"}</p>
        </body>
      </html>
      `,
      { headers: { "Content-Type": "text/html" } },
    )
  }
}
