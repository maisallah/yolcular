import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { note, currentStatus } = body

    if (!note || !note.trim()) {
      return NextResponse.json({ error: "Problem açıklaması gerekli" }, { status: 400 })
    }

    // Gerçek uygulamada burada:
    // 1. Problem raporu veritabanına kaydedilir
    // 2. Yöneticilere bildirim gönderilir
    // 3. SMS/Email ile uyarı yapılır
    // 4. Problem takip sistemi başlatılır

    console.log(`Problem Raporu - Transfer ID: ${params.id}`)
    console.log(`Mevcut Durum: ${currentStatus}`)
    console.log(`Problem: ${note}`)
    console.log(`Zaman: ${new Date().toISOString()}`)

    // Simüle edilmiş başarılı yanıt
    return NextResponse.json({
      success: true,
      message: "Problem raporu alındı",
      ticketId: `PROB-${Date.now()}`,
    })
  } catch (error) {
    return NextResponse.json({ error: "Problem raporu gönderilemedi" }, { status: 500 })
  }
}
