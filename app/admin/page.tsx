"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Calendar,
  User,
  Hash,
  ExternalLink,
  Filter,
  CalendarDays,
  Plus,
  List,
  Grid3X3,
  Search,
  Building2,
  CheckCircle,
  AlertCircle,
  LogIn,
  LogOut,
} from "lucide-react"

interface TransferData {
  id: string
  name: string
  zohoId: string
  location: string
  pickupTime: string
  dropOffTime: string
  status: "pending" | "arrived" | "picked_up" | "dropped_off"
  updatedAt?: string
  createdAt: string
  zohoDealId?: string
  leadId?: string
}

interface ZohoDeal {
  id: string
  leadId: string
  dealName: string
  contactName: string
  accountName: string
  phone?: string
  email?: string
  address?: string
  stage: string
  amount: number
}

interface ZohoAuthStatus {
  authenticated: boolean
  organization?: string
  user?: string
  expiresAt?: string
}

const statusConfig = {
  pending: { label: "Bekliyor", color: "bg-gray-500" },
  arrived: { label: "Konuma Varıldı", color: "bg-blue-500" },
  picked_up: { label: "Alındı", color: "bg-yellow-500" },
  dropped_off: { label: "Bırakıldı", color: "bg-green-500" },
}

const quickFilters = [
  { label: "Bugün", value: "today" },
  { label: "Dün", value: "yesterday" },
  { label: "Yarın", value: "tomorrow" },
  { label: "Bu Hafta", value: "this_week" },
  { label: "Gelecek Hafta", value: "next_week" },
  { label: "Bu Ay", value: "this_month" },
  { label: "Tümü", value: "all" },
]

const monthNames = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
]

const dayNames = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"]

