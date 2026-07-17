import { useState, useMemo } from "react"
import { router, usePage } from '@inertiajs/react'

// ─── Types ────────────────────────────────────────────────────────────────────

type InteractionType = "visit" | "lab" | "imaging" | "billing" | "insurance" | "drugs" | "payments"
type InteractionStatus = "completed" | "pending" | "active" | "cancelled"

interface Interaction {
  id?: number
  interaction_uuid?: string
  date?: string
  created_at?: string
  type: InteractionType | string
  description: string
  provider?: {
    id: number
    name: string
    email: string
  }
  provider_name?: string
  avatar?: string
  avatarColor?: string
  status: InteractionStatus | string
  ref?: string
  reference_number?: string
}

// ─── Style Maps with Fallbacks ───────────────────────────────────────────────

const DEFAULT_TYPE_STYLE = { 
  badge: "bg-gray-50 text-gray-700", 
  dot: "bg-gray-600", 
  label: "Other" 
}

const TYPE_STYLES: Record<string, { badge: string; dot: string; label: string }> = {
  visit:     { badge: "bg-blue-50 text-blue-700",     dot: "bg-blue-600",     label: "Visit" },
  lab:       { badge: "bg-green-50 text-green-700",   dot: "bg-green-600",    label: "Laboratory" },
  imaging:   { badge: "bg-purple-50 text-purple-700", dot: "bg-purple-600",   label: "X-Ray / Imaging" },
  billing:   { badge: "bg-orange-50 text-orange-700", dot: "bg-orange-600",   label: "Billing" },
  insurance: { badge: "bg-pink-50 text-pink-700",     dot: "bg-pink-600",     label: "Insurance" },
  drugs:     { badge: "bg-teal-50 text-teal-700",     dot: "bg-teal-600",     label: "Drug History" },
  payments:  { badge: "bg-yellow-50 text-yellow-700", dot: "bg-yellow-600",   label: "Payments" },
}

const STATUS_STYLES: Record<string, string> = {
  completed: "bg-green-50 text-green-700",
  pending:   "bg-orange-50 text-orange-700",
  cancelled: "bg-red-50 text-red-700",
  active:    "bg-blue-50 text-blue-700",
}

const DEFAULT_STATUS_STYLE = "bg-gray-50 text-gray-700"

const TYPE_FILTERS: Array<{ key: InteractionType | "all"; label: string }> = [
  { key: "all",       label: "All" },
  { key: "visit",     label: "Visit" },
  { key: "lab",       label: "Laboratory" },
  { key: "imaging",   label: "X-Ray / Imaging" },
  { key: "billing",   label: "Billing" },
  { key: "insurance", label: "Insurance" },
  { key: "drugs",     label: "Drug History" },
  { key: "payments",  label: "Payments" },
]

const PER_PAGE = 4

// ─── Helper Functions ────────────────────────────────────────────────────────

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "N/A"

  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return "Invalid date"

    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  } catch {
    return "Invalid date"
  }
}

function getProviderInfo(interaction: Interaction) {
  const providerName = interaction.provider?.name || interaction.provider_name || "System"
  
  const initials = providerName
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const hash = providerName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const colors = ['#3b82f6', '#16a34a', '#7c3aed', '#ea580c', '#0d9488', '#db2777', '#ca8a04']
  const avatarColor = colors[hash % colors.length]

  return {
    name: providerName,
    initials,
    avatarColor
  }
}

function getTypeStyle(type: string) {
  return TYPE_STYLES[type] || DEFAULT_TYPE_STYLE
}

function getStatusStyle(status: string) {
  return STATUS_STYLES[status] || DEFAULT_STATUS_STYLE
}

// ─── Component Props ─────────────────────────────────────────────────────────

