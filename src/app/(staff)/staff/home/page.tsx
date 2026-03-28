"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import timezone from "dayjs/plugin/timezone"

dayjs.extend(utc)
dayjs.extend(timezone)

const TIMEZONE = "America/Los_Angeles"

type DashData = {
    today: {
        dateLabel: string
        report: { id: string; status: string; cash_amount: number; card_amount: number; total_amount: number } | null
    }
    month: {
        label: string
        submittedCount: number
        missingDays: number
        totalDays: number
        totalHours: number
        totalCash: number
        totalCard: number
        totalRevenue: number
        totalExpenses: number
        totalPaid: number
        verifiedCount: number
    }
    streak: number
    recentReports: Array<{
        id: string
        report_date: string
        cash_amount: number
        card_amount: number
        total_amount: number
        status: string
    }>
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
    return (
        <div className={`bg-white rounded-2xl shadow-sm p-4 border-t-4 ${color}`}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-black text-gray-900 mt-1 leading-none">{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
    )
}

function PunchClock() {
    const [punch, setPunch] = useState<any>(null)
    const [loadingPunch, setLoadingPunch] = useState(true)
    const [timeStr, setTimeStr] = useState<string>('00:00:00')
    const [toggling, setToggling] = useState(false)

    useEffect(() => {
        fetch('/api/staff/punch')
            .then(r => r.json())
            .then(d => { if (d && !d.error) setPunch(d) })
            .finally(() => setLoadingPunch(false))
    }, [])

    useEffect(() => {
        if (!punch?.clock_in || punch?.clock_out) {
            setTimeStr('00:00:00')
            return
        }
        
        const tick = () => {
            const diff = dayjs().diff(dayjs(punch.clock_in), 'second')
            const h = Math.floor(diff / 3600).toString().padStart(2, '0')
            const m = Math.floor((diff % 3600) / 60).toString().padStart(2, '0')
            const s = (diff % 60).toString().padStart(2, '0')
            setTimeStr(`${h}:${m}:${s}`)
        }
        
        tick() // initial tick
        const interval = setInterval(tick, 1000)
        return () => clearInterval(interval)
    }, [punch?.clock_in, punch?.clock_out])

    const handlePunch = async () => {
        setToggling(true)
        const action = punch?.clock_in && !punch?.clock_out ? 'clock_out' : 'clock_in'
        try {
            const res = await fetch('/api/staff/punch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action })
            })
            const data = await res.json()
            if (data.success) {
                setPunch(action === 'clock_in' ? data.log : null)
                // Optionally show a toast
            } else {
                alert(data.error || 'Failed to clock in/out')
            }
        } catch (e: any) {
            alert('A network error occurred.')
        } finally {
            setToggling(false)
        }
    }

    if (loadingPunch) {
        return <div className="bg-white rounded-2xl shadow-sm h-24 animate-pulse border-2 border-slate-100" />
    }

    const isClockedIn = punch?.clock_in && !punch?.clock_out

    return (
        <div className={`rounded-2xl shadow-md p-5 border-2 flex flex-col md:flex-row items-center justify-between gap-4 transition-all ${isClockedIn ? 'bg-indigo-50 border-indigo-200 shadow-indigo-100/50' : 'bg-white border-slate-200'}`}>
            <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Time Clock</p>
                {isClockedIn ? (
                    <div>
                        <p className="text-3xl font-black text-indigo-700 tracking-tight font-mono">{timeStr}</p>
                        <p className="text-xs text-indigo-500 font-medium mt-1">Clocked in at {dayjs(punch.clock_in).format('h:mm A')}</p>
                    </div>
                ) : (
                    <div>
                        <p className="text-3xl font-black text-gray-800 tracking-tight font-mono">{timeStr}</p>
                        <p className="text-xs text-gray-400 font-medium mt-1">You are currently off the clock</p>
                    </div>
                )}
            </div>

            <button
                onClick={handlePunch}
                disabled={toggling}
                className={`py-3 px-8 rounded-xl font-bold text-white shadow-sm transition-transform active:scale-95 disabled:opacity-50 whitespace-nowrap w-full md:w-auto ${
                    isClockedIn 
                        ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-200' 
                        : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200'
                }`}
            >
                {toggling ? 'Updating...' : isClockedIn ? 'Clock Out' : 'Clock In'}
            </button>
        </div>
    )
}

function SkeletonCard() {
    return <div className="bg-white rounded-2xl shadow-sm h-20 animate-pulse border-t-4 border-gray-200" />
}

