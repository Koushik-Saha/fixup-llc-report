"use client"
import { useState, useEffect, useCallback, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Pagination } from "@/components/Pagination"
import toast from "react-hot-toast"
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import timezone from "dayjs/plugin/timezone"

dayjs.extend(utc)
dayjs.extend(timezone)

const TIMEZONE = "America/Los_Angeles"

export default function CategoryReportsListPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    
    const [reports, setReports] = useState<any[]>([])
    const [category, setCategory] = useState<{name: string} | null>(null)
    const [loading, setLoading] = useState(true)
    
    // Pagination
    const [page, setPage] = useState(1)
    const [limit, setLimit] = useState(10)
    const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 })

    // Date filters
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")
    const [status, setStatus] = useState("")

    useEffect(() => {
        // Fetch Category Details
        fetch(`/api/admin/categories/${id}`)
            .then(res => res.json())
            .then(data => {
                if (!data.error) setCategory(data)
            })
    }, [id])

    const fetchReports = useCallback(() => {
        setLoading(true)
        const queryParams = new URLSearchParams()
        queryParams.append('page', page.toString())
        queryParams.append('limit', limit.toString())
        if (startDate) queryParams.append('startDate', startDate)
        if (endDate) queryParams.append('endDate', endDate)
        if (status) queryParams.append('status', status)

        fetch(`/api/admin/categories/${id}/reports?${queryParams.toString()}`)
            .then(res => res.json())
            .then(resData => {
                setReports(resData.data || [])
                setPagination(resData.pagination || { total: 0, page: 1, totalPages: 1 })
                setLoading(false)
            })
            .catch(() => {
                toast.error("Failed to load reports")
                setLoading(false)
            })
    }, [id, page, limit, startDate, endDate, status])

    useEffect(() => {
        fetchReports()
    }, [fetchReports])

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">
                        {category ? `${category.name} Reports` : 'Loading...'}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Manage financial reports isolated to this category.</p>
                </div>
                <div className="flex gap-2">
                    <Link href="/admin/categories" className="bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded font-medium shadow-sm flex items-center transition">
                        ← Back
                    </Link>
                    <Link href={`/admin/categories/report/new`} className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded font-medium shadow-sm flex items-center transition">
                        📝 Create Report
                    </Link>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-lg shadow space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end">
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-purple-500 focus:border-purple-500" value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}>
                            <option value="">All</option>
                            <option value="Verified">✅ Verified</option>
                            <option value="Submitted">📋 Submitted (Unverified)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
                        <input
                            type="date"
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-purple-500 focus:border-purple-500"
                            value={startDate}
                            onChange={e => { setStartDate(e.target.value); setPage(1) }}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
                        <input
                            type="date"
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-purple-500 focus:border-purple-500"
                            value={endDate}
                            onChange={e => { setEndDate(e.target.value); setPage(1) }}
                        />
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
                <div className="overflow-x-auto min-h-[400px]">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 tracking-wider">Submitted By</th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 tracking-wider">Cash ($)</th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 tracking-wider">Card ($)</th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 tracking-wider">Total ($)</th>
                                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 tracking-wider">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200 text-sm">
                            {loading && Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
                                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16 ml-auto"></div></td>
                                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16 ml-auto"></div></td>
                                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16 ml-auto"></div></td>
                                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-12 mx-auto"></div></td>
                                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20 ml-auto"></div></td>
                                </tr>
                            ))}
                            {!loading && reports.map((r) => (
                                <tr key={r.id} className="hover:bg-gray-50 transition">
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-700 font-medium whitespace-nowrap">
                                        {dayjs.utc(r.report_date).format('MMM D, YYYY')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                                        {r.submitted_by?.name || 'Unknown'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-700 text-right">
                                        ${Number(r.cash_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-700 text-right">
                                        ${Number(r.card_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-900 text-right">
                                        ${Number(r.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${r.status === 'Verified' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                            {r.status === 'Verified' ? '✅ Verified' : '📋 Submitted'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                        <Link href={`/admin/categories/reports/${r.id}`} className="text-purple-600 hover:text-purple-900 font-medium">
                                            View Details
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                            {!loading && reports.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                                        No reports found for this category.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {!loading && pagination.total > 0 && (
                    <div className="border-t border-gray-200">
                        <Pagination 
                            currentPage={pagination.page} 
                            totalPages={pagination.totalPages} 
                            totalItems={pagination.total}
                            limit={limit}
                            onPageChange={(p) => setPage(p)}
                            onLimitChange={(l) => { setLimit(l); setPage(1) }}
                            label="reports"
                        />
                    </div>
                )}
            </div>
        </div>
    )
}
