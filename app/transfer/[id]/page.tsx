"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { MapPin, Clock, User, Hash, CheckCircle, AlertCircle, History, AlertTriangle } from "lucide-react"

interface TransferData {
  id: string
  name: string
  zohoId: string
  location: string
  pickupTime: string
  dropOffTime: string
  status: "pending" | "arrived" | "picked_up" | "dropped_off"
  updatedAt?: string
  statusHistory?: StatusHistoryItem[]
}

interface StatusHistoryItem {
  status: string
  note: string
  timestamp: string
  canUndo?: boolean
}

const statusConfig = {
  pending: { label: "Bekliyor", color: "bg-gray-500" },
  arrived: { label: "Konuma Varıldı", color: "bg-blue-500" },
  picked_up: { label: "Alındı", color: "bg-yellow-500" },
  dropped_off: { label: "Bırakıldı", color: "bg-green-500" },
}

const statusDescriptions = {
  arrived: "Yolcunun bulunduğu konuma vardığınızı onaylayın. Yolcuyla iletişime geçtiniz mi?",
  picked_up: "Yolcuyu aldığınızı onaylayın. Yolcu araçta mı?",
  dropped_off: "Yolcuyu hedef konuma bıraktığınızı onaylayın. Transfer tamamlandı mı?",
}

