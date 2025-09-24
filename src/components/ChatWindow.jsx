import React, { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function ChatWindow({ me, other }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const listRef = useRef()

  useEffect(() => {
    if (!me || !other) { setMessages([]); return }

    let mounted = true
    const loadMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${me.id},recipient_id.eq.${other.id}),and(sender_id.eq.${other.id},recipient_id.eq.${me.id})`)
        .order('created_at', { ascending: true })
      if (error) console.error(error)
      if (mounted) setMessages(data || [])
    }
    loadMessages()

    // ✅ Supabase real-time subscription
    const channel = supabase
      .channel(`messages:dm:${[me.id, other.id].sort().join(':')}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages"
        },
        (payload) => {
          const m = payload.new
          if (
            (m.sender_id === me.id && m.recipient_id === other.id) ||
            (m.sender_id === other.id && m.recipient_id === me.id)
          ) {
            setMessages(prev => [...prev, m])
          }
        }
      )
      .subscribe()

    return () => {
      mounted = false
      if (channel) supabase.removeChannel(channel)
    }
  }, [me, other])

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim()) return

    // Only insert message; do NOT add it manually
    await supabase.from('messages').insert({
      sender_id: me.id,
      recipient_id: other.id,
      content: input.trim()
    })

    setInput('') // clear input
  }

  if (!other) return <div className="h-full flex items-center justify-center text-gray-500">Select a user to start chatting</div>

  return (
    <div className="h-screen flex flex-col">
      <div className="p-4 border-b">
        <div className="font-semibold">Chat with {other.username || 'Unnamed'}</div>
      </div>

      <div className="flex-1 overflow-auto p-4" ref={listRef}>
        {messages.map(m => (
          <div key={m.id} className={`mb-3 flex ${m.sender_id === me.id ? 'justify-end' : 'justify-start'}`}>
            <div className={`p-2 rounded-lg max-w-[70%] ${m.sender_id === me.id ? 'bg-blue-600 text-white' : 'bg-gray-200 text-black'}`}>
              <div className="text-sm">{m.content}</div>
              <div className="text-xs text-gray-600 mt-1">{new Date(m.created_at).toLocaleString()}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t flex gap-2">
        <input
          className="flex-1 border rounded px-3 py-2"
          placeholder="Type a message"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
        />
        <button onClick={sendMessage} className="bg-blue-600 text-white px-4 py-2 rounded">Send</button>
      </div>
    </div>
  )
}
