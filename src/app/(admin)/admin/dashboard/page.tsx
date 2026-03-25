"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, Legend
} from "recharts"
import dayjs from "dayjs"

type DashboardData = {
    kpi: {
        todayCash: number
        todayCard: number
        todayTotal: number
        todayExpenses: number
        weekRevenue: number
        monthRevenue: number
        monthCash: number
        monthCard: number
        monthExpenses: number
        totalStores: number
        totalUsers: number
        missingToday: number
        unverifiedCount: number
    }
    revenueTrend: { date: string; label: string; revenue: number }[]
    storePerformance: { store_id: string; name: string; city: string; revenue: number; cash: number; card: number; reports: number }[]
    calendarDays: { date: string; label: string; dayName: string; submitted: number; total: number; missing: number }[]
    topPerformers: { user_id: string; name: string; role: string; reports: number; revenue: number }[]
    todayStatus: {
        store_id: string; store_name: string; store_city: string
        submitted: boolean; report_id: string | null
        submitted_by: string | null; total_amount: number | null; status: string
    }[]
    lowStockItems: { id: string; name: string; sku: string | null; quantity: number; reorder_level: number; store: { name: string } }[]
}

function fmt(n: number) { return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }

const STORE_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6']

export default function AdminDashboardPage() {
    const [data, setData] = useState<DashboardData | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch('/api/admin/dashboard')
            .then(r => r.json())
            .then(d => { setData(d); setLoading(false) })
            .catch(() => setLoading(false))
    }, [])

    if (loading) return (
        <div className="space-y-6 animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => <div key={i} className="h-28 bg-gray-200 rounded-xl" />)}
            </div>
            <div className="h-72 bg-gray-200 rounded-xl" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="h-64 bg-gray-200 rounded-xl" />
                <div className="h-64 bg-gray-200 rounded-xl" />
            </div>
        </div>
    )

    if (!data) return <div className="p-8 text-center text-red-500">Failed to load dashboard data.</div>

    const { kpi, revenueTrend, storePerformance, calendarDays, topPerformers, todayStatus, lowStockItems } = data

    const maxStoreRevenue = Math.max(...storePerformance.map(s => s.revenue), 1)

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Executive Dashboard</h1>
                    <p className="text-sm text-gray-500 mt-0.5">{dayjs().format('dddd, MMMM D, YYYY')} · Pacific Time</p>
                </div>
                <Link href="/admin/reports?status=Submitted" className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
                    <span className="text-lg">📋</span> Review Unverified ({kpi.unverifiedCount})
                </Link>
            </div>

            {/* Low Stock Alerts */}
            {lowStockItems && lowStockItems.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="bg-rose-100 text-rose-600 p-2 rounded-lg text-xl">⚠️</span>
                            <div>
                                <h2 className="text-base font-bold text-rose-800">Low Stock Alert</h2>
                                <p className="text-xs text-rose-600 mt-0.5">You have {lowStockItems.length} inventory items running low across your stores.</p>
                            </div>
                        </div>
                        <Link href="/admin/inventory" className="text-sm font-bold text-rose-700 hover:text-rose-900 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition-colors">
                            Manage Inventory →
                        </Link>
                    </div>
                </div>
            )}

            {/* KPI Cards — Row 1: Revenue */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow border-t-4 border-indigo-500 p-5">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Today's Net</p>
                    <p className="text-2xl font-black text-indigo-700 mt-1">{fmt(kpi.todayTotal)}</p>
                    <div className="mt-2 flex gap-2 text-xs text-gray-500">
                        <span className="bg-green-50 text-green-700 px-1.5 py-0.5 rounded font-medium">Net Cash {fmt(kpi.todayCash)}</span>
                        <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium">Card {fmt(kpi.todayCard)}</span>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow border-t-4 border-blue-500 p-5">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">This Week</p>
                    <p className="text-2xl font-black text-blue-700 mt-1">{fmt(kpi.weekRevenue)}</p>
                    <p className="text-xs text-gray-400 mt-2">Mon – Today</p>
                </div>
                <div className="bg-white rounded-xl shadow border-t-4 border-green-500 p-5">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">This Month Revenue</p>
                    <p className="text-2xl font-black text-green-700 mt-1">{fmt(kpi.monthRevenue)}</p>
                    <div className="mt-2 flex gap-2 text-xs text-gray-500">
                        <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-medium">Net Cash {fmt(kpi.monthCash)}</span>
                        <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium">Card {fmt(kpi.monthCard)}</span>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow border-t-4 border-red-500 p-5">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Monthly Expenses</p>
                    <p className="text-2xl font-black text-red-700 mt-1">{fmt(kpi.monthExpenses)}</p>
                    <div className="mt-2 flex gap-1 text-[10px] text-gray-400 items-baseline">
                        <span className="font-medium text-red-600">Today: {fmt(kpi.todayExpenses)}</span>
                    </div>
                </div>
                <div className={`bg-white rounded-xl shadow border-t-4 p-5 ${kpi.missingToday > 0 ? 'border-red-500' : 'border-green-400'}`}>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Missing Today</p>
                    <p className={`text-2xl font-black mt-1 ${kpi.missingToday > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {kpi.missingToday === 0 ? '✓ All In' : `${kpi.missingToday} Store${kpi.missingToday > 1 ? 's' : ''}`}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">{kpi.totalStores} active stores total</p>
                </div>
            </div>

            {/* KPI Row 2: Operations */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-2xl">🏪</div>
                    <div>
                        <p className="text-xs text-gray-400 font-medium uppercase">Active Stores</p>
                        <p className="text-2xl font-black text-gray-900">{kpi.totalStores}</p>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-2xl">👥</div>
                    <div>
                        <p className="text-xs text-gray-400 font-medium uppercase">Active Staff</p>
                        <p className="text-2xl font-black text-gray-900">{kpi.totalUsers}</p>
                    </div>
                </div>
                <Link href="/admin/reports?status=Submitted" className="bg-white rounded-xl shadow p-5 flex items-center gap-4 hover:shadow-md transition">
                    <div className="w-12 h-12 rounded-full bg-yellow-50 flex items-center justify-center text-2xl">📋</div>
                    <div>
                        <p className="text-xs text-gray-400 font-medium uppercase">Unverified</p>
                        <p className="text-2xl font-black text-yellow-600">{kpi.unverifiedCount}</p>
                    </div>
                </Link>
                <Link href="/admin/reports?status=Missing" className="bg-white rounded-xl shadow p-5 flex items-center gap-4 hover:shadow-md transition">
                    <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-2xl">❌</div>
                    <div>
                        <p className="text-xs text-gray-400 font-medium uppercase">Missing Today</p>
                        <p className={`text-2xl font-black ${kpi.missingToday > 0 ? 'text-red-600' : 'text-green-600'}`}>{kpi.missingToday}</p>
                    </div>
                </Link>
            </div>

            {/* ── Today's Submission Status ─────────────────────────────── */}
            <div className="bg-white rounded-xl shadow p-5">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-base font-bold text-gray-800">Today's Submission Status</h2>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {(todayStatus || []).filter(s => s.submitted).length} of {(todayStatus || []).length} stores submitted
                        </p>
                    </div>
                    <Link href="/admin/todays-reports" className="text-xs text-indigo-600 hover:underline font-semibold">
                        View All Today's Reports →
                    </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(todayStatus || []).map(s => {
                        const cardClass = `flex items-center justify-between px-4 py-3 rounded-xl border transition ${
                            s.submitted
                                ? s.status === 'Verified'
                                    ? 'bg-green-50 border-green-200 hover:bg-green-100 hover:shadow-sm cursor-pointer'
                                    : 'bg-blue-50 border-blue-200 hover:bg-blue-100 hover:shadow-sm cursor-pointer'
                                : 'bg-red-50 border-red-200'
                        }`
                        const inner = (
                            <>
                                <div className="flex items-center gap-3">
                                    <span className="text-lg">
                                        {s.submitted ? (s.status === 'Verified' ? '✅' : '📤') : '❌'}
                                    </span>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900 leading-tight">{s.store_name}</p>
                                        <p className="text-xs text-gray-400">
                                            {s.submitted ? `by ${s.submitted_by}` : 'Not submitted'}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    {s.submitted ? (
                                        <>
                                            <p className="text-sm font-black text-gray-900">{fmt(s.total_amount ?? 0)}</p>
                                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                                s.status === 'Verified' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                            }`}>
                                                {s.status === 'Verified' ? '✓ Verified' : 'View →'}
                                            </span>
                                        </>
                                    ) : (
                                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                                            Missing
                                        </span>
                                    )}
                                </div>
                            </>
                        )
                        return s.submitted && s.report_id ? (
                            <Link key={s.store_id} href={`/admin/reports/${s.report_id}`} className={cardClass}>
                                {inner}
                            </Link>
                        ) : (
                            <div key={s.store_id} className={cardClass}>
                                {inner}
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Revenue Trend Chart */}
            <div className="bg-white rounded-xl shadow p-5">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h2 className="text-base font-bold text-gray-800">Revenue Trend</h2>
                        <p className="text-xs text-gray-400">Last 30 days across all stores</p>
                    </div>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={revenueTrend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.18} />
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }}
                            tickLine={false} interval={Math.floor(revenueTrend.length / 7)} />
                        <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false}
                            tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} width={44} />
                        <Tooltip formatter={(v: number | undefined) => [fmt(v ?? 0), 'Revenue']}
                            contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', fontSize: 13 }} />
                        <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2.5}
                            fill="url(#revGrad)" dot={false} activeDot={{ r: 4, fill: '#6366f1' }} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Store Performance + Top Performers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Store Performance Bar Chart */}
                <div className="bg-white rounded-xl shadow p-5">
                    <h2 className="text-base font-bold text-gray-800 mb-1">Store Performance</h2>
                    <p className="text-xs text-gray-400 mb-4">Revenue this month, by store</p>
                    {storePerformance.length === 0 ? (
                        <p className="text-center text-gray-400 py-8 italic text-sm">No data this month yet</p>
                    ) : (
                        <>
                            <ResponsiveContainer width="100%" height={Math.max(160, storePerformance.length * 44)}>
                                <BarChart data={storePerformance} layout="vertical"
                                    margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                                    <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false}
                                        axisLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                                    <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#374151' }}
                                        tickLine={false} axisLine={false} width={90} />
                                    <Tooltip formatter={(v: number | undefined) => [fmt(v ?? 0), 'Revenue']}
                                        contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', fontSize: 13 }} />
                                    <Bar dataKey="revenue" radius={[0, 6, 6, 0]}>
                                        {storePerformance.map((_, i) => (
                                            <Cell key={i} fill={STORE_COLORS[i % STORE_COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                            {/* Leaderboard table */}
                            <div className="mt-3 divide-y divide-gray-100">
                                {storePerformance.map((s, i) => (
                                    <div key={s.store_id} className="flex items-center justify-between py-1.5">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-black text-gray-400 w-4">#{i + 1}</span>
                                            <div>
                                                <p className="text-sm font-semibold text-gray-800">{s.name}</p>
                                                <p className="text-xs text-gray-400">{s.city} · {s.reports} reports</p>
                                            </div>
                                        </div>
                                        <p className="text-sm font-bold text-indigo-700">{fmt(s.revenue)}</p>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Top Performers + Submission Calendar */}
                <div className="space-y-6">
                    {/* Top Performers */}
                    <div className="bg-white rounded-xl shadow p-5">
                        <h2 className="text-base font-bold text-gray-800 mb-1">Top Performers</h2>
                        <p className="text-xs text-gray-400 mb-3">Staff by reports submitted this month</p>
                        {topPerformers.length === 0 ? (
                            <p className="text-center text-gray-400 py-4 italic text-sm">No data this month yet</p>
                        ) : (
                            <div className="space-y-2">
                                {topPerformers.map((p, i) => (
                                    <div key={p.user_id} className="flex items-center gap-3">
                                        <span className={`w-6 h-6 rounded-full text-xs font-black flex items-center justify-center ${i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-gray-100 text-gray-600' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-50 text-gray-400'}`}>
                                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                                        </span>
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-gray-800">{p.name}</p>
                                            <p className="text-xs text-gray-400">{p.role}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-gray-900">{p.reports} reports</p>
                                            <p className="text-xs text-gray-400">{fmt(p.revenue)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 14-Day Submission Calendar */}
                    <div className="bg-white rounded-xl shadow p-5">
                        <h2 className="text-base font-bold text-gray-800 mb-1">Submission Calendar</h2>
                        <p className="text-xs text-gray-400 mb-3">Last 14 days — how many stores reported each day</p>
                        <div className="grid grid-cols-7 gap-1">
                            {calendarDays.map(day => {
                                const pct = day.total > 0 ? day.submitted / day.total : 0
                                const bg = pct === 0 ? 'bg-red-100' : pct < 0.5 ? 'bg-orange-100' : pct < 1 ? 'bg-yellow-100' : 'bg-green-100'
                                const text = pct === 0 ? 'text-red-700' : pct < 0.5 ? 'text-orange-700' : pct < 1 ? 'text-yellow-700' : 'text-green-700'
                                const border = pct === 0 ? 'border-red-200' : pct < 0.5 ? 'border-orange-200' : pct < 1 ? 'border-yellow-200' : 'border-green-200'
                                const isToday = day.date === dayjs().format('YYYY-MM-DD')
                                return (
                                    <Link href={`/admin/reports?startDate=${day.date}&endDate=${day.date}`}
                                        key={day.date}
                                        title={`${day.label}: ${day.submitted}/${day.total} stores reported`}
                                        className={`${bg} ${text} border ${border} ${isToday ? 'ring-2 ring-indigo-400' : ''} rounded-lg p-1.5 text-center hover:opacity-80 transition`}>
                                        <p className="text-[10px] font-medium opacity-70">{day.dayName}</p>
                                        <p className="text-xs font-bold">{dayjs(day.date).format('D')}</p>
                                        <p className="text-[10px] mt-0.5 font-semibold">{day.submitted}/{day.total}</p>
                                    </Link>
                                )
                            })}
                        </div>
                        <div className="flex gap-3 mt-3 text-xs text-gray-500 flex-wrap">
                            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-200 inline-block" /> All submitted</span>
                            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-200 inline-block" /> Most submitted</span>
                            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-200 inline-block" /> Some missing</span>
                            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-200 inline-block" /> None submitted</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { href: '/admin/todays-reports', icon: '📅', label: "Today's Reports", color: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
                    { href: '/admin/work-hours', icon: '⏱️', label: 'Work Hours', color: 'bg-blue-50 text-blue-700 border-blue-100' },
                    { href: '/admin/payroll', icon: '💰', label: 'Payroll', color: 'bg-green-50 text-green-700 border-green-100' },
                    { href: '/admin/expenses', icon: '🧾', label: 'Expenses', color: 'bg-red-50 text-red-700 border-red-100' },
                ].map(l => (
                    <Link key={l.href} href={l.href} className={`${l.color} border rounded-xl p-4 text-center hover:opacity-80 transition font-semibold text-sm`}>
                        <div className="text-2xl mb-1">{l.icon}</div>
                        {l.label}
                    </Link>
                ))}
            </div>
        </div>
    )
}
