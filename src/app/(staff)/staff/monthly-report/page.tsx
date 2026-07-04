"use client"
import { useEffect, useState, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { generateMonthlyReportPDF, generateMonthlyReportCSV } from "@/lib/export-utils"
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
    admin_expenses_amount: number | null
    status: string
    store: { name: string }
}

type Summary = {
    totalCash: number
    totalCard: number
    totalAmount: number
    totalExpenses: number
    submittedCount: number
    missingCount: number
}

function MonthlyReportContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    
    const [viewMode, setViewMode] = useState<'table' | 'calendar'>(searchParams.get('view') === 'calendar' ? 'calendar' : 'table')
    const [data, setData] = useState<ReportRow[]>([])
    const [summary, setSummary] = useState<Summary | null>(null)
    const [storeName, setStoreName] = useState("")
    const [month, setMonth] = useState("")
    const [expensesList, setExpensesList] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    const { data: session } = useSession()

    const startDate = searchParams.get('startDate') || ""
    const endDate = searchParams.get('endDate') || ""

    const setPeriod = (period: '1-15' | '16-end') => {
        const now = dayjs().tz(TIMEZONE)
        const monthYear = now.format('YYYY-MM')
        
        let s = ""
        let e = ""
        
        if (period === '1-15') {
            s = `${monthYear}-01`
            e = `${monthYear}-15`
        } else {
            s = `${monthYear}-16`
            e = now.endOf('month').format('YYYY-MM-DD')
        }
        
        const params = new URLSearchParams()
        params.set('startDate', s)
        params.set('endDate', e)
        if (viewMode === 'calendar') params.set('view', 'calendar')
        router.push(`/staff/monthly-report?${params.toString()}`)
    }

    const clearPeriod = () => {
        const params = new URLSearchParams()
        if (viewMode === 'calendar') params.set('view', 'calendar')
        const query = params.toString()
        router.push(query ? `/staff/monthly-report?${query}` : '/staff/monthly-report')
    }

    const setView = (newView: 'table' | 'calendar') => {
        setViewMode(newView)
        const params = new URLSearchParams()
        if (startDate) params.set('startDate', startDate)
        if (endDate) params.set('endDate', endDate)
        if (newView === 'calendar') params.set('view', 'calendar')
        router.push(`/staff/monthly-report?${params.toString()}`)
    }

    useEffect(() => {
        setLoading(true)
        const params = new URLSearchParams()
        if (startDate) params.set('startDate', startDate)
        if (endDate) params.set('endDate', endDate)

        fetch(`/api/staff/monthly-report?${params.toString()}`)
            .then(res => res.json())
            .then(d => {
                if (d.error) {
                    setError(d.error)
                } else {
                    setData(d.data || [])
                    setSummary(d.summary || null)
                    setExpensesList(d.expensesList || [])
                    setStoreName(d.storeName || "")
                    setMonth(d.month || "")
                }
                setLoading(false)
            })
            .catch(() => {
                setError("Failed to load monthly report")
                setLoading(false)
            })
    }, [startDate, endDate])

    if (loading) {
        return (
            <div className="max-w-6xl mx-auto space-y-4 animate-pulse">
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
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-wrap justify-between items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <div className="flex items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Monthly Report</h1>
                        <p className="text-sm text-gray-500 mt-1">{storeName} — {month}</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        <button 
                            onClick={() => setPeriod('1-15')}
                            className={`px-4 py-1.5 text-xs font-bold rounded-md transition ${startDate.endsWith('-01') && endDate.endsWith('-15') ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            1-15
                        </button>
                        <button 
                            onClick={() => setPeriod('16-end')}
                            className={`px-4 py-1.5 text-xs font-bold rounded-md transition ${startDate.endsWith('-16') ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            16+
                        </button>
                        {startDate && (
                            <button 
                                onClick={clearPeriod}
                                className="px-3 py-1.5 text-xs font-bold text-red-500 hover:text-red-700 ml-1"
                            >
                                Clear
                            </button>
                        )}
                    </div>

                    <div className="flex bg-gray-100 rounded-lg p-1">
                        <button 
                            onClick={() => setView('table')}
                            className={`p-1.5 rounded-md transition ${viewMode === 'table' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            title="Table View"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                        <button 
                            onClick={() => setView('calendar')}
                            className={`p-1.5 rounded-md transition ${viewMode === 'calendar' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            title="Calendar View"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </button>
                    </div>
                    
                    {/* Exports */}
                    <div className="flex bg-blue-50 border border-blue-100 rounded-lg p-1">
                        <button 
                            onClick={() => generateMonthlyReportPDF(data, expensesList, summary, storeName, session?.user?.name || "Staff", startDate ? `${startDate} to ${endDate}` : 'Full Month')}
                            className="px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 rounded-md transition flex items-center gap-1"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            PDF
                        </button>
                        <button 
                            onClick={() => generateMonthlyReportCSV(data, expensesList, summary, storeName, session?.user?.name || "Staff", startDate ? `${startDate} to ${endDate}` : 'Full Month')}
                            className="px-3 py-1.5 text-xs font-bold text-green-700 hover:bg-green-100 rounded-md transition flex items-center gap-1"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            CSV
                        </button>
                    </div>

                    <Link href="/staff/home" className="text-gray-600 hover:text-gray-900 font-medium text-sm border-l pl-3 border-gray-200">
                        Back to Home
                    </Link>
                </div>
            </div>

            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <div className="bg-white rounded-lg shadow p-4 border-t-4 border-indigo-500">
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Revenue</p>
                        <p className="text-xl font-bold text-indigo-700 mt-1">${summary.totalAmount.toFixed(2)}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4 border-t-4 border-orange-400">
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Cash</p>
                        <p className="text-xl font-bold text-orange-600 mt-1">${summary.totalCash.toFixed(2)}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4 border-t-4 border-blue-500">
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Card</p>
                        <p className="text-xl font-bold text-blue-600 mt-1">${summary.totalCard.toFixed(2)}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4 border-t-4 border-red-500">
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Expenses</p>
                        <p className="text-xl font-bold text-red-600 mt-1">${summary.totalExpenses.toFixed(2)}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4 border-t-4 border-emerald-500">
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Balance</p>
                        <p className="text-xl font-bold text-emerald-700 mt-1">${(summary.totalAmount - summary.totalExpenses).toFixed(2)}</p>
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

            {/* Main View Block (Table or Calendar) */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
                {loading ? (
                    <div className="p-10 text-center text-gray-400 animate-pulse">Loading...</div>
                ) : viewMode === 'calendar' ? (
                    (() => {
                        const activeMonth = startDate ? dayjs(startDate).format('YYYY-MM') : dayjs().tz(TIMEZONE).format('YYYY-MM')
                        const startDay = dayjs(activeMonth + "-01").startOf('month').startOf('week')
                        const endDay = dayjs(activeMonth + "-01").endOf('month').endOf('week')
                        const days = []
                        let current = startDay
                        while (current.isBefore(endDay) || current.isSame(endDay, 'day')) {
                            days.push(current)
                            current = current.add(1, 'day')
                        }
                        const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                        return (
                            <div className="p-4 overflow-x-auto">
                                <div className="min-w-[800px]">
                                    <div className="grid grid-cols-7 bg-gray-200 gap-px rounded-xl overflow-hidden border border-gray-200">
                                        {WEEK_DAYS.map(day => (
                                            <div key={day} className="bg-gray-50 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                {day}
                                            </div>
                                        ))}
                                        {days.map(date => {
                                            const dateStr = date.format('YYYY-MM-DD')
                                            const isCurrentMonth = date.format('YYYY-MM') === activeMonth
                                            const isToday = date.isSame(dayjs().tz(TIMEZONE), 'day')
                                            const isFuture = date.isAfter(dayjs().tz(TIMEZONE), 'day')
                                            const row = data.find(r => dayjs.utc(r.report_date).format('YYYY-MM-DD') === dateStr)
                                            const isMissing = (!row || row.status === 'Missing') && !isFuture && isCurrentMonth
                                            const isFiltered = (startDate && dateStr < startDate) || (endDate && dateStr > endDate)

                                            const hasReport = !!row && row.status !== 'Missing'
                                            const tRevenue = hasReport ? Number(row.total_amount || 0) : 0
                                            const tCash = hasReport ? Number(row.cash_amount || 0) : 0
                                            const tCard = hasReport ? Number(row.card_amount || 0) : 0

                                            let cellBg = 'bg-white'
                                            let borderStyle = 'border-gray-100'
                                            let linkUrl = ''

                                            if (!isCurrentMonth) {
                                                cellBg = 'bg-gray-50/50 text-gray-400'
                                            } else if (isFiltered) {
                                                cellBg = 'bg-gray-50/70 text-gray-300 opacity-45'
                                            } else if (isMissing) {
                                                cellBg = 'bg-red-50/60 hover:bg-red-50 transition'
                                                borderStyle = 'border-red-200'
                                                
                                                const canSubmit = (dateStr === dayjs().tz(TIMEZONE).format('YYYY-MM-DD') || dateStr === dayjs().tz(TIMEZONE).subtract(1, 'day').format('YYYY-MM-DD'))
                                                if (canSubmit) {
                                                    linkUrl = `/staff/report/new?date=${dateStr}`
                                                }
                                            } else if (hasReport && row) {
                                                linkUrl = `/staff/report/${row.id}`
                                                if (row.status === 'Verified') {
                                                    borderStyle = 'border-green-300'
                                                    cellBg = 'bg-white hover:bg-green-50/20'
                                                } else if (row.status === 'CorrectionRequested') {
                                                    borderStyle = 'border-yellow-300'
                                                    cellBg = 'bg-white hover:bg-yellow-50/20'
                                                } else {
                                                    borderStyle = 'border-indigo-200'
                                                    cellBg = 'bg-white hover:bg-indigo-50/20'
                                                }
                                            }

                                            const cellContent = (
                                                <div className={`flex flex-col h-full min-h-[135px] p-2.5 border-t-2 ${borderStyle} ${cellBg} relative transition-all`}>
                                                    <div className="flex justify-between items-center mb-1.5">
                                                        <span className={`text-xs font-bold ${!isCurrentMonth ? 'text-gray-400' : isToday ? 'bg-indigo-600 text-white rounded-full w-5 h-5 flex items-center justify-center' : 'text-gray-700'}`}>
                                                            {date.date()}
                                                        </span>
                                                        {isMissing && (
                                                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">
                                                                Missing
                                                            </span>
                                                        )}
                                                    </div>

                                                    {hasReport && (
                                                        <div className="space-y-1 text-[10px] font-semibold text-gray-600 mt-auto">
                                                            <div className={`flex justify-between ${tRevenue > 500 ? 'text-red-600' : 'text-indigo-700'} font-black text-lg border-b border-gray-100 pb-0.5 mb-0.5`}>
                                                                <span>Rev:</span>
                                                                <span>${tRevenue.toFixed(2)}</span>
                                                            </div>
                                                            <div className="flex justify-between text-slate-500 font-medium">
                                                                <span>Cash:</span>
                                                                <span>${tCash.toFixed(2)}</span>
                                                            </div>
                                                            <div className="flex justify-between text-blue-600 font-medium">
                                                                <span>Card:</span>
                                                                <span>${tCard.toFixed(2)}</span>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {isMissing && (
                                                        <div className="flex-1 flex flex-col justify-center items-center gap-1.5 mt-auto">
                                                            <span className="text-[10px] text-red-400 font-medium text-center">No report</span>
                                                            {isCurrentMonth && !isFiltered && linkUrl && (
                                                                <span className="inline-flex bg-red-500 hover:bg-red-600 text-white text-[9px] font-bold px-2.5 py-0.5 rounded-full transition shadow-sm">
                                                                    Submit
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )

                                            if (linkUrl && isCurrentMonth && !isFiltered) {
                                                return (
                                                    <Link key={dateStr} href={linkUrl} className="block select-none focus:outline-none hover:no-underline">
                                                        {cellContent}
                                                    </Link>
                                                )
                                            }

                                            return <div key={dateStr} className="select-none">{cellContent}</div>
                                        })}
                                    </div>
                                </div>
                            </div>
                        )
                    })()
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Revenue</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Cash</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Card</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Expenses</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Balance</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {data.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                                            No data for this month yet.
                                        </td>
                                    </tr>
                                ) : data.map((row) => {
                                    const isMissing = row.status === 'Missing'
                                    const dateStr = dayjs.utc(row.report_date).format('YYYY-MM-DD')
                                    return (
                                        <tr key={row.id} className={`${isMissing ? 'bg-red-50' : 'hover:bg-gray-50'} transition`}>
                                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                                {dayjs.utc(row.report_date).format('ddd, M/D/YYYY')}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-right font-bold text-indigo-700">
                                                {row.total_amount != null ? `$${Number(row.total_amount).toFixed(2)}` : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-right text-gray-600">
                                                {row.cash_amount != null ? `$${Number(row.cash_amount).toFixed(2)}` : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-right text-blue-700">
                                                {row.card_amount != null ? `$${Number(row.card_amount).toFixed(2)}` : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-right text-red-600">
                                                {row.status !== 'Missing' || (row.admin_expenses_amount || 0) > 0 ? `$${(Number(row.expenses_amount || 0) + Number(row.payouts_amount || 0) + Number(row.admin_expenses_amount || 0)).toFixed(2)}` : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-right font-black text-emerald-700">
                                                {row.status !== 'Missing' || (row.admin_expenses_amount || 0) > 0 ? `$${(Number(row.total_amount || 0) - (Number(row.expenses_amount || 0) + Number(row.payouts_amount || 0) + Number(row.admin_expenses_amount || 0))).toFixed(2)}` : '—'}
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
                                                        {row.status === 'Verified' ? 'Verified' : row.status === 'CorrectionRequested' ? 'Correction' : 'View'}
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
                                        <td className="px-4 py-3 text-sm font-bold text-right text-indigo-700">${summary.totalAmount.toFixed(2)}</td>
                                        <td className="px-4 py-3 text-sm font-bold text-right text-gray-600">${summary.totalCash.toFixed(2)}</td>
                                        <td className="px-4 py-3 text-sm font-bold text-right text-blue-700">${summary.totalCard.toFixed(2)}</td>
                                        <td className="px-4 py-3 text-sm font-bold text-right text-red-600">${summary.totalExpenses.toFixed(2)}</td>
                                        <td className="px-4 py-3 text-sm font-bold text-right text-emerald-700">${(summary.totalAmount - summary.totalExpenses).toFixed(2)}</td>
                                        <td />
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

export default function MonthlyReportPage() {
    return (
        <Suspense fallback={
            <div className="max-w-4xl mx-auto space-y-4 animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-1/2" />
                <div className="grid grid-cols-3 gap-4 mt-8">
                    {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-200 rounded-lg" />)}
                </div>
                <div className="h-64 bg-gray-200 rounded-lg" />
            </div>
        }>
            <MonthlyReportContent />
        </Suspense>
    )
}
