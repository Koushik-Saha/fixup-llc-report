"use client"
import { useState, useEffect, use, useRef } from "react"
import { useReactToPrint } from "react-to-print"
import Link from "next/link"

export default function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const [report, setReport] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const printRef = useRef<HTMLDivElement>(null)

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Report_${report?.store?.name || 'Store'}_${report?.report_date ? new Date(report.report_date).toLocaleDateString('en-US', { timeZone: 'UTC' }) : 'Date'}`,
    })

    useEffect(() => {
        fetch(`/api/staff/reports/${id}`)
            .then(res => res.json())
            .then(data => {
                setReport(data)
                setLoading(false)
            })
    }, [id])

    if (loading) return <div>Loading details...</div>
    if (report?.error) return <div className="text-red-600">{report.error}</div>

    return (
        <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-md space-y-6">
            <div className="flex justify-between items-start border-b pb-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Report Details</h2>
                    <p className="text-gray-500 mt-1">{report.store.name} ({report.store.city})</p>
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                    <span className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full ${report.status === 'Submitted' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                        {report.status}
                    </span>
                    <button
                        onClick={() => handlePrint()}
                        className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-md hover:bg-gray-200 font-medium text-sm transition flex items-center gap-1 mt-1"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                        PDF
                    </button>
                    <p className="text-xs text-gray-400 mt-1">{new Date(report.createdAt).toLocaleString()}</p>
                </div>
            </div>

            <div ref={printRef} className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-gray-50 p-4 rounded border">
                <div>
                    <p className="text-sm text-gray-500 font-medium">Report Date</p>
                    <p className="text-lg font-bold">{new Date(report.report_date).toLocaleDateString('en-US', { timeZone: 'UTC' })}</p>
                </div>
                <div>
                    <p className="text-sm text-gray-500 font-medium">Shift Times</p>
                    <p className="text-lg font-bold">{report.time_in ? `${report.time_in} - ${report.time_out}` : 'N/A'}</p>
                </div>
                <div>
                    <p className="text-sm text-gray-500 font-medium">Submitted By</p>
                    <p className="text-lg font-bold">{report.submitted_by.name}</p>
                </div>
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
                    <p className="text-gray-600 font-bold uppercase">Total Input</p>
                    <p className="text-2xl font-black text-gray-900">${Number(report.total_amount).toFixed(2)}</p>
                </div>
            </div>

            {report.notes && (
                <div>
                    <h3 className="text-lg font-semibold mb-2">Notes</h3>
                    <p className="text-gray-700 bg-yellow-50 p-3 rounded">{report.notes}</p>
                </div>
            )}

            {report.images && report.images.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold mb-4">Receipt Images</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {report.images.map((img: any) => (
                            <a key={img.id} href={img.image_url} target="_blank" rel="noopener noreferrer" className="block border rounded overflow-hidden shadow-sm hover:shadow-md transition">
                                <img src={img.image_url} alt="Receipt" className="w-full h-32 object-cover" />
                            </a>
                        ))}
                    </div>
                </div>
            )}

            <div className="pt-4">
                <Link href="/staff/home" className="text-blue-600 hover:text-blue-800 font-medium">&larr; Back to Dashboard</Link>
            </div>
        </div>
    )
}
