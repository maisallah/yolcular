"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function ZohoTestPage() {
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [authInfo, setAuthInfo] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const checkDebug = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/zoho/debug")
      const data = await response.json()
      setDebugInfo(data)
    } catch (error) {
      setDebugInfo({ error: error instanceof Error ? error.message : "Unknown error" })
    }
    setLoading(false)
  }

  const checkAuth = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/zoho/auth")
      const data = await response.json()
      setAuthInfo({ status: response.status, data })
    } catch (error) {
      setAuthInfo({ error: error instanceof Error ? error.message : "Unknown error" })
    }
    setLoading(false)
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">Zoho Authentication Debug</h1>

      <div className="flex gap-4">
        <Button onClick={checkDebug} disabled={loading}>
          Check Debug Info
        </Button>
        <Button onClick={checkAuth} disabled={loading}>
          Check Auth Status
        </Button>
      </div>

      {debugInfo && (
        <Card>
          <CardHeader>
            <CardTitle>Debug Information</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm bg-gray-100 p-4 rounded overflow-auto">{JSON.stringify(debugInfo, null, 2)}</pre>
          </CardContent>
        </Card>
      )}

      {authInfo && (
        <Card>
          <CardHeader>
            <CardTitle>Auth Check Result</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm bg-gray-100 p-4 rounded overflow-auto">{JSON.stringify(authInfo, null, 2)}</pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
