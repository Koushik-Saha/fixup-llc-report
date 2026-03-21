"use client"
import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import toast from "react-hot-toast"
import { Pagination } from "@/components/Pagination"
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import timezone from "dayjs/plugin/timezone"

dayjs.extend(utc)
dayjs.extend(timezone)

export default function AnomaliesDashboard() {
    const { data: session } = useSession()
    const isAdmin = session?.user?.role === 'Admin'

    const [anomalies, setAnomalies] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState("Open")
    
    // Pagination
    const [page, setPage] = useState(1)
    const [limit, setLimit] = useState(20)
    const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 })

    const fetchAnomalies = useCallback(() => {
        setLoading(true)
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
            status: statusFilter
        })

        fetch(`/api/admin/anomalies?${params.toString()}`)
            .then(res => res.json())
            .then(data => {
                setAnomalies(data.data || [])
                setPagination(data.pagination || { total: 0, page: 1, totalPages: 1 })
            })
            .catch(() => toast.error("Failed to fetch anomalies"))
            .finally(() => setLoading(false))
    }, [page, limit, statusFilter])

    useEffect(() => {
        if (session) fetchAnomalies()
    }, [fetchAnomalies, session])

    const updateStatus = async (id: string, newStatus: string) => {
        const loadingToast = toast.loading("Updating status...")
        try {
            const res = await fetch(`/api/admin/anomalies/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus })
            })
            if (res.ok) {
                toast.success(`Anomaly marked as ${newStatus}`, { id: loadingToast })
                fetchAnomalies()
            } else {
                const err = await res.json()
                toast.error(err.error || "Failed to update", { id: loadingToast })
            }
        } catch (error) {
            toast.error("Network error", { id: loadingToast })
        }
    }

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'CASH_VARIANCE': return { label: 'Discrepancy', color: 'bg-orange-100 text-orange-800 border-orange-200' }
            case 'REVENUE_DROP': return { label: 'Revenue Drop', color: 'bg-red-100 text-red-800 border-red-200' }
            case 'HIGH_EXPENSES': return { label: 'High Expenses', color: 'bg-amber-100 text-amber-800 border-amber-200' }
            default: return { label: type, color: 'bg-gray-100 text-gray-800 border-gray-200' }
        }
    }

    const getSeverityIcon = (sev: string) => {
        if (sev === 'High') return '🟥 High'
        if (sev === 'Medium') return '🟨 Med'
        return '🟩 Low'
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
                        🤖 AI Anomaly Detection
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Automatically flagged reports requiring administrative review.
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex gap-4">
                <div className="w-full sm:w-64">
                    <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wider">Status Filter</label>
                    <select
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-purple-500 focus:border-purple-500"
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
                    >
                        <option value="Open">🔴 Open Actions</option>
                        <option value="Investigating">🔍 Investigating</option>
                        <option value="Resolved">✅ Resolved</option>
                        <option value="Dismissed">⚪ Dismissed (False Alarm)</option>
                        <option value="All">All Flags</option>
                    </select>
                </div>
            </div>

            {/* Inbox */}
            <div className="bg-white shadow-sm border border-gray-100 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Detection Details</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Source Context</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Severity</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {loading && Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td className="px-6 py-5"><div className="h-10 bg-gray-100 rounded w-full"></div></td>
                                    <td className="px-6 py-5"><div className="h-10 bg-gray-100 rounded w-32"></div></td>
                                    <td className="px-6 py-5"><div className="h-6 bg-gray-100 rounded w-16"></div></td>
                                    <td className="px-6 py-5"><div className="h-6 bg-gray-100 rounded w-20"></div></td>
                                    <td className="px-6 py-5"><div className="h-8 bg-gray-100 rounded w-24 ml-auto"></div></td>
                                </tr>
                            ))}
                            {!loading && anomalies.map(anomaly => {
                                const typeStyling = getTypeLabel(anomaly.type)
                                return (
                                    <tr key={anomaly.id} className="hover:bg-gray-50 transition">
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wide ${typeStyling.color}`}>
                                                        {typeStyling.label}
                                                    </span>
                                                    <span className="text-xs text-gray-400 font-medium">
                                                        Detected {dayjs(anomaly.createdAt).fromNow()}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-800 mt-1 max-w-md font-medium leading-relaxed">
                                                    {anomaly.description}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-gray-900">{anomaly.report?.store?.name || 'Unknown Store'}</span>
                                                <span className="text-xs text-gray-500 mt-0.5">By {anomaly.report?.submitted_by?.name}</span>
                                                <Link href={`/admin/reports/${anomaly.report_id}`} className="text-purple-600 hover:text-purple-800 text-xs font-semibold underline mt-1">
                                                    View Report →
                                                </Link>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className="text-sm font-bold text-gray-700">{getSeverityIcon(anomaly.severity)}</span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${
                                                anomaly.status === 'Open' ? 'bg-rose-100 text-rose-800' :
                                                anomaly.status === 'Investigating' ? 'bg-blue-100 text-blue-800' :
                                                anomaly.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800' :
                                                'bg-gray-100 text-gray-600'
                                            }`}>
                                                {anomaly.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-right whitespace-nowrap">
                                            {anomaly.status !== 'Resolved' && anomaly.status !== 'Dismissed' && (
                                                <div className="flex flex-col gap-2 items-end">
                                                    {anomaly.status === 'Open' && (
                                                        <button onClick={() => updateStatus(anomaly.id, 'Investigating')} className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded font-bold transition w-full sm:w-auto text-center">
                                                            Investigate
                                                        </button>
                                                    )}
                                                    <button onClick={() => updateStatus(anomaly.id, 'Resolved')} className="text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded font-bold transition w-full sm:w-auto text-center">
                                                        Mark Resolved
                                                    </button>
                                                    <button onClick={() => updateStatus(anomaly.id, 'Dismissed')} className="text-xs text-gray-500 hover:text-rose-600 font-medium px-3 py-1 transition">
                                                        Dismiss
                                                    </button>
                                                </div>
                                            )}
                                            {(anomaly.status === 'Resolved' || anomaly.status === 'Dismissed') && (
                                                <button onClick={() => updateStatus(anomaly.id, 'Open')} className="text-xs text-gray-400 hover:text-gray-700 font-medium underline">
                                                    Reopen
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                            {!loading && anomalies.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-16 text-center">
                                        <div className="text-5xl mb-4">🎉</div>
                                        <h3 className="text-lg font-bold text-gray-900 mb-1">Zero Anomalies</h3>
                                        <p className="text-gray-500">Everything looks clean. No suspicious flags matching your filters.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                
                {!loading && pagination.total > 0 && (
                    <div className="border-t border-gray-100 bg-gray-50">
                        <Pagination 
                            currentPage={pagination.page} 
                            totalPages={pagination.totalPages} 
                            totalItems={pagination.total} 
                            limit={limit}
                            onPageChange={setPage}
                            onLimitChange={(l) => { setLimit(l); setPage(1); }}
                            label="anomalies"
                        />
                    </div>
                )}
            </div>
        </div>
    )
}