export default function AdminPage() {
  const [transfers, setTransfers] = useState<TransferData[]>([])
  const [filteredTransfers, setFilteredTransfers] = useState<TransferData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [adding, setAdding] = useState(false)

  // Zoho authentication states
  const [zohoAuth, setZohoAuth] = useState<ZohoAuthStatus>({ authenticated: false })
  const [checkingAuth, setCheckingAuth] = useState(false)

  // Zoho integration states
  const [zohoDeals, setZohoDeals] = useState<ZohoDeal[]>([])
  const [searchingZoho, setSearchingZoho] = useState(false)
  const [leadIdSearch, setLeadIdSearch] = useState("")
  const [selectedDeal, setSelectedDeal] = useState<ZohoDeal | null>(null)
  const [showPassengerLookup, setShowPassengerLookup] = useState(false)

  // Filter states
  const [selectedQuickFilter, setSelectedQuickFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [searchTerm, setSearchTerm] = useState("")

  // Calendar states
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  // Add transfer form
  const [newTransfer, setNewTransfer] = useState({
    name: "",
    zohoId: "",
    location: "",
    pickupTime: "",
    dropOffTime: "",
    zohoDealId: "",
    leadId: "",
  })

  useEffect(() => {
    fetchTransfers()
    checkZohoAuth()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [transfers, selectedQuickFilter, statusFilter, startDate, endDate, searchTerm])

  useEffect(() => {
    if (leadIdSearch.length >= 3 && zohoAuth.authenticated) {
      searchZohoDeals()
    } else {
      setZohoDeals([])
    }
  }, [leadIdSearch, zohoAuth.authenticated])

  const checkZohoAuth = async () => {
    try {
      setCheckingAuth(true)
      const response = await fetch("/api/zoho/auth")

      if (response.ok) {
        const authData = await response.json()
        setZohoAuth(authData)
      } else {
        setZohoAuth({ authenticated: false })
      }
    } catch (err) {
      setZohoAuth({ authenticated: false })
    } finally {
      setCheckingAuth(false)
    }
  }

  const initiateZohoAuth = async () => {
    try {
      // Gerçek uygulamada Zoho OAuth URL'ine yönlendirilecek
      const authUrl = "/api/zoho/auth/login"
      window.open(authUrl, "zoho-auth", "width=600,height=600")

      // OAuth callback'i dinle
      const checkAuthInterval = setInterval(async () => {
        try {
          const response = await fetch("/api/zoho/auth")
          if (response.ok) {
            const authData = await response.json()
            if (authData.authenticated) {
              setZohoAuth(authData)
              clearInterval(checkAuthInterval)
            }
          }
        } catch (err) {
          // Auth check failed, continue polling
        }
      }, 2000)

      // 5 dakika sonra polling'i durdur
      setTimeout(() => clearInterval(checkAuthInterval), 300000)
    } catch (err) {
      setError("Zoho CRM authentication başlatılamadı")
    }
  }

  const disconnectZoho = async () => {
    try {
      await fetch("/api/zoho/auth/logout", { method: "POST" })
      setZohoAuth({ authenticated: false })
      setSelectedDeal(null)
      setZohoDeals([])
    } catch (err) {
      setError("Zoho CRM bağlantısı kesilemedi")
    }
  }

  const fetchTransfers = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/admin/transfers")

      if (!response.ok) {
        throw new Error("Transfer listesi yüklenemedi")
      }

      const data = await response.json()
      setTransfers(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu")
    } finally {
      setLoading(false)
    }
  }

  const searchZohoDeals = async () => {
    try {
      setSearchingZoho(true)

      const response = await fetch(`/api/zoho/deals/search?leadId=${encodeURIComponent(leadIdSearch)}`)

      if (!response.ok) {
        throw new Error("Zoho CRM araması başarısız")
      }

      const data = await response.json()
      setZohoDeals(data.deals || [])
    } catch (err) {
      console.error("Zoho search error:", err)
      setZohoDeals([])
    } finally {
      setSearchingZoho(false)
    }
  }

  const selectZohoDeal = (deal: ZohoDeal) => {
    setSelectedDeal(deal)
    setNewTransfer({
      ...newTransfer,
      name: deal.contactName,
      zohoId: deal.leadId,
      location: deal.address || "",
      zohoDealId: deal.id,
      leadId: deal.leadId,
    })
    setShowPassengerLookup(false)
    setLeadIdSearch("")
  }

  const clearZohoSelection = () => {
    setSelectedDeal(null)
    setNewTransfer({
      ...newTransfer,
      name: "",
      zohoId: "",
      location: "",
      zohoDealId: "",
      leadId: "",
    })
  }

  const addTransfer = async () => {
    if (
      !newTransfer.name ||
      !newTransfer.zohoId ||
      !newTransfer.location ||
      !newTransfer.pickupTime ||
      !newTransfer.dropOffTime
    ) {
      setError("Tüm alanları doldurun")
      return
    }

    setAdding(true)
    setError(null)

    try {
      const response = await fetch("/api/admin/transfers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newTransfer),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Transfer eklenemedi")
      }

      const addedTransfer = await response.json()
      setTransfers([...transfers, addedTransfer])
      setShowAddDialog(false)
      setNewTransfer({
        name: "",
        zohoId: "",
        location: "",
        pickupTime: "",
        dropOffTime: "",
        zohoDealId: "",
        leadId: "",
      })
      setSelectedDeal(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transfer eklenemedi")
    } finally {
      setAdding(false)
    }
  }

  const getDateRange = (filterValue: string) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    switch (filterValue) {
      case "today":
        return {
          start: today,
          end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1),
        }
      case "yesterday":
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
        return {
          start: yesterday,
          end: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000 - 1),
        }
      case "tomorrow":
        const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
        return {
          start: tomorrow,
          end: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000 - 1),
        }
      case "this_week":
        const startOfWeek = new Date(today)
        startOfWeek.setDate(today.getDate() - today.getDay() + 1)
        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 6)
        endOfWeek.setHours(23, 59, 59, 999)
        return { start: startOfWeek, end: endOfWeek }
      case "next_week":
        const nextWeekStart = new Date(today)
        nextWeekStart.setDate(today.getDate() - today.getDay() + 8)
        const nextWeekEnd = new Date(nextWeekStart)
        nextWeekEnd.setDate(nextWeekStart.getDate() + 6)
        nextWeekEnd.setHours(23, 59, 59, 999)
        return { start: nextWeekStart, end: nextWeekEnd }
      case "this_month":
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
        endOfMonth.setHours(23, 59, 59, 999)
        return { start: startOfMonth, end: endOfMonth }
      default:
        return null
    }
  }

  const applyFilters = () => {
    let filtered = [...transfers]

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (transfer) =>
          transfer.name.toLowerCase().includes(term) ||
          transfer.zohoId.toLowerCase().includes(term) ||
          transfer.location.toLowerCase().includes(term),
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((transfer) => transfer.status === statusFilter)
    }

    if (selectedQuickFilter !== "all") {
      const dateRange = getDateRange(selectedQuickFilter)
      if (dateRange) {
        filtered = filtered.filter((transfer) => {
          const pickupDate = new Date(transfer.pickupTime)
          return pickupDate >= dateRange.start && pickupDate <= dateRange.end
        })
      }
    } else if (startDate || endDate) {
      filtered = filtered.filter((transfer) => {
        const pickupDate = new Date(transfer.pickupTime)
        const start = startDate ? new Date(startDate) : new Date("1900-01-01")
        const end = endDate ? new Date(endDate + "T23:59:59") : new Date("2100-12-31")
        return pickupDate >= start && pickupDate <= end
      })
    }

    filtered.sort((a, b) => new Date(a.pickupTime).getTime() - new Date(b.pickupTime).getTime())
    setFilteredTransfers(filtered)
  }

  const handleQuickFilter = (filterValue: string) => {
    setSelectedQuickFilter(filterValue)
    if (filterValue !== "all") {
      setStartDate("")
      setEndDate("")
    }
  }

  const clearFilters = () => {
    setSelectedQuickFilter("all")
    setStatusFilter("all")
    setStartDate("")
    setEndDate("")
    setSearchTerm("")
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // Calendar functions
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay()
    return firstDay === 0 ? 6 : firstDay - 1
  }

  const getTransfersForDate = (date: Date) => {
    const dateStr = date.toDateString()
    return filteredTransfers.filter((transfer) => {
      const transferDate = new Date(transfer.pickupTime)
      return transferDate.toDateString() === dateStr
    })
  }

  const navigateMonth = (direction: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1))
  }

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate)
    const firstDay = getFirstDayOfMonth(currentDate)
    const days = []

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 border border-gray-200"></div>)
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      const dayTransfers = getTransfersForDate(date)
      const isToday = date.toDateString() === new Date().toDateString()
      const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString()

      days.push(
        <div
          key={day}
          className={`h-24 border border-gray-200 p-1 cursor-pointer hover:bg-gray-50 ${
            isToday ? "bg-blue-50 border-blue-300" : ""
          } ${isSelected ? "bg-blue-100 border-blue-500" : ""}`}
          onClick={() => setSelectedDate(date)}
        >
          <div className={`text-sm font-medium mb-1 ${isToday ? "text-blue-600" : "text-gray-900"}`}>{day}</div>
          <div className="space-y-1">
            {dayTransfers.slice(0, 2).map((transfer) => (
              <div
                key={transfer.id}
                className={`text-xs px-1 py-0.5 rounded text-white truncate ${statusConfig[transfer.status].color}`}
                title={`${transfer.name} - ${transfer.location}`}
              >
                {transfer.name}
              </div>
            ))}
            {dayTransfers.length > 2 && <div className="text-xs text-gray-500">+{dayTransfers.length - 2} daha</div>}
          </div>
        </div>,
      )
    }

    return days
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Transfer listesi yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Transfer Yönetimi</h1>
            <p className="text-gray-600">Zoho CRM entegrasyonu ile transfer yönetimi</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowAddDialog(true)} className="bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-2" />
              Yeni Transfer
            </Button>
          </div>
        </div>

        {/* Zoho Integration Status */}
        <Card className={zohoAuth.authenticated ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-gray-600" />
                <span className="font-medium">Zoho CRM Entegrasyonu</span>
                {zohoAuth.authenticated ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                )}
              </div>
              <div className="flex items-center gap-2">
                {checkingAuth ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                ) : zohoAuth.authenticated ? (
                  <>
                    <span className="text-sm text-green-700">
                      {zohoAuth.organization} - {zohoAuth.user}
                    </span>
                    <Button variant="outline" size="sm" onClick={disconnectZoho}>
                      <LogOut className="h-4 w-4 mr-1" />
                      Bağlantıyı Kes
                    </Button>
                  </>
                ) : (
                  <Button onClick={initiateZohoAuth} className="bg-blue-600 hover:bg-blue-700">
                    <LogIn className="h-4 w-4 mr-2" />
                    Zoho CRM'e Bağlan
                  </Button>
                )}
              </div>
            </div>
            <p className="text-sm text-gray-700 mt-1">
              {zohoAuth.authenticated
                ? "Yeni transfer eklerken Zoho CRM Deals modülünden Lead_ID ile arama yapabilirsiniz."
                : "Zoho CRM entegrasyonu için önce authentication yapmanız gerekiyor."}
            </p>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtreler
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="search">Arama (İsim, Lead ID veya Konum)</Label>
              <Input
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="İsim, Lead ID veya konum ile arama yapın..."
                className="mt-1"
              />
            </div>

            <div>
              <Label>Hızlı Tarih Filtreleri</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {quickFilters.map((filter) => (
                  <Button
                    key={filter.value}
                    variant={selectedQuickFilter === filter.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleQuickFilter(filter.value)}
                  >
                    {filter.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="start-date">Başlangıç Tarihi</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value)
                    if (e.target.value) setSelectedQuickFilter("all")
                  }}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="end-date">Bitiş Tarihi</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value)
                    if (e.target.value) setSelectedQuickFilter("all")
                  }}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="status-filter">Durum</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tüm Durumlar</SelectItem>
                    <SelectItem value="pending">Bekliyor</SelectItem>
                    <SelectItem value="arrived">Konuma Varıldı</SelectItem>
                    <SelectItem value="picked_up">Alındı</SelectItem>
                    <SelectItem value="dropped_off">Bırakıldı</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t">
              <p className="text-sm text-gray-600">
                {filteredTransfers.length} transfer gösteriliyor (toplam {transfers.length})
              </p>
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Filtreleri Temizle
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error Message */}
        {error && (
          <Card className="bg-red-50 border-red-200">
            <CardContent className="pt-4">
              <p className="text-red-600">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Tabs for List and Calendar View */}
        <Tabs defaultValue="list" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="list" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              Liste Görünümü
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Grid3X3 className="h-4 w-4" />
              Takvim Görünümü
            </TabsTrigger>
          </TabsList>

          {/* List View */}
          <TabsContent value="list" className="space-y-4">
            {filteredTransfers.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <CalendarDays className="h-8 w-8 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Seçilen kriterlere uygun transfer bulunamadı.</p>
                </CardContent>
              </Card>
            ) : (
              filteredTransfers.map((transfer) => (
                <Card key={transfer.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <User className="h-5 w-5 text-gray-500" />
                        <div>
                          <h3 className="font-semibold text-lg">{transfer.name}</h3>
                          <p className="text-sm text-gray-600">Lead ID: {transfer.zohoId}</p>
                          {transfer.leadId && <p className="text-xs text-blue-600">Zoho Lead ID: {transfer.leadId}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`${statusConfig[transfer.status].color} text-white`}>
                          {statusConfig[transfer.status].label}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/transfer/${transfer.id}`, "_blank")}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{transfer.location}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Alış: {formatDate(transfer.pickupTime)}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-500">
                      <div>Bırakış: {formatDate(transfer.dropOffTime)}</div>
                      <div>
                        {transfer.updatedAt
                          ? `Son güncelleme: ${formatDate(transfer.updatedAt)}`
                          : `Oluşturulma: ${formatDate(transfer.createdAt)}`}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Calendar View */}
          <TabsContent value="calendar" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => navigateMonth(-1)}>
                      ←
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                      Bugün
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => navigateMonth(1)}>
                      →
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-0 mb-4">
                  {dayNames.map((day) => (
                    <div key={day} className="h-8 flex items-center justify-center font-medium text-gray-600 border-b">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-0">{renderCalendar()}</div>
              </CardContent>
            </Card>

            {/* Selected Date Details */}
            {selectedDate && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    {selectedDate.toLocaleDateString("tr-TR", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {getTransfersForDate(selectedDate).length === 0 ? (
                    <p className="text-gray-600">Bu tarihte transfer bulunmuyor.</p>
                  ) : (
                    <div className="space-y-3">
                      {getTransfersForDate(selectedDate).map((transfer) => (
                        <div key={transfer.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium">{transfer.name}</p>
                            <p className="text-sm text-gray-600">{transfer.location}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(transfer.pickupTime).toLocaleTimeString("tr-TR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}{" "}
                              -{" "}
                              {new Date(transfer.dropOffTime).toLocaleTimeString("tr-TR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={`${statusConfig[transfer.status].color} text-white`}>
                              {statusConfig[transfer.status].label}
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(`/transfer/${transfer.id}`, "_blank")}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Refresh Button */}
        <div className="text-center">
          <Button onClick={fetchTransfers} variant="outline" disabled={loading}>
            {loading ? "Yükleniyor..." : "Listeyi Yenile"}
          </Button>
        </div>

        {/* Add Transfer Dialog with Zoho Integration */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="w-[95vw] max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Yeni Transfer Ekle
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Zoho Authentication Warning */}
              {!zohoAuth.authenticated && (
                <Card className="bg-yellow-50 border-yellow-200">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm text-yellow-800">
                        Zoho CRM entegrasyonu için önce authentication yapmanız gerekiyor.
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Passenger Name Lookup */}
              <div>
                <Label>Yolcu Adı (Zoho CRM Lookup)</Label>
                {selectedDeal ? (
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-green-800">{selectedDeal.contactName}</p>
                        <p className="text-sm text-green-600">Lead ID: {selectedDeal.leadId}</p>
                        <p className="text-sm text-green-600">Deal: {selectedDeal.dealName}</p>
                        <p className="text-sm text-green-600">Firma: {selectedDeal.accountName}</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={clearZohoSelection}>
                        Değiştir
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full mt-2"
                    onClick={() => setShowPassengerLookup(true)}
                    disabled={!zohoAuth.authenticated}
                  >
                    <Search className="h-4 w-4 mr-2" />
                    {zohoAuth.authenticated ? "Zoho CRM'den Yolcu Seç" : "Zoho CRM Bağlantısı Gerekli"}
                  </Button>
                )}
              </div>

              {/* Manual Fields (populated from Zoho or manual entry) */}
              <div>
                <Label htmlFor="name">Yolcu Adı</Label>
                <Input
                  id="name"
                  value={newTransfer.name}
                  onChange={(e) => setNewTransfer({ ...newTransfer, name: e.target.value })}
                  placeholder={zohoAuth.authenticated ? "Zoho CRM'den seçin veya manuel girin" : "Manuel girin"}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="lead-id">Lead ID</Label>
                <Input
                  id="lead-id"
                  value={newTransfer.zohoId}
                  onChange={(e) => setNewTransfer({ ...newTransfer, zohoId: e.target.value })}
                  placeholder="LEAD-001"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="location">Konum</Label>
                <Textarea
                  id="location"
                  value={newTransfer.location}
                  onChange={(e) => setNewTransfer({ ...newTransfer, location: e.target.value })}
                  placeholder="Pickup konumu"
                  rows={2}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="pickup-time">Alış Zamanı</Label>
                <Input
                  id="pickup-time"
                  type="datetime-local"
                  value={newTransfer.pickupTime}
                  onChange={(e) => setNewTransfer({ ...newTransfer, pickupTime: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="dropoff-time">Bırakış Zamanı</Label>
                <Input
                  id="dropoff-time"
                  type="datetime-local"
                  value={newTransfer.dropOffTime}
                  onChange={(e) => setNewTransfer({ ...newTransfer, dropOffTime: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                İptal
              </Button>
              <Button onClick={addTransfer} disabled={adding} className="bg-green-600 hover:bg-green-700">
                {adding ? "Ekleniyor..." : "Transfer Ekle"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Passenger Lookup Dialog */}
        <Dialog open={showPassengerLookup} onOpenChange={setShowPassengerLookup}>
          <DialogContent className="w-[95vw] max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Yolcu Seçimi - Zoho CRM Deals
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="lead-search">Lead ID ile Arama</Label>
                <Input
                  id="lead-search"
                  value={leadIdSearch}
                  onChange={(e) => setLeadIdSearch(e.target.value)}
                  placeholder="LEAD-001 formatında Lead ID girin..."
                  className="mt-1"
                />
                {searchingZoho && <p className="text-sm text-gray-500 mt-1">Zoho CRM'de aranıyor...</p>}
                <p className="text-xs text-gray-500 mt-1">
                  Minimum 3 karakter girin. Zoho CRM Deals modülünde Lead_ID alanında arama yapılır.
                </p>
              </div>

              <div className="max-h-96 overflow-y-auto space-y-2">
                {zohoDeals.length === 0 && leadIdSearch.length >= 3 && !searchingZoho && (
                  <p className="text-gray-500 text-center py-4">Sonuç bulunamadı</p>
                )}

                {zohoDeals.map((deal) => (
                  <div
                    key={deal.id}
                    className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => selectZohoDeal(deal)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{deal.contactName}</p>
                        <p className="text-sm text-gray-600">Lead ID: {deal.leadId}</p>
                        <p className="text-sm text-gray-600">Deal: {deal.dealName}</p>
                        <p className="text-sm text-gray-600">Firma: {deal.accountName}</p>
                        {deal.phone && <p className="text-xs text-gray-500">Tel: {deal.phone}</p>}
                        {deal.address && <p className="text-xs text-gray-500">Adres: {deal.address}</p>}
                      </div>
                      <div className="text-right">
                        <Badge variant="outline">{deal.stage}</Badge>
                        <p className="text-sm font-medium text-green-600">${deal.amount.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPassengerLookup(false)}>
                İptal
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