export default function StaffHomePage() {
    const { data: session } = useSession()
    const [data, setData] = useState<DashData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        fetch('/api/staff/dashboard')
            .then(r => r.json())
            .then(d => { if (d.error) setError(d.error); else setData(d) })
            .catch(() => setError('Failed to load'))
            .finally(() => setLoading(false))
    }, [])

    const firstName = session?.user?.name?.split(' ')[0] || 'there'
    const hour = dayjs().tz(TIMEZONE).hour()
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

    if (error) return <div className="p-6 text-red-500 text-center text-sm">{error}</div>

    const todayStr = dayjs().tz(TIMEZONE).format('YYYY-MM-DD')
    const todaySubmitted = !!data?.today?.report
    const todayReport = data?.today?.report

    return (
        <div className="space-y-5">
        
            <PunchClock />

            {/* Greeting banner */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 text-white shadow-lg">
                <p className="text-blue-100 text-sm">{data?.today?.dateLabel || dayjs().tz(TIMEZONE).format('dddd, MMMM D')}</p>
                <h1 className="text-2xl font-black mt-1">{greeting}, {firstName}!</h1>
                {data?.streak !== undefined && data.streak > 1 && (
                    <p className="text-blue-100 text-sm mt-2">{data.streak}-day submission streak — keep it up!</p>
                )}
            </div>

            {/* Today's Action Card */}
            <div className={`rounded-2xl shadow-sm p-5 flex items-center justify-between gap-4 border-2 ${todaySubmitted ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                <div className="flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Today's Report</p>
                    {loading ? (
                        <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mt-1" />
                    ) : todaySubmitted ? (
                        <>
                            <p className="text-green-700 font-bold text-lg mt-0.5">
                                Submitted
                            </p>
                            <p className="text-sm text-green-600 mt-0.5">
                                Total: <strong>${Number(todayReport?.total_amount || 0).toFixed(2)}</strong>
                                {' '}· Status: <span className="capitalize">{todayReport?.status}</span>
                            </p>
                        </>
                    ) : (
                        <>
                            <p className="text-amber-700 font-bold text-lg mt-0.5">
                                Not submitted yet
                            </p>
                            <p className="text-sm text-amber-600 mt-0.5">Submit before end of day</p>
                        </>
                    )}
                </div>
                {todaySubmitted ? (
                    <Link href={`/staff/report/${todayReport?.id}`}
                        className="bg-green-600 hover:bg-green-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition whitespace-nowrap flex-shrink-0">
                        View →
                    </Link>
                ) : (
                    <Link href={`/staff/report/new?date=${todayStr}`}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition whitespace-nowrap flex-shrink-0">
                        Submit Now
                    </Link>
                )}
            </div>

            {/* Monthly Stats Grid */}
            <div>
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">
                    {data?.month.label || 'This Month'}
                </h2>
                <div className="grid grid-cols-2 gap-3">
                    {loading ? (
                        <>
                            <SkeletonCard /><SkeletonCard />
                            <SkeletonCard /><SkeletonCard />
                            <SkeletonCard /><SkeletonCard />
                        </>
                    ) : data ? (
                        <>
                            <StatCard
                                label="Reports Submitted"
                                value={`${data.month.submittedCount} / ${data.month.totalDays}`}
                                sub={`${data.month.missingDays} missing`}
                                color="border-blue-400"
                            />
                            <StatCard
                                label="Total Sales"
                                value={`$${data.month.totalRevenue.toFixed(2)}`}
                                color="border-green-400"
                            />
                            <StatCard
                                label="Hours Worked"
                                value={`${data.month.totalHours}h`}
                                sub="based on shift times"
                                color="border-indigo-400"
                            />
                            <StatCard
                                label="Pay Received"
                                value={`$${data.month.totalPaid.toFixed(2)}`}
                                sub="this month"
                                color="border-emerald-400"
                            />
                            <StatCard
                                label="Net Cash"
                                value={`$${data.month.totalCash.toFixed(2)}`}
                                sub="after expenses"
                                color="border-yellow-400"
                            />
                            <StatCard
                                label="Total Card"
                                value={`$${data.month.totalCard.toFixed(2)}`}
                                color="border-purple-400"
                            />
                            <StatCard
                                label="Expenses"
                                value={`$${data.month.totalExpenses.toFixed(2)}`}
                                sub="from cash"
                                color="border-red-400"
                            />
                        </>
                    ) : null}
                </div>
            </div>

            {/* Recent Reports */}
            {data && data.recentReports.length > 0 && (
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide">Recent Submissions</h2>
                        <Link href="/staff/reports" className="text-xs text-blue-600 font-semibold hover:underline">See all →</Link>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100">
                        {data.recentReports.map(r => {
                            const dateStr = r.report_date.split('T')[0]
                            return (
                                <Link key={r.id} href={`/staff/report/${r.id}`}
                                    className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition">
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900">
                                            {dayjs.utc(r.report_date).format('ddd, M/D/YYYY')}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            Cash ${Number(r.cash_amount).toFixed(2)} · Card ${Number(r.card_amount).toFixed(2)}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <p className="text-sm font-bold text-gray-900">${Number(r.total_amount).toFixed(2)}</p>
                                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                            r.status === 'Verified' ? 'bg-green-100 text-green-700' :
                                            r.status === 'CorrectionRequested' ? 'bg-yellow-100 text-yellow-700' :
                                            'bg-blue-100 text-blue-700'
                                        }`}>
                                            {r.status === 'CorrectionRequested' ? 'Correction Requested' : r.status}
                                        </span>
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Quick actions */}
            <div className="grid grid-cols-2 gap-3 pb-2">
                <Link href="/staff/monthly-report"
                    className="bg-white rounded-2xl shadow-sm p-4 text-center hover:bg-blue-50 transition border border-gray-100">
                    <p className="text-sm font-semibold text-gray-700">Monthly Report</p>
                </Link>
                <Link href="/staff/reports"
                    className="bg-white rounded-2xl shadow-sm p-4 text-center hover:bg-blue-50 transition border border-gray-100">
                    <p className="text-sm font-semibold text-gray-700">All Reports</p>
                </Link>
            </div>
        </div>
    )
}
