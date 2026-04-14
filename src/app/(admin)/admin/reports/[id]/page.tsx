"use client"
import { useState, useEffect, use, useRef } from "react"
import { useReactToPrint } from "react-to-print"
import Link from "next/link"
import { useRouter } from "next/navigation"
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import timezone from "dayjs/plugin/timezone"

dayjs.extend(utc)
dayjs.extend(timezone)

const TIMEZONE = "America/Los_Angeles"

export default function AdminReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [report, setReport] = useState<any>(null)
    const [notices, setNotices] = useState<any>(null)
    const [lightboxImg, setLightboxImg] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const printRef = useRef<HTMLDivElement>(null)

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Report_${report?.store?.name || 'Store'}_${report?.report_date ? dayjs.utc(report.report_date).format('YYYY-MM-DD') : 'Date'}`,
    })

    useEffect(() => {
        fetch(`/api/admin/reports/${id}`)
            .then(res => res.json())
            .then(data => {
                setReport(data)
                setLoading(false)
            })
    }, [id])

    const handleStatusChange = async (newStatus: string) => {
        const res = await fetch(`/api/admin/reports/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus })
        })
        if (res.ok) {
            setReport({ ...report, status: newStatus })
            router.refresh()
        }
    }

    if (loading) return <div>Loading details...</div>
    if (report?.error) return <div className="text-red-600">{report.error}</div>

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">Report from {report.store.name}</h2>
                <div className="flex gap-4 items-center">
                    <button
                        onClick={() => handlePrint()}
                        className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-md hover:bg-gray-200 font-medium text-sm transition flex items-center gap-1"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                        PDF / Print
                    </button>
                    <Link href={`/admin/reports/${id}/edit`} className="bg-purple-100 text-purple-700 px-3 py-1.5 rounded-md hover:bg-purple-200 font-medium text-sm transition">
                        Edit Amounts
                    </Link>
                    <Link href="/admin/reports" className="text-blue-600 hover:text-blue-800 font-medium">&larr; Back to Reports</Link>
                </div>
            </div>

            <div ref={printRef} className="bg-white p-6 rounded-lg shadow border-t-4 border-blue-500 space-y-6">
                <div className="flex justify-between items-start border-b pb-4">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800">{dayjs.utc(report.report_date).format('dddd, M/D/YYYY')}</h3>
                        <p className="text-gray-500 mt-1">Shift: {report.time_in ? <span className="font-semibold text-gray-700">{report.time_in} - {report.time_out}</span> : 'N/A'}</p>
                        <p className="text-gray-500">Submitted by: <span className="font-medium text-gray-700">{report.submitted_by.name}</span> ({report.submitted_by.email})</p>
                        {report.assignees && report.assignees.length > 0 && (
                            <p className="text-gray-500 mt-1">Personnel Assigned: {report.assignees.map((a: any, i: number) => (
                                <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100 mr-1">{a.name}</span>
                            ))}</p>
                        )}
                    </div>
                    <div className="text-right space-y-2">
                        <span className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full ${report.status === 'Submitted' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                            {report.status}
                        </span>
                        <div className="flex space-x-2 mt-2">
                            {report.status !== 'Verified' && (
                                <button onClick={() => handleStatusChange("Verified")} className="text-xs bg-green-500 text-white py-1 px-2 rounded hover:bg-green-600">Mark Verified</button>
                            )}
                            {report.status !== 'CorrectionRequested' && (
                                <button onClick={() => handleStatusChange("CorrectionRequested")} className="text-xs bg-yellow-500 text-white py-1 px-2 rounded hover:bg-yellow-600">Request Correction</button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-gray-50 p-4 rounded border">
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Cash Amount</p>
                        <p className="text-xl font-bold text-green-700">${Number(report.cash_amount).toFixed(2)}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Card Amount</p>
                        <p className="text-xl font-bold text-blue-700">${Number(report.card_amount).toFixed(2)}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Expenses</p>
                        <p className="text-xl font-bold text-red-600">-${Number(report.expenses_amount || 0).toFixed(2)}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Payouts</p>
                        <p className="text-xl font-bold text-red-600">-${Number(report.payouts_amount || 0).toFixed(2)}</p>
                    </div>
                    <div className="col-span-1 sm:col-span-2 pt-2 border-t border-gray-200 flex justify-between items-center">
                        <p className="text-gray-600 font-bold uppercase">Net Cash</p>
                        <p className="text-lg font-bold text-gray-800">${(Number(report.cash_amount) - Number(report.expenses_amount || 0) - Number(report.payouts_amount || 0)).toFixed(2)}</p>
                    </div>
                    <div className="col-span-1 sm:col-span-2 pt-2 border-t border-gray-200 flex justify-between items-center">
                        <p className="text-gray-600 font-bold uppercase">Total Computed</p>
                        <p className="text-2xl font-black text-gray-900">${Number(report.total_amount).toFixed(2)}</p>
                    </div>
                </div>

                {report.notes && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                        <h3 className="text-sm font-bold text-yellow-800 uppercase tracking-wide mb-2 flex items-center gap-2">
                            <span>📝</span> Staff Notes
                        </h3>
                        <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-line">{report.notes}</p>
                    </div>
                )}

                {report.sale_items && report.sale_items.length > 0 && (
                    <div className="bg-white border rounded-lg shadow-sm overflow-hidden mt-6">
                        <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
                            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide flex items-center gap-2">
                                <span>🏷️</span> Itemized Sales
                            </h3>
                            <span className="text-xs font-semibold bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                {report.sale_items.length} Items
                            </span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="bg-white">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Qty</th>
                                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Unit Price</th>
                                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {report.sale_items.map((item: any) => (
                                        <tr key={item.id}>
                                            <td className="px-4 py-2 whitespace-nowrap">
                                                <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-medium">
                                                    {item.category}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2 text-gray-900">{item.description}</td>
                                            <td className="px-4 py-2 whitespace-nowrap text-right text-gray-700">{item.quantity}</td>
                                            <td className="px-4 py-2 whitespace-nowrap text-right text-gray-700">${Number(item.unit_price).toFixed(2)}</td>
                                            <td className="px-4 py-2 whitespace-nowrap text-right font-semibold text-gray-900">${(item.quantity * Number(item.unit_price)).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                    <tr className="bg-gray-50 font-bold">
                                        <td colSpan={4} className="px-4 py-3 text-right text-gray-900">Total Itemized Revenue:</td>
                                        <td className="px-4 py-3 text-right text-green-700">
                                            ${report.sale_items.reduce((sum: number, item: any) => sum + (item.quantity * Number(item.unit_price)), 0).toFixed(2)}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {report.images && report.images.length > 0 && (
                    <div>
                        <h3 className="text-lg font-semibold mb-4">Receipt Images ({report.images.length})</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {report.images.map((img: any) => (
                                <button key={img.id} onClick={() => setLightboxImg(img.image_url)} className="block w-full border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition text-left">
                                    <img src={img.image_url} alt="Receipt" className="w-full h-48 object-cover" />
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {report.edit_logs && report.edit_logs.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                        <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <span className="text-gray-500">🕐</span> Edit History
                            <span className="bg-gray-100 text-gray-600 text-xs font-semibold px-2 py-0.5 rounded-full">{report.edit_logs.length}</span>
                        </h3>
                        <div className="space-y-4">
                            {report.edit_logs.map((log: any) => {
                                const changes = JSON.parse(log.changes)
                                return (
                                    <div key={log.id} className="bg-white border rounded-lg p-4 shadow-sm text-sm">
                                        <div className="flex justify-between items-center mb-3">
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${log.user.role === 'Admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                                                    {log.user.role} Edit
                                                </span>
                                                <span className="font-semibold text-gray-900">{log.user.name}</span>
                                            </div>
                                            <span className="text-gray-500">{dayjs(log.createdAt).tz(TIMEZONE).format('M/D/YYYY, h:mm A')}</span>
                                        </div>
                                        <div className="grid gap-2 bg-gray-50 p-3 rounded text-gray-700">
                                            {changes.cash && changes.cash.old !== changes.cash.new && (
                                                <div className="flex justify-between border-b border-gray-200 pb-1">
                                                    <span>Cash:</span>
                                                    <span><span className="line-through text-red-500 mr-2">${changes.cash.old}</span> <span className="text-green-600 font-medium">${changes.cash.new}</span></span>
                                                </div>
                                            )}
                                            {changes.card && changes.card.old !== changes.card.new && (
                                                <div className="flex justify-between border-b border-gray-200 pb-1">
                                                    <span>Card:</span>
                                                    <span><span className="line-through text-red-500 mr-2">${changes.card.old}</span> <span className="text-green-600 font-medium">${changes.card.new}</span></span>
                                                </div>
                                            )}
                                            {changes.expenses && changes.expenses.old !== changes.expenses.new && (
                                                <div className="flex justify-between border-b border-gray-200 pb-1">
                                                    <span>Expenses:</span>
                                                    <span><span className="line-through text-red-500 mr-2">${changes.expenses.old}</span> <span className="text-red-500 font-medium">${changes.expenses.new}</span></span>
                                                </div>
                                            )}
                                            {changes.payouts && changes.payouts.old !== changes.payouts.new && (
                                                <div className="flex justify-between border-b border-gray-200 pb-1">
                                                    <span>Payouts:</span>
                                                    <span><span className="line-through text-red-500 mr-2">${changes.payouts.old}</span> <span className="text-red-500 font-medium">${changes.payouts.new}</span></span>
                                                </div>
                                            )}
                                            <div className="flex justify-between font-bold pt-1">
                                                <span>Total Impact:</span>
                                                <span><span className="line-through text-red-500 mr-2">${changes.total.old}</span> <span className="text-gray-900">${changes.total.new}</span></span>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Lightbox Modal */}
            {lightboxImg && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 p-4 cursor-zoom-out"
                    onClick={() => setLightboxImg(null)}
                >
                    <button className="absolute top-6 right-6 text-white hover:text-gray-300">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                    <img
                        src={lightboxImg}
                        className="max-w-full max-h-[90vh] object-contain cursor-default"
                        alt="Receipt Fullscreen"
                        onClick={(e) => e.stopPropagation()} // Let admins right-click the image safely
                    />
                </div>
            )}
        </div>
    )
}
