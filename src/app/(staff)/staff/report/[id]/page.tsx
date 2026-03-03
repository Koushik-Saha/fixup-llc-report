"use client"
import { useState, useEffect, use } from "react"
import Link from "next/link"

export default function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const [report, setReport] = useState<any>(null)
    const [loading, setLoading] = useState(true)

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
                <div className="text-right">
                    <span className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full ${report.status === 'Submitted' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                        {report.status}
                    </span>
                    <p className="text-xs text-gray-400 mt-2">{new Date(report.createdAt).toLocaleString()}</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-6 bg-gray-50 p-4 rounded border">
                <div>
                    <p className="text-sm text-gray-500 font-medium">Report Date</p>
                    <p className="text-lg font-bold">{new Date(report.report_date).toLocaleDateString()}</p>
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
                <div className="col-span-2 pt-2 border-t border-gray-200 flex justify-between items-center">
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
