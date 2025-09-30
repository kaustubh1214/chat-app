import React, { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function ChatWindow({ me, other }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const listRef = useRef();

  // Request notification permission on component mount
  useEffect(() => {
    if ("Notification" in window) {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!me || !other) {
      setMessages([]);
      return;
    }

    let mounted = true;

    const loadMessages = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${me.id},recipient_id.eq.${other.id}),and(sender_id.eq.${other.id},recipient_id.eq.${me.id})`
        )
        .order("created_at", { ascending: true });

      if (error) console.error(error);
      if (mounted) setMessages(data || []);
    };

    loadMessages();

    const channel = supabase
      .channel(`messages:dm:${[me.id, other.id].sort().join(":")}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const m = payload.new;
          if (
            (m.sender_id === me.id && m.recipient_id === other.id) ||
            (m.sender_id === other.id && m.recipient_id === me.id)
          ) {
            setMessages((prev) => {
              if (prev.find((msg) => msg.id === m.id)) return prev;

              // Show notification only if message is from the other user
              if (m.sender_id === other.id && "Notification" in window && Notification.permission === "granted") {
                new Notification(`New message from ${other.username || "User"}`, {
                  body: m.content,
                  icon: "/favicon.ico" // optional, add your icon path
                });
              }

              return [...prev, m];
            });
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [me, other]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const content = input.trim();
    setInput("");

    const tempId = `temp-${Date.now()}`;
    const newMessage = {
      id: tempId,
      sender_id: me.id,
      recipient_id: other.id,
      content,
      created_at: new Date().toISOString(),
      optimistic: true,
    };
    setMessages((prev) => [...prev, newMessage]);

    const { data, error } = await supabase
      .from("messages")
      .insert({
        sender_id: me.id,
        recipient_id: other.id,
        content,
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInput(content);
    } else if (data) {
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? data : m))
      );
    }
  };

  if (!other) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 text-gray-600">
        <div className="text-center p-8 max-w-md">
          <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">Welcome to Chat</h3>
          <p className="text-gray-600">Select a user from the sidebar to start a conversation</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-lg border-b border-gray-200/60 shadow-sm py-4 px-6">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
            <span className="text-white font-semibold text-lg">
              {(other.username || "Unnamed").charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              {other.username || "Unnamed User"}
            </h2>
            <p className="text-green-600 text-sm flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
              Online
            </p>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div 
        className="flex-1 overflow-auto p-6 space-y-4 bg-gradient-to-b from-white/40 to-blue-50/30"
        ref={listRef}
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-4">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-lg font-medium text-gray-600">No messages yet</p>
            <p className="text-sm text-gray-500 text-center max-w-xs">
              Start a conversation by sending the first message to {other.username || "Unnamed"}
            </p>
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.sender_id === me.id ? "justify-end" : "justify-start"}`}
            >
              <div className="flex max-w-[85%] space-x-2">
                {m.sender_id !== me.id && (
                  <div className="w-8 h-8 bg-gradient-to-r from-gray-400 to-gray-500 rounded-full flex-shrink-0 mt-1 shadow"></div>
                )}
                <div
                  className={`relative p-4 rounded-2xl shadow-sm transition-all duration-200 hover:shadow-md ${
                    m.sender_id === me.id
                      ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-md"
                      : "bg-white text-gray-800 rounded-bl-md border border-gray-100"
                  } ${m.optimistic ? "opacity-80" : ""}`}
                >
                  <div className={`text-sm leading-relaxed ${m.sender_id === me.id ? "text-white" : "text-gray-800"}`}>
                    {m.content}
                  </div>
                  <div
                    className={`text-xs mt-2 flex items-center space-x-1 ${
                      m.sender_id === me.id ? "text-blue-100" : "text-gray-500"
                    }`}
                  >
                    <span>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {m.optimistic && (
                      <>
                        <span>•</span>
                        <span className="flex items-center">
                          <svg className="w-3 h-3 animate-spin mr-1" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          sending
                        </span>
                      </>
                    )}
                  </div>
                  
                  {/* Message triangle */}
                  <div
                    className={`absolute w-3 h-3 rotate-45 ${
                      m.sender_id === me.id
                        ? "bg-blue-500 -right-1 top-3"
                        : "bg-white border-l border-b border-gray-100 -left-1 top-3"
                    }`}
                  ></div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input Area */}
      <div className="bg-white/80 backdrop-blur-lg border-t border-gray-200/60 p-4 shadow-lg">
        <div className="flex space-x-3 max-w-4xl mx-auto">
          <div className="flex-1 relative">
            <input
              className="w-full bg-white border border-gray-300 rounded-2xl px-4 py-3 pr-12 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-200"
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex space-x-2">
              <button className="text-gray-400 hover:text-gray-600 transition-colors duration-200">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>
              <button className="text-gray-400 hover:text-gray-600 transition-colors duration-200">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            </div>
          </div>
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-6 py-3 rounded-2xl font-medium shadow-lg hover:shadow-xl transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2"
          >
            <span>Send</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
