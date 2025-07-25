"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface CollapsibleInfoProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
  variant?: "info" | "stats" | "debug"
  className?: string
}

export default function CollapsibleInfo({ 
  title, 
  children, 
  defaultOpen = false, 
  variant = "info",
  className = ""
}: CollapsibleInfoProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  const getVariantStyles = () => {
    switch (variant) {
      case "stats":
        return "bg-blue-50/80 border-blue-200 text-blue-900"
      case "debug":
        return "bg-gray-50/80 border-gray-200 text-gray-900"
      default:
        return "bg-purple-50/80 border-purple-200 text-purple-900"
    }
  }

  const getIconColor = () => {
    switch (variant) {
      case "stats":
        return "text-blue-600"
      case "debug":
        return "text-gray-600"
      default:
        return "text-purple-600"
    }
  }

  return (
    <Card className={`border-0 shadow-sm ${getVariantStyles()} ${className}`}>
      <Button
        variant="ghost"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between p-3 h-auto hover:bg-white/50"
      >
        <div className="flex items-center gap-2">
          <Info className={`h-4 w-4 ${getIconColor()}`} />
          <span className="font-medium text-sm">{title}</span>
        </div>
        {isOpen ? (
          <ChevronUp className={`h-4 w-4 ${getIconColor()}`} />
        ) : (
          <ChevronDown className={`h-4 w-4 ${getIconColor()}`} />
        )}
      </Button>
      
      {isOpen && (
        <CardContent className="pt-0 pb-3 px-3">
          <div className="text-sm">
            {children}
          </div>
        </CardContent>
      )}
    </Card>
  )
}

// Quick info component for essential game info
export function QuickGameInfo({ 
  phase, 
  round, 
  currentPlayer, 
  playerCount 
}: {
  phase: string
  round: number
  currentPlayer?: string
  playerCount: number
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
      <div className="flex items-center gap-3">
        <div className="text-lg">🎮</div>
        <div>
          <div className="font-semibold text-gray-900 text-sm capitalize">
            {phase} - Round {round}
          </div>
          <div className="text-xs text-gray-600">
            {playerCount}/4 players
          </div>
        </div>
      </div>
      
      {currentPlayer && (
        <div className="text-right">
          <div className="text-xs text-gray-500">Current turn</div>
          <div className="font-medium text-sm text-purple-700 truncate max-w-20">
            {currentPlayer}
          </div>
        </div>
      )}
    </div>
  )
}
