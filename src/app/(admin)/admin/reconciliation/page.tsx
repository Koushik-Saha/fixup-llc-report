"use client"
import { useEffect, useState, Suspense } from "react"
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
    date: string
    store_id: string
    store_name: string
    store_city: string
    cash_amount: number
    card_amount: number
    total_amount: number
    expected_cash: number | null
    variance: number | null
    status: string
}

type StoreSummary = {
    store_id: string
    name: string
    city: string
    reports: number
    totalVariance: number
    flagged: number
}

type Stats = { totalOverage: number; totalShortage: number; netVariance: number; flagged: number; total: number }

function VarianceBadge({ variance }: { variance: number | null }) {
    if (variance === null) return <span className="text-xs text-gray-400 italic">No expected set</span>
    const abs = Math.abs(variance)
    if (abs < 1) return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">Exact ✓</span>
    if (variance > 0) return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${abs > 50 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
            +${variance.toFixed(2)} Over
        </span>
    )
    return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${abs > 50 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
            -${abs.toFixed(2)} Short
        </span>
    )
}

function ReconciliationContent() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [month, setMonth] = useState(searchParams.get('month') || dayjs().tz(TIMEZONE).format('YYYY-MM'))
    const [storeId, setStoreId] = useState(searchParams.get('storeId') || '')
    const [stores, setStores] = useState<any[]>([])
    const [reports, setReports] = useState<ReportRow[]>([])
    const [storeSummary, setStoreSummary] = useState<StoreSummary[]>([])
    const [stats, setStats] = useState<Stats | null>(null)
    const [loading, setLoading] = useState(true)
    const [view, setView] = useState<'detail' | 'summary'>('summary')

    const pushParams = (overrides: Record<string, string> = {}) => {
        const vals = { month, storeId, ...overrides }
        const p = new URLSearchParams()
        Object.entries(vals).forEach(([k, v]) => { if (v) p.set(k, v) })
        router.replace(`/admin/reconciliation?${p.toString()}`, { scroll: false })
    }

    useEffect(() => {
        fetch('/api/admin/stores').then(r => r.json()).then(d => setStores(Array.isArray(d) ? d : []))
    }, [])

    useEffect(() => {
        setLoading(true)
        const p = new URLSearchParams()
        if (month) p.set('month', month)
        if (storeId) p.set('storeId', storeId)
        fetch(`/api/admin/reconciliation?${p.toString()}`)
            .then(r => r.json())
            .then(d => {
                setReports(d.reports || [])
                setStoreSummary(d.storeSummary || [])
                setStats(d.stats || null)
                setLoading(false)
            })
    }, [month, storeId])

    const flaggedReports = reports.filter(r => r.variance !== null && Math.abs(r.variance) > 50)

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Cash Reconciliation</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Track expected vs. actual cash per store. Flagged = variance &gt; $50</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow p-4 flex flex-wrap gap-4 items-end">
                <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Month</label>
                    <input type="month" value={month}
                        onChange={e => { setMonth(e.target.value); pushParams({ month: e.target.value }) }}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Store</label>
                    <select value={storeId}
                        onChange={e => { setStoreId(e.target.value); pushParams({ storeId: e.target.value }) }}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900">
                        <option value="">All Stores</option>
                        {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
                <div className="flex gap-1 bg-gray-100 p-1 rounded-lg ml-auto">
                    {(['summary', 'detail'] as const).map(v => (
                        <button key={v} onClick={() => setView(v)}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition capitalize ${view === v ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                            {v}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats cards */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl shadow p-4 border-t-4 border-green-400">
                        <p className="text-xs text-gray-400 font-semibold uppercase">Total Overage</p>
                        <p className="text-2xl font-black text-green-600 mt-1">+${stats.totalOverage.toFixed(2)}</p>
                    </div>
                    <div className="bg-white rounded-xl shadow p-4 border-t-4 border-red-400">
                        <p className="text-xs text-gray-400 font-semibold uppercase">Total Shortage</p>
                        <p className="text-2xl font-black text-red-600 mt-1">${stats.totalShortage.toFixed(2)}</p>
                    </div>
                    <div className={`bg-white rounded-xl shadow p-4 border-t-4 ${stats.netVariance >= 0 ? 'border-green-300' : 'border-red-300'}`}>
                        <p className="text-xs text-gray-400 font-semibold uppercase">Net Variance</p>
                        <p className={`text-2xl font-black mt-1 ${stats.netVariance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                            {stats.netVariance >= 0 ? '+' : ''}{stats.netVariance.toFixed(2)}
                        </p>
                    </div>
                    <div className={`bg-white rounded-xl shadow p-4 border-t-4 ${stats.flagged > 0 ? 'border-red-500' : 'border-green-400'}`}>
                        <p className="text-xs text-gray-400 font-semibold uppercase">Flagged (&gt;$50)</p>
                        <p className={`text-2xl font-black mt-1 ${stats.flagged > 0 ? 'text-red-600' : 'text-green-600'}`}>{stats.flagged}</p>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="space-y-3">
                    {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
                </div>
            ) : view === 'summary' ? (
                /* Store Summary View */
                <div className="bg-white rounded-xl shadow overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100">
                        <h2 className="font-bold text-gray-800">Store Variance Summary — {dayjs(`${month}-01`).format('MMMM YYYY')}</h2>
                        <p className="text-xs text-gray-400 mt-0.5">Only reports with expected cash set are included in variance</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100">
                            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                                <tr>
                                    <th className="px-5 py-3 text-left">Store</th>
                                    <th className="px-5 py-3 text-center">Reports</th>
                                    <th className="px-5 py-3 text-right">Net Variance</th>
                                    <th className="px-5 py-3 text-center">Flagged</th>
                                    <th className="px-5 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {storeSummary.length === 0 ? (
                                    <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400">No reports found for this period.</td></tr>
                                ) : storeSummary.map(s => (
                                    <tr key={s.store_id} className="hover:bg-gray-50">
                                        <td className="px-5 py-3">
                                            <p className="font-semibold text-gray-900 text-sm">{s.name}</p>
                                            <p className="text-xs text-gray-400">{s.city}</p>
                                        </td>
                                        <td className="px-5 py-3 text-center text-sm text-gray-600">{s.reports}</td>
                                        <td className="px-5 py-3 text-right">
                                            <span className={`text-sm font-bold ${s.totalVariance > 0 ? 'text-green-600' : s.totalVariance < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                                                {s.totalVariance > 0 ? '+' : ''}{s.totalVariance.toFixed(2)}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-center">
                                            {s.flagged > 0
                                                ? <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-bold">⚠ {s.flagged}</span>
                                                : <span className="text-green-500 text-sm">✓</span>}
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            <Link href={`/admin/reports?storeId=${s.store_id}&month=${month}`}
                                                className="text-xs text-indigo-600 hover:underline font-medium">View Reports →</Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* Detail View — Per Report */
                <div className="bg-white rounded-xl shadow overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="font-bold text-gray-800">Per-Report Detail — {dayjs(`${month}-01`).format('MMMM YYYY')}</h2>
                        {flaggedReports.length > 0 && (
                            <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full">⚠ {flaggedReports.length} flagged</span>
                        )}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100">
                            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                                <tr>
                                    <th className="px-5 py-3 text-left">Date</th>
                                    <th className="px-5 py-3 text-left">Store</th>
                                    <th className="px-5 py-3 text-right">Actual Cash</th>
                                    <th className="px-5 py-3 text-right">Expected</th>
                                    <th className="px-5 py-3 text-center">Variance</th>
                                    <th className="px-5 py-3 text-center">Status</th>
                                    <th className="px-5 py-3 text-right">View</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {reports.length === 0 ? (
                                    <tr><td colSpan={7} className="px-5 py-8 text-center text-gray-400">No reports found for this period.</td></tr>
                                ) : reports.map(r => (
                                    <tr key={r.id} className={`hover:bg-gray-50 ${r.variance !== null && Math.abs(r.variance) > 50 ? 'bg-red-50' : ''}`}>
                                        <td className="px-5 py-3 text-sm font-semibold text-gray-900 whitespace-nowrap">
                                            {dayjs.utc(r.date).format('ddd, MMM D')}
                                        </td>
                                        <td className="px-5 py-3 text-sm text-gray-700">{r.store_name}</td>
                                        <td className="px-5 py-3 text-sm text-right font-semibold text-gray-900">${r.cash_amount.toFixed(2)}</td>
                                        <td className="px-5 py-3 text-sm text-right text-gray-500">
                                            {r.expected_cash !== null ? `$${r.expected_cash.toFixed(2)}` : '—'}
                                        </td>
                                        <td className="px-5 py-3 text-center"><VarianceBadge variance={r.variance} /></td>
                                        <td className="px-5 py-3 text-center">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${r.status === 'Verified' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{r.status}</span>
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            <Link href={`/admin/reports/${r.id}`} className="text-xs text-indigo-600 hover:underline font-medium">View →</Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}

export default function ReconciliationPage() {
    return <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading...</div>}><ReconciliationContent /></Suspense>
}
