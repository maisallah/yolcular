import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

export async function GET() {
  try {
    const user = await getSession()

    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        username: user.username,
        role: user.role,
        displayName: user.displayName,
      },
    })
  } catch (error) {
    console.error("Session check error:", error)
    return NextResponse.json({ error: "Session kontrolü başarısız" }, { status: 500 })
  }
}
