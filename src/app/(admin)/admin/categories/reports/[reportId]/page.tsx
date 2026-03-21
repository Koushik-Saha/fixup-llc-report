"use client"
import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import toast from "react-hot-toast"
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import timezone from "dayjs/plugin/timezone"

dayjs.extend(utc)
dayjs.extend(timezone)

export default function CategoryReportDetail({ params }: { params: Promise<{ reportId: string }> }) {
    const { reportId } = use(params)
    const router = useRouter()
    const [report, setReport] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [verifying, setVerifying] = useState(false)

    useEffect(() => {
        setLoading(true)
        fetch(`/api/admin/categories/reports/${reportId}`)
            .then(res => res.json())
            .then(data => {
                if (data.error) {
                    toast.error(data.error)
                } else {
                    setReport(data)
                }
            })
            .finally(() => setLoading(false))
    }, [reportId])

    if (loading) return <div className="p-8 text-center text-gray-500">Loading details...</div>
    if (!report) return <div className="p-8 text-center text-red-500">Report not found</div>

    const dateStr = dayjs.utc(report.report_date).format('dddd, MMMM D, YYYY')

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{report.category?.name} Report</h1>
                    <p className="text-sm text-gray-500">{dateStr}</p>
                </div>
                <div className="flex gap-2">
                    <Link href={`/admin/categories/${report.category_id}/reports`} className="bg-gray-100 text-gray-700 py-2 px-4 rounded hover:bg-gray-200 transition">
                        Back to List
                    </Link>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-100">
                    <div className="flex items-center space-x-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            report.status === 'Verified' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                            {report.status === 'Verified' ? '✅ Verified' : '📋 Submitted'}
                        </span>
                        <span className="text-sm text-gray-500">
                            Submitted by <strong>{report.submitted_by?.name}</strong>
                        </span>
                    </div>
                </div>

                <div className="p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Financial Breakdown</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                        <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100">
                            <p className="text-xs font-medium text-emerald-800 uppercase tracking-wide">Cash Received</p>
                            <p className="text-xl font-extrabold text-emerald-600 mt-1">${Number(report.cash_amount).toFixed(2)}</p>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                            <p className="text-xs font-medium text-blue-800 uppercase tracking-wide">Card Total</p>
                            <p className="text-xl font-extrabold text-blue-600 mt-1">${Number(report.card_amount).toFixed(2)}</p>
                        </div>
                        <div className="bg-amber-50 p-4 rounded-lg border border-amber-100">
                            <p className="text-xs font-medium text-amber-800 uppercase tracking-wide">Expenses</p>
                            <p className="text-xl font-extrabold text-amber-600 mt-1">${Number(report.expenses_amount).toFixed(2)}</p>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                            <p className="text-xs font-medium text-purple-800 uppercase tracking-wide">Gross Total</p>
                            <p className="text-2xl font-black text-purple-700 mt-1">${Number(report.total_amount).toFixed(2)}</p>
                        </div>
                    </div>

                    {report.notes && (
                        <div className="mb-8">
                            <h3 className="text-lg font-bold text-gray-800 mb-2">Notes</h3>
                            <div className="bg-gray-50 p-4 rounded border border-gray-200 text-gray-700 whitespace-pre-wrap">
                                {report.notes}
                            </div>
                        </div>
                    )}

                    {report.images && report.images.length > 0 && (
                        <div>
                            <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Receipts & Evidence ({report.images.length})</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                {report.images.map((img: any) => (
                                    <a key={img.id} href={img.image_url} target="_blank" rel="noopener noreferrer" className="block border rounded-lg overflow-hidden hover:opacity-80 transition hover:shadow-md cursor-pointer">
                                        <img src={img.image_url} alt="Receipt" className="w-full h-40 object-cover" />
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
