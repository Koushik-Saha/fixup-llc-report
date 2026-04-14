"use client"
import { useEffect, useState, use, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Pagination } from "@/components/Pagination"
import SettlementModal from "./SettlementModal"
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import timezone from "dayjs/plugin/timezone"

dayjs.extend(utc)
dayjs.extend(timezone)

const TIMEZONE = "America/Los_Angeles"

function parseHours(timeStr: string | null | undefined): number | null {
    if (!timeStr) return null
    if (timeStr.toLowerCase().includes('am') || timeStr.toLowerCase().includes('pm')) {
        const [time, period] = timeStr.split(' ')
        let [hours, minutes] = time.split(':').map(Number)
        if (period.toLowerCase() === 'pm' && hours !== 12) hours += 12
        if (period.toLowerCase() === 'am' && hours === 12) hours = 0
        if (isNaN(hours) || isNaN(minutes)) return null
        return hours + (minutes / 60)
    }
    const [hours, minutes] = timeStr.split(':').map(Number)
    if (isNaN(hours) || isNaN(minutes)) return null
    return hours + (minutes / 60)
}

type Shift = {
    id: string
    date: string
    store_name: string
    store_city: string
    time_in: string | null
    time_out: string | null
    duration: number
    status: string
    cash_amount: number
    card_amount: number
    total_amount: number
    submitted_by: string | null
}

type DetailData = {
    user: {
        id: string
        name: string
        email: string
        role: string
        pay_type: string
        base_salary: number
    }
    period: { startDate: string; endDate: string }
    summary: { total_shifts: number; total_hours: number; total_earned: number }
    shifts: Shift[]
    by_store: { store: string; city: string; shifts: number; hours: number }[]
}