interface PatientTabsProps {
  patient?: {
    interactions?: Interaction[]
  }
  interactions?: {
    data?: Interaction[]
    current_page?: number
    last_page?: number
    total?: number
    per_page?: number
    links?: any[]
  }
  filters?: {
    type?: string
    status?: string
    date_from?: string
    date_to?: string
  }
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function PatientTabs({ 
  patient, 
  interactions: paginatedInteractions, 
  filters = {} 
}: PatientTabsProps) {
  const { props } = usePage()
  const interactionsFromProps = props.interactions as Interaction[]
  
  const allInteractions: Interaction[] = 
    paginatedInteractions?.data ?? 
    interactionsFromProps ?? 
    patient?.interactions ?? 
    []

  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<InteractionType | "all">(
    (filters.type as InteractionType | "all") || "all"
  )
  const [page, setPage] = useState(paginatedInteractions?.current_page || 1)

  // Filter interactions
  const filtered = useMemo(() => {
    return allInteractions
      .filter((interaction) => {
        const matchType = typeFilter === "all" || interaction.type === typeFilter
        const searchTerm = search.toLowerCase()
        const providerName = interaction.provider?.name || interaction.provider_name || ""
        
        const matchSearch = !searchTerm || [
          interaction.description,
          providerName,
          interaction.reference_number || interaction.ref
        ].some(field => field?.toLowerCase().includes(searchTerm))
        
        return matchType && matchSearch
      })
      .sort((a, b) => {
        const dateA = a.created_at || a.date || ""
        const dateB = b.created_at || b.date || ""
        return dateB.localeCompare(dateA)
      })
  }, [allInteractions, search, typeFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const safePage = Math.min(page, totalPages)
  const pageRows = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE)

  const handleTypeFilter = (key: InteractionType | "all") => {
    setTypeFilter(key)
    setPage(1)

    router.get(window.location.pathname, {
      ...filters,
      type: key === "all" ? undefined : key
    }, {
      preserveState: true,
      replace: true
    })
  }

  const handleSearch = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-gray-100 flex-wrap">
        <div>
          <h1 className="text-xl text-gray-900">Previous Interactions</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {filtered.length} record{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Search Input */}
        <div className="relative">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5 pointer-events-none"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <circle cx={11} cy={11} r={8} />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search interactions…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-gray-50
                       focus:outline-none focus:border-blue-400 focus:bg-white w-48 transition-colors"
          />
        </div>
      </div>

      {/* Type Filter Pills */}
      <div className="flex gap-1.5 px-6 py-3 border-b border-gray-100 bg-gray-50 flex-wrap items-center">
        <span className="text-xs text-gray-400 font-medium mr-1">Type:</span>
        {TYPE_FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handleTypeFilter(key)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              typeFilter === key
                ? "bg-blue-50 text-blue-700 border-blue-300"
                : "bg-white text-gray-500 border-gray-200 hover:border-blue-300 hover:text-blue-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {["Date", "Type", "Description", "Provider", "Status", "Ref #"].map((header) => (
                <th
                  key={header}
                  className="px-4 py-2.5 text-left text-[11px] font-semibold
                             uppercase tracking-wide text-gray-400 whitespace-nowrap"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-14 text-center text-sm text-gray-400">
                  No interactions match your search.
                </td>
              </tr>
            ) : (
              pageRows.map((interaction, index) => {
                const typeStyle = getTypeStyle(interaction.type)
                const statusStyle = getStatusStyle(interaction.status)
                const providerInfo = getProviderInfo(interaction)
                const displayDate = interaction.created_at || interaction.date
                const reference = interaction.reference_number || interaction.ref || "N/A"

                return (
                  <tr 
                    key={interaction.id || index} 
                    className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                  >
                    {/* Date */}
                    <td className="px-4 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">
                      {formatDate(displayDate)}
                    </td>

                    {/* Type Badge */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5
                                        rounded-full text-xs font-medium ${typeStyle.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${typeStyle.dot}`} />
                        {typeStyle.label}
                      </span>
                    </td>

                    {/* Description */}
                    <td className="px-4 py-3 text-gray-700 max-w-xs truncate">
                      {interaction.description}
                    </td>

                    {/* Provider */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center
                                     text-white text-[9px] font-bold flex-shrink-0"
                          style={{ background: providerInfo.avatarColor }}
                        >
                          {providerInfo.initials}
                        </div>
                        <span className="text-gray-600 text-xs whitespace-nowrap">
                          {providerInfo.name}
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyle}`}>
                        {typeof interaction.status === 'string'
                          ? interaction.status.charAt(0).toUpperCase() + interaction.status.slice(1)
                          : 'Unknown'}
                      </span>
                    </td>

                    {/* Reference Number */}
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">
                      {reference}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {filtered.length > PER_PAGE && (
        <div className="flex items-center justify-between px-6 py-3 bg-gray-50
                        border-t border-gray-100 flex-wrap gap-3">
          <p className="text-xs text-gray-400">
            Showing{" "}
            <span className="font-semibold text-gray-600">
              {filtered.length === 0 ? 0 : (safePage - 1) * PER_PAGE + 1}–
              {Math.min(safePage * PER_PAGE, filtered.length)}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-gray-600">{filtered.length}</span>
          </p>

          <div className="flex gap-1">
            {/* Previous Button */}
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200
                         bg-white text-gray-500 hover:border-blue-400 hover:text-blue-600
                         disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>

            {/* Page Numbers */}
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => setPage(pageNum)}
                className={`w-7 h-7 flex items-center justify-center rounded-lg border text-xs
                            font-medium transition-colors ${
                              pageNum === safePage
                                ? "bg-blue-600 border-blue-600 text-white"
                                : "bg-white border-gray-200 text-gray-600 hover:border-blue-400 hover:text-blue-600"
                            }`}
              >
                {pageNum}
              </button>
            ))}

            {/* Next Button */}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200
                         bg-white text-gray-500 hover:border-blue-400 hover:text-blue-600
                         disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}