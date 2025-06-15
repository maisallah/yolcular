import { cookies } from "next/headers"
import type { NextRequest } from "next/server"

export interface User {
  username: string
  role: "admin" | "root"
  displayName: string
}

// Temporary user credentials (will be replaced with database later)
const TEMP_USERS = [
  {
    username: "admin",
    password: process.env.ADMIN_PASSWORD || "admin123!",
    role: "admin" as const,
    displayName: "Admin User",
  },
  {
    username: "root",
    password: process.env.ROOT_PASSWORD || "root123!",
    role: "root" as const,
    displayName: "Root User",
  },
]

export async function validateCredentials(username: string, password: string): Promise<User | null> {
  const user = TEMP_USERS.find((u) => u.username === username)

  if (!user) {
    return null
  }

  // For now, simple password comparison (will use bcrypt with database)
  if (user.password === password) {
    return {
      username: user.username,
      role: user.role,
      displayName: user.displayName,
    }
  }

  return null
}

export async function createSession(user: User): Promise<string> {
  const sessionData = {
    username: user.username,
    role: user.role,
    displayName: user.displayName,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
  }

  // Simple base64 encoding for now (will use JWT with database)
  const sessionToken = Buffer.from(JSON.stringify(sessionData)).toString("base64")

  // Set HTTP-only cookie
  const cookieStore = cookies()
  cookieStore.set("admin_session", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 24 * 60 * 60, // 24 hours
    path: "/",
  })

  return sessionToken
}

export async function getSession(): Promise<User | null> {
  try {
    const cookieStore = cookies()
    const sessionCookie = cookieStore.get("admin_session")

    if (!sessionCookie?.value) {
      return null
    }

    const sessionData = JSON.parse(Buffer.from(sessionCookie.value, "base64").toString())

    // Check if session is expired
    if (new Date(sessionData.expiresAt) < new Date()) {
      return null
    }

    return {
      username: sessionData.username,
      role: sessionData.role,
      displayName: sessionData.displayName,
    }
  } catch (error) {
    console.error("Session validation error:", error)
    return null
  }
}

export async function clearSession(): Promise<void> {
  const cookieStore = cookies()
  cookieStore.delete("admin_session")
}

export function requireAuth(allowedRoles: ("admin" | "root")[] = ["admin", "root"]) {
  return async (request: NextRequest) => {
    const user = await getSession()

    if (!user || !allowedRoles.includes(user.role)) {
      return false
    }

    return user
  }
}
