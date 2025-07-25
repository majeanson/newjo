"use client"

import { ArrowLeft, Home, Gamepad2, TestTube, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface NavigationProps {
  title?: string
  showBack?: boolean
  backUrl?: string
  className?: string
}

export default function Navigation({ 
  title = "Card Game", 
  showBack = false, 
  backUrl = "/",
  className = ""
}: NavigationProps) {
  const router = useRouter()

  const handleBack = () => {
    if (backUrl) {
      router.push(backUrl)
    } else {
      router.back()
    }
  }

  return (
    <div className={`bg-white/90 backdrop-blur border-b border-gray-200 sticky top-0 z-50 ${className}`}>
      <div className="px-3 py-2">
        <div className="flex items-center justify-between">
          {/* Left side - Back button or Home */}
          <div className="flex items-center gap-2">
            {showBack ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="p-1.5 hover:bg-gray-100 rounded-full"
              >
                <ArrowLeft className="h-4 w-4 text-gray-600" />
              </Button>
            ) : (
              <Link href="/">
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1.5 hover:bg-gray-100 rounded-full"
                >
                  <Home className="h-4 w-4 text-gray-600" />
                </Button>
              </Link>
            )}

            {/* Title - more compact */}
            <h1 className="text-base font-semibold text-gray-900 truncate max-w-32">
              {title}
            </h1>
          </div>

          {/* Right side - Quick actions - hidden on very small screens */}
          <div className="hidden xs:flex items-center gap-1">
            <Link href="/testing">
              <Button
                variant="ghost"
                size="sm"
                className="p-1.5 hover:bg-blue-50 rounded-full"
                title="Simulator"
              >
                <TestTube className="h-3.5 w-3.5 text-blue-600" />
              </Button>
            </Link>

            <Link href="/dashboard">
              <Button
                variant="ghost"
                size="sm"
                className="p-1.5 hover:bg-green-50 rounded-full"
                title="Dashboard"
              >
                <Users className="h-3.5 w-3.5 text-green-600" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

// Bottom Navigation for mobile - Ultra compact
export function BottomNavigation() {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur border-t border-gray-200 md:hidden z-50">
      <div className="grid grid-cols-3 gap-0 p-1">
        <Link href="/">
          <Button
            variant="ghost"
            className="flex flex-col items-center gap-0.5 h-auto py-1.5 px-2 rounded"
          >
            <Home className="h-4 w-4 text-gray-600" />
            <span className="text-xs text-gray-600">Home</span>
          </Button>
        </Link>

        <Link href="/testing">
          <Button
            variant="ghost"
            className="flex flex-col items-center gap-0.5 h-auto py-1.5 px-2 rounded"
          >
            <TestTube className="h-4 w-4 text-blue-600" />
            <span className="text-xs text-blue-600">Test</span>
          </Button>
        </Link>

        <Link href="/dashboard">
          <Button
            variant="ghost"
            className="flex flex-col items-center gap-0.5 h-auto py-1.5 px-2 rounded"
          >
            <Users className="h-4 w-4 text-green-600" />
            <span className="text-xs text-green-600">Rooms</span>
          </Button>
        </Link>
      </div>
    </div>
  )
}
