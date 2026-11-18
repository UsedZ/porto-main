"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { FiSend, FiX, FiCpu, FiUser, FiTrash2, FiRotateCcw } from "react-icons/fi"
import { useLanguage } from "@/context/LanguageContext.js"
import translations from "@/translations"

interface Message {
  role: "user" | "assistant"
  content: string
}

interface ChatSession {
  id: string
  messages: Message[]
  createdAt: number
  updatedAt: number
}

const STORAGE_KEY = "portfolio_ai_chat_history"
const CURRENT_SESSION_KEY = "portfolio_ai_current_session"
const SESSION_ID_KEY = "portfolio_ai_session_id"
const MAX_HISTORY_MESSAGES = 20 // Keep last 20 messages per session
const MAX_SESSIONS = 10 // Keep last 10 sessions

export default function AIChat() {
  const { lang } = useLanguage()
  const t = translations[lang]
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  // Server-side conversation identity: persisted separately from the local
  // chat history so it survives reloads and is sent on every request.
  const [sessionId, setSessionId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  // Ensure a stable server session id exists for this browser.
  useEffect(() => {
    try {
      let storedSessionId = localStorage.getItem(SESSION_ID_KEY)
      if (!storedSessionId) {
        storedSessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
        localStorage.setItem(SESSION_ID_KEY, storedSessionId)
      }
      setSessionId(storedSessionId)
    } catch (e) {
      console.error("Failed to initialise chat session:", e)
    }
  }, [])

  // Load sessions from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      const currentId = localStorage.getItem(CURRENT_SESSION_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as ChatSession[]
        setSessions(parsed)
        if (currentId && parsed.some(s => s.id === currentId)) {
          setCurrentSessionId(currentId)
          const session = parsed.find(s => s.id === currentId)
          if (session) setMessages(session.messages)
        } else if (parsed.length > 0) {
          // Load latest session
          const latest = parsed[0]
          setCurrentSessionId(latest.id)
          setMessages(latest.messages)
          localStorage.setItem(CURRENT_SESSION_KEY, latest.id)
        }
      }
    } catch (e) {
      console.error("Failed to load chat history:", e)
    }
  }, [])

  // Save messages to current session
  const saveSession = useCallback((msgs: Message[]) => {
    if (!currentSessionId) return
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      const parsed = stored ? JSON.parse(stored) as ChatSession[] : []
      const updated = parsed.map(s =>
        s.id === currentSessionId
          ? { ...s, messages: msgs, updatedAt: Date.now() }
          : s
      )
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      setSessions(updated)
    } catch (e) {
      console.error("Failed to save session:", e)
    }
  }, [currentSessionId])

  // Create new session
  const createNewSession = useCallback(() => {
    const newSession: ChatSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    const updated = [newSession, ...sessions].slice(0, MAX_SESSIONS)
    setSessions(updated)
    setCurrentSessionId(newSession.id)
    setMessages([])
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    localStorage.setItem(CURRENT_SESSION_KEY, newSession.id)
  }, [sessions])

  // Switch to a session
  const switchSession = useCallback((sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId)
    if (session) {
      setCurrentSessionId(sessionId)
      setMessages(session.messages)
      localStorage.setItem(CURRENT_SESSION_KEY, sessionId)
      setShowHistory(false)
    }
  }, [sessions])

  // Delete a session
  const deleteSession = useCallback((sessionId: string) => {
    const updated = sessions.filter(s => s.id !== sessionId)
    setSessions(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    if (currentSessionId === sessionId) {
      if (updated.length > 0) {
        switchSession(updated[0].id)
      } else {
        createNewSession()
      }
    }
  }, [sessions, currentSessionId, createNewSession])

  // Clear current session messages
  const clearCurrentSession = useCallback(() => {
    if (!currentSessionId) return
    setMessages([])
    saveSession([])
  }, [currentSessionId, saveSession])

  // Save messages whenever they change
  useEffect(() => {
    if (currentSessionId && messages.length > 0) {
      saveSession(messages)
    }
  }, [messages, currentSessionId, saveSession])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    const newUserMessage: Message = { role: "user", content: userMessage }
    const newMessages = [...messages, newUserMessage]

    setMessages(newMessages)
    setInput("")
    setIsLoading(true)

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (sessionId) headers["x-session-id"] = sessionId

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({ messages: newMessages }),
      })

      const data = await res.json().catch(() => ({}))

      // The server echoes the session id it used; persist it if it generated one.
      if (data.session_id && data.session_id !== sessionId) {
        setSessionId(data.session_id)
        try {
          localStorage.setItem(SESSION_ID_KEY, data.session_id)
        } catch (e) {
          console.error("Failed to persist chat session id:", e)
        }
      }

      if (res.ok && data.choices?.[0]?.message?.content) {
        const assistantMessage: Message = {
          role: "assistant",
          content: data.choices[0].message.content,
        }
        setMessages(prev => [...prev, assistantMessage])
      } else {
        setMessages(prev => [
          ...prev,
          {
            role: "assistant",
            content: data.error
              ? lang === "en"
                ? `Error: ${data.error}`
                : `Galat: ${data.error}`
              : lang === "en"
                ? "Sorry, I'm having trouble connecting. Please try again later."
                : "Maaf, terjadi masalah koneksi. Silakan coba lagi nanti.",
          },
        ])
      }
    } catch (error) {
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: lang === "en"
            ? "Sorry, I'm having trouble connecting. Please try again later."
            : "Maaf, terjadi masalah koneksi. Silakan coba lagi nanti.",
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return "Just now"
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString(lang === "en" ? "en-US" : "id-ID", {
      month: "short",
      day: "numeric",
    })
  }

  const getSessionPreview = (session: ChatSession) => {
    const lastUserMsg = [...session.messages].reverse().find(m => m.role === "user")
    return lastUserMsg ? lastUserMsg.content.slice(0, 40) + "..." : "New chat"
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 grid h-14 w-14 place-items-center rounded-full border border-border bg-surface text-text shadow-lg transition-all hover:scale-105 hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        aria-label={lang === "en" ? "Open AI Assistant" : "Buka Asisten AI"}
      >
        <FiCpu size={24} className="text-accent" />
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-full max-w-sm md:max-w-md">
      <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-surface/50 px-4 py-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <FiCpu size={20} className="text-accent flex-shrink-0" />
            <span className="font-semibold text-text truncate">{lang === "en" ? "AI Assistant" : "Asisten AI"}</span>
            <span className="text-[0.65rem] px-1.5 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 flex-shrink-0">
              Nemotron 3 Ultra
            </span>
          </div>
          <div className="flex items-center gap-1">
            {/* History toggle */}
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`grid h-8 w-8 place-items-center rounded-lg text-text-muted transition-colors ${showHistory ? "bg-accent/10 text-accent" : "hover:bg-border hover:text-text"} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`}
              aria-label={lang === "en" ? "Chat History" : "Riwayat Chat"}
            >
              <FiRotateCcw size={18} />
            </button>
            {/* New chat */}
            <button
              onClick={createNewSession}
              className="grid h-8 w-8 place-items-center rounded-lg text-text-muted transition-colors hover:bg-border hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              aria-label={lang === "en" ? "New Chat" : "Chat Baru"}
            >
              <FiRotateCcw size={18} />
            </button>
            {/* Close */}
            <button
              onClick={() => setIsOpen(false)}
              className="grid h-8 w-8 place-items-center rounded-lg text-text-muted transition-colors hover:bg-border hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              aria-label={lang === "en" ? "Close" : "Tutup"}
            >
              <FiX size={18} />
            </button>
          </div>
        </div>

        {/* History Sidebar */}
        {showHistory && (
          <div className="border-b border-border bg-surface/50 p-3 max-h-60 overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-sm text-text">{lang === "en" ? "Chat History" : "Riwayat Chat"}</span>
              {sessions.length > 1 && (
                <button
                  onClick={clearCurrentSession}
                  className="text-[0.65rem] text-text-muted hover:text-text transition-colors"
                >
                  {lang === "en" ? "Clear this chat" : "Bersihkan chat ini"}
                </button>
              )}
            </div>
            <div className="space-y-1 max-h-[300px] overflow-y-auto">
              {sessions.length === 0 ? (
                <p className="text-xs text-text-muted text-center py-4">
                  {lang === "en" ? "No chat history yet" : "Belum ada riwayat chat"}
                </p>
              ) : (
                sessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => switchSession(session.id)}
                    className={`w-full text-left p-2 rounded-lg transition-colors text-sm ${
                      currentSessionId === session.id
                        ? "bg-accent/10 text-accent"
                        : "text-text-muted hover:bg-border hover:text-text"
                    }`}
                  >
                    <div className="truncate font-medium">{getSessionPreview(session)}</div>
                    <div className="text-[0.6rem] opacity-60 truncate">{formatTime(session.updatedAt)}</div>
                    {sessions.length > 1 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteSession(session.id) }}
                        className="float-right mt-1 text-[0.65rem] opacity-40 hover:opacity-100 text-text-muted"
                        aria-label={lang === "en" ? "Delete" : "Hapus"}
                      >
                        <FiTrash2 size={12} />
                      </button>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Messages */}
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[500px]"
        >
          {messages.length === 0 && !showHistory && (
            <div className="flex flex-col items-center justify-center h-full text-center text-text-muted py-8">
              <FiCpu size={48} className="text-accent/50 mb-3" />
              <p className="text-sm">
                {lang === "en"
                  ? "Hi! Ask me about Syahrul's skills, projects, or experience."
                  : "Halo! Tanyakan soal skill, proyek, atau pengalaman Syahrul."}
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <div
                className={`flex-shrink-0 grid h-8 w-8 place-items-center rounded-full ${
                  msg.role === "user"
                    ? "bg-accent text-bg"
                    : "bg-surface border border-border text-accent"
                }`}
              >
                {msg.role === "user" ? <FiUser size={16} /> : <FiCpu size={16} />}
              </div>
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                  msg.role === "user"
                    ? "bg-accent text-bg rounded-tr-none"
                    : "bg-surface border border-border text-text rounded-tl-none"
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3">
              <div className="flex-shrink-0 grid h-8 w-8 place-items-center rounded-full bg-surface border border-border text-accent">
                <FiCpu size={16} />
              </div>
              <div className="max-w-[75%] rounded-2xl bg-surface border border-border px-4 py-2.5 rounded-tl-none">
                <div className="flex gap-1">
                  <span className="h-2 w-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-border bg-surface/50 p-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={lang === "en" ? "Ask me anything..." : "Tanyakan apa saja..."}
              disabled={isLoading}
              className="flex-1 rounded-lg border border-border bg-bg px-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent disabled:opacity-50"
              autoFocus
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-bg transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              aria-label={lang === "en" ? "Send" : "Kirim"}
            >
              <FiSend size={18} />
            </button>
          </div>
          <p className="mt-2 text-[0.65rem] text-center text-text-muted">
            {lang === "en"
              ? "Powered by Nemotron 3 Ultra 550B via freellmapi"
              : "Didukung oleh Nemotron 3 Ultra 550B via freellmapi"}
          </p>
        </div>
      </div>
    </div>
  )
}