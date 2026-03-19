"use client"
import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import toast from "react-hot-toast"

export default function TaxExportDashboard() {
    const { data: session } = useSession()
    const isAdmin = session?.user?.role === 'Admin'

    const [year, setYear] = useState(new Date().getFullYear().toString())
    const [loading, setLoading] = useState(false)
    const [reports, setReports] = useState<any[]>([])

    const fetchPreview = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/admin/payroll/export?year=${year}&format=json`)
            if (res.ok) {
                const data = await res.json()
                setReports(data.records || [])
            } else {
                toast.error("Failed to load tax preview")
            }
        } catch (e) {
            toast.error("Network error")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchPreview()
    }, [year])

    const downloadCSV = () => {
        window.location.href = `/api/admin/payroll/export?year=${year}&format=csv`
    }

    if (!isAdmin) {
        return <div className="p-8 text-center text-red-500">Access Denied</div>
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
                        🧮 Payroll Tax Exports
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Generate accountant-ready annual payroll summaries and estimated withholdings.
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={downloadCSV}
                        className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded font-medium shadow-sm transition flex items-center gap-2"
                    >
                        <span>📥</span> Export CSV Spreadsheet
                    </button>
                    <button
                        onClick={() => toast("PDF processing requires external rendering engine on Vercel. Download CSV for now.", { icon: "ℹ️" })}
                        className="bg-gray-100 text-gray-400 py-2 px-4 rounded font-medium cursor-not-allowed flex items-center gap-2"
                        title="PDF export coming in future update"
                    >
                        <span>📄</span> Export PDF Folio
                    </button>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wider">Tax Year</label>
                    <select
                        className="w-48 px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg font-bold focus:ring-purple-500 focus:border-purple-500"
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                    >
                        <option value="2026">2026</option>
                        <option value="2025">2025</option>
                        <option value="2024">2024</option>
                    </select>
                </div>
                <div className="text-sm text-gray-500 mt-4">
                    Showing <strong className="text-gray-900">{reports.length}</strong> payroll profiles for the {year} tax year.
                </div>
            </div>

            {loading ? (
                <div className="p-12 text-center text-gray-400 animate-pulse">Calculating tax estimates...</div>
            ) : (
                <div className="bg-white shadow-sm rounded-xl overflow-hidden border border-gray-100">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Employee</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Classification</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Gross Pay</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Est. Fed Tax</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Est. State Tax</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Total Paid</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {reports.map((r, i) => (
                                    <tr key={i} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-gray-900">{r.Name}</span>
                                                <span className="text-xs text-gray-500">{r.Email}</span>
                                                <span className="text-[10px] text-gray-400 font-mono mt-1">ID: {r.TaxID}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-bold rounded shadow-sm ${
                                                r.TaxClassification === 'W-2' ? 'bg-blue-100 text-blue-800 border border-blue-200' : 'bg-orange-100 text-orange-800 border border-orange-200'
                                            }`}>
                                                {r.TaxClassification}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-gray-800">
                                            ${Number(r.TotalGross).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-rose-600 font-medium">
                                            -${Number(r.EstimatedFedTax).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-orange-600 font-medium">
                                            -${Number(r.EstimatedStateTax).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right font-extrabold text-emerald-600">
                                            ${Number(r.TotalPaid).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                ))}
                                {reports.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                            No payroll history found for this year.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}
