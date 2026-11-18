"use client"

import { useState, useEffect, useCallback } from "react"
import {
  FiUsers,
  FiMessageSquare,
  FiDollarSign,
  FiActivity,
  FiSearch,
  FiDownload,
  FiRefreshCw,
  FiX,
  FiEye,
  FiTrash2,
  FiCpu,
  FiUser,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi"
import { useLanguage } from "@/context/LanguageContext.js"
import translations from "@/translations"

interface Session {
  id: string
  ip: string
  user_agent: string
  referer: string
  language: string
  created_at: number
  updated_at: number
  message_count: number
}

interface Message {
  id: number
  session_id: string
  role: "user" | "assistant"
  content: string
  tokens_input: number
  tokens_output: number
  model: string | null
  provider: string | null
  cost_usd: number
  latency_ms: number | null
  status: number | null
  created_at: number
}

interface Stats {
  total_sessions: number
  total_messages: number
  unique_visitors: number
  total_tokens: number
  tokens_input: number
  tokens_output: number
  total_cost: number
  sessions_last_24h: number
  messages_last_24h: number
  avg_latency_ms: number
  measured_assistant_messages: number
  successful_assistant_messages: number
}

interface RecentSession {
  id: string
  ip: string
  language: string
  created_at: number
  updated_at: number
  message_count: number
  last_message: string | null
}

type AuthStatus = "unknown" | "authorized" | "unauthorized" | "unconfigured"

const ITEMS_PER_PAGE = 20
const MAX_ROWS = 200

const FALLBACK_T = {
  title: "AI Assistant Monitor",
  subtitle: "Monitor conversations, usage, and performance",
  stats: {
    totalSessions: "Total Sessions",
    totalMessages: "Total Messages",
    uniqueVisitors: "Unique Visitors",
    totalTokens: "Total Tokens",
    totalCost: "Total Cost (USD)",
    sessions24h: "Sessions (24h)",
    messages24h: "Messages (24h)",
    inputTokens: "Input",
    outputTokens: "Output",
    total: "Total",
    costPerSession: "Cost/Session (avg)",
    costPerMessage: "Cost/Message (avg)",
    avgMessagesPerSession: "Avg Messages/Session",
    tokenUsage: "Token Usage",
    costBreakdown: "Cost Breakdown",
    engagement: "Engagement",
    performance: "Performance",
    avgResponseTime: "Avg Response Time",
    successRate: "Success Rate",
    languageDistribution: "Language Distribution",
    notEnoughData: "Not enough data",
  },
  auth: {
    unauthorizedTitle: "Unauthorized (401)",
    unauthorizedBody:
      "Open /api/admin/ai-stats in a new tab and sign in with the admin credentials, then retry. Browsers cache Basic Auth credentials per origin.",
    unconfiguredTitle: "Admin auth not configured (503)",
    unconfiguredBody:
      "Set ADMIN_USER and ADMIN_PASS in .env.local and restart the server. No default credentials exist.",
    retry: "Retry",
    authorized: "Authorized",
  },
  export: { label: "Export CSV", messages: "Messages", sessions: "Sessions" },
}

function formatNumber(value: unknown): string {
  const numeric = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(numeric)) return "0"
  return numeric.toLocaleString()
}

