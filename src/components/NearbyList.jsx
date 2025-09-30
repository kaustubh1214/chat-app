import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function NearbyList({ me, onSelect }) {
  const [nearby, setNearby] = useState([])
  const [loading, setLoading] = useState(false)
  const [distance, setDistance] = useState(5) // default distance in km

  useEffect(() => {
    if (!me?.location_lat || !me?.location_lon) return

    const fetchNearby = async () => {
      setLoading(true)
      const { data, error } = await supabase.rpc('nearby_users', {
        my_lat: me.location_lat,
        my_lon: me.location_lon,
        me: me.id,
        limit_rows: 100,
      })

      if (error) console.error('nearby rpc error', error)
      else {
        const filtered = (data || []).filter(u => u.distance_km <= distance)
        setNearby(filtered)
      }
      setLoading(false)
    }

    fetchNearby()
  }, [me, distance])

  // Generate random colors for user avatars
  const getRandomColor = (username) => {
    const colors = [
      'bg-gradient-to-r from-blue-500 to-blue-600',
      'bg-gradient-to-r from-green-500 to-green-600',
      'bg-gradient-to-r from-purple-500 to-purple-600',
      'bg-gradient-to-r from-pink-500 to-pink-600',
      'bg-gradient-to-r from-orange-500 to-orange-600',
      'bg-gradient-to-r from-teal-500 to-teal-600',
    ]
    const index = username?.length % colors.length || 0
    return colors[index]
  }

  // Get initials for avatar
  const getInitials = (username) => {
    if (!username) return '?'
    return username
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-800">Nearby Users</h3>
          <p className="text-sm text-gray-500 mt-1">
            Discover people around you
          </p>
        </div>
        <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
      </div>

      {/* Distance Slider */}
      <div className="mb-6 bg-gray-50 rounded-xl p-4 border border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-semibold text-gray-700">
            Search Radius
          </label>
          <span className="text-lg font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
            {distance} km
          </span>
        </div>
        <input
          type="range"
          min="1"
          max="50"
          value={distance}
          onChange={(e) => setDistance(Number(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>1km</span>
          <span>25km</span>
          <span>50km</span>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-3"></div>
          <p className="text-gray-600">Finding nearby users...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && nearby.length === 0 && (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </div>
          <p className="text-gray-600 font-medium">No users found nearby</p>
          <p className="text-sm text-gray-500 mt-1">
            Try increasing the search radius
          </p>
        </div>
      )}

      {/* Users List */}
      {!loading && nearby.length > 0 && (
        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
          {nearby.map((u, index) => (
            <button
              key={u.id}
              onClick={() => onSelect(u)}
              className="w-full text-left p-4 rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200 transform hover:scale-[1.02] group"
            >
              <div className="flex items-center space-x-4">
                {/* User Avatar */}
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-sm ${getRandomColor(u.username)} shadow-md group-hover:shadow-lg transition-shadow`}>
                  {getInitials(u.username)}
                </div>
                
                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-gray-800 truncate group-hover:text-indigo-700 transition-colors">
                      {u.username || 'Anonymous User'}
                    </h4>
                    <div className="flex items-center space-x-1 bg-white px-2 py-1 rounded-full border border-gray-200 group-hover:border-indigo-200">
                      <svg className="w-3 h-3 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      <span className="text-xs font-bold text-gray-700">
                        {u.distance_km?.toFixed(1)} km
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-1 truncate">
                    Nearby • {index + 1} of {nearby.length}
                  </p>
                </div>

                {/* Chevron Icon */}
                <svg className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Footer Stats */}
      {!loading && nearby.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>Found {nearby.length} user{nearby.length !== 1 ? 's' : ''}</span>
            <span>Within {distance} km radius</span>
          </div>
        </div>
      )}
    </div>
  )
}