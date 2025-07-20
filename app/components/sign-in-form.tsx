"use client"

import { useActionState } from "react"
import { signIn } from "../actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function SignInForm() {
  const [state, action, isPending] = useActionState(signIn, null)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <div>
            <Input
              name="name"
              type="text"
              placeholder="Enter your name"
              required
              className="w-full"
              disabled={isPending}
            />
          </div>
          {state?.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600 text-sm">{state.error}</p>
            </div>
          )}
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
