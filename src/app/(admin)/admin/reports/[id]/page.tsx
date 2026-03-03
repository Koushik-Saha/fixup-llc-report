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
                <Link href="/admin/reports" className="text-blue-600 hover:text-blue-800 font-medium">&larr; Back to Reports</Link>
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
            </div>
        </div>
    )
}
