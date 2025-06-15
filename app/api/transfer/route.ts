import { type NextRequest, NextResponse } from "next/server"

// In-memory storage for demo purposes
// In production, you'd use a database
const transfers = new Map<string, any>()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, zohoId, location, pickupTime, dropOffTime } = body

    // Validate required fields
    if (!name || !zohoId || !location || !pickupTime || !dropOffTime) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Generate unique ID
    const id = Math.random().toString(36).substring(2, 15)

    // Create transfer record
    const transfer = {
      id,
      name,
      zohoId,
      location,
      pickupTime,
      dropOffTime,
      status: "pending",
      createdAt: new Date().toISOString(),
    }

    // Store transfer
    transfers.set(id, transfer)

    // Return the transfer with the custom link
    return NextResponse.json({
      ...transfer,
      link: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/transfer/${id}`,
    })
  } catch (error) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
}

export async function GET() {
  // Return all transfers (for admin purposes)
  const allTransfers = Array.from(transfers.values())
  return NextResponse.json(allTransfers)
}
