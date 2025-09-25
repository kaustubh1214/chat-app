import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Chat({ me, other }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const listRef = useRef(null);

  useEffect(() => {
    if (!me?.id || !other?.id) return;

    // ✅ Fetch old messages
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${me.id},recipient_id.eq.${other.id}),and(sender_id.eq.${other.id},recipient_id.eq.${me.id})`
        )
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching messages:", error);
      } else {
        setMessages(data || []);
      }
    };

    fetchMessages();

    // ✅ Subscribe to new messages in real-time
    const channel = supabase
      .channel("messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const m = payload.new;
          if (
            (m.sender_id === me.id && m.recipient_id === other.id) ||
            (m.sender_id === other.id && m.recipient_id === me.id)
          ) {
            setMessages((prev) => {
              if (prev.find((msg) => msg.id === m.id)) return prev; // prevent duplicates
              return [...prev, m];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [me?.id, other?.id]);

  // ✅ Auto-scroll when messages change
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  // ✅ Send message
  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const { error } = await supabase.from("messages").insert([
      {
        sender_id: me.id,
        recipient_id: other.id,
        content: newMessage.trim(),
      },
    ]);

    if (error) {
      console.error("Error sending message:", error);
    } else {
      setNewMessage("");
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-lg mx-auto bg-gray-50">
      {/* Header */}
      <div className="p-4 bg-blue-600 text-white text-lg font-semibold">
        Chat with {other.name}
      </div>

      {/* Messages */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto p-4 space-y-3"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`p-2 rounded-lg max-w-xs ${
              msg.sender_id === me.id
                ? "bg-blue-500 text-white self-end ml-auto"
                : "bg-gray-200 text-gray-900 self-start mr-auto"
            }`}
          >
            {msg.content}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-4 border-t flex items-center space-x-2">
        <input
          type="text"
          placeholder="Type a message..."
          className="flex-1 border rounded-lg px-3 py-2 focus:outline-none"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button
          onClick={sendMessage}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg"
        >
          Send
        </button>
      </div>
    </div>
  );
}
