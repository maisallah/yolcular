"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function Home() {
  useEffect(() => {
    // Redirect to login for admin access
    window.location.href = "/login"
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Transfer Yönetim Sistemi</h1>
        <p className="text-gray-600 mb-4">Admin paneline erişim için giriş yapın</p>
        <Button onClick={() => (window.location.href = "/login")}>Admin Girişi</Button>
      </div>
    </div>
  )
}
