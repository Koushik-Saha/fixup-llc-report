"use client"
import { useState, useEffect, use, useRef } from "react"
import { useReactToPrint } from "react-to-print"
import Link from "next/link"
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import timezone from "dayjs/plugin/timezone"

dayjs.extend(utc)
dayjs.extend(timezone)

const TIMEZONE = "America/Los_Angeles"

export default function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const [report, setReport] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const printRef = useRef<HTMLDivElement>(null)

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Report_${report?.store?.name || 'Store'}_${report?.report_date ? dayjs.utc(report.report_date).tz(TIMEZONE).format('YYYY-MM-DD') : 'Date'}`,
    })

    useEffect(() => {
        fetch(`/api/staff/reports/${id}`)
            .then(res => res.json())
            .then(data => {
                setReport(data)
                setLoading(false)
            })
    }, [id])

    if (loading) return (
        <div className="max-w-2xl mx-auto space-y-4 animate-pulse p-4">
            <div className="h-8 bg-gray-200 rounded w-2/3" />
            <div className="h-4 bg-gray-200 rounded w-1/3" />
            <div className="h-48 bg-gray-200 rounded-lg" />
        </div>
    )
    if (report?.error) return <div className="p-8 text-red-600 text-center font-medium">{report.error}</div>

    const netCash = Number(report.cash_amount) - Number(report.expenses_amount || 0) - Number(report.payouts_amount || 0)

    return (
        <div className="max-w-2xl mx-auto space-y-5">

            {/* ── Top Header Bar ── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800 leading-snug">
                        Report from {report.store.name}
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">{report.store.city}</p>
                </div>

                {/* Action Buttons — wrap gracefully on small screens */}
                <div className="flex flex-wrap gap-2 sm:gap-3 items-center">
                    <button
                        onClick={() => handlePrint()}
                        className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium px-3 py-2 rounded-lg transition"
                    >
                        PDF / Print
                    </button>

                    {/* Only show Edit if staff_edit_count allows */}
                    {report.status !== 'Verified' && (report.staff_edit_count ?? 0) < 2 && (
                        <Link
                            href={`/staff/report/${id}/edit`}
                            className="bg-purple-100 hover:bg-purple-200 text-purple-700 text-sm font-medium px-3 py-2 rounded-lg transition"
                        >
                            Edit Amounts
                        </Link>
                    )}

                    <Link
                        href="/staff/reports"
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 px-1 py-2"
                    >
                        Back to Reports
                    </Link>
                </div>
            </div>

            {/* ── Status + Meta Card ── */}
            <div ref={printRef} className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-100">

                {/* Date, Shift, Submitted by, Status */}
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="space-y-1">
                        <p className="text-xl font-bold text-gray-900">
                            {dayjs.utc(report.report_date).tz(TIMEZONE).format('ddd, M/D/YYYY')}
                        </p>
                        <p className="text-sm text-gray-600">
                            Shift: <span className="font-semibold">{report.time_in && report.time_out ? `${report.time_in} - ${report.time_out}` : 'N/A'}</span>
                        </p>
                        <p className="text-sm text-gray-600">
                            Submitted by: <span className="font-semibold">{report.submitted_by?.name}</span>
                            {report.submitted_by?.email && (
                                <span className="text-gray-400"> ({report.submitted_by.email})</span>
                            )}
                        </p>
                    </div>
                    <div className="flex flex-col items-start sm:items-end gap-2">
                        <span className={`px-3 py-1 text-sm font-semibold rounded-full
                            ${report.status === 'Verified' ? 'bg-green-100 text-green-800' :
                              report.status === 'CorrectionRequested' ? 'bg-red-100 text-red-800' :
                              'bg-blue-100 text-blue-800'}`}>
                            {report.status}
                        </span>
                        {report.staff_edit_count > 0 && (
                            <span className="text-xs text-gray-400 border border-gray-200 rounded px-2 py-0.5">
                                Edits: {report.staff_edit_count}/2
                            </span>
                        )}
                    </div>
                </div>

                {/* Financial Numbers Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y divide-gray-100">
                    <div className="p-4 sm:p-5">
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Cash</p>
                        <p className="text-xl font-bold text-green-700 mt-1">${Number(report.cash_amount).toFixed(2)}</p>
                    </div>
                    <div className="p-4 sm:p-5">
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Card</p>
                        <p className="text-xl font-bold text-blue-700 mt-1">${Number(report.card_amount).toFixed(2)}</p>
                    </div>
                    <div className="p-4 sm:p-5">
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Expenses</p>
                        <p className="text-xl font-bold text-red-600 mt-1">-${Number(report.expenses_amount || 0).toFixed(2)}</p>
                    </div>
                    <div className="p-4 sm:p-5">
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Payouts</p>
                        <p className="text-xl font-bold text-red-600 mt-1">-${Number(report.payouts_amount || 0).toFixed(2)}</p>
                    </div>
                </div>

                {/* Net Cash + Total */}
                <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
                    <div className="p-4 sm:p-5 flex justify-between items-center">
                        <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Net Cash</p>
                        <p className="text-lg font-bold text-gray-800">${netCash.toFixed(2)}</p>
                    </div>
                    <div className="p-4 sm:p-5 flex justify-between items-center bg-gray-50 rounded-b-xl sm:rounded-none sm:rounded-br-xl">
                        <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Total Sales</p>
                        <p className="text-2xl font-black text-gray-900">${Number(report.total_amount).toFixed(2)}</p>
                    </div>
                </div>
            </div>

            {/* Notes */}
            {report.notes && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <p className="text-xs text-yellow-700 font-semibold uppercase tracking-wide mb-1">Notes</p>
                    <p className="text-gray-700 text-sm leading-relaxed">{report.notes}</p>
                </div>
            )}

            {/* ITEM SALES SECTION */}
            {report.sale_items && report.sale_items.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                            Itemized Sales
                        </h3>
                        <span className="text-xs font-medium bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                            {report.sale_items.length} Items
                        </span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100 text-sm border-b">
                            <thead className="bg-white">
                                <tr>
                                    <th className="px-4 py-2+ text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Category</th>
                                    <th className="px-4 py-2+ text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Description</th>
                                    <th className="px-4 py-2+ text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Qty</th>
                                    <th className="px-4 py-2+ text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Unit Price</th>
                                    <th className="px-4 py-2+ text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 bg-white">
                                {report.sale_items.map((item: any) => (
                                    <tr key={item.id} className="hover:bg-gray-50/50">
                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-medium border border-gray-200">
                                                {item.category}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5 text-gray-800 font-medium">{item.description}</td>
                                        <td className="px-4 py-2.5 whitespace-nowrap text-right text-gray-600">{item.quantity}</td>
                                        <td className="px-4 py-2.5 whitespace-nowrap text-right text-gray-600">${Number(item.unit_price).toFixed(2)}</td>
                                        <td className="px-4 py-2.5 whitespace-nowrap text-right font-semibold text-gray-900">${(item.quantity * Number(item.unit_price)).toFixed(2)}</td>
                                    </tr>
                                ))}
                                <tr className="bg-gray-50">
                                    <td colSpan={4} className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Itemized Revenue:</td>
                                    <td className="px-4 py-3 text-right text-sm font-bold text-gray-900 border-t border-gray-200">
                                        ${report.sale_items.reduce((sum: number, item: any) => sum + (item.quantity * Number(item.unit_price)), 0).toFixed(2)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Receipt Images */}
            {report.images && report.images.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Receipt Images</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {report.images.map((img: any) => (
                            <a key={img.id} href={img.image_url} target="_blank" rel="noopener noreferrer"
                                className="block border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition aspect-square">
                                <img src={img.image_url} alt="Receipt" className="w-full h-full object-cover" />
                            </a>
                        ))}
                    </div>
                </div>
            )}

            {/* Back Link */}
            <div className="pb-4">
                <Link href="/staff/home" className="text-blue-600 hover:text-blue-800 font-medium text-sm">
                    Back to Dashboard
                </Link>
            </div>
        </div>
    )
}
