"use client"
import { useEffect, useState } from "react"
import { SkeletonRow } from "@/components/Skeleton"
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

export default function WorkHoursPage() {
    const [data, setData] = useState<WorkHourData[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")

    // Preset Date Ranges using dayjs with Pacific timezone
    const getPresetDates = (preset: string) => {
        const now = dayjs().tz(TIMEZONE)
        let start = now
        const end = now

        switch (preset) {
            case 'This Week':
                // Week starts on Monday
                start = now.startOf('week').add(1, 'day') // dayjs startOf('week') is Sunday, +1 = Monday
                break
            case 'Last 15 Days':
                start = now.subtract(15, 'day')
                break
            case 'This Month':
                start = now.startOf('month')
                break
        }

        return {
            start: start.format('YYYY-MM-DD'),
            end: end.format('YYYY-MM-DD')
        }
    }

    const initialPreset = getPresetDates('This Week')
    const [preset, setPreset] = useState('This Week')
    const [startDate, setStartDate] = useState(initialPreset.start)
    const [endDate, setEndDate] = useState(initialPreset.end)

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
        if (p === 'Custom') return
        const dates = getPresetDates(p)
        setStartDate(dates.start)
        setEndDate(dates.end)
    }

    const filteredData = data.filter(d =>
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.role.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="space-y-6">
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                <h1 className="text-2xl font-bold text-gray-900">Work Hours Tracking</h1>

                <div className="flex flex-wrap items-center gap-2">
                    <input
                        type="text"
                        placeholder="Search staff..."
                        className="border border-gray-300 rounded px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900 w-full sm:w-auto"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />

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
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="text-sm border-none focus:ring-0 p-0 text-gray-900 font-medium"
                            />
                            <span className="text-gray-400">to</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="text-sm border-none focus:ring-0 p-0 text-gray-900 font-medium"
                            />
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
                            {filteredData.map((d) => (
                                <tr key={d.user_id} className="hover:bg-gray-50 transition">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-bold text-gray-900">{d.name}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-500">{d.role}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-gray-600">
                                        {d.shifts_count}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <span className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-bold bg-blue-100 text-blue-800">
                                            {d.total_hours.toFixed(2)} hrs
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-green-700">
                                        ${d.total_earned.toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                            {filteredData.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500 italic">
                                        No work hours recorded for the selected date range.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
