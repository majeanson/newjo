"use client"

import { useActionState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "./actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function HomePage() {
  const [state, formAction] = useActionState(signIn, null)
  const router = useRouter()

  useEffect(() => {
    if (state && 'success' in state && state.success && 'redirectTo' in state && state.redirectTo) {
      router.push(state.redirectTo as string)
    }
  }, [state, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Join Card Game</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div>
              <Input
                name="name"
                placeholder="Enter your name"
                required
                className="w-full"
              />
            </div>
            {state?.error && (
              <p className="text-red-500 text-sm">{state.error}</p>
            )}
            <Button type="submit" className="w-full">
              Join Game
            </Button>
          </form>
          
          <div className="mt-4 p-3 bg-blue-50 rounded text-sm text-blue-700">
            <strong>Multiplayer Testing:</strong> Open multiple incognito windows and sign in with different names to test multiplayer features.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