function formatTime(timestamp: number, lang: string): string {
  const date = new Date(timestamp)
  const diff = Date.now() - date.getTime()
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
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatFullTime(timestamp: number, lang: string): string {
  return new Date(timestamp).toLocaleString(lang === "en" ? "en-US" : "id-ID")
}

function getLanguageLabel(language: string): string {
  return language === "en" ? "English" : language === "id" ? "Indonesian" : language
}

export default function AIMonitorDashboard() {
  const { lang } = useLanguage()
  const t = (translations as any)[lang]?.admin?.ai_monitor || FALLBACK_T

  const [activeTab, setActiveTab] = useState<"overview" | "sessions" | "messages" | "analytics">("overview")
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [sessionMessages, setSessionMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [authStatus, setAuthStatus] = useState<AuthStatus>("unknown")

  const [searchQuery, setSearchQuery] = useState("")
  const [languageFilter, setLanguageFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const [messageSearchQuery, setMessageSearchQuery] = useState("")
  const [messagePage, setMessagePage] = useState(1)
  const [messageTotalPages, setMessageTotalPages] = useState(1)

  const [exportType, setExportType] = useState<"messages" | "sessions">("messages")
  const [exporting, setExporting] = useState(false)
  const [viewingSession, setViewingSession] = useState(false)

  const markAuth = (status: number): boolean => {
    if (status === 401) {
      setAuthStatus("unauthorized")
      return true
    }
    if (status === 503) {
      setAuthStatus("unconfigured")
      return true
    }
    return false
  }

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/ai-stats")
      if (markAuth(res.status)) return
      if (res.ok) {
        const data = await res.json()
        setStats(data.stats)
        setRecentSessions(data.recent_sessions || [])
        setAuthStatus("authorized")
      } else {
        setError("Failed to load stats")
      }
    } catch (e) {
      console.error("Failed to fetch stats:", e)
      setError("Failed to load stats")
    }
  }, [])

  const fetchSessions = useCallback(async (page: number, search: string, language: string) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        limit: ITEMS_PER_PAGE.toString(),
        offset: ((page - 1) * ITEMS_PER_PAGE).toString(),
      })
      if (language !== "all") params.append("language", language)
      if (search.trim()) params.append("search", search.trim())

      const res = await fetch(`/api/admin/ai-logs?${params.toString()}`)
      if (markAuth(res.status)) return
      if (res.ok) {
        const data = await res.json()
        setSessions(data.sessions || [])
        setTotalPages(Math.max(1, Math.ceil((data.total || 0) / ITEMS_PER_PAGE)))
        setAuthStatus("authorized")
      } else {
        setError("Failed to load sessions")
      }
    } catch (e) {
      console.error("Failed to fetch sessions:", e)
      setError("Failed to load sessions")
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchMessages = useCallback(async (page: number, search: string) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        limit: ITEMS_PER_PAGE.toString(),
        offset: ((page - 1) * ITEMS_PER_PAGE).toString(),
      })
      if (search.trim()) params.append("search", search.trim())

      const res = await fetch(`/api/admin/ai-messages?${params.toString()}`)
      if (markAuth(res.status)) return
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages || [])
        setMessageTotalPages(Math.max(1, Math.ceil((data.total || 0) / ITEMS_PER_PAGE)))
        setAuthStatus("authorized")
      } else {
        setError("Failed to load messages")
      }
    } catch (e) {
      console.error("Failed to fetch messages:", e)
      setError("Failed to load messages")
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchSessionMessages = useCallback(async (sessionId: string) => {
    try {
      const res = await fetch(`/api/admin/ai-logs?session_id=${encodeURIComponent(sessionId)}&limit=${MAX_ROWS}`)
      if (markAuth(res.status)) return
      if (res.ok) {
        const data = await res.json()
        setSessionMessages(data.messages || [])
      }
    } catch (e) {
      console.error("Failed to fetch session messages:", e)
    }
  }, [])

  // Single initial load: no duplicate fetches, no refetch on every keystroke.
  useEffect(() => {
    fetchStats()
    fetchSessions(1, "", "all")
    fetchMessages(1, "")
  }, [fetchStats, fetchSessions, fetchMessages])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    fetchSessions(1, searchQuery, languageFilter)
  }

  const handleLanguageChange = (language: string) => {
    setLanguageFilter(language)
    setCurrentPage(1)
    fetchSessions(1, searchQuery, language)
  }

  const handleSessionsPageChange = (page: number) => {
    setCurrentPage(page)
    fetchSessions(page, searchQuery, languageFilter)
  }

  const handleMessageSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setMessagePage(1)
    fetchMessages(1, messageSearchQuery)
  }

  const handleMessagePageChange = (page: number) => {
    setMessagePage(page)
    fetchMessages(page, messageSearchQuery)
  }

  const handleViewSession = (session: Session) => {
    setSelectedSession(session)
    setViewingSession(true)
    fetchSessionMessages(session.id)
  }

  const handleExport = async () => {
    const params = new URLSearchParams({ type: exportType })
    if (exportType === "sessions") {
      if (searchQuery.trim()) params.set("search", searchQuery.trim())
      if (languageFilter !== "all") params.set("language", languageFilter)
    } else if (messageSearchQuery.trim()) {
      params.set("search", messageSearchQuery.trim())
    }

    const fallbackName = `ai-${exportType}-${new Date().toISOString().slice(0, 10)}.csv`
    setExporting(true)
    setError(null)
    try {
      // fetch (not navigation) so a failed export keeps the dashboard in place;
      // the browser still replays cached Basic Auth credentials for this origin.
      const res = await fetch(`/api/admin/ai-export?${params.toString()}`, {
        credentials: "same-origin",
      })
      if (markAuth(res.status)) return
      if (!res.ok) {
        setError(`Export failed (${res.status})`)
        return
      }

      const disposition = res.headers.get("content-disposition") || ""
      const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition)
      const filename = match?.[1]?.trim() || fallbackName
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (e) {
      console.error("Export failed:", e)
      setError("Export failed")
    } finally {
      setExporting(false)
    }
  }

  const handleRetry = () => {
    setAuthStatus("unknown")
    fetchStats()
    fetchSessions(currentPage, searchQuery, languageFilter)
    fetchMessages(messagePage, messageSearchQuery)
  }

  const renderAuthBanner = () => {
    if (authStatus === "authorized" || authStatus === "unknown") return null
    const isUnconfigured = authStatus === "unconfigured"
    return (
      <div
        className={`mb-6 p-4 rounded-lg border text-sm ${
          isUnconfigured
            ? "border-amber-500/30 bg-amber-500/10 text-amber-500"
            : "border-red-500/30 bg-red-500/10 text-red-400"
        }`}
        role="alert"
      >
        <p className="font-semibold">
          {isUnconfigured ? t.auth.unconfiguredTitle : t.auth.unauthorizedTitle}
        </p>
        <p className="mt-1">{isUnconfigured ? t.auth.unconfiguredBody : t.auth.unauthorizedBody}</p>
        <button onClick={handleRetry} className="mt-2 inline-flex min-h-11 items-center text-sm underline">
          {t.auth.retry}
        </button>
      </div>
    )
  }

  const renderPagination = (
    page: number,
    pages: number,
    onChange: (next: number) => void
  ) => {
    if (pages <= 1) return null
    return (
      <div className="flex items-center justify-center gap-2 mt-4 p-4">
        <button
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="px-3 py-1.5 rounded-lg border border-border bg-surface text-sm text-text-muted hover:bg-border disabled:opacity-50"
          aria-label="Previous page"
        >
          <FiChevronLeft size={16} />
        </button>
        <span className="px-3 text-sm text-text-muted">
          Page {page} of {pages}
        </span>
        <button
          onClick={() => onChange(Math.min(pages, page + 1))}
          disabled={page === pages}
          className="px-3 py-1.5 rounded-lg border border-border bg-surface text-sm text-text-muted hover:bg-border disabled:opacity-50"
          aria-label="Next page"
        >
          <FiChevronRight size={16} />
        </button>
      </div>
    )
  }

  const renderOverview = () => {
    if (!stats) return null
    const cards = [
      { key: "total_sessions", label: t.stats.totalSessions, icon: FiUsers, color: "text-blue-400" },
      { key: "total_messages", label: t.stats.totalMessages, icon: FiMessageSquare, color: "text-green-400" },
      { key: "unique_visitors", label: t.stats.uniqueVisitors, icon: FiUsers, color: "text-purple-400" },
      { key: "total_tokens", label: t.stats.totalTokens, icon: FiCpu, color: "text-orange-400" },
      { key: "total_cost", label: t.stats.totalCost, icon: FiDollarSign, color: "text-yellow-400" },
      { key: "sessions_last_24h", label: t.stats.sessions24h, icon: FiActivity, color: "text-cyan-400" },
      { key: "messages_last_24h", label: t.stats.messages24h, icon: FiMessageSquare, color: "text-pink-400" },
    ]
    return (
      <div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          {cards.map((card) => (
            <div key={card.key} className="card p-5 border border-border bg-surface rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-muted">{card.label}</p>
                  <p className="mt-1 text-2xl font-bold text-text">
                    {formatNumber((stats as any)[card.key])}
                  </p>
                </div>
                <div className={`p-3 rounded-xl ${card.color}`}>
                  <card.icon size={24} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="card border border-border bg-surface rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-text">{lang === "en" ? "Recent Sessions" : "Session Terbaru"}</h2>
            <button onClick={() => setActiveTab("sessions")} className="text-sm text-accent hover:underline">
              {lang === "en" ? "View All" : "Lihat Semua"}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-text-muted border-b border-border">
                  <th className="p-3">Session ID</th>
                  <th className="p-3">IP</th>
                  <th className="p-3">Lang</th>
                  <th className="p-3">Messages</th>
                  <th className="p-3">Created</th>
                  <th className="p-3">Updated</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentSessions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-text-muted">
                      {lang === "en" ? "No sessions yet" : "Belum ada session"}
                    </td>
                  </tr>
                ) : (
                  recentSessions.slice(0, 10).map((session) => (
                    <tr key={session.id} className="border-b border-border/50 hover:bg-surface/50">
                      <td className="p-3 font-mono text-xs text-text">{session.id.slice(0, 20)}...</td>
                      <td className="p-3 text-sm text-text">{session.ip}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-xs bg-accent/10 text-accent">
                          {getLanguageLabel(session.language)}
                        </span>
                      </td>
                      <td className="p-3 text-sm text-text">{session.message_count}</td>
                      <td className="p-3 text-sm text-text-muted">{formatTime(session.created_at, lang)}</td>
                      <td className="p-3 text-sm text-text-muted">{formatTime(session.updated_at, lang)}</td>
                      <td className="p-3">
                        <button onClick={() => handleViewSession(session as any)} className="text-sm text-accent hover:underline">
                          {lang === "en" ? "View" : "Lihat"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  const renderSessions = () => (
    <div className="card border border-border bg-surface rounded-xl overflow-hidden">
      <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <h2 className="font-semibold text-text">Sessions</h2>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={lang === "en" ? "Search sessions..." : "Cari session..."}
              className="rounded-lg border border-border bg-bg px-4 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent w-64"
            />
            <button type="submit" className="px-3 py-2 rounded-lg bg-accent text-bg text-sm font-medium hover:opacity-90">
              <FiSearch size={16} className="inline mr-1" />
              {lang === "en" ? "Search" : "Cari"}
            </button>
          </form>
          <select
            value={languageFilter}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
          >
            <option value="all">All Languages</option>
            <option value="id">Indonesian</option>
            <option value="en">English</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-text-muted">Loading...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-text-muted border-b border-border">
                <th className="p-3">Session ID</th>
                <th className="p-3">IP Address</th>
                <th className="p-3">User Agent</th>
                <th className="p-3">Language</th>
                <th className="p-3">Messages</th>
                <th className="p-3">Created</th>
                <th className="p-3">Updated</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-text-muted">
                    No sessions found
                  </td>
                </tr>
              ) : (
                sessions.map((session) => (
                  <tr key={session.id} className="border-b border-border/50 hover:bg-surface/50">
                    <td className="p-3 font-mono text-xs text-text">{session.id.slice(0, 25)}...</td>
                    <td className="p-3 text-sm text-text">{session.ip}</td>
                    <td className="p-3">
                      <div className="max-w-xs truncate text-sm text-text-muted" title={session.user_agent}>
                        {session.user_agent}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-xs bg-accent/10 text-accent">
                        {getLanguageLabel(session.language)}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-text">{session.message_count}</td>
                    <td className="p-3 text-sm text-text-muted">{formatFullTime(session.created_at, lang)}</td>
                    <td className="p-3 text-sm text-text-muted">{formatFullTime(session.updated_at, lang)}</td>
                    <td className="p-3">
                      <button
                        onClick={() => handleViewSession(session)}
                        className="px-2 py-1 text-xs rounded text-accent hover:bg-accent/10 transition-colors"
                      >
                        <FiEye size={14} className="inline mr-0.5" />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {renderPagination(currentPage, totalPages, handleSessionsPageChange)}
    </div>
  )

  const renderMessages = () => (
    <div className="card border border-border bg-surface rounded-xl overflow-hidden">
      <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <h2 className="font-semibold text-text">Messages</h2>
        <form onSubmit={handleMessageSearch} className="flex gap-2 w-full sm:w-auto">
          <input
            type="text"
            value={messageSearchQuery}
            onChange={(e) => setMessageSearchQuery(e.target.value)}
            placeholder={lang === "en" ? "Search message content..." : "Cari isi pesan..."}
            className="flex-1 rounded-lg border border-border bg-bg px-4 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
          />
          <button type="submit" className="px-3 py-2 rounded-lg bg-accent text-bg text-sm font-medium hover:opacity-90">
            <FiSearch size={16} className="inline mr-1" />
            {lang === "en" ? "Search" : "Cari"}
          </button>
        </form>
      </div>

      {loading ? (
        <div className="p-8 text-center text-text-muted">Loading...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-text-muted border-b border-border">
                <th className="p-3">Session</th>
                <th className="p-3">Role</th>
                <th className="p-3">Content</th>
                <th className="p-3">Tokens</th>
                <th className="p-3">Model</th>
                <th className="p-3">Provider</th>
                <th className="p-3">Latency</th>
                <th className="p-3">Cost</th>
                <th className="p-3">Time</th>
              </tr>
            </thead>
            <tbody>
              {messages.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-text-muted">
                    No messages found
                  </td>
                </tr>
              ) : (
                messages.map((msg) => (
                  <tr key={msg.id} className="border-b border-border/50 hover:bg-surface/50">
                    <td className="p-3 font-mono text-xs text-text">{msg.session_id.slice(0, 20)}...</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-xs ${msg.role === "user" ? "bg-accent/20 text-accent" : "bg-green-500/20 text-green-400"}`}>
                        {msg.role === "user" ? "User" : "Assistant"}
                      </span>
                    </td>
                    <td className="p-3 max-w-md">
                      <div className="max-w-full truncate text-sm text-text">
                        {msg.content || (msg.status !== null && msg.status >= 400 ? `Request failed (HTTP ${msg.status})` : "-")}
                      </div>
                    </td>
                    <td className="p-3 text-sm text-text-muted">
                      {msg.tokens_input + msg.tokens_output} ({msg.tokens_input} in / {msg.tokens_output} out)
                    </td>
                    <td className="p-3">
                      {msg.model ? (
                        <span className="px-2 py-0.5 rounded text-xs bg-surface border border-border text-text">{msg.model}</span>
                      ) : (
                        <span className="text-text-muted">-</span>
                      )}
                    </td>
                    <td className="p-3 text-sm text-text-muted">{msg.provider || "-"}</td>
                    <td className="p-3 text-sm text-text-muted">
                      {msg.latency_ms !== null && msg.latency_ms !== undefined ? `${msg.latency_ms} ms` : "-"}
                    </td>
                    <td className="p-3 text-sm text-text-muted">{msg.cost_usd > 0 ? `$${msg.cost_usd.toFixed(6)}` : "-"}</td>
                    <td className="p-3 text-sm text-text-muted">{formatFullTime(msg.created_at, lang)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {renderPagination(messagePage, messageTotalPages, handleMessagePageChange)}
    </div>
  )

  const renderAnalytics = () => {
    if (!stats) return null
    const measured = stats.measured_assistant_messages || 0
    const successful = stats.successful_assistant_messages || 0
    const avgLatency = measured > 0 ? `${Math.round(stats.avg_latency_ms || 0)} ms` : t.stats.notEnoughData
    const successRate = measured > 0 ? `${((successful / measured) * 100).toFixed(1)}%` : t.stats.notEnoughData
    const languageCounts = recentSessions.reduce<Record<string, number>>((acc, session) => {
      acc[session.language] = (acc[session.language] || 0) + 1
      return acc
    }, {})
    const languageTotal = Object.values(languageCounts).reduce((sum, count) => sum + count, 0)

    return (
      <div className="space-y-6">
        <h2 className="font-semibold text-text">Analytics</h2>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="card p-5 border border-border bg-surface rounded-xl">
            <h3 className="font-semibold text-text mb-3">{t.stats.tokenUsage}</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">{t.stats.inputTokens}</span>
                <span className="font-medium text-text">{formatNumber(stats.tokens_input)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">{t.stats.outputTokens}</span>
                <span className="font-medium text-text">{formatNumber(stats.tokens_output)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">{t.stats.total}</span>
                <span className="font-bold text-text">{formatNumber(stats.total_tokens)}</span>
              </div>
            </div>
          </div>

          <div className="card p-5 border border-border bg-surface rounded-xl">
            <h3 className="font-semibold text-text mb-3">{t.stats.costBreakdown}</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">{t.stats.totalCost}</span>
                <span className="font-bold text-text">${(stats.total_cost || 0).toFixed(4)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">{t.stats.costPerSession}</span>
                <span className="font-medium text-text">
                  ${stats.total_sessions > 0 ? (stats.total_cost / stats.total_sessions).toFixed(4) : "0.0000"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">{t.stats.costPerMessage}</span>
                <span className="font-medium text-text">
                  ${stats.total_messages > 0 ? (stats.total_cost / stats.total_messages).toFixed(6) : "0.000000"}
                </span>
              </div>
            </div>
          </div>

          <div className="card p-5 border border-border bg-surface rounded-xl">
            <h3 className="font-semibold text-text mb-3">{t.stats.engagement}</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">{t.stats.avgMessagesPerSession}</span>
                <span className="font-medium text-text">
                  {stats.total_sessions > 0 ? (stats.total_messages / stats.total_sessions).toFixed(1) : "0.0"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">{t.stats.sessions24h}</span>
                <span className="font-medium text-text">{formatNumber(stats.sessions_last_24h)}</span>
              </div>
            </div>
          </div>

          <div className="card p-5 border border-border bg-surface rounded-xl">
            <h3 className="font-semibold text-text mb-3">{t.stats.performance}</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">{t.stats.avgResponseTime}</span>
                <span className="font-medium text-text">{avgLatency}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">{t.stats.successRate}</span>
                <span className={`font-medium ${measured > 0 ? "text-green-400" : "text-text-muted"}`}>{successRate}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card p-5 border border-border bg-surface rounded-xl">
          <h3 className="font-semibold text-text mb-4">{t.stats.languageDistribution}</h3>
          {languageTotal === 0 ? (
            <p className="text-sm text-text-muted">{t.stats.notEnoughData}</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {Object.entries(languageCounts).map(([language, count]) => (
                <div key={language} className="flex items-center justify-between text-sm">
                  <span className="text-text">{getLanguageLabel(language)}</span>
                  <span className="text-text-muted">
                    {count} ({((count / languageTotal) * 100).toFixed(1)}%)
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderSessionModal = () => {
    if (!viewingSession || !selectedSession) return null
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div className="w-full max-w-3xl max-h-[90vh] bg-surface rounded-2xl border border-border shadow-xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-border p-4 bg-surface/50">
            <div className="flex items-center gap-3">
              <FiMessageSquare size={24} className="text-accent" />
              <div>
                <h2 className="font-semibold text-text">Session Details</h2>
                <p className="text-sm text-text-muted">{selectedSession.id}</p>
              </div>
            </div>
            <button
              onClick={() => setViewingSession(false)}
              className="grid h-8 w-8 place-items-center rounded-lg text-text-muted transition-colors hover:bg-border hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              aria-label="Close"
            >
              <FiX size={18} />
            </button>
          </div>

          <div className="border-b border-border p-4 bg-surface/50 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-text-muted block">IP</span>
              <span className="font-mono text-text">{selectedSession.ip}</span>
            </div>
            <div>
              <span className="text-text-muted block">Language</span>
              <span className="text-text">{getLanguageLabel(selectedSession.language)}</span>
            </div>
            <div>
              <span className="text-text-muted block">Messages</span>
              <span className="text-text">{selectedSession.message_count}</span>
            </div>
            <div>
              <span className="text-text-muted block">Created</span>
              <span className="text-text">{formatFullTime(selectedSession.created_at, lang)}</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[60vh]">
            {sessionMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-text-muted py-8">
                <FiMessageSquare size={48} className="text-accent/50 mb-3" />
                <p className="text-sm">{lang === "en" ? "No messages in this session" : "Tidak ada pesan di session ini"}</p>
              </div>
            ) : (
              sessionMessages.map((msg) => (
                <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div
                    className={`flex-shrink-0 grid h-8 w-8 place-items-center rounded-full ${
                      msg.role === "user" ? "bg-accent text-bg" : "bg-surface border border-border text-accent"
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
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-text-muted">{msg.role === "user" ? "User" : "Assistant"}</span>
                      <span className="text-[0.6rem] text-text-muted">{formatFullTime(msg.created_at, lang)}</span>
                      {msg.latency_ms !== null && msg.latency_ms !== undefined && (
                        <span className="text-[0.6rem] px-1.5 py-0.5 rounded bg-surface/50 text-text-muted">
                          {msg.latency_ms} ms
                        </span>
                      )}
                    </div>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {msg.content || (msg.status !== null && msg.status >= 400 ? `Request failed (HTTP ${msg.status})` : "-")}
                    </p>
                    {msg.model && (
                      <div className="mt-1 flex items-center gap-2 text-[0.6rem] text-text-muted">
                        <span className="px-1.5 py-0.5 rounded bg-surface/50">{msg.model}</span>
                        {msg.provider && <span className="px-1.5 py-0.5 rounded bg-surface/50">{msg.provider}</span>}
                        {msg.cost_usd > 0 && <span>${msg.cost_usd.toFixed(6)}</span>}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-border p-4 bg-surface/50">
            <button onClick={() => setViewingSession(false)} className="w-full btn btn-ghost">
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border bg-surface/50 sticky top-0 z-40">
        <div className="shell flex items-center justify-between h-16">
          <div className="flex items-center gap-4 min-w-0">
            <FiCpu size={24} className="text-accent shrink-0" />
            <div className="min-w-0">
              <h1 className="font-semibold text-text truncate">{t.title}</h1>
              <p className="hidden sm:block text-sm text-text-muted">{t.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {authStatus === "authorized" && (
              <span className="hidden sm:inline text-xs px-2 py-1 rounded bg-emerald-500/10 text-emerald-400">{t.auth.authorized}</span>
            )}
            <button
              onClick={fetchStats}
              className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-surface text-text-muted transition-colors hover:bg-border hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              aria-label="Refresh"
            >
              <FiRefreshCw size={18} />
            </button>
            <select
              value={exportType}
              onChange={(e) => setExportType(e.target.value as "messages" | "sessions")}
              className="rounded-lg border border-border bg-bg px-2 py-1.5 text-sm text-text min-h-11 sm:min-h-0"
              aria-label="Export type"
            >
              <option value="messages">{t.export.messages}</option>
              <option value="sessions">{t.export.sessions}</option>
            </select>
            <button
              onClick={handleExport}
              disabled={exporting}
              aria-busy={exporting}
              aria-label={t.export.label}
              className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-border bg-surface px-3 py-1.5 min-h-11 sm:min-h-0 text-sm font-medium text-text transition-colors hover:bg-border hover:text-text disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <FiDownload size={14} />
              <span className="hidden sm:inline">{exporting ? "…" : t.export.label}</span>
            </button>
          </div>
        </div>
      </header>

      <nav className="border-b border-border bg-surface/50 sticky top-16 z-30">
        <div className="shell flex gap-1 px-4 py-2 overflow-x-auto">
          {[
            { id: "overview", label: "Overview", icon: FiActivity },
            { id: "sessions", label: "Sessions", icon: FiUsers },
            { id: "messages", label: "Messages", icon: FiMessageSquare },
            { id: "analytics", label: "Analytics", icon: FiActivity },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any)
                setViewingSession(false)
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-accent/10 text-accent border-b-2 border-accent"
                  : "text-text-muted hover:text-text hover:bg-border"
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="shell py-6">
        {renderAuthBanner()}

        {error && (
          <div className="mb-6 p-4 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-sm">
            {error}
            <button onClick={handleRetry} className="ml-2 text-sm underline">
              {t.auth.retry}
            </button>
          </div>
        )}

        {activeTab === "overview" && renderOverview()}
        {activeTab === "sessions" && renderSessions()}
        {activeTab === "messages" && renderMessages()}
        {activeTab === "analytics" && renderAnalytics()}
      </main>

      {renderSessionModal()}
    </div>
  )
}