export default function TransferPage({ params }: { params: { id: string } }) {
  const [transferData, setTransferData] = useState<TransferData | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showHistoryDialog, setShowHistoryDialog] = useState(false)
  const [showProblemDialog, setShowProblemDialog] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<TransferData["status"] | null>(null)
  const [confirmationNote, setConfirmationNote] = useState("")
  const [problemNote, setProblemNote] = useState("")

  useEffect(() => {
    fetchTransferData()
  }, [])

  const fetchTransferData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/transfer/${params.id}`)

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Transfer bulunamadı")
        }
        throw new Error("Transfer verileri yüklenemedi")
      }

      const data = await response.json()
      setTransferData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu")
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = (newStatus: TransferData["status"]) => {
    setPendingStatus(newStatus)
    setConfirmationNote("")
    setShowConfirmDialog(true)
  }

  const confirmStatusUpdate = async () => {
    if (!transferData || !pendingStatus || !confirmationNote.trim()) return

    setUpdating(true)
    setError(null)

    try {
      const response = await fetch(`/api/transfer/${params.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: pendingStatus,
          note: confirmationNote.trim(),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Durum güncellenemedi")
      }

      const updatedData = await response.json()
      setTransferData(updatedData)
      setShowConfirmDialog(false)
      setPendingStatus(null)
      setConfirmationNote("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Güncelleme başarısız")
    } finally {
      setUpdating(false)
    }
  }

  const handleUndo = async (targetStatus: TransferData["status"]) => {
    if (!transferData) return

    setUpdating(true)
    setError(null)

    try {
      const response = await fetch(`/api/transfer/${params.id}/undo`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetStatus,
          note: "Durum geri alındı - şoför düzeltmesi",
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Geri alma başarısız")
      }

      const updatedData = await response.json()
      setTransferData(updatedData)
      setShowHistoryDialog(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Geri alma başarısız")
    } finally {
      setUpdating(false)
    }
  }

  const reportProblem = async () => {
    if (!transferData || !problemNote.trim()) return

    setUpdating(true)
    try {
      const response = await fetch(`/api/transfer/${params.id}/problem`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          note: problemNote.trim(),
          currentStatus: transferData.status,
        }),
      })

      if (!response.ok) {
        throw new Error("Problem raporu gönderilemedi")
      }

      setShowProblemDialog(false)
      setProblemNote("")
      setError("Problem raporu gönderildi. Yönetici ekibi en kısa sürede iletişime geçecek.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Problem raporu gönderilemedi")
    } finally {
      setUpdating(false)
    }
  }

  const getNextStatus = (currentStatus: TransferData["status"]) => {
    switch (currentStatus) {
      case "pending":
        return "arrived"
      case "arrived":
        return "picked_up"
      case "picked_up":
        return "dropped_off"
      default:
        return null
    }
  }

  const getNextStatusLabel = (currentStatus: TransferData["status"]) => {
    const nextStatus = getNextStatus(currentStatus)
    return nextStatus ? statusConfig[nextStatus].label : null
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Transfer bilgileri yükleniyor...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error && !transferData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchTransferData} variant="outline">
              Tekrar Dene
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!transferData) return null

  const nextStatus = getNextStatus(transferData.status)
  const nextStatusLabel = getNextStatusLabel(transferData.status)
  const canUndo =
    transferData.statusHistory &&
    transferData.statusHistory.length > 0 &&
    transferData.statusHistory[transferData.statusHistory.length - 1]?.canUndo

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        {/* Başlık */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Taşıma Güncelleme</h1>
          <Badge className={`${statusConfig[transferData.status].color} text-white px-3 py-1`}>
            {statusConfig[transferData.status].label}
          </Badge>
          {transferData.updatedAt && (
            <p className="text-xs text-gray-500 mt-2">
              Son güncelleme: {new Date(transferData.updatedAt).toLocaleString("tr-TR")}
            </p>
          )}
        </div>

        {/* Hata/Bilgi mesajı */}
        {error && (
          <Card
            className={`${error.includes("raporu gönderildi") ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}
          >
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                {error.includes("raporu gönderildi") ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
                <p className={`text-sm ${error.includes("raporu gönderildi") ? "text-green-600" : "text-red-600"}`}>
                  {error}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transfer Detayları Kartı */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5" />
              Transfer Detayları
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-gray-500 flex-shrink-0" />
              <div>
                <p className="font-medium">{transferData.name}</p>
                <p className="text-sm text-gray-600">Yolcu</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Hash className="h-4 w-4 text-gray-500 flex-shrink-0" />
              <div>
                <p className="font-medium">{transferData.zohoId}</p>
                <p className="text-sm text-gray-600">Zoho ID</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-gray-500 flex-shrink-0" />
              <div>
                <p className="font-medium">{transferData.location}</p>
                <p className="text-sm text-gray-600">Konum</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-green-600 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">{transferData.pickupTime}</p>
                  <p className="text-xs text-gray-600">Alış</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-red-600 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">{transferData.dropOffTime}</p>
                  <p className="text-xs text-gray-600">Bırakış</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Durum İlerleme Göstergesi */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-blue-800">İlerleme</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-blue-600">
                  {Object.keys(statusConfig).indexOf(transferData.status) + 1} / 4
                </span>
                {transferData.statusHistory && transferData.statusHistory.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowHistoryDialog(true)}
                    className="h-6 px-2 text-xs"
                  >
                    <History className="h-3 w-3 mr-1" />
                    Geçmiş
                  </Button>
                )}
              </div>
            </div>
            <div className="flex gap-1">
              {Object.keys(statusConfig).map((status, index) => {
                const isCompleted = Object.keys(statusConfig).indexOf(transferData.status) >= index
                const statusKey = status as keyof typeof statusConfig
                const statusColor = statusConfig[statusKey].color

                return (
                  <div
                    key={status}
                    className={`h-2 flex-1 rounded-full transition-colors duration-300 ${
                      isCompleted ? statusColor : "bg-gray-200"
                    }`}
                  />
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Durum Güncelleme Butonu */}
        {nextStatus && (
          <Button
            onClick={() => handleStatusUpdate(nextStatus)}
            disabled={updating}
            className="w-full h-12 text-lg font-medium"
            size="lg"
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              {nextStatusLabel} Olarak İşaretle
            </div>
          </Button>
        )}

        {/* Geri Al Butonu */}
        {canUndo && (
          <Button onClick={() => setShowHistoryDialog(true)} variant="outline" className="w-full" disabled={updating}>
            <div className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Son İşlemi Geri Al
            </div>
          </Button>
        )}

        {/* Problem Bildir Butonu */}
        <Button
          onClick={() => setShowProblemDialog(true)}
          variant="outline"
          className="w-full border-orange-300 text-orange-700 hover:bg-orange-50"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Problem Bildir
          </div>
        </Button>

        {/* Tamamlanma Mesajı */}
        {transferData.status === "dropped_off" && (
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-6 text-center">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-green-800 font-medium">Transfer Tamamlandı!</p>
              <p className="text-green-600 text-sm">Hizmetiniz için teşekkür ederiz.</p>
            </CardContent>
          </Card>
        )}

        {/* Onay Dialog'u */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent className="w-[95vw] max-w-md">
            <DialogHeader>
              <DialogTitle>Durumu Onayla</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800 mb-2">
                  <strong>{pendingStatus && statusConfig[pendingStatus].label}</strong> durumuna geçmek istiyorsunuz.
                </p>
                <p className="text-xs text-blue-600">
                  {pendingStatus && statusDescriptions[pendingStatus as keyof typeof statusDescriptions]}
                </p>
              </div>
              <div>
                <Label htmlFor="confirmation-note">Onay Notu (Zorunlu)</Label>
                <Textarea
                  id="confirmation-note"
                  value={confirmationNote}
                  onChange={(e) => setConfirmationNote(e.target.value)}
                  placeholder="Bu duruma geçiş için açıklama yazın... (örn: 'Yolcu ile görüştüm, konumdayım')"
                  rows={3}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">Bu not kayıt altına alınacak ve geri alınabilir.</p>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                İptal
              </Button>
              <Button onClick={confirmStatusUpdate} disabled={!confirmationNote.trim() || updating}>
                {updating ? "Güncelleniyor..." : "Onayla"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Geçmiş Dialog'u */}
        <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
          <DialogContent className="w-[95vw] max-w-md">
            <DialogHeader>
              <DialogTitle>Durum Geçmişi</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {transferData.statusHistory?.map((item, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Badge
                      className={`${statusConfig[item.status as keyof typeof statusConfig].color} text-white text-xs`}
                    >
                      {statusConfig[item.status as keyof typeof statusConfig].label}
                    </Badge>
                    <span className="text-xs text-gray-500">{new Date(item.timestamp).toLocaleString("tr-TR")}</span>
                  </div>
                  <p className="text-sm text-gray-700">{item.note}</p>
                  {item.canUndo && index === transferData.statusHistory!.length - 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 text-xs"
                      onClick={() => {
                        const previousStatus =
                          index > 0
                            ? (transferData.statusHistory![index - 1].status as TransferData["status"])
                            : "pending"
                        handleUndo(previousStatus)
                      }}
                      disabled={updating}
                    >
                      Bu İşlemi Geri Al
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowHistoryDialog(false)}>
                Kapat
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Problem Bildir Dialog'u */}
        <Dialog open={showProblemDialog} onOpenChange={setShowProblemDialog}>
          <DialogContent className="w-[95vw] max-w-md">
            <DialogHeader>
              <DialogTitle>Problem Bildir</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-orange-50 rounded-lg">
                <p className="text-sm text-orange-800">
                  Yaşadığınız problemi detaylı olarak açıklayın. Yönetici ekibi en kısa sürede size dönüş yapacak.
                </p>
              </div>
              <div>
                <Label htmlFor="problem-note">Problem Açıklaması</Label>
                <Textarea
                  id="problem-note"
                  value={problemNote}
                  onChange={(e) => setProblemNote(e.target.value)}
                  placeholder="Yaşadığınız problemi detaylı olarak açıklayın..."
                  rows={4}
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowProblemDialog(false)}>
                İptal
              </Button>
              <Button
                onClick={reportProblem}
                disabled={!problemNote.trim() || updating}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {updating ? "Gönderiliyor..." : "Problem Bildir"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
