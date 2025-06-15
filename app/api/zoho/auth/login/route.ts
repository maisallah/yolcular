import { NextResponse } from "next/server"

// Zoho OAuth configuration
const ZOHO_CLIENT_ID = process.env.ZOHO_CLIENT_ID || "your_zoho_client_id"
const ZOHO_CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET || "your_zoho_client_secret"
const ZOHO_REDIRECT_URI =
  process.env.ZOHO_REDIRECT_URI ||
  `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/zoho/auth/callback`
const ZOHO_SCOPE = "ZohoCRM.modules.deals.READ,ZohoCRM.modules.contacts.READ,ZohoCRM.modules.accounts.READ"

export async function GET() {
  try {
    // Generate state parameter for security
    const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

    // Store state in session/memory for validation (in production, use proper session storage)
    // For now, we'll include it in the URL and validate in callback

    // Build Zoho OAuth URL
    const zohoAuthUrl = new URL("https://accounts.zoho.com/oauth/v2/auth")
    zohoAuthUrl.searchParams.append("scope", ZOHO_SCOPE)
    zohoAuthUrl.searchParams.append("client_id", ZOHO_CLIENT_ID)
    zohoAuthUrl.searchParams.append("response_type", "code")
    zohoAuthUrl.searchParams.append("access_type", "offline")
    zohoAuthUrl.searchParams.append("redirect_uri", ZOHO_REDIRECT_URI)
    zohoAuthUrl.searchParams.append("state", state)
    zohoAuthUrl.searchParams.append("prompt", "consent")

    // Redirect to Zoho OAuth
    return NextResponse.redirect(zohoAuthUrl.toString())
  } catch (error) {
    console.error("Zoho OAuth initiation failed:", error)

    // Return error page
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
          <p>Zoho CRM authentication başlatılamadı.</p>
          <p>Lütfen sistem yöneticisi ile iletişime geçin.</p>
          <button onclick="window.close()">Pencereyi Kapat</button>
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
