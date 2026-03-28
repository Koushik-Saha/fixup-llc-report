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

function parseHours(t: string | null | undefined): number | null {
    if (!t) return null
    if (t.toLowerCase().includes('am') || t.toLowerCase().includes('pm')) {
        const [time, period] = t.split(' '); let [h, m] = time.split(':').map(Number)
        if (period.toLowerCase() === 'pm' && h !== 12) h += 12
        if (period.toLowerCase() === 'am' && h === 12) h = 0
        return isNaN(h) || isNaN(m) ? null : h + m / 60
    }
    const [h, m] = t.split(':').map(Number); return isNaN(h) || isNaN(m) ? null : h + m / 60
}
function calculateDuration(i?: string | null, o?: string | null) {
    const s = parseHours(i), e = parseHours(o)
    if (s === null || e === null) return 0
    let d = e - s; if (d < 0) d += 24; return Math.max(0, d)
}

function TodaysReportsContent() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [reports, setReports] = useState<any[]>([])
    const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 })
    const [stores, setStores] = useState<any[]>([])
    const [users, setUsers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedReports, setSelectedReports] = useState<string[]>([])
    const [verifying, setVerifying] = useState(false)

    const [storeId, setStoreId] = useState(searchParams.get('storeId') || "")
    const [userId, setUserId] = useState(searchParams.get('userId') || "")
    const [search, setSearch] = useState(searchParams.get('search') || "")
    const [page, setPage] = useState(Number(searchParams.get('page') || "1"))
    const [limit, setLimit] = useState(Number(searchParams.get('limit') || "10"))

    const push = useCallback((overrides: Record<string, string> = {}) => {
        const vals: Record<string, string> = { storeId, userId, search, page: page.toString(), limit: limit.toString(), ...overrides }
        const p = new URLSearchParams(); Object.entries(vals).forEach(([k, v]) => { if (v) p.set(k, v) })
        router.replace(`/admin/todays-reports?${p.toString()}`, { scroll: false })
    }, [storeId, userId, search, page, limit, router])

    useEffect(() => {
        Promise.all([
            fetch('/api/admin/stores').then(r => r.json()),
            fetch('/api/admin/users').then(r => r.json())
        ]).then(([s, u]) => { setStores(Array.isArray(s) ? s : []); setUsers(Array.isArray(u) ? u : []) })
    }, [])

    const fetchReports = useCallback(() => {
        setLoading(true)
        const todayStr = dayjs().tz(TIMEZONE).format('YYYY-MM-DD')
        const p = new URLSearchParams()
        if (storeId) p.set('storeId', storeId)
        if (userId) p.set('userId', userId)
        p.set('startDate', todayStr); p.set('endDate', todayStr)
        if (search) p.set('search', search)
        p.set('page', page.toString()); p.set('limit', limit.toString())
        fetch(`/api/admin/reports?${p.toString()}`).then(r => r.json()).then(d => {
            setReports(d.data || [])
            setPagination(d.pagination || { total: 0, page: 1, totalPages: 1 })
            setSelectedReports([])
            setLoading(false)
        })
    }, [storeId, userId, search, page, limit])

    useEffect(() => { fetchReports() }, [fetchReports])

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedReports(e.target.checked ? reports.filter(r => r.status === 'Submitted').map(r => r.id) : [])
    }
    const handleSelectRow = (id: string) => setSelectedReports(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])

    const handleBulkVerify = async () => {
        if (!selectedReports.length) return
        setVerifying(true)
        try {
            const res = await fetch('/api/admin/reports/bulk-verify', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reportIds: selectedReports }) })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed')
            toast.success(`Verified ${data.count} reports!`); setSelectedReports([]); fetchReports()
        } catch (err: any) { toast.error(err.message) } finally { setVerifying(false) }
    }

    const handleExportCSV = () => {
        const headers = ["Date", "Store", "City", "Cash", "Card", "Total", "Submitted By", "Total Hours", "Status"]
        const rows = reports.map(r => [dayjs.utc(r.report_date).format('ddd, M/D/YYYY'), `"${r.store.name}"`, `"${r.store.city}"`, r.cash_amount, r.card_amount, r.total_amount, `"${r.submitted_by?.name || 'Unknown'}"`, calculateDuration(r.time_in, r.time_out).toFixed(2), r.status])
        const csv = [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
        const a = document.createElement('a'); a.href = url; a.download = `todays_reports_${dayjs().tz(TIMEZONE).format('YYYY-MM-DD')}.csv`; a.click()
    }

    const handleClear = () => { setStoreId(''); setUserId(''); setSearch(''); setPage(1); router.replace('/admin/todays-reports', { scroll: false }) }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Today's Reports</h2>
                    <p className="text-sm text-gray-500 mt-0.5">{dayjs().tz(TIMEZONE).format('dddd, MMMM D, YYYY')}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {selectedReports.length > 0 && <button onClick={handleBulkVerify} disabled={verifying} className={`bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded font-medium shadow-sm ${verifying ? 'opacity-50 cursor-not-allowed' : ''}`}>{verifying ? 'Verifying...' : `Bulk Verify (${selectedReports.length})`}</button>}
                    <Link href="/admin/reports/new" className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded font-medium shadow-sm flex items-center">+ Create Report</Link>
                    <button onClick={handleExportCSV} className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded font-medium shadow-sm">Export CSV</button>
                </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow space-y-3">
                <input type="text" placeholder="Search by store or user name..." className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" value={search} onChange={e => { setSearch(e.target.value); setPage(1); push({ search: e.target.value, page: '1' }) }} />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Filter by Store</label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-blue-500 focus:border-blue-500" value={storeId} onChange={e => { setStoreId(e.target.value); setPage(1); push({ storeId: e.target.value, page: '1' }) }}>
                            <option value="">All Stores</option>
                            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Filter by User</label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-blue-500 focus:border-blue-500" value={userId} onChange={e => { setUserId(e.target.value); setPage(1); push({ userId: e.target.value, page: '1' }) }}>
                            <option value="">All Users</option>
                            {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                        </select>
                    </div>
                    <div>
                        <button onClick={handleClear} className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded text-sm font-medium">Clear Filters</button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="bg-white p-6 shadow rounded-lg"><SkeletonRow rows={6} /></div>
            ) : (
                <div className="bg-white shadow rounded-lg overflow-hidden overflow-x-auto">
                    <table className="min-w-full divide-y border-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left w-12"><input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-gray-300 cursor-pointer" checked={reports.filter(r => r.status === 'Submitted').length > 0 && selectedReports.length === reports.filter(r => r.status === 'Submitted').length} onChange={handleSelectAll} disabled={reports.filter(r => r.status === 'Submitted').length === 0} /></th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Store</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Staff / Assignees</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submitted By</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Hours</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cash</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Card</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {reports.map((report: any) => (
                                <tr key={report.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-center">{report.status === 'Submitted' && <input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-gray-300 cursor-pointer" checked={selectedReports.includes(report.id)} onChange={() => handleSelectRow(report.id)} />}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{dayjs.utc(report.report_date).format('ddd, M/D/YYYY')}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{report.store?.name || 'Unknown'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {report.assignees?.length > 0 ? <div className="flex flex-wrap gap-1">{report.assignees.map((a: any, i: number) => <span key={i} className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">{a.name}</span>)}</div>
                                            : report.status === 'Missing' && userId ? <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">{users.find(u => u.id === userId)?.name || 'Filtered User'}</span>
                                                : <span className="text-gray-500">None</span>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {report.submitted_by?.name || (report.status === 'Missing' && userId ? <span className="italic text-gray-400">Waiting on {users.find(u => u.id === userId)?.name?.split(' ')[0] || 'User'}</span> : 'Unknown')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-indigo-600">{report.status !== 'Missing' ? `${calculateDuration(report.time_in, report.time_out).toFixed(2)}h` : '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">${Number(report.cash_amount).toFixed(2)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">${Number(report.card_amount).toFixed(2)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap font-bold">${Number(report.total_amount).toFixed(2)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${report.status === 'Verified' ? 'bg-green-100 text-green-800' : report.status === 'CorrectionRequested' ? 'bg-red-100 text-red-800' : report.status === 'Missing' ? 'bg-gray-100 text-gray-800' : report.status === 'Submitted' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>{report.status}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        {report.status === 'Missing' ? <Link href={`/admin/reports/new?storeId=${report.store_id}&date=${dayjs.utc(report.report_date).format('YYYY-MM-DD')}`} className="text-green-600 hover:text-green-900 font-bold">Create</Link>
                                            : <><Link href={`/admin/reports/${report.id}`} className="text-indigo-600 hover:text-indigo-900 mr-4">View</Link><Link href={`/admin/reports/${report.id}/edit`} className="text-orange-600 hover:text-orange-900">Edit</Link></>}
                                    </td>
                                </tr>
                            ))}
                            {reports.length === 0 && <tr><td colSpan={11} className="px-6 py-8 text-center text-gray-500">No reports for today yet.</td></tr>}
                        </tbody>
                        {reports.length > 0 && (() => {
                            const totalHours = reports.reduce((s, r) => s + (r.status !== 'Missing' ? calculateDuration(r.time_in, r.time_out) : 0), 0)
                            const totalCash = reports.reduce((s, r) => s + Number(r.cash_amount || 0), 0)
                            const totalCard = reports.reduce((s, r) => s + Number(r.card_amount || 0), 0)
                            const totalAmount = reports.reduce((s, r) => s + Number(r.total_amount || 0), 0)
                            return (
                                <tfoot>
                                    <tr className="bg-gray-100 border-t-2 border-gray-300">
                                        <td colSpan={4} className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Page Totals ({reports.filter(r => r.status !== 'Missing').length} submitted)</td>
                                        <td /><td className="px-6 py-3 font-black text-indigo-700">{totalHours.toFixed(2)}h</td>
                                        <td className="px-6 py-3 font-black text-gray-700">${totalCash.toFixed(2)}</td>
                                        <td className="px-6 py-3 font-black text-gray-700">${totalCard.toFixed(2)}</td>
                                        <td className="px-6 py-3 font-black text-blue-800 text-base">${totalAmount.toFixed(2)}</td>
                                        <td colSpan={2} />
                                    </tr>
                                </tfoot>
                            )
                        })()}
                    </table>
                    <Pagination currentPage={pagination.page} totalPages={pagination.totalPages} totalItems={pagination.total}
                        onPageChange={v => { setPage(v); push({ page: v.toString() }) }}
                        label="reports" limit={limit}
                        onLimitChange={v => { setLimit(v); setPage(1); push({ limit: v.toString(), page: '1' }) }} />
                </div>
            )}
        </div>
    )
}

export default function AdminTodaysReportsPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading...</div>}>
            <TodaysReportsContent />
        </Suspense>
    )
}
