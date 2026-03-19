"use client"
import { useState, useEffect } from "react"
import dayjs from "dayjs"
const FiClock = ({ className }: { className?: string }) => <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-6 h-6 ${className || ''}`}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
const FiEdit2 = ({ className }: { className?: string }) => <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-4 h-4 ${className || ''}`}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
const FiTrash2 = ({ className }: { className?: string }) => <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-4 h-4 ${className || ''}`}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
const FiSearch = ({ className }: { className?: string }) => <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-4 h-4 inline ${className || ''}`}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
const FiCheck = ({ className }: { className?: string }) => <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-4 h-4 ${className || ''}`}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
import toast from "react-hot-toast"

export default function AdminTimeLogsPage() {
    const [logs, setLogs] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [users, setUsers] = useState<any[]>([])
    const [stores, setStores] = useState<any[]>([])
    
    // Filters
    const [selectedStore, setSelectedStore] = useState("")
    const [selectedUser, setSelectedUser] = useState("")
    const [selectedDate, setSelectedDate] = useState("")

    // Editing State
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editForm, setEditForm] = useState<any>({})

    const fetchData = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (selectedStore) params.append("store_id", selectedStore)
            if (selectedUser) params.append("user_id", selectedUser)
            if (selectedDate) {
                params.append("from", selectedDate)
                params.append("to", selectedDate)
            }

            const [logsRes, usersRes, storesRes] = await Promise.all([
                fetch(`/api/admin/time-logs?${params.toString()}`).then(r => r.json()),
                fetch('/api/admin/users').then(r => r.json()),
                fetch('/api/admin/stores').then(r => r.json())
            ])

            if (logsRes.success) setLogs(logsRes.data)
            if (usersRes.success) setUsers(usersRes.data)
            if (storesRes.success) setStores(storesRes.data)
        } catch (error) {
            toast.error("Failed to load time logs")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [selectedStore, selectedUser, selectedDate])

    const startEdit = (log: any) => {
        setEditingId(log.id)
        setEditForm({
            clock_in: dayjs(log.clock_in).format("YYYY-MM-DDTHH:mm"),
            clock_out: log.clock_out ? dayjs(log.clock_out).format("YYYY-MM-DDTHH:mm") : "",
            status: log.status,
            notes: log.notes || ""
        })
    }

    const cancelEdit = () => {
        setEditingId(null)
        setEditForm({})
    }

    const saveEdit = async (id: string) => {
        try {
            const res = await fetch(`/api/admin/time-logs/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clock_in: new Date(editForm.clock_in).toISOString(),
                    clock_out: editForm.clock_out ? new Date(editForm.clock_out).toISOString() : null,
                    status: editForm.status,
                    notes: editForm.notes
                })
            })
            const data = await res.json()
            if (data.success) {
                toast.success("Time log updated!")
                setEditingId(null)
                fetchData()
            } else {
                toast.error(data.error || "Update failed")
            }
        } catch (error) {
            toast.error("Network error")
        }
    }

    const deleteLog = async (id: string) => {
        if (!confirm("Are you sure you want to delete this time log?")) return
        try {
            const res = await fetch(`/api/admin/time-logs/${id}`, { method: 'DELETE' })
            if (res.ok) {
                toast.success("Log deleted")
                fetchData()
            } else {
                toast.error("Failed to delete log")
            }
        } catch (error) {
            toast.error("Network error")
        }
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <FiClock className="text-indigo-600" />
                        Time Logs
                    </h1>
                    <p className="text-slate-500 mt-1">Review and manage staff punch-ins and hours.</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-wrap gap-4 items-center">
                <FiSearch className="text-slate-400 text-xl" />
                <select 
                    value={selectedStore} 
                    onChange={e => setSelectedStore(e.target.value)}
                    className="bg-slate-50 border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    <option value="">All Stores</option>
                    {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>

                <select 
                    value={selectedUser} 
                    onChange={e => setSelectedUser(e.target.value)}
                    className="bg-slate-50 border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    <option value="">All Staff</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>

                <input 
                    type="date" 
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    className="bg-slate-50 border-slate-200 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
            </div>

            {/* Logs Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-xs font-semibold">
                            <tr>
                                <th className="p-4">Staff Member</th>
                                <th className="p-4">Store</th>
                                <th className="p-4">Clock In</th>
                                <th className="p-4">Clock Out</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 w-40">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="p-10 text-center text-slate-400">Loading logs...</td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-10 text-center text-slate-400">No time logs found.</td>
                                </tr>
                            ) : (
                                logs.map(log => (
                                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-4 font-medium text-slate-800">
                                            {log.user.name}
                                        </td>
                                        <td className="p-4 text-slate-600">
                                            {log.store.name}
                                        </td>
                                        <td className="p-4 text-slate-600">
                                            {editingId === log.id ? (
                                                <input 
                                                    type="datetime-local" 
                                                    value={editForm.clock_in}
                                                    onChange={e => setEditForm({...editForm, clock_in: e.target.value})}
                                                    className="border border-slate-300 rounded p-1 w-full text-sm"
                                                />
                                            ) : (
                                                dayjs(log.clock_in).format("MMM D, h:mm A")
                                            )}
                                        </td>
                                        <td className="p-4 text-slate-600">
                                            {editingId === log.id ? (
                                                <input 
                                                    type="datetime-local" 
                                                    value={editForm.clock_out}
                                                    onChange={e => setEditForm({...editForm, clock_out: e.target.value})}
                                                    className="border border-slate-300 rounded p-1 w-full text-sm"
                                                />
                                            ) : (
                                                log.clock_out ? dayjs(log.clock_out).format("MMM D, h:mm A") : <span className="text-amber-500 font-medium animate-pulse">On the clock</span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            {editingId === log.id ? (
                                                <select 
                                                    value={editForm.status}
                                                    onChange={e => setEditForm({...editForm, status: e.target.value})}
                                                    className="border border-slate-300 rounded p-1 w-full text-sm"
                                                >
                                                    <option value="Approved">Approved</option>
                                                    <option value="Pending">Pending</option>
                                                    <option value="Flagged">Flagged</option>
                                                </select>
                                            ) : (
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                                    log.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                                                    log.status === 'Pending' ? 'bg-amber-100 text-amber-800' :
                                                    'bg-rose-100 text-rose-800'
                                                }`}>
                                                    {log.status}
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            {editingId === log.id ? (
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => saveEdit(log.id)} className="text-emerald-600 hover:text-emerald-700 p-2 bg-emerald-50 rounded-lg"><FiCheck className="w-5 h-5 text-emerald-600" /></button>
                                                    <button onClick={cancelEdit} className="text-slate-500 hover:text-slate-700 p-2 bg-slate-100 rounded-lg text-xs font-bold px-3">Cancel</button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => startEdit(log)} className="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50 transition-colors"><FiEdit2 /></button>
                                                    <button onClick={() => deleteLog(log.id)} className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"><FiTrash2 /></button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
