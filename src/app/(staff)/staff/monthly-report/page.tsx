"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import timezone from "dayjs/plugin/timezone"

dayjs.extend(utc)
dayjs.extend(timezone)

const TIMEZONE = "America/Los_Angeles"

type ReportRow = {
    id: string
    report_date: string
    cash_amount: number | null
    card_amount: number | null
    total_amount: number | null
    status: string
    store: { name: string }
}

type Summary = {
    totalCash: number
    totalCard: number
    totalAmount: number
    submittedCount: number
    missingCount: number
}

export default function MonthlyReportPage() {
    const [data, setData] = useState<ReportRow[]>([])
    const [summary, setSummary] = useState<Summary | null>(null)
    const [storeName, setStoreName] = useState("")
    const [month, setMonth] = useState("")
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    useEffect(() => {
        fetch("/api/staff/monthly-report")
            .then(res => res.json())
            .then(d => {
                if (d.error) {
                    setError(d.error)
                } else {
                    setData(d.data || [])
                    setSummary(d.summary || null)
                    setStoreName(d.storeName || "")
                    setMonth(d.month || "")
                }
                setLoading(false)
            })
            .catch(() => {
                setError("Failed to load monthly report")
                setLoading(false)
            })
    }, [])

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto space-y-4 animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-1/2" />
                <div className="grid grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-200 rounded-lg" />)}
                </div>
                <div className="h-64 bg-gray-200 rounded-lg" />
            </div>
        )
    }

    if (error) return <div className="p-8 text-red-500 text-center">{error}</div>

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-wrap justify-between items-center gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Monthly Report</h1>
                    <p className="text-sm text-gray-500 mt-1">{storeName} — {month}</p>
                </div>
                <Link href="/staff/home" className="text-blue-600 hover:text-blue-800 font-medium text-sm">
                    ← Back to Home
                </Link>
            </div>

            {/* Summary Cards */}
            {summary && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    <div className="bg-white rounded-lg shadow p-4 border-t-4 border-green-500">
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Cash</p>
                        <p className="text-xl font-bold text-green-600 mt-1">${summary.totalCash.toFixed(2)}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4 border-t-4 border-blue-500">
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Card</p>
                        <p className="text-xl font-bold text-blue-600 mt-1">${summary.totalCard.toFixed(2)}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4 border-t-4 border-indigo-500 col-span-2 sm:col-span-1">
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Sales</p>
                        <p className="text-xl font-bold text-indigo-600 mt-1">${summary.totalAmount.toFixed(2)}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4 border-t-4 border-emerald-400">
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Submitted</p>
                        <p className="text-xl font-bold text-emerald-600 mt-1">{summary.submittedCount} days</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4 border-t-4 border-red-400">
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Missing</p>
                        <p className="text-xl font-bold text-red-500 mt-1">{summary.missingCount} days</p>
                    </div>
                </div>
            )}

            {/* Report Table */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Cash</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Card</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {data.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                                        No data for this month yet.
                                    </td>
                                </tr>
                            ) : data.map((row) => {
                                const isMissing = row.status === 'Missing'
                                const dateStr = new Date(row.report_date).toISOString().split('T')[0]
                                return (
                                    <tr key={row.id} className={`${isMissing ? 'bg-red-50' : 'hover:bg-gray-50'} transition`}>
                                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                            {dayjs.utc(row.report_date).tz(TIMEZONE).format('ddd, MMM D')}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right text-green-700 font-medium">
                                            {row.cash_amount != null ? `$${Number(row.cash_amount).toFixed(2)}` : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right text-blue-700 font-medium">
                                            {row.card_amount != null ? `$${Number(row.card_amount).toFixed(2)}` : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right font-bold text-gray-900">
                                            {row.total_amount != null ? `$${Number(row.total_amount).toFixed(2)}` : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {isMissing ? (
                                                (dateStr === dayjs().tz(TIMEZONE).format('YYYY-MM-DD') || dateStr === dayjs().tz(TIMEZONE).subtract(1, 'day').format('YYYY-MM-DD')) ? (
                                                    <Link
                                                        href={`/staff/report/new?date=${dateStr}`}
                                                        className="inline-block bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1 rounded-full transition"
                                                    >
                                                        Submit
                                                    </Link>
                                                ) : (
                                                    <span className="inline-block bg-red-100 text-red-600 text-xs font-semibold px-3 py-1 rounded-full">Missing</span>
                                                )
                                            ) : (
                                                <Link
                                                    href={`/staff/report/${row.id}`}
                                                    className="inline-block bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold px-3 py-1 rounded-full transition"
                                                >
                                                    {row.status === 'Verified' ? '✓ Verified' : row.status === 'CorrectionRequested' ? '⚠ Correction' : 'View'}
                                                </Link>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>

                        {/* Footer totals row */}
                        {summary && summary.submittedCount > 0 && (
                            <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                                <tr>
                                    <td className="px-4 py-3 text-sm font-bold text-gray-700">Month Total</td>
                                    <td className="px-4 py-3 text-sm font-bold text-right text-green-700">${summary.totalCash.toFixed(2)}</td>
                                    <td className="px-4 py-3 text-sm font-bold text-right text-blue-700">${summary.totalCard.toFixed(2)}</td>
                                    <td className="px-4 py-3 text-sm font-bold text-right text-indigo-700">${summary.totalAmount.toFixed(2)}</td>
                                    <td />
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </div>
    )
}
