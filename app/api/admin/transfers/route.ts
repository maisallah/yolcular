import { type NextRequest, NextResponse } from "next/server"

// Gerçek uygulamada veritabanı kullanılacak
const transfers = new Map<string, any>()

// Demo verileri - farklı tarihlerle
const now = new Date()
const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

// Bugün
transfers.set("demo123", {
  id: "demo123",
  name: "Ahmet Yılmaz",
  zohoId: "ZH-2024-001",
  location: "Atatürk Caddesi No:123, Merkez İş Merkezi, Kat 4 Daire 15",
  pickupTime: new Date(today.getTime() + 9.5 * 60 * 60 * 1000).toISOString(),
  dropOffTime: new Date(today.getTime() + 10.25 * 60 * 60 * 1000).toISOString(),
  status: "pending",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  statusHistory: [],
})

// Dün
transfers.set("demo456", {
  id: "demo456",
  name: "Fatma Demir",
  zohoId: "ZH-2024-002",
  location: "İstiklal Caddesi No:456, Galata Kulesi yanı",
  pickupTime: new Date(today.getTime() - 24 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000).toISOString(),
  dropOffTime: new Date(today.getTime() - 24 * 60 * 60 * 1000 + 14.75 * 60 * 60 * 1000).toISOString(),
  status: "dropped_off",
  createdAt: new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString(),
  updatedAt: new Date(today.getTime() - 23 * 60 * 60 * 1000).toISOString(),
  statusHistory: [
    {
      status: "arrived",
      note: "Konuma vardım, yolcu ile iletişime geçtim",
      timestamp: new Date(today.getTime() - 23.5 * 60 * 60 * 1000).toISOString(),
      canUndo: false,
    },
    {
      status: "picked_up",
      note: "Yolcu alındı, hedefe doğru yola çıkıldı",
      timestamp: new Date(today.getTime() - 23.25 * 60 * 60 * 1000).toISOString(),
      canUndo: false,
    },
    {
      status: "dropped_off",
      note: "Yolcu hedef konuma güvenle bırakıldı",
      timestamp: new Date(today.getTime() - 23 * 60 * 60 * 1000).toISOString(),
      canUndo: false,
    },
  ],
})

// Yarın
transfers.set("demo789", {
  id: "demo789",
  name: "Mehmet Kaya",
  zohoId: "ZH-2024-003",
  location: "Bağdat Caddesi No:789, Kadıköy",
  pickupTime: new Date(today.getTime() + 24 * 60 * 60 * 1000 + 11 * 60 * 60 * 1000).toISOString(),
  dropOffTime: new Date(today.getTime() + 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000).toISOString(),
  status: "pending",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  statusHistory: [],
})

// Bu hafta (Çarşamba)
transfers.set("demo101", {
  id: "demo101",
  name: "Ayşe Özkan",
  zohoId: "ZH-2024-004",
  location: "Nişantaşı, Teşvikiye Caddesi No:101",
  pickupTime: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000 + 15 * 60 * 60 * 1000).toISOString(),
  dropOffTime: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000 + 16 * 60 * 60 * 1000).toISOString(),
  status: "arrived",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  statusHistory: [
    {
      status: "arrived",
      note: "Konuma vardım, yolcuyu bekliyorum",
      timestamp: new Date().toISOString(),
      canUndo: true,
    },
  ],
})

// Gelecek hafta
transfers.set("demo202", {
  id: "demo202",
  name: "Can Yıldız",
  zohoId: "ZH-2024-005",
  location: "Levent, Büyükdere Caddesi No:202",
  pickupTime: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000).toISOString(),
  dropOffTime: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000 + 9 * 60 * 60 * 1000).toISOString(),
  status: "pending",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  statusHistory: [],
})

// Geçen hafta (tamamlanmış)
transfers.set("demo303", {
  id: "demo303",
  name: "Zeynep Arslan",
  zohoId: "ZH-2024-006",
  location: "Beyoğlu, İstiklal Caddesi No:303",
  pickupTime: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000 + 13 * 60 * 60 * 1000).toISOString(),
  dropOffTime: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000).toISOString(),
  status: "dropped_off",
  createdAt: new Date(today.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString(),
  updatedAt: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000).toISOString(),
  statusHistory: [
    {
      status: "arrived",
      note: "Konuma vardım",
      timestamp: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000 + 12.75 * 60 * 60 * 1000).toISOString(),
      canUndo: false,
    },
    {
      status: "picked_up",
      note: "Yolcu alındı",
      timestamp: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000 + 13 * 60 * 60 * 1000).toISOString(),
      canUndo: false,
    },
    {
      status: "dropped_off",
      note: "Transfer tamamlandı",
      timestamp: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000).toISOString(),
      canUndo: false,
    },
  ],
})

export async function GET() {
  try {
    const allTransfers = Array.from(transfers.values())
    return NextResponse.json(allTransfers)
  } catch (error) {
    return NextResponse.json({ error: "Transfer listesi alınamadı" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, zohoId, location, pickupTime, dropOffTime } = body

    // Validation
    if (!name || !zohoId || !location || !pickupTime || !dropOffTime) {
      return NextResponse.json({ error: "Tüm alanlar gereklidir" }, { status: 400 })
    }

    // Check if pickup time is before drop off time
    if (new Date(pickupTime) >= new Date(dropOffTime)) {
      return NextResponse.json({ error: "Alış zamanı bırakış zamanından önce olmalıdır" }, { status: 400 })
    }

    // Generate unique ID
    const id = `TR-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`

    // Create transfer
    const newTransfer = {
      id,
      name: name.trim(),
      zohoId: zohoId.trim(),
      location: location.trim(),
      pickupTime,
      dropOffTime,
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      statusHistory: [],
    }

    // Store transfer
    transfers.set(id, newTransfer)

    return NextResponse.json(newTransfer, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Transfer eklenemedi" }, { status: 500 })
  }
}
