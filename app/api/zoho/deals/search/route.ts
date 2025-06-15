import { type NextRequest, NextResponse } from "next/server"

// Get auth tokens (in production, get from secure storage)
const authTokens = {
  access_token: "",
  refresh_token: "",
  expires_at: "",
  organization_id: "",
  user_email: "",
}

// Mock data as fallback
const mockZohoDeals = [
  {
    id: "deal_001",
    leadId: "LEAD-001",
    dealName: "Kurumsal Taşıma Hizmeti - Q1",
    contactName: "Ahmet Yılmaz",
    accountName: "ABC Teknoloji A.Ş.",
    phone: "+90 212 555 0101",
    email: "ahmet.yilmaz@abctech.com",
    address: "Atatürk Caddesi No:123, Merkez İş Merkezi, Kat 4 Daire 15, Şişli/İstanbul",
    stage: "Negotiation",
    amount: 15000,
  },
  {
    id: "deal_002",
    leadId: "LEAD-002",
    dealName: "VIP Transfer Paketi",
    contactName: "Fatma Demir",
    accountName: "XYZ Holding",
    phone: "+90 212 555 0202",
    email: "fatma.demir@xyzholding.com",
    address: "İstiklal Caddesi No:456, Galata Kulesi yanı, Beyoğlu/İstanbul",
    stage: "Closed Won",
    amount: 8500,
  },
  {
    id: "deal_003",
    leadId: "LEAD-003",
    dealName: "Havalimanı Transfer Hizmeti",
    contactName: "Mehmet Kaya",
    accountName: "DEF Turizm Ltd.",
    phone: "+90 216 555 0303",
    email: "mehmet.kaya@defturizm.com",
    address: "Bağdat Caddesi No:789, Kadıköy/İstanbul",
    stage: "Proposal",
    amount: 12000,
  },
  {
    id: "deal_004",
    leadId: "LEAD-004",
    dealName: "Özel Etkinlik Taşıma",
    contactName: "Ayşe Özkan",
    accountName: "GHI Events",
    phone: "+90 212 555 0404",
    email: "ayse.ozkan@ghievents.com",
    address: "Nişantaşı, Teşvikiye Caddesi No:101, Şişli/İstanbul",
    stage: "Qualification",
    amount: 25000,
  },
  {
    id: "deal_005",
    leadId: "LEAD-005",
    dealName: "Aylık Transfer Aboneliği",
    contactName: "Can Yıldız",
    accountName: "JKL Consulting",
    phone: "+90 212 555 0505",
    email: "can.yildiz@jklconsulting.com",
    address: "Levent, Büyükdere Caddesi No:202, Şişli/İstanbul",
    stage: "Needs Analysis",
    amount: 18000,
  },
  {
    id: "deal_006",
    leadId: "LEAD-006",
    dealName: "Konferans Transfer Hizmeti",
    contactName: "Zeynep Arslan",
    accountName: "MNO Organizasyon",
    phone: "+90 212 555 0606",
    email: "zeynep.arslan@mnoorg.com",
    address: "Beyoğlu, İstiklal Caddesi No:303, İstanbul",
    stage: "Closed Won",
    amount: 9500,
  },
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const leadId = searchParams.get("leadId")?.toUpperCase() || ""

    if (leadId.length < 3) {
      return NextResponse.json({ deals: [] })
    }

    // Check if we have valid authentication
    if (!authTokens.access_token) {
      return NextResponse.json({ error: "Zoho CRM authentication required" }, { status: 401 })
    }

    // Check token expiry
    if (new Date(authTokens.expires_at) <= new Date()) {
      return NextResponse.json({ error: "Zoho CRM token expired" }, { status: 401 })
    }

    try {
      // Real Zoho CRM API call
      const searchCriteria = `(Lead_ID:contains:${leadId})`
      const zohoApiUrl = `https://www.zohoapis.com/crm/v2/Deals/search?criteria=${encodeURIComponent(searchCriteria)}`

      const zohoResponse = await fetch(zohoApiUrl, {
        headers: {
          Authorization: `Zoho-oauthtoken ${authTokens.access_token}`,
          "Content-Type": "application/json",
        },
      })

      if (!zohoResponse.ok) {
        if (zohoResponse.status === 401) {
          return NextResponse.json({ error: "Zoho CRM authentication expired" }, { status: 401 })
        }
        throw new Error(`Zoho API error: ${zohoResponse.status}`)
      }

      const zohoData = await zohoResponse.json()

      // Transform Zoho data to our format
      const deals = (zohoData.data || []).map((deal: any) => ({
        id: deal.id,
        leadId: deal.Lead_ID || deal.id,
        dealName: deal.Deal_Name || "Unnamed Deal",
        contactName: deal.Contact_Name?.name || deal.Contact_Name || "Unknown Contact",
        accountName: deal.Account_Name?.name || deal.Account_Name || "Unknown Account",
        phone: deal.Phone || deal.Contact_Name?.phone || "",
        email: deal.Email || deal.Contact_Name?.email || "",
        address: deal.Billing_Street || deal.Mailing_Street || "",
        stage: deal.Stage || "Unknown",
        amount: deal.Amount || 0,
      }))

      // Sort results - exact matches first
      const exactMatches = deals.filter((deal: any) => deal.leadId === leadId)
      const partialMatches = deals.filter((deal: any) => deal.leadId !== leadId)
      const sortedResults = [...exactMatches, ...partialMatches]

      return NextResponse.json({
        deals: sortedResults.slice(0, 10),
        total: sortedResults.length,
        source: "zoho_api",
      })
    } catch (apiError) {
      console.error("Zoho API error, falling back to mock data:", apiError)

      // Fallback to mock data
      const filteredDeals = mockZohoDeals.filter((deal) => deal.leadId.includes(leadId))
      const exactMatches = filteredDeals.filter((deal) => deal.leadId === leadId)
      const partialMatches = filteredDeals.filter((deal) => deal.leadId !== leadId)
      const sortedResults = [...exactMatches, ...partialMatches]

      return NextResponse.json({
        deals: sortedResults.slice(0, 10),
        total: sortedResults.length,
        source: "mock_data",
        warning: "Using mock data - Zoho API unavailable",
      })
    }
  } catch (error) {
    console.error("Zoho search error:", error)
    return NextResponse.json({ error: "Zoho CRM araması başarısız" }, { status: 500 })
  }
}