function WorkHoursDetailContent({ params }: { params: Promise<{ userId: string }> }) {
    const { userId } = use(params)
    const searchParams = useSearchParams()
    const startDate = searchParams.get('startDate') || dayjs().tz(TIMEZONE).startOf('week').add(1, 'day').format('YYYY-MM-DD')
    const endDate = searchParams.get('endDate') || dayjs().tz(TIMEZONE).format('YYYY-MM-DD')
    const backPreset = searchParams.get('preset') || 'This Week'

    const [data, setData] = useState<DetailData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [page, setPage] = useState(1)
    const [limit, setLimit] = useState(10)
    const [isSettlementOpen, setIsSettlementOpen] = useState(false)

    useEffect(() => {
        fetch(`/api/admin/work-hours/${userId}?startDate=${startDate}&endDate=${endDate}`)
            .then(res => res.json())
            .then(d => {
                if (d.error) { setError(d.error) } else { setData(d) }
                setLoading(false)
            })
            .catch(() => { setError("Failed to load data"); setLoading(false) })
    }, [userId, startDate, endDate])

    if (loading) return (
        <div className="max-w-4xl mx-auto space-y-4 animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3" />
            <div className="grid grid-cols-3 gap-4">{[1,2,3].map(i => <div key={i} className="h-24 bg-gray-200 rounded-lg" />)}</div>
            <div className="h-64 bg-gray-200 rounded-lg" />
        </div>
    )

    if (error || !data) return <div className="p-8 text-center text-red-500">{error || "User not found"}</div>

    const { user, period, summary, shifts, by_store } = data
    const isHourly = user.pay_type === 'HOURLY'
    const hourlyRate = isHourly ? user.base_salary : null

    return (
        <div className="max-w-5xl mx-auto space-y-6">

            {/* Back + Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <Link
                        href={`/admin/work-hours?preset=${backPreset}&startDate=${startDate}&endDate=${endDate}`}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                        ← Back to Work Hours
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-900 mt-1">{user.name}</h1>
                    <p className="text-sm text-gray-500">{user.email} · {user.role}</p>
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                    <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Period</p>
                        <p className="text-sm font-semibold text-gray-700">
                            {dayjs.utc(period.startDate).format('MMM D')} – {dayjs.utc(period.endDate).format('MMM D, YYYY')}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {isHourly ? `$${hourlyRate}/hr (Hourly)` : `$${user.base_salary.toFixed(2)} base (Salary)`}
                        </p>
                    </div>
                    <button 
                        onClick={() => setIsSettlementOpen(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-blue-700 transition-all flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        Generate Settlement
                    </button>
                </div>
            </div>

            <SettlementModal 
                isOpen={isSettlementOpen}
                onClose={() => setIsSettlementOpen(false)}
                user={user}
                shifts={shifts}
                period={period}
            />

            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl shadow border-t-4 border-blue-500 p-5">
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Total Shifts</p>
                    <p className="text-3xl font-black text-gray-900 mt-1">{summary.total_shifts}</p>
                </div>
                <div className="bg-white rounded-xl shadow border-t-4 border-indigo-500 p-5">
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Total Hours</p>
                    <p className="text-3xl font-black text-blue-700 mt-1">{summary.total_hours.toFixed(2)} <span className="text-base font-medium text-gray-500">hrs</span></p>
                </div>
                <div className="bg-white rounded-xl shadow border-t-4 border-green-500 p-5 col-span-2 sm:col-span-1">
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Est. Gross Pay</p>
                    <p className="text-3xl font-black text-green-700 mt-1">${summary.total_earned.toFixed(2)}</p>
                </div>
            </div>

            {/* Store Breakdown */}
            {by_store.length > 1 && (
                <div className="bg-white rounded-xl shadow overflow-hidden">
                    <div className="px-5 py-4 border-b bg-gray-50">
                        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Breakdown by Store</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
                        {by_store.map(s => (
                            <div key={s.store} className="p-4">
                                <p className="font-semibold text-gray-800 text-sm">{s.store}</p>
                                <p className="text-xs text-gray-400">{s.city}</p>
                                <div className="mt-2 flex gap-3 text-xs text-gray-600">
                                    <span className="bg-blue-50 text-blue-700 font-medium px-2 py-0.5 rounded">{s.shifts} shifts</span>
                                    <span className="bg-indigo-50 text-indigo-700 font-medium px-2 py-0.5 rounded">{s.hours.toFixed(2)} hrs</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Shift-by-Shift Table */}
            <div className="bg-white rounded-xl shadow overflow-hidden">
                <div className="px-5 py-4 border-b bg-gray-50 flex justify-between items-center">
                    <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">All Shifts ({shifts.length})</h2>
                    {isHourly && (
                        <span className="text-xs text-gray-500 bg-blue-50 text-blue-700 px-2 py-1 rounded font-medium">
                            ${hourlyRate}/hr × hours = earned
                        </span>
                    )}
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                            <tr>
                                <th className="px-5 py-3 text-left">Date</th>
                                <th className="px-5 py-3 text-left">Store</th>
                                <th className="px-5 py-3 text-center">Time In</th>
                                <th className="px-5 py-3 text-center">Time Out</th>
                                <th className="px-5 py-3 text-center">Hours</th>
                                {isHourly && <th className="px-5 py-3 text-right">Earned</th>}
                                <th className="px-5 py-3 text-right">Store Total</th>
                                <th className="px-5 py-3 text-center">Status</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {(() => {
                                const paged = shifts.slice((page - 1) * limit, page * limit)
                                const totalPages = Math.ceil(shifts.length / limit)
                                return (
                                    <>
                                        {paged.length === 0 ? (
                                            <tr><td colSpan={9} className="px-5 py-8 text-center text-gray-400">No shifts in selected period.</td></tr>
                                        ) : paged.map(s => {
                                            const earned = isHourly ? s.duration * (hourlyRate || 0) : null
                                            return (
                                                <tr key={s.id} className="hover:bg-gray-50 transition">
                                                    <td className="px-5 py-3 text-sm font-semibold text-gray-900 whitespace-nowrap">{dayjs.utc(s.date).format('ddd, M/D/YYYY')}</td>
                                                    <td className="px-5 py-3 text-sm text-gray-700 whitespace-nowrap">
                                                        <div className="font-medium">{s.store_name}</div>
                                                        <div className="text-xs text-gray-400">{s.store_city}</div>
                                                    </td>
                                                    <td className="px-5 py-3 text-sm text-center text-gray-600">{s.time_in || '—'}</td>
                                                    <td className="px-5 py-3 text-sm text-center text-gray-600">{s.time_out || '—'}</td>
                                                    <td className="px-5 py-3 text-center">
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">{s.duration.toFixed(2)} hrs</span>
                                                    </td>
                                                    {isHourly && <td className="px-5 py-3 text-sm text-right font-semibold text-green-700">${(earned || 0).toFixed(2)}</td>}
                                                    <td className="px-5 py-3 text-sm text-right font-bold text-gray-900">${Number(s.total_amount).toFixed(2)}</td>
                                                    <td className="px-5 py-3 text-center">
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${s.status === 'Verified' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>{s.status}</span>
                                                    </td>
                                                    <td className="px-5 py-3 text-right">
                                                        <Link href={`/admin/reports/${s.id}`} className="text-indigo-600 hover:text-indigo-800 text-xs font-semibold">View Report →</Link>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                        <tr className="bg-transparent">
                                            <td colSpan={9} className="p-0">
                                                <Pagination currentPage={page} totalPages={totalPages} totalItems={shifts.length}
                                                    onPageChange={setPage} label="shifts" limit={limit} onLimitChange={v => { setLimit(v); setPage(1) }} />
                                            </td>
                                        </tr>
                                    </>
                                )
                            })()}
                        </tbody>
                        {/* Footer totals (always full dataset) */}
                        {shifts.length > 0 && (
                            <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                                <tr>
                                    <td colSpan={4} className="px-5 py-3 text-sm font-bold text-gray-700">Totals ({shifts.length} shifts)</td>
                                    <td className="px-5 py-3 text-center">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-black bg-indigo-100 text-indigo-800">{summary.total_hours.toFixed(2)} hrs</span>
                                    </td>
                                    {isHourly && <td className="px-5 py-3 text-right font-black text-green-700">${summary.total_earned.toFixed(2)}</td>}
                                    <td className="px-5 py-3 text-right font-bold text-gray-600">${shifts.reduce((a, s) => a + Number(s.total_amount), 0).toFixed(2)}</td>
                                    <td colSpan={2} />
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </div>
    )
}

export default function WorkHoursDetailPage({ params }: { params: Promise<{ userId: string }> }) {
    return (
        <Suspense fallback={<div className="p-8 text-center text-gray-500 animate-pulse">Loading user details...</div>}>
            <WorkHoursDetailContent params={params} />
        </Suspense>
    )
}
