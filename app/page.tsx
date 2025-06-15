"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ExternalLink, Truck, Settings, Calendar } from "lucide-react"

export default function HomePage() {
  const demoLinks = [
    {
      id: "demo123",
      name: "Ahmet Yılmaz (Bugün)",
      status: "Bekliyor",
      url: "/transfer/demo123",
    },
    {
      id: "demo456",
      name: "Fatma Demir (Dün - Tamamlandı)",
      status: "Bırakıldı",
      url: "/transfer/demo456",
    },
    {
      id: "demo789",
      name: "Mehmet Kaya (Yarın)",
      status: "Bekliyor",
      url: "/transfer/demo789",
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Truck className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Şoför Transfer Sistemi</h1>
          </div>
          <p className="text-gray-600">Demo transfer linklerini test edin</p>
        </div>

        {/* Admin Panel Link */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6 text-center">
            <Settings className="h-8 w-8 text-blue-600 mx-auto mb-4" />
            <h3 className="font-semibold text-blue-900 mb-2">Yönetici Paneli</h3>
            <p className="text-blue-800 text-sm mb-4">Tüm transferleri görüntüleyin, filtreleyin ve yönetin</p>
            <Button onClick={() => window.open("/admin", "_blank")} className="bg-blue-600 hover:bg-blue-700">
              <Calendar className="h-4 w-4 mr-2" />
              Admin Panelini Aç
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Demo Transfer Linkleri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {demoLinks.map((link) => (
              <div key={link.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">{link.name}</p>
                  <p className="text-sm text-gray-600">ID: {link.id}</p>
                  <p className="text-sm text-blue-600">Durum: {link.status}</p>
                </div>
                <Button onClick={() => window.open(link.url, "_blank")} variant="outline" size="sm">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Aç
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-green-900 mb-2">Yeni Özellikler:</h3>
            <ul className="text-sm text-green-800 space-y-1">
              <li>• 📅 Tarih bazlı filtreleme sistemi</li>
              <li>• ⚡ Hızlı filtreler (Bugün, Yarın, Bu Hafta vb.)</li>
              <li>• 🔍 İsim, ID ve konum araması</li>
              <li>• 📊 Durum bazlı filtreleme</li>
              <li>• 📋 Detaylı transfer listesi</li>
              <li>• 🔗 Direkt transfer linklerine erişim</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-blue-900 mb-2">Nasıl Çalışır:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Her transfer için benzersiz bir link oluşturulur</li>
              <li>• Şoför linki açarak transfer detaylarını görür</li>
              <li>• Durum güncellemeleri sunucuda saklanır</li>
              <li>• Admin panelinden tüm transferler yönetilebilir</li>
              <li>• Tarih ve durum filtrelemeleri yapılabilir</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
