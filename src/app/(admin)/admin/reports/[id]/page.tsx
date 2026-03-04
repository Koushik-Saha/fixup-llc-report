"use client"
import { useState, useEffect, use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function AdminReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [report, setReport] = useState<any>(null)
    const [loading, setLoading] = useState(true)

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
                    <Link href={`/admin/reports/${id}/edit`} className="bg-purple-100 text-purple-700 px-3 py-1.5 rounded-md hover:bg-purple-200 font-medium text-sm transition">
                        Edit Amounts
                    </Link>
                    <Link href="/admin/reports" className="text-blue-600 hover:text-blue-800 font-medium">&larr; Back to Reports</Link>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border-t-4 border-blue-500 space-y-6">
                <div className="flex justify-between items-start border-b pb-4">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800">{new Date(report.report_date).toLocaleDateString()}</h3>
                        <p className="text-gray-500 mt-1">Submitted by: {report.submitted_by.name} ({report.submitted_by.email})</p>
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

                <div className="grid grid-cols-2 gap-6 bg-gray-50 p-4 rounded border">
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Cash Amount</p>
                        <p className="text-xl font-bold text-green-700">${Number(report.cash_amount).toFixed(2)}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Card Amount</p>
                        <p className="text-xl font-bold text-blue-700">${Number(report.card_amount).toFixed(2)}</p>
                    </div>
                    <div className="col-span-2 pt-2 border-t border-gray-200 flex justify-between items-center">
                        <p className="text-gray-600 font-bold uppercase">Total Computed</p>
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
                        <h3 className="text-lg font-semibold mb-4">Receipt Images ({report.images.length})</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {report.images.map((img: any) => (
                                <a key={img.id} href={img.image_url} target="_blank" rel="noopener noreferrer" className="block border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition">
                                    <img src={img.image_url} alt="Receipt" className="w-full h-48 object-cover" />
                                </a>
                            ))}
                        </div>
                    </div>
                )}

                {report.edit_logs && report.edit_logs.length > 0 && (
                    <div className="mt-8 pt-8 border-t border-gray-200">
                        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                            Edit History ({report.edit_logs.length})
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
                                            <span className="text-gray-500">{new Date(log.createdAt).toLocaleString()}</span>
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
        </div>
    )
}
