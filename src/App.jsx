import React, { useEffect, useState } from "react"
import { supabase } from "./lib/supabaseClient"
import Auth from "./components/Auth"
import NearbyList from "./components/NearbyList"
import ChatWindow from "./components/ChatWindow"
import { Menu, X } from "lucide-react" // for hamburger + close icons
import './index.css'

export default function App() {
  const [session, setSession] = useState(null)
  const [me, setMe] = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false) // NEW: sidebar toggle

  // 1. Handle auth state
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null)
    })
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
      await supabase.from("profiles").upsert({
        id: user.id,
        username: user.user_metadata?.full_name || user.email,
      })

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle()

      setMe(profile ?? null)

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

  // 4. Main layout with responsive sidebar
  return (
    <div className="flex w-full h-full min-h-screen relative">
      {/* Mobile hamburger button */}
      <button
        className="absolute top-4 left-4 z-20 md:hidden bg-gray-800 text-white p-2 rounded"
        onClick={() => setIsSidebarOpen(true)}
      >
        <Menu size={20} />
      </button>

      {/* Sidebar */}
      <div
        className={`
          fixed inset-y-0 left-0 w-80 bg-white border-r transform z-30
          transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
          md:static md:translate-x-0 md:flex md:flex-col
        `}
      >
        {/* Close button (mobile only) */}
        <div className="flex justify-between items-center p-4 border-b md:hidden">
          <div className="font-bold">{me?.username || session.user.email}</div>
          <button onClick={() => setIsSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        {/* Profile info (desktop only) */}
        <div className="hidden md:block p-4 border-b">
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
        <div className="flex-1 min-h-0 overflow-y-auto">
          <NearbyList me={me} onSelect={(u) => {
            setSelectedUser(u)
            setIsSidebarOpen(false) // auto-close on mobile when selecting a user
          }} />
        </div>
      </div>

      {/* Chat window */}
      <div className="flex-1 min-w-0">
        <ChatWindow me={me} other={selectedUser} />
      </div>
    </div>
  )
}
