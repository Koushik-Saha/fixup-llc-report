"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { SkeletonRow } from "@/components/Skeleton"
import { Pagination } from "@/components/Pagination"

type ReportSummary = {
    id: string
    report_date: string
    total_amount: string
    status: string
    staff_edit_count: number
    store: {
        name: string
    }
}

export default function StaffReportsPage() {
    const [reports, setReports] = useState<ReportSummary[]>([])
    const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [page, setPage] = useState(1)
    const [limit, setLimit] = useState(10)

    useEffect(() => {
        setLoading(true)
        fetch(`/api/staff/reports?page=${page}&limit=${limit}`)
            .then(res => res.json())
            .then(data => {
                if (data.error) {
                    setError(data.error)
                } else {
                    setReports(data.data)
                    setPagination(data.pagination)
                }
                setLoading(false)
            })
            .catch(err => {
                setError("Failed to load reports")
                setLoading(false)
            })
    }, [page, limit])

    if (loading) return <div className="p-6 bg-white shadow rounded-lg max-w-4xl mx-auto"><SkeletonRow rows={5} /></div>
    if (error) return <div className="p-8 text-red-500 text-center">{error}</div>

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">My Required Reports</h1>
                <Link href="/staff/home" className="text-blue-600 hover:text-blue-800 font-medium">
                    &larr; Back to Home
                </Link>
            </div>

            <div className="bg-white shadow overflow-hidden overflow-x-auto sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Store</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Sales</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {reports.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                                    No past reports found.
                                </td>
                            </tr>
                        ) : reports.map((report) => (
                            <tr key={report.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {new Date(report.report_date).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {report.store.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    ${Number(report.total_amount).toFixed(2)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                        ${report.status === 'Verified' ? 'bg-green-100 text-green-800' :
                                            report.status === 'CorrectionRequested' ? 'bg-red-100 text-red-800' :
                                                report.status === 'Missing' ? 'bg-gray-100 text-gray-800' :
                                                    'bg-yellow-100 text-yellow-800'}`}>
                                        {report.status}
                                    </span>
                                    {report.staff_edit_count > 0 && (
                                        <span className="ml-2 text-xs text-gray-500 border border-gray-200 rounded px-1">
                                            Edits: {report.staff_edit_count}/2
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    {report.status === 'Missing' ? (
                                        // Is it today or yesterday?
                                        new Date(report.report_date).getTime() >= new Date(new Date().setDate(new Date().getDate() - 1)).setHours(0, 0, 0, 0) ? (
                                            <Link href="/staff/report/new" className="text-blue-600 hover:text-blue-900 font-bold">Submit</Link>
                                        ) : (
                                            <span className="text-gray-400">Locked</span>
                                        )
                                    ) : (
                                        <>
                                            <Link
                                                href={`/staff/report/${report.id}`}
                                                className="text-blue-600 hover:text-blue-900 mr-4"
                                            >
                                                View
                                            </Link>

                                            {/* Edit Logic: Block if >= 2 edits */}
                                            {report.staff_edit_count >= 2 ? (
                                                <span className="text-gray-400 cursor-not-allowed" title="Maximum edits reached">Locked</span>
                                            ) : (
                                                <Link
                                                    href={`/staff/report/${report.id}/edit`}
                                                    className="text-orange-600 hover:text-orange-900"
                                                >
                                                    Edit
                                                </Link>
                                            )}
                                        </>
                                    )}

                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <Pagination
                    currentPage={pagination.page}
                    totalPages={pagination.totalPages}
                    totalItems={pagination.total}
                    onPageChange={setPage}
                    label="calendar days"
                    limit={limit}
                    onLimitChange={(newLimit) => {
                        setLimit(newLimit)
                        setPage(1)
                    }}
                />
            </div>
        </div>
    )
}
