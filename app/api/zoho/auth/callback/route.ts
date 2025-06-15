import { type NextRequest, NextResponse } from "next/server"

// Zoho OAuth configuration
const ZOHO_CLIENT_ID = process.env.ZOHO_CLIENT_ID
const ZOHO_CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET
const ZOHO_REDIRECT_URI =
  process.env.ZOHO_REDIRECT_URI ||
  `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/zoho/auth/callback`

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const error = searchParams.get("error")
    const errorDescription = searchParams.get("error_description")

    console.log("=== ZOHO CALLBACK START ===")
    console.log("OAuth callback received:", {
      code: !!code,
      error,
      errorDescription,
      state,
      hasClientId: !!ZOHO_CLIENT_ID,
      hasClientSecret: !!ZOHO_CLIENT_SECRET,
    })

    // Check environment variables
    if (!ZOHO_CLIENT_ID || !ZOHO_CLIENT_SECRET) {
      throw new Error("Missing Zoho client credentials in environment variables")
    }

    // Handle OAuth errors
    if (error) {
      console.error("OAuth error received:", { error, errorDescription })
      const errorHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Zoho CRM Authentication Error</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .error { color: #dc3545; }
            .container { max-width: 400px; margin: 0 auto; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2 class="error">❌ Authentication Failed</h2>
            <p>Zoho CRM authentication reddedildi.</p>
            <p><strong>Error:</strong> ${error}</p>
            ${errorDescription ? `<p><strong>Description:</strong> ${errorDescription}</p>` : ""}
            <button onclick="window.close()">Pencereyi Kapat</button>
            <script>
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'ZOHO_AUTH_ERROR', 
                  error: '${error}',
                  description: '${errorDescription || ""}'
                }, '*');
                setTimeout(() => window.close(), 3000);
              }
            </script>
          </div>
        </body>
        </html>
      `
      return new NextResponse(errorHtml, {
        headers: { "Content-Type": "text/html" },
        status: 400,
      })
    }

    // Validate required parameters
    if (!code) {
      throw new Error("Authorization code not received from Zoho")
    }

    console.log("Exchanging authorization code for tokens...")
    console.log("Using redirect URI:", ZOHO_REDIRECT_URI)

    // Exchange authorization code for access token
    const tokenRequestBody = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: ZOHO_CLIENT_ID,
      client_secret: ZOHO_CLIENT_SECRET,
      redirect_uri: ZOHO_REDIRECT_URI,
      code: code,
    })

    console.log("Token request body:", tokenRequestBody.toString())

    const tokenResponse = await fetch("https://accounts.zoho.com/oauth/v2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: tokenRequestBody,
    })

    console.log("Token response status:", tokenResponse.status)
    console.log("Token response headers:", Object.fromEntries(tokenResponse.headers.entries()))

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error("Token exchange failed:", {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        body: errorData,
      })
      throw new Error(`Token exchange failed: ${tokenResponse.status} - ${errorData}`)
    }

    const tokenData = await tokenResponse.json()
    console.log("✅ Token exchange successful:", {
      hasAccessToken: !!tokenData.access_token,
      hasRefreshToken: !!tokenData.refresh_token,
      expiresIn: tokenData.expires_in,
      tokenType: tokenData.token_type,
      scope: tokenData.scope,
    })

    // Get user information to determine the correct API domain
    console.log("Fetching user information...")
    const userResponse = await fetch("https://accounts.zoho.com/oauth/user/info", {
      headers: {
        Authorization: `Zoho-oauthtoken ${tokenData.access_token}`,
        Accept: "application/json",
      },
    })

    console.log("User info response status:", userResponse.status)

    let userInfo = {
      Email: "unknown@domain.com",
      Display_Name: "Unknown User",
      ZUID: "unknown",
      Country: "US",
    }

    if (userResponse.ok) {
      userInfo = await userResponse.json()
      console.log("✅ User info retrieved:", {
        email: userInfo.Email,
        name: userInfo.Display_Name,
        zuid: userInfo.ZUID,
        country: userInfo.Country,
      })
    } else {
      const userErrorData = await userResponse.text()
      console.warn("⚠️ Failed to fetch user info:", {
        status: userResponse.status,
        body: userErrorData,
      })
    }

    // Determine API domain based on user's country/region
    let apiDomain = "www.zohoapis.com" // Default for US
    if (userInfo.Country === "AU") {
      apiDomain = "www.zohoapis.com.au"
    } else if (userInfo.Country === "EU") {
      apiDomain = "www.zohoapis.eu"
    } else if (userInfo.Country === "IN") {
      apiDomain = "www.zohoapis.in"
    } else if (userInfo.Country === "CN") {
      apiDomain = "www.zohoapis.com.cn"
    }

    console.log("Determined API domain:", apiDomain)

    // Prepare tokens for storage
    const tokens = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
      organization_id: userInfo.ZUID || "unknown",
      user_email: userInfo.Email,
      api_domain: apiDomain,
      scope: tokenData.scope,
      token_type: tokenData.token_type || "Bearer",
    }

    console.log("Storing tokens via API...")

    // Store tokens via internal API
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
      const storeResponse = await fetch(`${baseUrl}/api/zoho/tokens`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(tokens),
      })

      if (!storeResponse.ok) {
        const storeError = await storeResponse.text()
        console.error("Failed to store tokens via API:", storeError)
      } else {
        console.log("✅ Tokens stored successfully via API")
      }
    } catch (error) {
      console.error("Error storing tokens via API:", error)
    }

    // Success page
    const successHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Zoho CRM Authentication Success</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 50px; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            margin: 0;
          }
          .success { color: #28a745; background: white; padding: 30px; border-radius: 10px; color: #333; }
          .container { max-width: 500px; margin: 0 auto; }
          .checkmark { font-size: 48px; margin-bottom: 20px; }
          .info { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; text-align: left; }
          .info-row { margin: 5px 0; }
          button { 
            background: #28a745; 
            color: white; 
            border: none; 
            padding: 10px 20px; 
            border-radius: 5px; 
            cursor: pointer; 
            font-size: 16px;
            margin-top: 15px;
          }
          button:hover { background: #218838; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success">
            <div class="checkmark">✅</div>
            <h2>Authentication Successful!</h2>
            <p>Zoho CRM bağlantısı başarıyla kuruldu.</p>
            <div class="info">
              <div class="info-row"><strong>User:</strong> ${userInfo.Email}</div>
              <div class="info-row"><strong>Organization:</strong> ${userInfo.Display_Name}</div>
              <div class="info-row"><strong>API Domain:</strong> ${apiDomain}</div>
              <div class="info-row"><strong>Scopes:</strong> ${tokenData.scope || "CRM Access"}</div>
              <div class="info-row"><strong>Expires:</strong> ${new Date(Date.now() + tokenData.expires_in * 1000).toLocaleString()}</div>
            </div>
            <p>Bu pencereyi kapatabilirsiniz.</p>
            <button onclick="window.close()">Pencereyi Kapat</button>
          </div>
        </div>
        <script>
          console.log('🚀 Sending success message to parent window...');
          // Parent window'a başarılı authentication mesajı gönder
          if (window.opener) {
            window.opener.postMessage({ 
              type: 'ZOHO_AUTH_SUCCESS',
              user: '${userInfo.Email}',
              organization: '${userInfo.Display_Name}',
              apiDomain: '${apiDomain}',
              scope: '${tokenData.scope || ""}'
            }, '*');
            console.log('✅ Success message sent');
            setTimeout(() => {
              console.log('🔒 Closing popup window');
              window.close();
            }, 3000);
          } else {
            console.warn('⚠️ No opener window found');
          }
        </script>
      </body>
      </html>
    `

    console.log("=== ZOHO CALLBACK SUCCESS ===")
    return new NextResponse(successHtml, {
      headers: { "Content-Type": "text/html" },
    })
  } catch (error) {
    console.error("❌ OAuth callback error:", error)

    const errorHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Zoho CRM Authentication Error</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .error { color: #dc3545; }
          .container { max-width: 500px; margin: 0 auto; }
          .error-details { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; text-align: left; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2 class="error">❌ Authentication Error</h2>
          <p>Zoho CRM authentication sırasında bir hata oluştu.</p>
          <div class="error-details">
            <strong>Error:</strong> ${error instanceof Error ? error.message : "Unknown error"}
          </div>
          <p>Lütfen environment variables'ları kontrol edin:</p>
          <ul style="text-align: left;">
            <li>ZOHO_CLIENT_ID</li>
            <li>ZOHO_CLIENT_SECRET</li>
            <li>ZOHO_REDIRECT_URI</li>
          </ul>
          <button onclick="window.close()">Pencereyi Kapat</button>
          <script>
            if (window.opener) {
              window.opener.postMessage({ 
                type: 'ZOHO_AUTH_ERROR', 
                error: '${error instanceof Error ? error.message : "Unknown error"}' 
              }, '*');
              setTimeout(() => window.close(), 3000);
            }
          </script>
        </div>
      </body>
      </html>
    `

    return new NextResponse(errorHtml, {
      headers: { "Content-Type": "text/html" },
      status: 500,
    })
  }
}
