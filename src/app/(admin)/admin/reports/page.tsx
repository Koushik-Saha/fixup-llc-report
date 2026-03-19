"use client"
import { useState, useEffect, useCallback, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { SkeletonRow } from "@/components/Skeleton"
import { Pagination } from "@/components/Pagination"
import toast from "react-hot-toast"
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import timezone from "dayjs/plugin/timezone"

dayjs.extend(utc)
dayjs.extend(timezone)

const TIMEZONE = "America/Los_Angeles"

function parseHours(timeStr: string | null | undefined): number | null {
    if (!timeStr) return null;
    if (timeStr.toLowerCase().includes('am') || timeStr.toLowerCase().includes('pm')) {
        const [time, period] = timeStr.split(' ');
        let [hours, minutes] = time.split(':').map(Number);
        if (period.toLowerCase() === 'pm' && hours !== 12) hours += 12;
        if (period.toLowerCase() === 'am' && hours === 12) hours = 0;
        if (isNaN(hours) || isNaN(minutes)) return null;
        return hours + (minutes / 60);
    } else {
        const [hours, minutes] = timeStr.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes)) return null;
        return hours + (minutes / 60);
    }
}

function calculateDuration(timeIn: string | null | undefined, timeOut: string | null | undefined): number {
    const start = parseHours(timeIn);
    const end = parseHours(timeOut);
    if (start === null || end === null) return 0;
    let duration = end - start;
    if (duration < 0) duration += 24;
    return Math.max(0, duration);
}

