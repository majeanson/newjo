"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RefreshCw, Home } from "lucide-react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Global application error:', error)
  }, [error])

  return (
    <html>
      <body>
        <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-100 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-lg border-0 bg-white/80 backdrop-blur">
            <CardHeader className="text-center">
              <div className="text-6xl mb-4">💥</div>
              <CardTitle className="text-2xl text-gray-900">Application Error</CardTitle>
              <p className="text-gray-600">
                A critical error occurred. Please refresh the page.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={reset}
                className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button 
                onClick={() => window.location.href = '/'}
                variant="outline" 
                className="w-full"
              >
                <Home className="h-4 w-4 mr-2" />
                Go Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </body>
    </html>
  )
}
