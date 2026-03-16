"use client"
import { useState, useEffect, useCallback, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { SkeletonRow } from "@/components/Skeleton"
import { Pagination } from "@/components/Pagination"
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import timezone from "dayjs/plugin/timezone"

dayjs.extend(utc)
dayjs.extend(timezone)

const TIMEZONE = "America/Los_Angeles"

function AdminActivityLogsContent() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [logs, setLogs] = useState<any[]>([])
    const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 })
    const [stores, setStores] = useState<any[]>([])
    const [users, setUsers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const [storeId, setStoreId] = useState(searchParams.get('storeId') || "")
    const [userId, setUserId] = useState(searchParams.get('userId') || "")
    const [startDate, setStartDate] = useState(searchParams.get('startDate') || "")
    const [endDate, setEndDate] = useState(searchParams.get('endDate') || "")
    const [search, setSearch] = useState(searchParams.get('search') || "")
    const [page, setPage] = useState(Number(searchParams.get('page') || "1"))
    const [limit, setLimit] = useState(Number(searchParams.get('limit') || "10"))

    const push = useCallback((overrides: Record<string, string> = {}) => {
        const vals: Record<string, string> = { storeId, userId, startDate, endDate, search, page: page.toString(), limit: limit.toString(), ...overrides }
        const p = new URLSearchParams()
        Object.entries(vals).forEach(([k, v]) => { if (v) p.set(k, v) })
        router.replace(`/admin/logs?${p.toString()}`, { scroll: false })
    }, [storeId, userId, startDate, endDate, search, page, limit, router])

    useEffect(() => {
        Promise.all([
            fetch('/api/admin/stores').then(r => r.json()),
            fetch('/api/admin/users').then(r => r.json())
        ]).then(([s, u]) => { setStores(Array.isArray(s) ? s : []); setUsers(Array.isArray(u) ? u : []) })
    }, [])

    const fetchLogs = useCallback(() => {
        setLoading(true)
        const p = new URLSearchParams()
        if (storeId) p.set('storeId', storeId)
        if (userId) p.set('userId', userId)
        if (startDate) p.set('startDate', startDate)
        if (endDate) p.set('endDate', endDate)
        if (search) p.set('search', search)
        p.set('page', page.toString()); p.set('limit', limit.toString())
        fetch(`/api/admin/logs?${p.toString()}`).then(r => r.json()).then(d => {
            setLogs(d.data || [])
            setPagination(d.pagination || { total: 0, page: 1, totalPages: 1 })
            setLoading(false)
        })
    }, [storeId, userId, startDate, endDate, search, page, limit])

    useEffect(() => { fetchLogs() }, [fetchLogs])

    const handleClear = () => {
        setStoreId(''); setUserId(''); setStartDate(''); setEndDate(''); setSearch(''); setPage(1)
        router.replace('/admin/logs', { scroll: false })
    }

    const handle = (setter: (v: string) => void, key: string) => (v: string) => {
        setter(v); setPage(1); push({ [key]: v, page: '1' })
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">Global Activity Logs</h2>
                <div className="text-sm text-gray-500">Tracking every edit made across all stores</div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow space-y-4">
                <input type="text" placeholder="Search by store or user name..." className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" value={search} onChange={e => { setSearch(e.target.value); setPage(1); push({ search: e.target.value, page: '1' }) }} />
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Store</label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" value={storeId} onChange={e => handle(setStoreId, 'storeId')(e.target.value)}>
                            <option value="">All Stores</option>
                            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Filter by User</label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" value={userId} onChange={e => handle(setUserId, 'userId')(e.target.value)}>
                            <option value="">All Users</option>
                            {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                        <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" value={startDate} onChange={e => handle(setStartDate, 'startDate')(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                        <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" value={endDate} onChange={e => handle(setEndDate, 'endDate')(e.target.value)} />
                    </div>
                    <div>
                        <button onClick={handleClear} className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded font-medium">Clear</button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="bg-white p-6 shadow rounded-lg max-w-full"><SkeletonRow rows={6} /></div>
            ) : (
                <div className="bg-white shadow rounded-lg overflow-hidden overflow-x-auto">
                    <table className="min-w-full divide-y border-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">System Ref</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Context Link</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {logs.map((log: any) => {
                                let detailsObj: any = {}
                                try { detailsObj = JSON.parse(log.details || '{}') } catch (e) { }
                                let actionText = 'Performed an action'
                                if (log.action === 'USER_LOGIN') actionText = 'Logged into the portal.'
                                else if (log.action === 'REPORT_CREATE') actionText = `Submitted a Daily Report for $${detailsObj.total || 0}.`
                                else if (log.action === 'REPORT_EDIT') {
                                    actionText = `Edited a Daily Report`
                                    const changes = []
                                    if (detailsObj.cash && String(detailsObj.cash.old) !== String(detailsObj.cash.new)) changes.push(`Cash: $${detailsObj.cash.old} → $${detailsObj.cash.new}`)
                                    if (detailsObj.card && String(detailsObj.card.old) !== String(detailsObj.card.new)) changes.push(`Card: $${detailsObj.card.old} → $${detailsObj.card.new}`)
                                    if (changes.length > 0) actionText += ` (${changes.join(' | ')})`
                                }
                                else if (log.action === 'REPORT_STATUS_UPDATE') actionText = `Updated Report Status to ${detailsObj.new_status}`
                                else if (log.action === 'STORE_CREATE') actionText = `Created a new Store: ${detailsObj.name || ''}`
                                else if (log.action === 'STORE_UPDATE') actionText = `Edited Store details`
                                else if (log.action === 'USER_CREATE') actionText = `Created a new User: ${detailsObj.name || detailsObj.email || ''}`
                                else if (log.action === 'USER_UPDATE') actionText = `Updated User details`
                                else if (log.action === 'MEMBER_ASSIGNED') actionText = `Assigned a new staff member to the Store`
                                else if (log.action === 'MEMBER_REACTIVATED') actionText = `Reactivated a staff member for the Store`
                                else if (log.action === 'MEMBER_STATUS_UPDATE') actionText = `Updated Store Member status to ${detailsObj.status}`
                                return (
                                    <tr key={log.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{dayjs(log.createdAt).tz(TIMEZONE).format('M/D/YYYY, h:mm:ss A')}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${log.user.role === 'Admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>{log.user.role}</span>
                                                <span className="font-semibold text-gray-900 text-sm">{log.user.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-normal text-sm text-gray-800"><div className="font-medium">{actionText}</div></td>
                                        <td className="px-6 py-4 whitespace-nowrap"><div className="text-xs text-gray-500 bg-gray-100 inline-block px-2 py-0.5 rounded border border-gray-200 font-mono tracking-tight">{log.action}</div></td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            {log.entity === 'DailyReport' && <Link href={`/admin/reports/${log.entity_id}`} className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 px-3 py-1.5 rounded-md">View Report</Link>}
                                            {log.entity === 'Store' && <Link href={`/admin/stores/${log.entity_id}/edit`} className="text-blue-600 hover:text-blue-900 bg-blue-50 px-3 py-1.5 rounded-md">View Store</Link>}
                                        </td>
                                    </tr>
                                )
                            })}
                            {logs.length === 0 && <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">No activity logs match the current filters.</td></tr>}
                        </tbody>
                    </table>
                    <Pagination currentPage={pagination.page} totalPages={pagination.totalPages} totalItems={pagination.total}
                        onPageChange={v => { setPage(v); push({ page: v.toString() }) }}
                        label="logs" limit={limit}
                        onLimitChange={v => { setLimit(v); setPage(1); push({ limit: v.toString(), page: '1' }) }} />
                </div>
            )}
        </div>
    )
}

export default function AdminActivityLogsPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading...</div>}>
            <AdminActivityLogsContent />
        </Suspense>
    )
}