function AdminReportsContent() {
    const router = useRouter()
    const searchParams = useSearchParams()

    // Read initial filter values from URL
    const [reports, setReports] = useState<any[]>([])
    const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 })
    const [stores, setStores] = useState<any[]>([])
    const [users, setUsers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    // All filters synced to URL params
    const [storeId, setStoreId] = useState(searchParams.get('storeId') || "")
    const [userId, setUserId] = useState(searchParams.get('userId') || "")
    const [startDate, setStartDate] = useState(searchParams.get('startDate') || "")
    const [endDate, setEndDate] = useState(searchParams.get('endDate') || "")
    const [month, setMonth] = useState(searchParams.get('month') || "")
    const [search, setSearch] = useState(searchParams.get('search') || "")
    const [status, setStatus] = useState(searchParams.get('status') || "")
    const [page, setPage] = useState(Number(searchParams.get('page') || "1"))
    const [limit, setLimit] = useState(Number(searchParams.get('limit') || "10"))

    const [selectedReports, setSelectedReports] = useState<string[]>([])
    const [verifying, setVerifying] = useState(false)

    // Sync state → URL whenever any filter changes
    const pushParams = useCallback((overrides: Record<string, string> = {}) => {
        const current: Record<string, string> = {
            storeId, userId, startDate, endDate, month, search, status,
            page: page.toString(), limit: limit.toString(),
            ...overrides
        }
        const p = new URLSearchParams()
        Object.entries(current).forEach(([k, v]) => { if (v) p.set(k, v) })
        router.replace(`/admin/reports?${p.toString()}`, { scroll: false })
    }, [storeId, userId, startDate, endDate, month, search, status, page, limit, router])

    // Handlers that also update URL
    const handleStoreId = (v: string) => { setStoreId(v); setPage(1); pushParams({ storeId: v, page: '1' }) }
    const handleUserId = (v: string) => { setUserId(v); setPage(1); pushParams({ userId: v, page: '1' }) }
    const handleStartDate = (v: string) => { setStartDate(v); setMonth(''); setPage(1); pushParams({ startDate: v, month: '', page: '1' }) }
    const handleEndDate = (v: string) => { setEndDate(v); setMonth(''); setPage(1); pushParams({ endDate: v, month: '', page: '1' }) }
    const handleSearch = (v: string) => { setSearch(v); setPage(1); pushParams({ search: v, page: '1' }) }
    const handleStatus = (v: string) => { setStatus(v); setPage(1); pushParams({ status: v, page: '1' }) }
    const handlePage = (v: number) => { setPage(v); pushParams({ page: v.toString() }) }
    const handleLimit = (v: number) => { setLimit(v); setPage(1); pushParams({ limit: v.toString(), page: '1' }) }

    // Month filter: auto-fills start/end date for the selected month
    const handleMonth = (v: string) => {
        setMonth(v)
        if (v) {
            const s = dayjs.tz(`${v}-01T00:00:00`, TIMEZONE).format('YYYY-MM-DD')
            const e = dayjs.tz(`${v}-01T00:00:00`, TIMEZONE).endOf('month').format('YYYY-MM-DD')
            setStartDate(s)
            setEndDate(e)
            setPage(1)
            pushParams({ month: v, startDate: s, endDate: e, page: '1' })
        } else {
            setStartDate('')
            setEndDate('')
            setPage(1)
            pushParams({ month: '', startDate: '', endDate: '', page: '1' })
        }
    }

    const handleClear = () => {
        setStoreId(''); setUserId(''); setStartDate(''); setEndDate('')
        setMonth(''); setSearch(''); setStatus(''); setPage(1)
        router.replace('/admin/reports', { scroll: false })
    }

    useEffect(() => {
        Promise.all([
            fetch('/api/admin/stores').then(res => res.json()),
            fetch('/api/admin/users').then(res => res.json())
        ]).then(([storesData, usersData]) => {
            setStores(Array.isArray(storesData) ? storesData : [])
            setUsers(Array.isArray(usersData) ? usersData : [])
        })
    }, [])

    const fetchReports = useCallback(() => {
        setLoading(true)
        const params = new URLSearchParams()
        if (storeId) params.append('storeId', storeId)
        if (userId) params.append('userId', userId)
        if (startDate) params.append('startDate', startDate)
        if (endDate) params.append('endDate', endDate)
        if (search) params.append('search', search)
        if (status) params.append('status', status)
        params.append('page', page.toString())
        params.append('limit', limit.toString())

        fetch(`/api/admin/reports?${params.toString()}`)
            .then(res => res.json())
            .then(resData => {
                setReports(resData.data || [])
                setPagination(resData.pagination || { total: 0, page: 1, totalPages: 1 })
                setSelectedReports([])
                setLoading(false)
            })
    }, [storeId, userId, startDate, endDate, search, status, page, limit])

    useEffect(() => { fetchReports() }, [fetchReports])

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedReports(reports.filter(r => r.status === 'Submitted').map(r => r.id))
        } else {
            setSelectedReports([])
        }
    }

    const handleSelectRow = (id: string) => {
        setSelectedReports(prev => prev.includes(id) ? prev.filter(rId => rId !== id) : [...prev, id])
    }

    const handleBulkVerify = async () => {
        if (selectedReports.length === 0) return
        setVerifying(true)
        try {
            const res = await fetch('/api/admin/reports/bulk-verify', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reportIds: selectedReports })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to bulk verify')
            toast.success(`Successfully verified ${data.count} reports!`)
            setSelectedReports([])
            fetchReports()
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setVerifying(false)
        }
    }

    const handleExportCSV = () => {
        const headers = ["Date", "Store", "City", "Cash", "Card", "Total", "Submitted By", "Total Hours", "Status"]
        const rows = reports.map(r => [
            dayjs.utc(r.report_date).format('M/D/YYYY'),
            `"${r.store.name}"`,
            `"${r.store.city}"`,
            r.cash_amount,
            r.card_amount,
            r.total_amount,
            `"${r.submitted_by?.name || 'Unknown'}"`,
            calculateDuration(r.time_in, r.time_out).toFixed(2),
            r.status
        ])
        const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n")
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.setAttribute("href", url)
        link.setAttribute("download", `reports_export_${dayjs().tz(TIMEZONE).format('YYYY-MM-DD')}.csv`)
        document.body.appendChild(link)
        link.click()
    }

    const hasActiveFilters = !!(storeId || userId || startDate || endDate || month || search || status)

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">All Reports</h2>
                    {hasActiveFilters && (
                        <p className="text-sm text-blue-600 mt-1">
                            Filtered view — <button onClick={handleClear} className="underline hover:text-blue-800">clear all filters</button>
                        </p>
                    )}
                </div>
                <div className="flex flex-wrap gap-2">
                    {selectedReports.length > 0 && (
                        <button
                            onClick={handleBulkVerify}
                            disabled={verifying}
                            className={`bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded font-medium shadow-sm transition ${verifying ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {verifying ? 'Verifying...' : `Bulk Verify (${selectedReports.length})`}
                        </button>
                    )}
                    <Link href="/admin/reports/new" className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded font-medium shadow-sm flex items-center">
                        + Create Missing Report
                    </Link>
                    <button onClick={handleExportCSV} className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded font-medium shadow-sm">
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-lg shadow space-y-3">
                {/* Search */}
                <input
                    type="text"
                    placeholder="Search by store or user name..."
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                    value={search}
                    onChange={e => handleSearch(e.target.value)}
                />

                {/* Filter Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3 items-end">
                    {/* Store */}
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Filter by Store</label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-blue-500 focus:border-blue-500" value={storeId} onChange={e => handleStoreId(e.target.value)}>
                            <option value="">All Stores</option>
                            {stores.map(store => <option key={store.id} value={store.id}>{store.name}</option>)}
                        </select>
                    </div>

                    {/* Status */}
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-blue-500 focus:border-blue-500" value={status} onChange={e => handleStatus(e.target.value)}>
                            <option value="">All</option>
                            <option value="Verified">✅ Verified</option>
                            <option value="Submitted">📋 Submitted (Unverified)</option>
                            <option value="Missing">❌ Missing</option>
                        </select>
                    </div>

                    {/* User */}
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Filter by User</label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-blue-500 focus:border-blue-500" value={userId} onChange={e => handleUserId(e.target.value)}>
                            <option value="">All Users</option>
                            {users.map(user => <option key={user.id} value={user.id}>{user.name} ({user.role})</option>)}
                        </select>
                    </div>

                    {/* Month shortcut */}
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                            Month <span className="text-gray-400">(auto-fills dates)</span>
                        </label>
                        <input
                            type="month"
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-blue-500 focus:border-blue-500"
                            value={month}
                            onChange={e => handleMonth(e.target.value)}
                        />
                    </div>

                    {/* Start Date */}
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
                        <input
                            type="date"
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-blue-500 focus:border-blue-500"
                            value={startDate}
                            onChange={e => handleStartDate(e.target.value)}
                        />
                    </div>

                    {/* End Date */}
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
                        <input
                            type="date"
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-blue-500 focus:border-blue-500"
                            value={endDate}
                            onChange={e => handleEndDate(e.target.value)}
                        />
                    </div>

                    {/* Clear */}
                    <div>
                        <button
                            onClick={handleClear}
                            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded text-sm font-medium"
                        >
                            Clear All
                        </button>
                    </div>
                </div>

                {/* Active filter badges */}
                {hasActiveFilters && (
                    <div className="flex flex-wrap gap-2 pt-1">
                        {month && <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-1 rounded-full">Month: {month}</span>}
                        {storeId && <span className="bg-purple-100 text-purple-700 text-xs font-medium px-2 py-1 rounded-full">Store: {stores.find(s => s.id === storeId)?.name || storeId}</span>}
                        {userId && <span className="bg-orange-100 text-orange-700 text-xs font-medium px-2 py-1 rounded-full">User: {users.find(u => u.id === userId)?.name || userId}</span>}
                        {(startDate || endDate) && !month && <span className="bg-green-100 text-green-700 text-xs font-medium px-2 py-1 rounded-full">Dates: {startDate} → {endDate || '…'}</span>}
                        {search && <span className="bg-gray-100 text-gray-700 text-xs font-medium px-2 py-1 rounded-full">Search: "{search}"</span>}
                    </div>
                )}
            </div>

            {loading ? (
                <div className="bg-white p-6 shadow rounded-lg max-w-full"><SkeletonRow rows={6} /></div>
            ) : (
                <div className="bg-white shadow rounded-lg overflow-hidden overflow-x-auto">
                    <table className="min-w-full divide-y border-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left w-12">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                                        checked={reports.filter(r => r.status === 'Submitted').length > 0 && selectedReports.length === reports.filter(r => r.status === 'Submitted').length}
                                        onChange={handleSelectAll}
                                        disabled={reports.filter(r => r.status === 'Submitted').length === 0}
                                    />
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Store</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Staff / Assignees</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submitted By</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Hours</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cash</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Card</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Amount</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {reports.map((report: any) => (
                                <tr key={report.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        {report.status === 'Submitted' && (
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                                                checked={selectedReports.includes(report.id)}
                                                onChange={() => handleSelectRow(report.id)}
                                            />
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <span>{dayjs.utc(report.report_date).format('M/D/YYYY')}</span>
                                            {report.anomalies && report.anomalies.length > 0 && (
                                                <Link href="/admin/anomalies" title={`${report.anomalies.length} unresolved anomalies`} className="text-rose-600 bg-rose-50 rounded-full px-1.5 py-0.5 text-[10px] border border-rose-200 cursor-pointer font-bold animate-pulse hover:bg-rose-100 transition inline-block">
                                                    ⚠️ {report.anomalies.length} Flag{report.anomalies.length > 1 ? 's' : ''}
                                                </Link>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">{report.store?.name || 'Unknown Store'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {report.assignees && report.assignees.length > 0 ? (
                                            <div className="flex flex-wrap gap-1">
                                                {report.assignees.map((a: any, i: number) => (
                                                    <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">{a.name}</span>
                                                ))}
                                            </div>
                                        ) : report.status === 'Missing' && userId ? (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                                {users.find(u => u.id === userId)?.name || 'Filtered User'}
                                            </span>
                                        ) : (
                                            <span className="text-gray-500">None</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {report.submitted_by?.name ? report.submitted_by.name
                                            : report.status === 'Missing' && userId ? (
                                                <span className="italic text-gray-400">Waiting on {users.find(u => u.id === userId)?.name?.split(' ')[0] || 'User'}</span>
                                            ) : 'Unknown'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-indigo-600">
                                        {report.status !== 'Missing' ? `${calculateDuration(report.time_in, report.time_out).toFixed(2)}h` : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">${Number(report.cash_amount).toFixed(2)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">${Number(report.card_amount).toFixed(2)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap font-bold">${Number(report.total_amount).toFixed(2)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                                            ${report.status === 'Verified' ? 'bg-green-100 text-green-800' :
                                                report.status === 'CorrectionRequested' ? 'bg-red-100 text-red-800' :
                                                    report.status === 'Missing' ? 'bg-gray-100 text-gray-800' :
                                                        report.status === 'Submitted' ? 'bg-blue-100 text-blue-800' :
                                                            'bg-yellow-100 text-yellow-800'}`}>
                                            {report.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        {report.status === 'Missing' ? (
                                            <Link href={`/admin/reports/new?storeId=${report.store_id}&date=${dayjs.utc(report.report_date).format('YYYY-MM-DD')}`} className="text-green-600 hover:text-green-900 font-bold">Create</Link>
                                        ) : (
                                            <>
                                                <Link href={`/admin/reports/${report.id}`} className="text-indigo-600 hover:text-indigo-900 mr-4">View</Link>
                                                <Link href={`/admin/reports/${report.id}/edit`} className="text-orange-600 hover:text-orange-900">Edit</Link>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {reports.length === 0 && (
                                <tr>
                                    <td colSpan={11} className="px-6 py-8 text-center text-gray-500">No reports match the current filters.</td>
                                </tr>
                            )}
                        </tbody>
                        {reports.length > 0 && (() => {
                            const totalHours = reports.reduce((s, r) => s + (r.status !== 'Missing' ? calculateDuration(r.time_in, r.time_out) : 0), 0)
                            const totalCash = reports.reduce((s, r) => s + Number(r.cash_amount || 0), 0)
                            const totalCard = reports.reduce((s, r) => s + Number(r.card_amount || 0), 0)
                            const totalAmount = reports.reduce((s, r) => s + Number(r.total_amount || 0), 0)
                            return (
                                <tfoot>
                                    <tr className="bg-gray-100 border-t-2 border-gray-300">
                                        <td colSpan={4} className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                            Page Totals ({reports.filter(r => r.status !== 'Missing').length} submitted)
                                        </td>
                                        <td className="px-6 py-3 text-left" />
                                        <td className="px-6 py-3 text-left font-black text-indigo-700">
                                            {totalHours.toFixed(2)}h
                                        </td>
                                        <td className="px-6 py-3 text-left" />
                                        <td className="px-6 py-3 text-left font-black text-gray-700">
                                            ${totalCash.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-3 text-left font-black text-gray-700">
                                            ${totalCard.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-3 text-left font-black text-blue-800 text-base">
                                            ${totalAmount.toFixed(2)}
                                        </td>
                                        <td colSpan={2} />
                                    </tr>
                                </tfoot>
                            )
                        })()}
                    </table>

                    <Pagination
                        currentPage={pagination.page}
                        totalPages={pagination.totalPages}
                        totalItems={pagination.total}
                        onPageChange={handlePage}
                        label="reports"
                        limit={limit}
                        onLimitChange={handleLimit}
                    />
                </div>
            )}
        </div>
    )
}

export default function AdminReportsPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading filters...</div>}>
            <AdminReportsContent />
        </Suspense>
    )
}
