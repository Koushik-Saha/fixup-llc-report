"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import toast from "react-hot-toast"

dayjs.extend(relativeTime)

type Notification = {
    id: string
    type: string
    title: string
    message: string
    is_read: boolean
    store_id: string | null
    report_id: string | null
    createdAt: string
}

const TYPE_CONFIG: Record<string, { icon: string; bg: string; border: string; badge: string }> = {
    MISSING_REPORT:    { icon: '❌', bg: 'bg-red-50',    border: 'border-red-200',    badge: 'bg-red-100 text-red-700' },
    UNVERIFIED_REPORT: { icon: '📋', bg: 'bg-yellow-50', border: 'border-yellow-200', badge: 'bg-yellow-100 text-yellow-700' },
    PAYROLL_DUE:       { icon: '💰', bg: 'bg-green-50',  border: 'border-green-200',  badge: 'bg-green-100 text-green-700' },
    GENERAL:           { icon: '🔔', bg: 'bg-blue-50',   border: 'border-blue-200',   badge: 'bg-blue-100 text-blue-700' },
}

function typeLabel(type: string) {
    return {
        MISSING_REPORT: 'Missing Report',
        UNVERIFIED_REPORT: 'Unverified Reports',
        PAYROLL_DUE: 'Payroll Reminder',
        GENERAL: 'General',
    }[type] ?? type
}

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [loading, setLoading] = useState(true)
    const [generating, setGenerating] = useState(false)
    const [filter, setFilter] = useState<'all' | 'unread'>('all')

    const load = () => {
        fetch('/api/admin/notifications')
            .then(r => r.json())
            .then(d => { setNotifications(d.notifications || []); setUnreadCount(d.unreadCount || 0); setLoading(false) })
    }

    useEffect(() => { load() }, [])

    const markAllRead = async () => {
        await fetch('/api/admin/notifications', { method: 'PATCH' })
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
        setUnreadCount(0)
        toast.success('All marked as read')
    }

    const markRead = async (id: string) => {
        await fetch(`/api/admin/notifications/${id}`, { method: 'PATCH' })
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
        setUnreadCount(prev => Math.max(0, prev - 1))
    }

    const deleteNotification = async (id: string) => {
        await fetch(`/api/admin/notifications/${id}`, { method: 'DELETE' })
        setNotifications(prev => prev.filter(n => n.id !== id))
        toast.success('Notification deleted')
    }

    const generateNotifications = async () => {
        setGenerating(true)
        try {
            const res = await fetch('/api/admin/notifications', { method: 'POST' })
            const d = await res.json()
            toast.success(d.created > 0 ? `${d.created} new notification${d.created > 1 ? 's' : ''} generated!` : 'No new notifications needed')
            load()
        } catch {
            toast.error('Failed to generate notifications')
        } finally {
            setGenerating(false)
        }
    }

    const filtered = filter === 'unread' ? notifications.filter(n => !n.is_read) : notifications

    return (
        <div className="space-y-5 max-w-3xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {unreadCount > 0 ? <span className="text-red-600 font-semibold">{unreadCount} unread</span> : 'All caught up!'}
                    </p>
                </div>
                <div className="flex gap-2">
                    <button onClick={generateNotifications} disabled={generating}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition">
                        {generating ? 'Checking...' : '🔄 Check Now'}
                    </button>
                    {unreadCount > 0 && (
                        <button onClick={markAllRead}
                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition">
                            ✓ Mark All Read
                        </button>
                    )}
                </div>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
                {(['all', 'unread'] as const).map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${filter === f ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                        {f === 'all' ? `All (${notifications.length})` : `Unread (${unreadCount})`}
                    </button>
                ))}
            </div>

            {/* Notification list */}
            {loading ? (
                <div className="space-y-3">
                    {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
                </div>
            ) : filtered.length === 0 ? (
                <div className="bg-white rounded-xl shadow p-12 text-center">
                    <div className="text-5xl mb-3">🎉</div>
                    <p className="text-lg font-semibold text-gray-700">
                        {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">Click "Check Now" to scan for missing reports and alerts</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filtered.map(n => {
                        const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.GENERAL
                        return (
                            <div key={n.id}
                                className={`flex gap-4 p-4 rounded-xl border ${cfg.bg} ${cfg.border} ${!n.is_read ? 'shadow-sm' : 'opacity-75'} transition`}>
                                <div className="text-2xl mt-0.5 flex-shrink-0">{cfg.icon}</div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badge} mr-2`}>
                                                {typeLabel(n.type)}
                                            </span>
                                            {!n.is_read && <span className="inline-block w-2 h-2 bg-blue-500 rounded-full align-middle" />}
                                        </div>
                                        <span className="text-xs text-gray-400 flex-shrink-0">{dayjs(n.createdAt).fromNow()}</span>
                                    </div>
                                    <p className="mt-1 text-sm font-semibold text-gray-900">{n.title}</p>
                                    <p className="text-sm text-gray-600 mt-0.5">{n.message}</p>
                                    <div className="flex gap-3 mt-2">
                                        {n.store_id && (
                                            <Link href={`/admin/reports?storeId=${n.store_id}`}
                                                className="text-xs text-indigo-600 hover:underline font-medium">
                                                View Reports →
                                            </Link>
                                        )}
                                        {n.type === 'UNVERIFIED_REPORT' && (
                                            <Link href="/admin/reports?status=Submitted"
                                                className="text-xs text-indigo-600 hover:underline font-medium">
                                                Review Now →
                                            </Link>
                                        )}
                                        {n.type === 'PAYROLL_DUE' && (
                                            <Link href="/admin/payroll"
                                                className="text-xs text-indigo-600 hover:underline font-medium">
                                                Go to Payroll →
                                            </Link>
                                        )}
                                        {!n.is_read && (
                                            <button onClick={() => markRead(n.id)}
                                                className="text-xs text-gray-400 hover:text-gray-600 font-medium">
                                                Mark read
                                            </button>
                                        )}
                                        <button onClick={() => deleteNotification(n.id)}
                                            className="text-xs text-red-400 hover:text-red-600 font-medium">
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
