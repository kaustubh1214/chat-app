import React, { useEffect, useState } from "react"
import { supabase } from "./lib/supabaseClient"
import Auth from "./components/Auth"
import NearbyList from "./components/NearbyList"
import ChatWindow from "./components/ChatWindow"
import './index.css'

export default function App() {
  const [session, setSession] = useState(null)
  const [me, setMe] = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)

  // 1. Handle auth state
  useEffect(() => {
    // get initial session
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null)
    })

    // listen to auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => setSession(session)
    )

    return () => listener?.subscription?.unsubscribe?.()
  }, [])

  // 2. When logged in, ensure profile + update location
  useEffect(() => {
    if (!session?.user) {
      setMe(null)
      return
    }

    const user = session.user
    let profileChannel

    const setupProfile = async () => {
      // upsert profile with username
      await supabase.from("profiles").upsert({
        id: user.id,
        username: user.user_metadata?.full_name || user.email,
      })

      // fetch profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle()

      setMe(profile ?? null)

      // try geolocation
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const lat = pos.coords.latitude
            const lon = pos.coords.longitude

            await supabase.from("profiles").upsert({
              id: user.id,
              username: profile?.username || user.user_metadata?.full_name || user.email,
              location_lat: lat,
              location_lon: lon,
            })

            const { data: updated } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", user.id)
              .single()

            setMe(updated)
          },
          (err) => console.warn("Geolocation denied/failed:", err),
          { enableHighAccuracy: false }
        )
      }

      // subscribe to changes in my profile
      profileChannel = supabase
        .channel(`profiles:id=eq.${user.id}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
          (payload) => setMe(payload.new)
        )
        .subscribe()
    }

    setupProfile()

    return () => {
      if (profileChannel) supabase.removeChannel(profileChannel)
    }
  }, [session])

  // 3. If not logged in → show auth page
  if (!session?.user) return <Auth />

  // 4. Main layout - Updated for full window
  return (
    <div className="flex w-full h-full min-h-screen">
      {/* Sidebar with profile + nearby users */}
      <div className="w-80 border-r bg-white flex flex-col min-h-0">
        <div className="p-4 border-b">
          <div className="font-bold">{me?.username || session.user.email}</div>
          <div className="text-sm text-gray-600">{session.user.email}</div>
          <div className="mt-2">
            <button
              className="bg-red-500 text-white px-3 py-1 rounded"
              onClick={async () => {
                await supabase.auth.signOut()
                setSelectedUser(null)
                setMe(null)
              }}
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Nearby users */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <NearbyList me={me} onSelect={(u) => setSelectedUser(u)} />
        </div>
      </div>

      {/* Chat window */}
      <div className="flex-1 min-w-0">
        <ChatWindow me={me} other={selectedUser} />
      </div>
    </div>
  )
}