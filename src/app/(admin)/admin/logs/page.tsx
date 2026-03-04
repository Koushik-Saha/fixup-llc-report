"use client"
import { useState, useEffect } from "react"
import Link from "next/link"

export default function AdminActivityLogsPage() {
    const [logs, setLogs] = useState<any[]>([])
    const [stores, setStores] = useState<any[]>([])
    const [users, setUsers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    // Filters
    const [storeId, setStoreId] = useState("")
    const [userId, setUserId] = useState("")
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")

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

        fetch(`/api/admin/logs?${params.toString()}`)
            .then(res => res.json())
            .then(data => {
                setLogs(data)
                setLoading(false)
            })
    }

    useEffect(() => {
        fetchLogs()
    }, [storeId, userId, startDate, endDate])

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">Global Activity Logs</h2>
                <div className="text-sm text-gray-500">Tracking every edit made across all stores</div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-lg shadow grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Store</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" value={storeId} onChange={e => setStoreId(e.target.value)}>
                        <option value="">All Stores</option>
                        {stores.map(store => (
                            <option key={store.id} value={store.id}>{store.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Filter by User</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" value={userId} onChange={e => setUserId(e.target.value)}>
                        <option value="">All Users</option>
                        {users.map(user => (
                            <option key={user.id} value={user.id}>{user.name} ({user.role})</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
                <div>
                    <button onClick={() => { setStoreId(""); setUserId(""); setStartDate(""); setEndDate(""); }} className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded font-medium">Clear</button>
                </div>
            </div>

            {loading ? (
                <div>Loading activity logs...</div>
            ) : (
                <div className="bg-white shadow rounded-lg overflow-hidden overflow-x-auto">
                    <table className="min-w-full divide-y border-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Store & Report Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action Overview</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Details</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {logs.map((log: any) => {
                                const changes = JSON.parse(log.changes)
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
                                            <div className="text-sm font-medium text-gray-900">{log.report.store.name}</div>
                                            <div className="text-xs text-gray-500">Report from: {new Date(log.report.report_date).toLocaleDateString()}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-700">
                                            <div className="grid gap-1">
                                                {changes.cash && changes.cash.old !== changes.cash.new && (
                                                    <div className="flex gap-2 text-xs">
                                                        <span className="font-medium">Cash:</span>
                                                        <span className="line-through text-red-500">${changes.cash.old}</span> → <span className="text-green-600">${changes.cash.new}</span>
                                                    </div>
                                                )}
                                                {changes.card && changes.card.old !== changes.card.new && (
                                                    <div className="flex gap-2 text-xs">
                                                        <span className="font-medium">Card:</span>
                                                        <span className="line-through text-red-500">${changes.card.old}</span> → <span className="text-green-600">${changes.card.new}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <Link href={`/admin/reports/${log.report.id}`} className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 px-3 py-1.5 rounded-md">View Report</Link>
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
                </div>
            )}
        </div>
    )
}
