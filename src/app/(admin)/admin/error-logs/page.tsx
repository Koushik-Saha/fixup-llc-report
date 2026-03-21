"use client"
import { useEffect, useState } from "react"
import dayjs from "dayjs"
import { Pagination } from "@/components/Pagination"

export default function ErrorLogsPage() {
    const [logs, setLogs] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const limit = 50
    const [total, setTotal] = useState(0)

    useEffect(() => {
        setLoading(true)
        fetch(`/api/admin/error-logs?page=${page}&limit=${limit}`)
            .then(res => res.json())
            .then(data => {
                setLogs(data.logs || [])
                setTotal(data.total || 0)
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }, [page])

    const totalPages = Math.ceil(total / limit)

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Error Logs</h2>

            <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Source</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Message</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Details</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-10 text-center text-gray-500"><div className="animate-pulse">Loading logs...</div></td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-10 text-center text-gray-500">No error logs found. You are doing great!</td>
                                </tr>
                            ) : logs.map(log => (
                                <tr key={log.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 border-r border-gray-100 align-top">
                                        <div className="font-medium text-gray-800">
                                            {dayjs(log.createdAt).format("MMM D, YYYY")}
                                        </div>
                                        <div className="text-xs">
                                            {dayjs(log.createdAt).format("h:mm:ss A")}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap align-top">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                            log.source === 'Frontend' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                                        }`}>
                                            {log.source}
                                        </span>
                                        {log.method && <p className="text-xs text-gray-500 mt-1">{log.method} {log.path}</p>}
                                        {!log.method && log.path && <p className="text-xs text-gray-500 mt-1">{log.path}</p>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap align-top">
                                        {log.user ? (
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">{log.user.name}</div>
                                                <div className="text-sm text-gray-500">{log.user.email}</div>
                                            </div>
                                        ) : (
                                            <span className="text-sm text-gray-400">Anonymous / System</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs xl:max-w-md break-words align-top">
                                        <div className="font-semibold text-red-600 mb-1">{log.message}</div>
                                        {log.payload && log.payload !== "{}" && (
                                            <details className="mt-2 text-xs">
                                                <summary className="text-blue-600 hover:text-blue-800 cursor-pointer font-medium">View Payload</summary>
                                                <pre className="mt-2 text-[10px] bg-gray-100 text-gray-800 p-2 rounded overflow-x-auto border border-gray-200">
                                                    {log.payload}
                                                </pre>
                                            </details>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 align-top w-1/3">
                                        {log.stack_trace ? (
                                            <details className="text-sm">
                                                <summary className="text-gray-500 hover:text-gray-700 cursor-pointer text-xs font-medium">Show Stack Trace</summary>
                                                <pre className="mt-2 text-[10px] bg-gray-900 text-gray-100 p-2 rounded overflow-x-auto">
                                                    {log.stack_trace}
                                                </pre>
                                            </details>
                                        ) : (
                                            <span className="text-xs text-gray-400 italic">No stack trace</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <div className="bg-white px-2 py-3 border-t border-gray-200 sm:px-4">
                        <Pagination 
                            currentPage={page} 
                            totalPages={totalPages} 
                            totalItems={total} 
                            limit={limit}
                            onPageChange={setPage} 
                            label="logs" 
                        />
                    </div>
                )}
            </div>
        </div>
    )
}
