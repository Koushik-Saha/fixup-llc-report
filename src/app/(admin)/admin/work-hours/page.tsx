"use client"
import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { SkeletonRow } from "@/components/Skeleton"
import { Pagination } from "@/components/Pagination"
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import timezone from "dayjs/plugin/timezone"

dayjs.extend(utc)
dayjs.extend(timezone)

const TIMEZONE = "America/Los_Angeles"

type WorkHourData = {
    user_id: string
    name: string
    role: string
    pay_type: string
    base_salary: number
    shifts_count: number
    total_hours: number
    total_earned: number
    report_details: any[]
}

function WorkHoursPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [data, setData] = useState<WorkHourData[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || "")
    const [page, setPage] = useState(Number(searchParams.get('page') || '1'))
    const [limit, setLimit] = useState(Number(searchParams.get('limit') || '10'))

    // Preset Date Ranges using dayjs with Pacific timezone
    const getPresetDates = (preset: string) => {
        const now = dayjs().tz(TIMEZONE)
        let start = now
        const end = now
        switch (preset) {
            case 'This Week':
                start = now.startOf('week').add(1, 'day')
                break
            case 'Last 15 Days':
                start = now.subtract(15, 'day')
                break
            case 'This Month':
                start = now.startOf('month')
                break
        }
        return { start: start.format('YYYY-MM-DD'), end: end.format('YYYY-MM-DD') }
    }

    const urlPreset = searchParams.get('preset') || 'This Month'
    const urlStart = searchParams.get('startDate') || ''
    const urlEnd = searchParams.get('endDate') || ''

    const [preset, setPreset] = useState(urlPreset)
    const [startDate, setStartDate] = useState(urlStart || getPresetDates(urlPreset).start)
    const [endDate, setEndDate] = useState(urlEnd || getPresetDates(urlPreset).end)

    const pushParams = (overrides: Record<string, string> = {}) => {
        const vals: Record<string, string> = { preset, startDate, endDate, search: searchTerm, ...overrides }
        const p = new URLSearchParams(); Object.entries(vals).forEach(([k, v]) => { if (v) p.set(k, v) })
        router.replace(`/admin/work-hours?${p.toString()}`, { scroll: false })
    }

    const fetchWorkHours = () => {
        if (!startDate || !endDate) return

        setLoading(true)
        fetch(`/api/admin/work-hours?startDate=${startDate}&endDate=${endDate}`)
            .then(res => res.json())
            .then(resData => {
                setData(resData || [])
                setLoading(false)
            })
            .catch(err => {
                console.error("Failed to fetch work hours", err)
                setLoading(false)
            })
    }

    useEffect(() => {
        fetchWorkHours()
    }, [startDate, endDate])

    const handlePresetChange = (p: string) => {
        setPreset(p)
        if (p === 'Custom') { pushParams({ preset: p }); return }
        const dates = getPresetDates(p)
        setStartDate(dates.start)
        setEndDate(dates.end)
        pushParams({ preset: p, startDate: dates.start, endDate: dates.end })
    }

    const filteredData = data.filter(d =>
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.role.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const handleSearch = (v: string) => { setSearchTerm(v); setPage(1); pushParams({ search: v, page: '1' }) }
    const handleCustomDate = (key: string, v: string) => {
        if (key === 'start') { setStartDate(v); pushParams({ startDate: v }) }
        else { setEndDate(v); pushParams({ endDate: v }) }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                <h1 className="text-2xl font-bold text-gray-900">Work Hours Tracking</h1>

                <div className="flex flex-wrap items-center gap-2">
                    <input type="text" placeholder="Search staff..." className="border border-gray-300 rounded px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900 w-full sm:w-auto"
                        value={searchTerm} onChange={(e) => handleSearch(e.target.value)} />

                    <select
                        className="border border-gray-300 rounded px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white min-w-[140px]"
                        value={preset}
                        onChange={(e) => handlePresetChange(e.target.value)}
                    >
                        <option value="This Week">This Week</option>
                        <option value="Last 15 Days">Last 15 Days</option>
                        <option value="This Month">This Month</option>
                        <option value="Custom">Custom Range</option>
                    </select>

                    {preset === 'Custom' && (
                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 border border-gray-300 rounded shadow-sm">
                            <input type="date" value={startDate} onChange={(e) => handleCustomDate('start', e.target.value)} className="text-sm border-none focus:ring-0 p-0 text-gray-900 font-medium" />
                            <span className="text-gray-400">to</span>
                            <input type="date" value={endDate} onChange={(e) => handleCustomDate('end', e.target.value)} className="text-sm border-none focus:ring-0 p-0 text-gray-900 font-medium" />
                        </div>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="bg-white shadow rounded-lg p-6 w-full"><SkeletonRow rows={5} /></div>
            ) : (
                <div className="bg-white shadow overflow-hidden sm:rounded-lg overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff Member</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Total Shifts</th>
                                <th className="px-6 py-3 text-center text-xs font-bold text-blue-600 uppercase tracking-wider">Total Hours</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-green-600 uppercase tracking-wider">Est. Gross Pay</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {(() => {
                                const paged = filteredData.slice((page - 1) * limit, page * limit)
                                const totalPages = Math.ceil(filteredData.length / limit)
                                return (
                                    <>
                                        {paged.map((d) => (
                                            <tr key={d.user_id} className="hover:bg-blue-50 transition cursor-pointer group">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <Link href={`/admin/work-hours/${d.user_id}?startDate=${startDate}&endDate=${endDate}&preset=${preset}`} className="block">
                                                        <div className="text-sm font-bold text-blue-700 group-hover:text-blue-900 group-hover:underline">{d.name}</div>
                                                        <div className="text-xs text-gray-400 mt-0.5 group-hover:text-blue-500">View details →</div>
                                                    </Link>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-500">{d.role}</div></td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-gray-600">{d.shifts_count}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    <span className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-bold bg-blue-100 text-blue-800">{d.total_hours.toFixed(2)} hrs</span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-green-700">${d.total_earned.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                        {paged.length === 0 && (
                                            <tr><td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500 italic">No work hours recorded for the selected date range.</td></tr>
                                        )}
                                        <tr className="bg-transparent">
                                            <td colSpan={5} className="p-0">
                                                <Pagination currentPage={page} totalPages={totalPages} totalItems={filteredData.length}
                                                    onPageChange={v => { setPage(v); pushParams({ page: v.toString() }) }}
                                                    label="staff" limit={limit}
                                                    onLimitChange={v => { setLimit(v); setPage(1); pushParams({ limit: v.toString(), page: '1' }) }} />
                                            </td>
                                        </tr>
                                    </>
                                )
                            })()}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}

export default function WorkHoursPageWrapper() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading...</div>}>
            <WorkHoursPage />
        </Suspense>
    )
}
