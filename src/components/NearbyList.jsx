import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function NearbyList({ me, onSelect }) {
  const [nearby, setNearby] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!me?.location_lat || !me?.location_lon) return
    const fetchNearby = async () => {
      setLoading(true)
      const { data, error } = await supabase.rpc('nearby_users', {
        my_lat: me.location_lat,
        my_lon: me.location_lon,
        me: me.id,
        limit_rows: 30
      })
      if (error) console.error('nearby rpc error', error)
      else setNearby(data || [])
      setLoading(false)
    }
    fetchNearby()
  }, [me])

  return (
    <div className="p-4">
      <h3 className="font-semibold mb-2">Nearby Users</h3>
      {loading && <div className="text-sm text-gray-500">Loading...</div>}
      {!loading && nearby.length === 0 && <div className="text-sm text-gray-500">No nearby users</div>}
      <ul className="mt-2 space-y-2">
        {nearby.map(u => (
          <li key={u.id}>
            <button onClick={() => onSelect(u)} className="w-full text-left p-2 rounded hover:bg-gray-100">
              <div className="font-medium">{u.username || 'Unnamed'}</div>
              <div className="text-xs text-gray-500">{u.distance_km?.toFixed(1)} km</div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
