"use client"
import { useState, useEffect, Suspense, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, Legend, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis
} from "recharts"
import dayjs from "dayjs"

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16']

type StoreStat = {
    store_id: string
    store_name: string
    store_city: string
    totalRevenue: number
    totalCash: number
    totalCard: number
    avgDailyRevenue: number
    submittedDays: number
    missingDays: number
    verifiedDays: number
    reliabilityScore: number
    totalHours: number
    revenuePerHour: number
}

type AnalyticsData = {
    period: { start: string; end: string; totalDays: number }
    storeStats: StoreStat[]
    dailyTrend: { date: string; label: string; revenue: number }[]
}

function fmt(n: number) {
    return `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function ReliabilityBar({ score, color }: { score: number; color: string }) {
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-100 rounded-full h-2">
                <div className="h-2 rounded-full transition-all" style={{ width: `${score}%`, backgroundColor: color }} />
            </div>
            <span className="text-xs font-bold text-gray-700 w-9 text-right">{score}%</span>
        </div>
    )
}

function AnalyticsContent() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [data, setData] = useState<AnalyticsData | null>(null)
    const [loading, setLoading] = useState(true)
    const [month, setMonth] = useState(searchParams.get('month') || dayjs().format('YYYY-MM'))
    const [activeChart, setActiveChart] = useState<'revenue' | 'efficiency' | 'reliability'>('revenue')
    const [selectedStores, setSelectedStores] = useState<Set<string>>(new Set())

    const pushParams = (overrides: Record<string, string> = {}) => {
        const p = new URLSearchParams({ month, ...overrides })
        router.replace(`/admin/analytics?${p}`, { scroll: false })
    }

    const fetchData = useCallback(() => {
        setLoading(true)
        fetch(`/api/admin/analytics/stores?month=${month}`)
            .then(r => r.json())
            .then(d => {
                setData(d)
                // Default: all stores selected
                setSelectedStores(new Set(d.storeStats?.map((s: StoreStat) => s.store_id) || []))
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }, [month])

    useEffect(() => { fetchData() }, [fetchData])

    if (loading) return (
        <div className="space-y-6 animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48" />
            <div className="grid grid-cols-4 gap-4">{Array.from({ length: 4 }, (_, i) => <div key={i} className="h-24 bg-gray-200 rounded-xl" />)}</div>
            <div className="h-72 bg-gray-200 rounded-xl" />
            <div className="h-64 bg-gray-200 rounded-xl" />
        </div>
    )

    if (!data) return <div className="p-8 text-center text-red-500">Failed to load analytics.</div>

    const { storeStats, dailyTrend, period } = data
    const filteredStats = storeStats.filter(s => selectedStores.has(s.store_id))

    const totalRevenue = storeStats.reduce((a, s) => a + s.totalRevenue, 0)
    const totalDays = period.totalDays
    const avgReliability = storeStats.length > 0 ? Math.round(storeStats.reduce((a, s) => a + s.reliabilityScore, 0) / storeStats.length) : 0
    const topStore = storeStats[0]
    const avgDailyRevenue = storeStats.reduce((a, s) => a + s.avgDailyRevenue, 0)

    const toggleStore = (id: string) => {
        setSelectedStores(prev => {
            const next = new Set(prev)
            if (next.has(id)) { if (next.size > 1) next.delete(id) }
            else next.add(id)
            return next
        })
    }

    const chartData = filteredStats.map((s, i) => ({
        name: s.store_name.length > 18 ? s.store_name.slice(0, 16) + '…' : s.store_name,
        fullName: s.store_name,
        Revenue: s.totalRevenue,
        'Revenue/Hr': s.revenuePerHour,
        Reliability: s.reliabilityScore,
        Cash: s.totalCash,
        Card: s.totalCard,
        color: COLORS[i % COLORS.length]
    }))

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload?.length) return null
        return (
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-3 text-sm">
                <p className="font-bold text-gray-900 mb-1">{payload[0]?.payload?.fullName || label}</p>
                {payload.map((p: any, i: number) => (
                    <p key={i} style={{ color: p.color }} className="font-semibold">
                        {p.name}: {p.name === 'Reliability' ? `${p.value}%` : fmt(p.value)}
                    </p>
                ))}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">📈 Store Analytics</h1>
                    <p className="text-sm text-gray-400 mt-0.5">
                        {dayjs(period.start).format('MMM D')} – {dayjs(period.end).format('MMM D, YYYY')} · {totalDays} days
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <input type="month" value={month}
                        onChange={e => { setMonth(e.target.value); pushParams({ month: e.target.value }) }}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow border-t-4 border-indigo-500 p-5">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Total Revenue</p>
                    <p className="text-2xl font-black text-gray-900 mt-1">{fmt(totalRevenue)}</p>
                    <p className="text-xs text-gray-400 mt-1">{storeStats.length} stores</p>
                </div>
                <div className="bg-white rounded-xl shadow border-t-4 border-emerald-500 p-5">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Avg Daily Revenue</p>
                    <p className="text-2xl font-black text-gray-900 mt-1">{fmt(avgDailyRevenue)}</p>
                    <p className="text-xs text-gray-400 mt-1">all stores combined</p>
                </div>
                <div className="bg-white rounded-xl shadow border-t-4 border-amber-500 p-5">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Avg Reliability</p>
                    <p className="text-2xl font-black text-gray-900 mt-1">{avgReliability}%</p>
                    <p className="text-xs text-gray-400 mt-1">reports submitted on time</p>
                </div>
                <div className="bg-white rounded-xl shadow border-t-4 border-rose-500 p-5">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Top Store</p>
                    <p className="text-lg font-black text-gray-900 mt-1 leading-tight">{topStore?.store_name?.split(' ').slice(0, 3).join(' ') || '—'}</p>
                    <p className="text-xs text-gray-400 mt-1">{fmt(topStore?.totalRevenue || 0)}</p>
                </div>
            </div>

            {/* Store filter chips */}
            <div className="flex flex-wrap gap-2">
                <button onClick={() => setSelectedStores(new Set(storeStats.map(s => s.store_id)))}
                    className="text-xs font-semibold px-3 py-1.5 rounded-full bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition">
                    All Stores
                </button>
                {storeStats.map((s, i) => (
                    <button key={s.store_id} onClick={() => toggleStore(s.store_id)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition ${selectedStores.has(s.store_id) ? 'text-white border-transparent' : 'bg-white border-gray-200 text-gray-500'}`}
                        style={selectedStores.has(s.store_id) ? { backgroundColor: COLORS[i % COLORS.length], borderColor: COLORS[i % COLORS.length] } : {}}>
                        {s.store_name.split(' ').slice(0, 3).join(' ')}
                    </button>
                ))}
            </div>

            {/* Chart type tabs */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
                {[
                    { key: 'revenue', label: '💰 Revenue' },
                    { key: 'efficiency', label: '⚡ Revenue/Hr' },
                    { key: 'reliability', label: '📊 Reliability' }
                ].map(t => (
                    <button key={t.key} onClick={() => setActiveChart(t.key as any)}
                        className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${activeChart === t.key ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Main Bar Chart */}
            <div className="bg-white rounded-xl shadow p-5">
                <h2 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">
                    {activeChart === 'revenue' ? 'Total Revenue by Store' : activeChart === 'efficiency' ? 'Revenue per Hour Worked' : 'Report Submission Reliability'}
                </h2>
                <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 60, left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
                        <YAxis tick={{ fontSize: 11 }}
                            tickFormatter={v => activeChart === 'reliability' ? `${v}%` : `$${(v / 1000).toFixed(0)}k`} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey={activeChart === 'revenue' ? 'Revenue' : activeChart === 'efficiency' ? 'Revenue/Hr' : 'Reliability'}
                            radius={[6, 6, 0, 0]} maxBarSize={60}>
                            {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Cash vs Card stacked */}
            {filteredStats.length > 0 && (
                <div className="bg-white rounded-xl shadow p-5">
                    <h2 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">Cash vs. Card Split by Store</h2>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 60, left: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
                            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Bar dataKey="Cash" stackId="a" fill="#fbbf24" radius={[0, 0, 0, 0]} maxBarSize={50} />
                            <Bar dataKey="Card" stackId="a" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={50} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Daily Revenue Trend */}
            {dailyTrend.length > 0 && (
                <div className="bg-white rounded-xl shadow p-5">
                    <h2 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">Daily Revenue Trend (All Stores)</h2>
                    <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={dailyTrend} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={Math.floor(dailyTrend.length / 6)} />
                            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                            <Tooltip formatter={(v: any) => [`$${Number(v).toFixed(2)}`, 'Revenue']} />
                            <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Rankings Table */}
            <div className="bg-white rounded-xl shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">🏆 Store Rankings</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Rank</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Store</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Revenue</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Avg/Day</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Rev/Hr</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[160px]">Reliability</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Submitted</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Missing</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {storeStats.map((s, i) => (
                                <tr key={s.store_id} className={`hover:bg-gray-50 ${i === 0 ? 'bg-yellow-50/50' : ''}`}>
                                    <td className="px-4 py-3 text-sm">
                                        <span className={`font-black text-lg ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-600' : 'text-gray-300'}`}>
                                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <p className="text-sm font-bold text-gray-900">{s.store_name}</p>
                                        <p className="text-xs text-gray-400">{s.store_city}</p>
                                    </td>
                                    <td className="px-4 py-3 text-right text-sm font-black text-gray-900">{fmt(s.totalRevenue)}</td>
                                    <td className="px-4 py-3 text-right text-sm font-semibold text-gray-700">{fmt(s.avgDailyRevenue)}</td>
                                    <td className="px-4 py-3 text-right text-sm font-semibold text-indigo-700">{s.revenuePerHour > 0 ? fmt(s.revenuePerHour) : '—'}</td>
                                    <td className="px-4 py-3 min-w-[160px]">
                                        <ReliabilityBar score={s.reliabilityScore} color={COLORS[i % COLORS.length]} />
                                    </td>
                                    <td className="px-4 py-3 text-right text-sm text-green-700 font-semibold">{s.submittedDays}</td>
                                    <td className="px-4 py-3 text-right text-sm">
                                        <span className={`font-semibold ${s.missingDays > 0 ? 'text-red-600' : 'text-gray-400'}`}>{s.missingDays}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

export default function AnalyticsPage() {
    return (
        <Suspense fallback={<div className="p-10 text-center text-gray-400 animate-pulse">Loading analytics...</div>}>
            <AnalyticsContent />
        </Suspense>
    )
}
