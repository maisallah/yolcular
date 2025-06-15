import { type NextRequest, NextResponse } from "next/server"

// Aynı transfer storage'ını kullan
const transfers = new Map<string, any>()

// Demo verileri (diğer dosyayla senkron tutmak için)
if (!transfers.has("demo123")) {
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
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { targetStatus, note } = body

    const transfer = transfers.get(params.id)

    if (!transfer) {
      return NextResponse.json({ error: "Transfer bulunamadı" }, { status: 404 })
    }

    if (!transfer.statusHistory || transfer.statusHistory.length === 0) {
      return NextResponse.json({ error: "Geri alınacak işlem bulunamadı" }, { status: 400 })
    }

    // Son işlemin geri alınabilir olup olmadığını kontrol et
    const lastHistoryItem = transfer.statusHistory[transfer.statusHistory.length - 1]
    if (!lastHistoryItem.canUndo) {
      return NextResponse.json({ error: "Bu işlem geri alınamaz" }, { status: 400 })
    }

    // Durum doğrulama
    const validStatuses = ["pending", "arrived", "picked_up", "dropped_off"]
    if (!validStatuses.includes(targetStatus)) {
      return NextResponse.json({ error: "Geçersiz hedef durum" }, { status: 400 })
    }

    // Son kayıdı kaldır
    transfer.statusHistory.pop()

    // Geri alma kaydı ekle
    transfer.statusHistory.push({
      status: targetStatus,
      note: note || "Durum geri alındı",
      timestamp: new Date().toISOString(),
      canUndo: false, // Geri alma işlemi tekrar geri alınamaz
      isUndo: true,
    })

    // Transfer durumunu güncelle
    transfer.status = targetStatus
    transfer.updatedAt = new Date().toISOString()
    transfers.set(params.id, transfer)

    return NextResponse.json(transfer)
  } catch (error) {
    return NextResponse.json({ error: "Geri alma başarısız" }, { status: 500 })
  }
}
