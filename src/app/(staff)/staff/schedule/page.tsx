"use client"
import { useEffect, useState } from "react"
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"

dayjs.extend(utc)

type Shift = {
    id: string
    shift_date: string
    start_time: string
    end_time: string
    notes: string | null
}

function hoursFromShift(s: Shift) {
    const [sh, sm] = s.start_time.split(':').map(Number)
    const [eh, em] = s.end_time.split(':').map(Number)
    return Math.max(0, eh + em / 60 - sh - sm / 60)
}

export default function StaffSchedulePage() {
    const [shifts, setShifts] = useState<Shift[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        fetch('/api/staff/schedule')
            .then(r => r.json())
            .then(d => { if (d.error) setError(d.error); else setShifts(d.shifts || []) })
            .catch(() => setError('Failed to load schedule'))
            .finally(() => setLoading(false))
    }, [])

    const todayStr = dayjs().format('YYYY-MM-DD')
    const totalHours = shifts.reduce((a, s) => a + hoursFromShift(s), 0)
    const nextShift = shifts.find(s => s.shift_date >= todayStr)

    if (loading) return (
        <div className="space-y-4 animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-40" />
            <div className="h-24 bg-gray-200 rounded-2xl" />
            {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-200 rounded-2xl" />)}
        </div>
    )

    if (error) return <div className="p-6 text-red-500 text-center">{error}</div>

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">My Schedule</h1>
                <p className="text-sm text-gray-400 mt-0.5">Your upcoming shifts for the next 2 weeks</p>
            </div>

            {/* Next shift banner */}
            {nextShift ? (
                <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-5 text-white">
                    <p className="text-indigo-200 text-xs font-semibold uppercase tracking-wide">Next Shift</p>
                    <p className="text-xl font-black mt-1">{dayjs.utc(nextShift.shift_date).format('dddd, MMMM D')}</p>
                    <p className="text-indigo-100 text-sm mt-1">{nextShift.start_time} – {nextShift.end_time} · {hoursFromShift(nextShift).toFixed(1)}h</p>
                    {nextShift.notes && <p className="text-indigo-200 text-xs mt-2 italic">{nextShift.notes}</p>}
                </div>
            ) : (
                <div className="bg-gray-50 rounded-2xl p-5 text-center text-gray-400 border border-gray-200">
                    <p className="text-3xl mb-2">📭</p>
                    <p className="font-semibold">No upcoming shifts scheduled</p>
                    <p className="text-sm mt-1">Check back later or contact your manager.</p>
                </div>
            )}

            {/* Stats */}
            {shifts.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white rounded-2xl shadow-sm p-4 border-t-4 border-indigo-400">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Upcoming Shifts</p>
                        <p className="text-2xl font-black text-gray-900 mt-1">{shifts.length}</p>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm p-4 border-t-4 border-violet-400">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Total Hours</p>
                        <p className="text-2xl font-black text-gray-900 mt-1">{totalHours.toFixed(1)}h</p>
                    </div>
                </div>
            )}

            {/* Shifts list */}
            {shifts.length === 0 ? null : (
                <div className="space-y-2">
                    <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide">All Upcoming Shifts</h2>
                    <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100 overflow-hidden">
                        {shifts.map(s => {
                            const isToday = s.shift_date === todayStr
                            const isPast = s.shift_date < todayStr
                            const hours = hoursFromShift(s)
                            return (
                                <div key={s.id} className={`px-4 py-3 flex items-center justify-between gap-3 ${isToday ? 'bg-indigo-50' : isPast ? 'opacity-50' : ''}`}>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                            {dayjs.utc(s.shift_date).format('ddd, MMM D')}
                                            {isToday && <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full font-semibold">Today</span>}
                                        </p>
                                        {s.notes && <p className="text-xs text-gray-400 mt-0.5 italic">{s.notes}</p>}
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className="text-sm font-bold text-gray-900">{s.start_time} – {s.end_time}</p>
                                        <p className="text-xs text-gray-400">{hours.toFixed(1)} hrs</p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
