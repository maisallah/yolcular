import { type NextRequest, NextResponse } from "next/server"

// Zoho OAuth configuration
const ZOHO_CLIENT_ID = process.env.ZOHO_CLIENT_ID || "your_zoho_client_id"
const ZOHO_CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET || "your_zoho_client_secret"
const ZOHO_REDIRECT_URI =
  process.env.ZOHO_REDIRECT_URI ||
  `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/zoho/auth/callback`

// In-memory token storage (in production, use database or secure session storage)
let authTokens = {
  access_token: "",
  refresh_token: "",
  expires_at: "",
  organization_id: "",
  user_email: "",
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const error = searchParams.get("error")

    // Handle OAuth errors
    if (error) {
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
            <p>Error: ${error}</p>
            <button onclick="window.close()">Pencereyi Kapat</button>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'ZOHO_AUTH_ERROR', error: '${error}' }, '*');
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
      throw new Error("Authorization code not received")
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch("https://accounts.zoho.com/oauth/v2/token", {
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

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error("Token exchange failed:", errorData)
      throw new Error("Failed to exchange authorization code for tokens")
    }

    const tokenData = await tokenResponse.json()

    // Get user information
    const userResponse = await fetch("https://accounts.zoho.com/oauth/user/info", {
      headers: {
        Authorization: `Zoho-oauthtoken ${tokenData.access_token}`,
      },
    })

    let userInfo = { Email: "unknown@domain.com", Display_Name: "Unknown User" }
    if (userResponse.ok) {
      userInfo = await userResponse.json()
    }

    // Store tokens (in production, use secure storage)
    authTokens = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
      organization_id: userInfo.ZUID || "unknown",
      user_email: userInfo.Email,
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
          .container { max-width: 400px; margin: 0 auto; }
          .checkmark { font-size: 48px; margin-bottom: 20px; }
          .info { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
          button { 
            background: #28a745; 
            color: white; 
            border: none; 
            padding: 10px 20px; 
            border-radius: 5px; 
            cursor: pointer; 
            font-size: 16px;
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
              <p><strong>User:</strong> ${userInfo.Email}</p>
              <p><strong>Organization:</strong> ${userInfo.Display_Name}</p>
              <p><strong>Access:</strong> CRM Deals, Contacts, Accounts</p>
            </div>
            <p>Bu pencereyi kapatabilirsiniz.</p>
            <button onclick="window.close()">Pencereyi Kapat</button>
          </div>
        </div>
        <script>
          // Parent window'a başarılı authentication mesajı gönder
          if (window.opener) {
            window.opener.postMessage({ 
              type: 'ZOHO_AUTH_SUCCESS',
              user: '${userInfo.Email}',
              organization: '${userInfo.Display_Name}'
            }, '*');
            setTimeout(() => window.close(), 3000);
          }
        </script>
      </body>
      </html>
    `

    return new NextResponse(successHtml, {
      headers: { "Content-Type": "text/html" },
    })
  } catch (error) {
    console.error("OAuth callback error:", error)

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
          <h2 class="error">❌ Authentication Error</h2>
          <p>Zoho CRM authentication sırasında bir hata oluştu.</p>
          <p>Error: ${error instanceof Error ? error.message : "Unknown error"}</p>
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
