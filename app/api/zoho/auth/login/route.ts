import { NextResponse } from "next/server"

export async function GET() {
  try {
    const ZOHO_CLIENT_ID = process.env.ZOHO_CLIENT_ID
    const ZOHO_REDIRECT_URI =
      process.env.ZOHO_REDIRECT_URI ||
      `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/zoho/auth/callback`

    if (!ZOHO_CLIENT_ID) {
      throw new Error("ZOHO_CLIENT_ID environment variable is not set")
    }

    console.log("Initiating Zoho OAuth with:", {
      clientId: ZOHO_CLIENT_ID.substring(0, 10) + "...",
      redirectUri: ZOHO_REDIRECT_URI,
    })

    // Zoho CRM OAuth 2.0 authorization URL with proper scopes
    const scopes = [
      "ZohoCRM.modules.deals.READ",
      "ZohoCRM.modules.deals.ALL",
      "ZohoCRM.modules.contacts.READ",
      "ZohoCRM.modules.accounts.READ",
      "ZohoCRM.users.READ",
    ].join(",")

    const authUrl = new URL("https://accounts.zoho.com/oauth/v2/auth")
    authUrl.searchParams.set("scope", scopes)
    authUrl.searchParams.set("client_id", ZOHO_CLIENT_ID)
    authUrl.searchParams.set("response_type", "code")
    authUrl.searchParams.set("access_type", "offline")
    authUrl.searchParams.set("redirect_uri", ZOHO_REDIRECT_URI)
    authUrl.searchParams.set("state", "zoho_auth_" + Date.now()) // CSRF protection

    console.log("Redirecting to Zoho OAuth URL:", authUrl.toString())

    // Redirect to Zoho OAuth
    return NextResponse.redirect(authUrl.toString())
  } catch (error) {
    console.error("Failed to initiate Zoho OAuth:", error)

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
          <h2 class="error">❌ Configuration Error</h2>
          <p>Zoho CRM authentication yapılandırması eksik.</p>
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
