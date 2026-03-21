"use client"
import { useState, useEffect, useCallback, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import dayjs from "dayjs"
import weekday from "dayjs/plugin/weekday"
import isoWeek from "dayjs/plugin/isoWeek"
import toast from "react-hot-toast"

dayjs.extend(weekday)
dayjs.extend(isoWeek)

type Member = { user: { id: string; name: string; role: string } }
type Shift = {
    id: string
    user_id: string
    shift_date: string
    start_time: string
    end_time: string
    notes: string | null
    user: { id: string; name: string }
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const COLORS = [
    'bg-indigo-100 border-indigo-300 text-indigo-800',
    'bg-emerald-100 border-emerald-300 text-emerald-800',
    'bg-amber-100 border-amber-300 text-amber-800',
    'bg-rose-100 border-rose-300 text-rose-800',
    'bg-purple-100 border-purple-300 text-purple-800',
    'bg-cyan-100 border-cyan-300 text-cyan-800',
    'bg-orange-100 border-orange-300 text-orange-800',
    'bg-pink-100 border-pink-300 text-pink-800',
]

function getWeekStart(date: dayjs.Dayjs) {
    // Monday of the current week
    return date.isoWeekday(1).startOf('day')
}

function AdminScheduleContent() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [stores, setStores] = useState<any[]>([])
    const [storeId, setStoreId] = useState(searchParams.get('storeId') || '')
    const [weekStart, setWeekStart] = useState(
        searchParams.get('week') || getWeekStart(dayjs()).format('YYYY-MM-DD')
    )
    const [shifts, setShifts] = useState<Shift[]>([])
    const [members, setMembers] = useState<Member[]>([])
    const [loading, setLoading] = useState(false)

    // Modal state
    const [modal, setModal] = useState<{
        open: boolean
        dateStr: string
        userId: string
        shiftId?: string
        startTime: string
        endTime: string
        notes: string
    } | null>(null)
    const [saving, setSaving] = useState(false)

    const pushParams = useCallback((overrides: Record<string, string> = {}) => {
        const vals = { storeId, week: weekStart, ...overrides }
        const p = new URLSearchParams()
        Object.entries(vals).forEach(([k, v]) => { if (v) p.set(k, v) })
        router.replace(`/admin/schedule?${p.toString()}`, { scroll: false })
    }, [storeId, weekStart, router])

    useEffect(() => {
        fetch('/api/admin/stores').then(r => r.json()).then(d => {
            const list = Array.isArray(d) ? d.filter((s: any) => s.status === 'Active') : []
            setStores(list)
            if (!storeId && list.length > 0) {
                setStoreId(list[0].id)
                pushParams({ storeId: list[0].id })
            }
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const fetchSchedule = useCallback(() => {
        if (!storeId) return
        setLoading(true)
        fetch(`/api/admin/schedule?storeId=${storeId}&weekStart=${weekStart}`)
            .then(r => r.json())
            .then(d => { setShifts(d.shifts || []); setMembers(d.members || []) })
            .finally(() => setLoading(false))
    }, [storeId, weekStart])

    useEffect(() => { fetchSchedule() }, [fetchSchedule])

    const weekDays = Array.from({ length: 7 }, (_, i) => dayjs(weekStart).add(i, 'day'))
    const userColorMap = new Map(members.map((m, i) => [m.user.id, COLORS[i % COLORS.length]]))

    const getShiftsFor = (userId: string, dateStr: string) =>
        shifts.filter(s => s.user_id === userId && s.shift_date.startsWith(dateStr))

    const openModal = (userId: string, dateStr: string) => {
        const existing = getShiftsFor(userId, dateStr)[0]
        setModal({
            open: true,
            dateStr,
            userId,
            shiftId: existing?.id,
            startTime: existing?.start_time || '09:00',
            endTime: existing?.end_time || '17:00',
            notes: existing?.notes || ''
        })
    }

    const saveShift = async () => {
        if (!modal || !storeId) return
        setSaving(true)
        try {
            await fetch('/api/admin/schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    store_id: storeId,
                    user_id: modal.userId,
                    shift_date: modal.dateStr,
                    start_time: modal.startTime,
                    end_time: modal.endTime,
                    notes: modal.notes
                })
            })
            toast.success('Shift saved!')
            setModal(null)
            fetchSchedule()
        } catch {
            toast.error('Failed to save shift')
        } finally {
            setSaving(false)
        }
    }

    const deleteShift = async (id: string) => {
        try {
            await fetch(`/api/admin/schedule?id=${id}`, { method: 'DELETE' })
            toast.success('Shift removed')
            setModal(null)
            fetchSchedule()
        } catch {
            toast.error('Failed to delete')
        }
    }

    const prevWeek = () => {
        const w = dayjs(weekStart).subtract(7, 'day').format('YYYY-MM-DD')
        setWeekStart(w); pushParams({ week: w })
    }
    const nextWeek = () => {
        const w = dayjs(weekStart).add(7, 'day').format('YYYY-MM-DD')
        setWeekStart(w); pushParams({ week: w })
    }
    const thisWeek = () => {
        const w = getWeekStart(dayjs()).format('YYYY-MM-DD')
        setWeekStart(w); pushParams({ week: w })
    }

    const todayStr = dayjs().format('YYYY-MM-DD')

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">📅 Shift Scheduling</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Assign and manage weekly staff shifts</p>
                </div>
            </div>

            {/* Controls */}
            <div className="bg-white rounded-xl shadow p-4 flex flex-wrap gap-4 items-end">
                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Store</label>
                    <select
                        value={storeId}
                        onChange={e => { setStoreId(e.target.value); pushParams({ storeId: e.target.value }) }}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-indigo-500 focus:border-indigo-500 min-w-[200px]"
                    >
                        <option value="">— Select Store —</option>
                        {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={prevWeek} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600">◀</button>
                    <div className="text-center min-w-[160px]">
                        <p className="text-sm font-bold text-gray-900">
                            {dayjs(weekStart).format('MMM D')} – {dayjs(weekStart).add(6, 'day').format('MMM D, YYYY')}
                        </p>
                    </div>
                    <button onClick={nextWeek} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600">▶</button>
                </div>
                <button onClick={thisWeek} className="text-sm font-medium text-indigo-600 hover:text-indigo-800 border border-indigo-200 bg-indigo-50 px-3 py-2 rounded-lg transition">
                    This Week
                </button>
            </div>

            {/* Legend */}
            {members.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {members.map(m => (
                        <span key={m.user.id} className={`text-xs font-semibold px-3 py-1 rounded-full border ${userColorMap.get(m.user.id) || COLORS[0]}`}>
                            {m.user.name}
                        </span>
                    ))}
                </div>
            )}

            {/* Calendar Grid */}
            {!storeId ? (
                <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400">Select a store to view the schedule.</div>
            ) : loading ? (
                <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400 animate-pulse">Loading schedule...</div>
            ) : members.length === 0 ? (
                <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400">No active staff assigned to this store.</div>
            ) : (
                <div className="bg-white rounded-xl shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-36 sticky left-0 bg-gray-50 z-10">
                                        Staff
                                    </th>
                                    {weekDays.map((d, i) => {
                                        const ds = d.format('YYYY-MM-DD')
                                        const isToday = ds === todayStr
                                        return (
                                            <th key={i} className={`px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider min-w-[100px] ${isToday ? 'text-indigo-600 bg-indigo-50' : 'text-gray-500'}`}>
                                                <div>{DAYS[i]}</div>
                                                <div className={`text-base font-black mt-0.5 ${isToday ? 'text-indigo-600' : 'text-gray-800'}`}>
                                                    {d.format('D')}
                                                </div>
                                            </th>
                                        )
                                    })}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {members.map(m => {
                                    const color = userColorMap.get(m.user.id) || COLORS[0]
                                    return (
                                        <tr key={m.user.id} className="hover:bg-gray-50/50">
                                            <td className="px-4 py-3 sticky left-0 bg-white z-10 border-r border-gray-100">
                                                <p className="text-sm font-semibold text-gray-900 leading-tight">{m.user.name}</p>
                                                <p className="text-xs text-gray-400">{m.user.role}</p>
                                            </td>
                                            {weekDays.map((d, i) => {
                                                const ds = d.format('YYYY-MM-DD')
                                                const dayShifts = getShiftsFor(m.user.id, ds)
                                                const isToday = ds === todayStr
                                                return (
                                                    <td key={i}
                                                        onClick={() => openModal(m.user.id, ds)}
                                                        className={`px-2 py-2 text-center cursor-pointer transition ${isToday ? 'bg-indigo-50/30' : ''} hover:bg-indigo-50`}>
                                                        {dayShifts.length > 0 ? (
                                                            dayShifts.map(sh => (
                                                                <div key={sh.id} className={`text-xs font-semibold px-2 py-1 rounded-lg border ${color} leading-tight`}>
                                                                    <div>{sh.start_time}</div>
                                                                    <div className="text-[10px] opacity-70">to {sh.end_time}</div>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className="h-10 flex items-center justify-center text-gray-200 hover:text-gray-400 text-lg">+</div>
                                                        )}
                                                    </td>
                                                )
                                            })}
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Shift Quick Summary */}
            {shifts.length > 0 && (
                <div className="bg-white rounded-xl shadow p-5">
                    <h2 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">This Week — Shift Summary</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-indigo-50 rounded-lg p-3 text-center">
                            <p className="text-2xl font-black text-indigo-700">{shifts.length}</p>
                            <p className="text-xs text-indigo-500 font-medium mt-0.5">Total Shifts</p>
                        </div>
                        <div className="bg-emerald-50 rounded-lg p-3 text-center">
                            <p className="text-2xl font-black text-emerald-700">{new Set(shifts.map(s => s.user_id)).size}</p>
                            <p className="text-xs text-emerald-500 font-medium mt-0.5">Staff Scheduled</p>
                        </div>
                        <div className="bg-amber-50 rounded-lg p-3 text-center">
                            <p className="text-2xl font-black text-amber-700">
                                {Math.round(shifts.reduce((a, s) => {
                                    const [sh, sm] = s.start_time.split(':').map(Number)
                                    const [eh, em] = s.end_time.split(':').map(Number)
                                    return a + (eh + em / 60 - sh - sm / 60)
                                }, 0))}h
                            </p>
                            <p className="text-xs text-amber-500 font-medium mt-0.5">Total Hours</p>
                        </div>
                        <div className="bg-rose-50 rounded-lg p-3 text-center">
                            <p className="text-2xl font-black text-rose-700">{members.length - new Set(shifts.map(s => s.user_id)).size}</p>
                            <p className="text-xs text-rose-500 font-medium mt-0.5">Not Scheduled</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Shift Modal */}
            {modal?.open && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-5">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">
                                    {modal.shiftId ? 'Edit Shift' : 'Assign Shift'}
                                </h2>
                                <p className="text-sm text-gray-400 mt-0.5">
                                    {members.find(m => m.user.id === modal.userId)?.user.name} · {dayjs(modal.dateStr).format('ddd, MMM D')}
                                </p>
                            </div>
                            <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Start Time</label>
                                    <input
                                        type="time"
                                        value={modal.startTime}
                                        onChange={e => setModal(m => m ? { ...m, startTime: e.target.value } : m)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">End Time</label>
                                    <input
                                        type="time"
                                        value={modal.endTime}
                                        onChange={e => setModal(m => m ? { ...m, endTime: e.target.value } : m)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Notes (optional)</label>
                                <input
                                    type="text"
                                    value={modal.notes}
                                    onChange={e => setModal(m => m ? { ...m, notes: e.target.value } : m)}
                                    placeholder="e.g. Opening shift, Manager on duty"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={saveShift}
                                disabled={saving}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl transition disabled:opacity-50"
                            >
                                {saving ? 'Saving...' : modal.shiftId ? 'Update Shift' : 'Assign Shift'}
                            </button>
                            {modal.shiftId && (
                                <button
                                    onClick={() => modal.shiftId && deleteShift(modal.shiftId)}
                                    className="px-4 py-2.5 text-red-600 hover:bg-red-50 border border-red-200 rounded-xl font-semibold transition text-sm"
                                >
                                    Remove
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default function AdminSchedulePage() {
    return (
        <Suspense fallback={<div className="p-10 text-center text-gray-400 animate-pulse">Loading...</div>}>
            <AdminScheduleContent />
        </Suspense>
    )
}
