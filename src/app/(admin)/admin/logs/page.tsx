"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { SkeletonRow } from "@/components/Skeleton"

export default function AdminActivityLogsPage() {
    const [logs, setLogs] = useState<any[]>([])
    const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 })
    const [stores, setStores] = useState<any[]>([])
    const [users, setUsers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    // Filters
    const [storeId, setStoreId] = useState("")
    const [userId, setUserId] = useState("")
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")
    const [search, setSearch] = useState("")
    const [page, setPage] = useState(1)

    useEffect(() => {
        // Fetch filter options (stores and users)
        Promise.all([
            fetch('/api/admin/stores').then(res => res.json()),
            fetch('/api/admin/users').then(res => res.json())
        ]).then(([storesData, usersData]) => {
            setStores(storesData)
            setUsers(usersData)
        })
    }, [])

    const fetchLogs = () => {
        setLoading(true)
        const params = new URLSearchParams()
        if (storeId) params.append('storeId', storeId)
        if (userId) params.append('userId', userId)
        if (startDate) params.append('startDate', startDate)
        if (endDate) params.append('endDate', endDate)
        if (search) params.append('search', search)
        params.append('page', page.toString())

        fetch(`/api/admin/logs?${params.toString()}`)
            .then(res => res.json())
            .then(resData => {
                setLogs(resData.data || [])
                setPagination(resData.pagination || { total: 0, page: 1, totalPages: 1 })
                setLoading(false)
            })
    }

    useEffect(() => {
        fetchLogs()
    }, [storeId, userId, startDate, endDate, search, page])

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">Global Activity Logs</h2>
                <div className="text-sm text-gray-500">Tracking every edit made across all stores</div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-lg shadow space-y-4">
                <div className="w-full">
                    <input type="text" placeholder="Search by store or user name..." className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Store</label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" value={storeId} onChange={e => { setStoreId(e.target.value); setPage(1); }}>
                            <option value="">All Stores</option>
                            {stores.map(store => (
                                <option key={store.id} value={store.id}>{store.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Filter by User</label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" value={userId} onChange={e => { setUserId(e.target.value); setPage(1); }}>
                            <option value="">All Users</option>
                            {users.map(user => (
                                <option key={user.id} value={user.id}>{user.name} ({user.role})</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                        <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(1); }} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                        <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" value={endDate} onChange={e => { setEndDate(e.target.value); setPage(1); }} />
                    </div>
                    <div>
                        <button onClick={() => { setStoreId(""); setUserId(""); setStartDate(""); setEndDate(""); setSearch(""); setPage(1); }} className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded font-medium">Clear</button>
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
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action & Entity</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase flex-1 whitespace-normal">Raw Details</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Context Link</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {logs.map((log: any) => {
                                let detailsObj: any = {}
                                try {
                                    detailsObj = JSON.parse(log.details || '{}')
                                } catch (e) { }

                                // Format details nicely for display depending on action
                                let detailContent = null
                                if (log.action === 'USER_LOGIN') detailContent = <span className="text-gray-500 italic">User signed in.</span>
                                else if (log.action === 'REPORT_EDIT') {
                                    detailContent = (
                                        <div className="grid gap-1 text-xs">
                                            {detailsObj.cash && String(detailsObj.cash.old) !== String(detailsObj.cash.new) && (
                                                <div className="flex gap-2 items-center">
                                                    <span className="font-medium text-gray-600">Cash:</span>
                                                    <span className="line-through text-red-400">${detailsObj.cash.old}</span>
                                                    <span className="text-gray-400">→</span>
                                                    <span className="text-green-600 font-medium">${detailsObj.cash.new}</span>
                                                </div>
                                            )}
                                            {detailsObj.card && String(detailsObj.card.old) !== String(detailsObj.card.new) && (
                                                <div className="flex gap-2 items-center">
                                                    <span className="font-medium text-gray-600">Card:</span>
                                                    <span className="line-through text-red-400">${detailsObj.card.old}</span>
                                                    <span className="text-gray-400">→</span>
                                                    <span className="text-green-600 font-medium">${detailsObj.card.new}</span>
                                                </div>
                                            )}
                                        </div>
                                    )
                                } else {
                                    detailContent = (
                                        <div className="flex flex-wrap gap-2 text-xs">
                                            {Object.keys(detailsObj).map((key) => {
                                                const val = detailsObj[key]
                                                if (typeof val === 'object' && val !== null) {
                                                    return (
                                                        <div key={key} className="bg-gray-50 border border-gray-200 rounded px-2 py-1 flex gap-1.5 items-center">
                                                            <span className="font-semibold text-gray-600 capitalize">{key.replace(/_/g, ' ')}:</span>
                                                            <span className="text-gray-400 italic">Object</span>
                                                        </div>
                                                    )
                                                }
                                                return (
                                                    <div key={key} className="bg-gray-50 border border-gray-200 rounded px-2 py-1 flex gap-1.5 items-center">
                                                        <span className="font-semibold text-gray-600 capitalize">{key.replace(/_/g, ' ')}:</span>
                                                        <span className="text-gray-900">{String(val)}</span>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )
                                }

                                return (
                                    <tr key={log.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(log.createdAt).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${log.user.role === 'Admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                                                    {log.user.role}
                                                </span>
                                                <span className="font-semibold text-gray-900 text-sm">{log.user.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-bold text-gray-800">{log.action}</div>
                                            <div className="text-xs text-gray-500 mt-1">Entity: {log.entity}</div>
                                            <div className="text-[10px] text-gray-400 font-mono mt-0.5">{log.entity_id}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-700 max-w-sm truncate whitespace-normal break-words leading-tight">
                                            {detailContent}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            {log.entity === 'DailyReport' && (
                                                <Link href={`/admin/reports/${log.entity_id}`} className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 px-3 py-1.5 rounded-md">View Report</Link>
                                            )}
                                            {log.entity === 'Store' && (
                                                <Link href={`/admin/stores/${log.entity_id}/edit`} className="text-blue-600 hover:text-blue-900 bg-blue-50 px-3 py-1.5 rounded-md">View Store</Link>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                            {logs.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">No activity logs match the current filters.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* Pagination Controls */}
                    <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex items-center justify-between">
                        <div className="text-sm text-gray-700">
                            Showing page <span className="font-medium">{pagination.page}</span> of <span className="font-medium">{Math.max(1, pagination.totalPages)}</span> ({pagination.total} total logs)
                        </div>
                        <div className="flex space-x-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={pagination.page <= 1}
                                className="px-3 py-1 border border-gray-300 rounded bg-white text-gray-700 disabled:opacity-50"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                                disabled={pagination.page >= pagination.totalPages}
                                className="px-3 py-1 border border-gray-300 rounded bg-white text-gray-700 disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
