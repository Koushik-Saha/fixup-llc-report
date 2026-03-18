"use client"
import { useEffect, useState, useCallback, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
    expenses_amount: number | null
    payouts_amount: number | null
    status: string
    submitted_by: { name: string } | null
}

type Summary = {
    totalCash: number
    totalCard: number
    totalAmount: number
    submittedCount: number
    missingCount: number
    verifiedCount: number
    unverifiedCount: number
}

function MonthlyReportContent() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [stores, setStores] = useState<any[]>([])
    const [storeId, setStoreId] = useState(searchParams.get('storeId') || '')
    const [month, setMonth] = useState(searchParams.get('month') || dayjs().tz(TIMEZONE).format('YYYY-MM'))
    const [data, setData] = useState<ReportRow[]>([])
    const [summary, setSummary] = useState<Summary | null>(null)
    const [storeName, setStoreName] = useState('')
    const [storeCity, setStoreCity] = useState('')
    const [monthLabel, setMonthLabel] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const pushParams = useCallback((overrides: Record<string, string> = {}) => {
        const vals = { storeId, month, ...overrides }
        const p = new URLSearchParams()
        Object.entries(vals).forEach(([k, v]) => { if (v) p.set(k, v) })
        router.replace(`/admin/monthly-report?${p.toString()}`, { scroll: false })
    }, [storeId, month, router])

    // Load stores
    useEffect(() => {
        fetch('/api/admin/stores').then(r => r.json()).then(d => {
            const list = Array.isArray(d) ? d : []
            setStores(list)
            // Auto-select first store if none selected
            if (!storeId && list.length > 0) {
                setStoreId(list[0].id)
                pushParams({ storeId: list[0].id })
            }
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Fetch report
    useEffect(() => {
        if (!storeId) return
        setLoading(true)
        setError('')
        const p = new URLSearchParams({ storeId, month })
        fetch(`/api/admin/monthly-report?${p.toString()}`)
            .then(r => r.json())
            .then(d => {
                if (d.error) { setError(d.error); return }
                setData(d.data || [])
                setSummary(d.summary || null)
                setStoreName(d.storeName || '')
                setStoreCity(d.storeCity || '')
                setMonthLabel(d.month || '')
            })
            .catch(() => setError('Failed to load report'))
            .finally(() => setLoading(false))
    }, [storeId, month])

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Monthly Report</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {storeName ? `${storeName}${storeCity ? ` — ${storeCity}` : ''} — ${monthLabel}` : 'Select a store to view'}
                    </p>
                </div>
                <Link href="/admin/todays-reports" className="text-blue-600 hover:text-blue-800 font-medium text-sm self-start sm:self-auto">
                    ← Back to Today's Reports
                </Link>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow p-4 flex flex-wrap gap-4 items-end">
                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Store</label>
                    <select
                        value={storeId}
                        onChange={e => { setStoreId(e.target.value); pushParams({ storeId: e.target.value }) }}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-indigo-500 focus:border-indigo-500 min-w-[180px]"
                    >
                        <option value="">— Select Store —</option>
                        {stores.map(s => <option key={s.id} value={s.id}>{s.name}{s.city ? ` (${s.city})` : ''}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Month</label>
                    <input
                        type="month"
                        value={month}
                        onChange={e => { setMonth(e.target.value); pushParams({ month: e.target.value }) }}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>
            </div>

            {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

            {/* Summary Cards — same as staff monthly report */}
            {summary && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
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
                    <div className="bg-white rounded-lg shadow p-4 border-t-4 border-teal-400">
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Verified</p>
                        <p className="text-xl font-bold text-teal-600 mt-1">{summary.verifiedCount} days</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4 border-t-4 border-yellow-400">
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Unverified</p>
                        <p className="text-xl font-bold text-yellow-600 mt-1">{summary.unverifiedCount} days</p>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="bg-white shadow rounded-xl overflow-hidden">
                {!storeId ? (
                    <div className="p-10 text-center text-gray-400 text-sm">Select a store above to view the monthly report.</div>
                ) : loading ? (
                    <div className="p-10 text-center text-gray-400 animate-pulse">Loading...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Cash</th>
                                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Card</th>
                                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Submitted By</th>
                                    <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {data.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-5 py-10 text-center text-gray-400">No data for this month yet.</td>
                                    </tr>
                                ) : data.map(row => {
                                    const isMissing = row.status === 'Missing'
                                    const dateStr = row.report_date.split('T')[0]
                                    const todayStr = dayjs().tz(TIMEZONE).format('YYYY-MM-DD')
                                    return (
                                        <tr key={row.id} className={`${isMissing ? 'bg-red-50' : 'hover:bg-gray-50'} transition`}>
                                            <td className="px-5 py-3 text-sm font-semibold text-gray-900 whitespace-nowrap">
                                                {dayjs.utc(row.report_date).format('ddd, MMM D')}
                                            </td>
                                            <td className="px-5 py-3 text-sm text-right text-green-700 font-medium">
                                                {row.cash_amount != null ? `$${Number(row.cash_amount).toFixed(2)}` : <span className="text-gray-300">—</span>}
                                            </td>
                                            <td className="px-5 py-3 text-sm text-right text-blue-700 font-medium">
                                                {row.card_amount != null ? `$${Number(row.card_amount).toFixed(2)}` : <span className="text-gray-300">—</span>}
                                            </td>
                                            <td className="px-5 py-3 text-sm text-right font-bold text-gray-900">
                                                {row.total_amount != null ? `$${Number(row.total_amount).toFixed(2)}` : <span className="text-gray-300 font-normal">—</span>}
                                            </td>
                                            <td className="px-5 py-3 text-sm text-gray-500">
                                                {row.submitted_by?.name || <span className="italic text-gray-300">—</span>}
                                            </td>
                                            <td className="px-5 py-3 text-center">
                                                {isMissing ? (
                                                    dateStr === todayStr ? (
                                                        <Link
                                                            href={`/admin/reports/new?storeId=${storeId}&date=${dateStr}`}
                                                            className="inline-block bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1 rounded-full transition"
                                                        >
                                                            Submit
                                                        </Link>
                                                    ) : (
                                                        <Link
                                                            href={`/admin/reports/new?storeId=${storeId}&date=${dateStr}`}
                                                            className="inline-block bg-red-100 hover:bg-red-200 text-red-600 text-xs font-semibold px-3 py-1 rounded-full transition"
                                                        >
                                                            Missing
                                                        </Link>
                                                    )
                                                ) : (
                                                    <Link
                                                        href={`/admin/reports/${row.id}`}
                                                        className={`inline-block text-xs font-semibold px-3 py-1 rounded-full transition ${
                                                            row.status === 'Verified'
                                                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                                : row.status === 'CorrectionRequested'
                                                                ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                        }`}
                                                    >
                                                        {row.status === 'Verified' ? '✓ Verified' : row.status === 'CorrectionRequested' ? '⚠ Correction' : 'View'}
                                                    </Link>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>

                            {/* Footer totals */}
                            {summary && summary.submittedCount > 0 && (
                                <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                                    <tr>
                                        <td className="px-5 py-3 text-sm font-bold text-gray-700">Month Total</td>
                                        <td className="px-5 py-3 text-sm font-bold text-right text-green-700">${summary.totalCash.toFixed(2)}</td>
                                        <td className="px-5 py-3 text-sm font-bold text-right text-blue-700">${summary.totalCard.toFixed(2)}</td>
                                        <td className="px-5 py-3 text-sm font-bold text-right text-indigo-700">${summary.totalAmount.toFixed(2)}</td>
                                        <td /><td />
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}

export default function AdminMonthlyReportPage() {
    return (
        <Suspense fallback={<div className="p-10 text-center text-gray-400 animate-pulse">Loading...</div>}>
            <MonthlyReportContent />
        </Suspense>
    )
}
