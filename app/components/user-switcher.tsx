"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, RefreshCw } from "lucide-react"

interface UserSwitcherProps {
  currentUser?: { id: string; name: string } | null
  onUserSwitch: (userId: string, userName: string) => void
}

const TEST_USERS = [
  { id: "player1", name: "Alice" },
  { id: "player2", name: "Bob" },
  { id: "player3", name: "Charlie" },
  { id: "player4", name: "Diana" }
]

export default function UserSwitcher({ currentUser, onUserSwitch }: UserSwitcherProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>(currentUser?.id || "")
  const [isSwitching, setIsSwitching] = useState(false)

  const handleUserSwitch = async (userId: string) => {
    if (isSwitching) return
    
    setIsSwitching(true)
    const user = TEST_USERS.find(u => u.id === userId)
    if (user) {
      await onUserSwitch(user.id, user.name)
      setSelectedUserId(userId)
    }
    setIsSwitching(false)
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4" />
          Testing Mode - User Switcher
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Current User:</span>
          <Badge variant="default">
            {currentUser?.name || "Not signed in"}
          </Badge>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Switch to:</label>
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a test user" />
            </SelectTrigger>
            <SelectContent>
              {TEST_USERS.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name} ({user.id})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button 
          onClick={() => handleUserSwitch(selectedUserId)}
          disabled={isSwitching || !selectedUserId || selectedUserId === currentUser?.id}
          className="w-full"
          size="sm"
        >
          {isSwitching ? (
            <>
              <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
              Switching...
            </>
          ) : (
            `Switch to ${TEST_USERS.find(u => u.id === selectedUserId)?.name || "User"}`
          )}
        </Button>

        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
          <p className="font-medium mb-1">Multi-Tab Testing:</p>
          <ol className="space-y-1">
            <li>1. Open 4 browser tabs</li>
            <li>2. Switch each tab to a different user</li>
            <li>3. Join the same room in all tabs</li>
            <li>4. Test multiplayer interactions</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  )
}
