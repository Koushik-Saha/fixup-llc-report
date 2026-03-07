"use client"
import { useEffect, useState } from "react"
import { SkeletonRow } from "@/components/Skeleton"

type WorkHourData = {
    user_id: string
    name: string
    role: string
    base_salary: number
    shifts_count: number
    total_hours: number
    report_details: any[]
}

export default function WorkHoursPage() {
    const [data, setData] = useState<WorkHourData[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")

    // Preset Date Ranges
    const getPresetDates = (preset: string) => {
        const today = new Date()
        let start = new Date()
        let end = new Date()

        switch (preset) {
            case 'This Week':
                // Assuming week starts on Monday
                const day = today.getDay() || 7
                start.setDate(today.getDate() - day + 1)
                break
            case 'Last 15 Days':
                start.setDate(today.getDate() - 15)
                break
            case 'This Month':
                start = new Date(today.getFullYear(), today.getMonth(), 1)
                break
        }

        // Correct timezone offset for stringification
        start.setMinutes(start.getMinutes() - start.getTimezoneOffset())
        end.setMinutes(end.getMinutes() - end.getTimezoneOffset())

        return {
            start: start.toISOString().split('T')[0],
            end: end.toISOString().split('T')[0]
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

                    <div className="flex bg-white shadow-sm border border-gray-300 rounded overflow-hidden">
                        {['This Week', 'Last 15 Days', 'This Month', 'Custom'].map(p => (
                            <button
                                key={p}
                                onClick={() => handlePresetChange(p)}
                                className={`px-4 py-2 text-sm font-medium border-r border-gray-200 last:border-r-0 transition ${preset === p ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-50'}`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>

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
