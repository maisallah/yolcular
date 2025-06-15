import { type NextRequest, NextResponse } from "next/server"

// Gerçek uygulamada veritabanı kullanılacak
const transfers = new Map<string, any>()

// Demo verileri ekle
transfers.set("demo123", {
  id: "demo123",
  name: "Ahmet Yılmaz",
  zohoId: "ZH-2024-001",
  location: "Atatürk Caddesi No:123, Merkez İş Merkezi, Kat 4 Daire 15",
  pickupTime: "15 Ocak 2024 09:30",
  dropOffTime: "15 Ocak 2024 10:15",
  status: "pending",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  statusHistory: [],
})

transfers.set("demo456", {
  id: "demo456",
  name: "Fatma Demir",
  zohoId: "ZH-2024-002",
  location: "İstiklal Caddesi No:456, Galata Kulesi yanı",
  pickupTime: "15 Ocak 2024 14:00",
  dropOffTime: "15 Ocak 2024 14:45",
  status: "arrived",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  statusHistory: [
    {
      status: "arrived",
      note: "Konuma vardım, yolcu ile iletişime geçtim",
      timestamp: new Date().toISOString(),
      canUndo: true,
    },
  ],
})

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const transfer = transfers.get(params.id)

    if (!transfer) {
      return NextResponse.json({ error: "Transfer bulunamadı" }, { status: 404 })
    }

    return NextResponse.json(transfer)
  } catch (error) {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { status, note } = body

    const transfer = transfers.get(params.id)

    if (!transfer) {
      return NextResponse.json({ error: "Transfer bulunamadı" }, { status: 404 })
    }

    // Not zorunlu
    if (!note || !note.trim()) {
      return NextResponse.json({ error: "Onay notu gerekli" }, { status: 400 })
    }

    // Durum doğrulama
    const validStatuses = ["pending", "arrived", "picked_up", "dropped_off"]
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Geçersiz durum" }, { status: 400 })
    }

    // Durum sırasını kontrol et
    const statusOrder = ["pending", "arrived", "picked_up", "dropped_off"]
    const currentIndex = statusOrder.indexOf(transfer.status)
    const newIndex = statusOrder.indexOf(status)

    if (newIndex < currentIndex) {
      return NextResponse.json({ error: "Durum geriye alınamaz" }, { status: 400 })
    }

    if (newIndex !== currentIndex + 1) {
      return NextResponse.json({ error: "Durum sırayla güncellenmelidir" }, { status: 400 })
    }

    // Geçmiş kayıt ekle
    if (!transfer.statusHistory) {
      transfer.statusHistory = []
    }

    // Önceki kayıtların undo özelliğini kapat
    transfer.statusHistory.forEach((item: any) => {
      item.canUndo = false
    })

    // Yeni kayıt ekle
    transfer.statusHistory.push({
      status: status,
      note: note.trim(),
      timestamp: new Date().toISOString(),
      canUndo: status !== "dropped_off", // Son durum geri alınamaz
    })

    // Transfer güncelle
    transfer.status = status
    transfer.updatedAt = new Date().toISOString()
    transfers.set(params.id, transfer)

    return NextResponse.json(transfer)
  } catch (error) {
    return NextResponse.json({ error: "Güncelleme başarısız" }, { status: 500 })
  }
}
