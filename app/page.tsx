"use client"

import { useActionState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "./actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Gamepad2, TestTube, Users, Sparkles } from "lucide-react"
import Link from "next/link"
import { BottomNavigation } from "@/components/navigation"

export default function HomePage() {
  const [state, formAction] = useActionState(signIn, null)
  const router = useRouter()

  useEffect(() => {
    if (state && 'success' in state && state.success && 'redirectTo' in state && state.redirectTo) {
      router.push(state.redirectTo as string)
    }
  }, [state, router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-3 pb-16">
      {/* Compact Header */}
      <div className="text-center mb-6 pt-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Gamepad2 className="h-6 w-6 text-purple-600" />
          <h1 className="text-2xl font-bold text-gray-900">Card Game</h1>
          <Sparkles className="h-5 w-5 text-yellow-500" />
        </div>
        <p className="text-gray-600 text-sm">Real-time multiplayer fun!</p>
      </div>

      {/* Main Content - Ultra compact */}
      <div className="max-w-sm mx-auto space-y-4">
        {/* Join Game Card - Compact */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
          <CardHeader className="text-center pb-3">
            <CardTitle className="text-lg text-gray-900">🎮 Join Game</CardTitle>
            <p className="text-xs text-gray-600">Enter your name to start</p>
          </CardHeader>
          <CardContent className="pt-0">
            <form action={formAction} className="space-y-3">
              <div>
                <Input
                  name="name"
                  placeholder="Your awesome name ✨"
                  required
                  className="w-full h-10 text-sm border-2 border-purple-200 focus:border-purple-400 rounded-lg"
                />
              </div>
              {state?.error && (
                <p className="text-red-500 text-xs bg-red-50 p-2 rounded">
                  {state.error}
                </p>
              )}
              <Button
                type="submit"
                className="w-full h-10 text-sm bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg shadow-lg"
              >
                🚀 Join Game
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Quick Actions - Compact */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/testing">
            <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 border-0 bg-blue-50/80 backdrop-blur">
              <CardContent className="p-3 text-center">
                <TestTube className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                <h3 className="font-semibold text-blue-900 text-sm">Simulator</h3>
                <p className="text-xs text-blue-700">Test with bots</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard">
            <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 border-0 bg-green-50/80 backdrop-blur">
              <CardContent className="p-3 text-center">
                <Users className="h-6 w-6 text-green-600 mx-auto mb-1" />
                <h3 className="font-semibold text-green-900 text-sm">Rooms</h3>
                <p className="text-xs text-green-700">Your games</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Info Card - Compact */}
        <Card className="border-0 bg-gradient-to-r from-yellow-50 to-orange-50 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-start gap-2">
              <div className="text-lg">🎯</div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1 text-sm">How to Play</h4>
                <ul className="text-xs text-gray-700 space-y-0.5">
                  <li>• 4 players, 2 teams</li>
                  <li>• Teams → Bets → Cards</li>
                  <li>• Real-time multiplayer!</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Navigation for Mobile */}
      <BottomNavigation />
    </div>
  )
}


