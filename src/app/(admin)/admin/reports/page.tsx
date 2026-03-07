"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { SkeletonRow } from "@/components/Skeleton"
import { Pagination } from "@/components/Pagination"

export default function AdminReportsPage() {
    const [reports, setReports] = useState<any[]>([])
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
    const [limit, setLimit] = useState(10)

    useEffect(() => {
        // Fetch filter options (stores and users)
        Promise.all([
            fetch('/api/admin/stores').then(res => res.json()),
            fetch('/api/admin/users').then(res => res.json())
        ]).then(([storesData, usersData]) => {
            setStores(Array.isArray(storesData) ? storesData : [])
            setUsers(Array.isArray(usersData) ? usersData : [])
        })
    }, [])

    const fetchReports = () => {
        setLoading(true)
        const params = new URLSearchParams()
        if (storeId) params.append('storeId', storeId)
        if (userId) params.append('userId', userId)
        if (startDate) params.append('startDate', startDate)
        if (endDate) params.append('endDate', endDate)
        if (search) params.append('search', search)
        params.append('page', page.toString())
        params.append('limit', limit.toString())

        fetch(`/api/admin/reports?${params.toString()}`)
            .then(res => res.json())
            .then(resData => {
                setReports(resData.data || [])
                setPagination(resData.pagination || { total: 0, page: 1, totalPages: 1 })
                setLoading(false)
            })
    }

    useEffect(() => {
        fetchReports()
    }, [storeId, userId, startDate, endDate, search, page, limit])

    const handleExportCSV = () => {
        // Simple client-side CSV export
        const headers = ["Date", "Store", "City", "Cash", "Card", "Total", "Submitted By", "Status"]
        const rows = reports.map(r => [
            new Date(r.report_date).toLocaleDateString(),
            `"${r.store.name}"`,
            `"${r.store.city}"`,
            r.cash_amount,
            r.card_amount,
            r.total_amount,
            `"${r.submitted_by.name}"`,
            r.status
        ])

        const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n")
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.setAttribute("href", url)
        link.setAttribute("download", `reports_export_${new Date().getTime()}.csv`)
        document.body.appendChild(link)
        link.click()
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                <h2 className="text-2xl font-bold text-gray-800">All Reports</h2>
                <div className="flex space-x-3">
                    <Link href="/admin/reports/new" className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded font-medium shadow-sm flex items-center">
                        + Create Missing Report
                    </Link>
                    <button onClick={handleExportCSV} className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded font-medium shadow-sm">
                        Export CSV
                    </button>
                </div>
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
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Store</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submitted By</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cash</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Card</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total amount</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {reports.map((report: any) => (
                                <tr key={report.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">{new Date(report.report_date).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{report.store.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{report.submitted_by?.name || 'Unknown'}</td>
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
                                            <Link href="/admin/reports/new" className="text-green-600 hover:text-green-900 font-bold">Create</Link>
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
                                    <td colSpan={8} className="px-6 py-4 text-center text-gray-500">No reports match the current filters.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    <Pagination
                        currentPage={pagination.page}
                        totalPages={pagination.totalPages}
                        totalItems={pagination.total}
                        onPageChange={setPage}
                        label="reports"
                        limit={limit}
                        onLimitChange={(newLimit) => {
                            setLimit(newLimit)
                            setPage(1)
                        }}
                    />
                </div>
            )}
        </div>
    )
}
