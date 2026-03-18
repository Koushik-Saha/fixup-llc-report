"use client"
import Link from 'next/link'
import { signOut, useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

function BellIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
    )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { data: session } = useSession()
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [unreadCount, setUnreadCount] = useState(0)
    const isAdmin = session?.user?.role === 'Admin'
    const isManagerOrAdmin = session?.user?.role === 'Admin' || session?.user?.role === 'Manager'
    const pathname = usePathname()

    // Poll unread notification count every 60s
    useEffect(() => {
        if (!session?.user) return
        const load = () => {
            fetch('/api/admin/notifications')
                .then(r => r.json())
                .then(d => setUnreadCount(d.unreadCount || 0))
                .catch(() => { })
        }
        load()
        const interval = setInterval(load, 60000)
        return () => clearInterval(interval)
    }, [session])

    const navLink = (href: string, label: string, color?: string) => {
        const active = pathname === href
        return (
            <Link
                href={href}
                onClick={() => setIsSidebarOpen(false)}
                className={`block py-2 px-4 rounded transition text-sm font-medium
                    ${active ? 'bg-gray-700 text-white' : `hover:bg-gray-800 ${color ?? 'text-gray-200'}`}`}
            >
                {label}
            </Link>
        )
    }

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row">
            {/* Mobile Header */}
            <div className="md:hidden bg-gray-900 text-white p-4 flex justify-between items-center shrink-0">
                <div className="text-xl font-bold">Daily Sales Admin</div>
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 bg-gray-800 rounded font-medium text-sm">
                    {isSidebarOpen ? 'Close Menu' : 'Menu'}
                </button>
            </div>

            {/* Sidebar */}
            <aside className={`${isSidebarOpen ? 'block' : 'hidden'} md:block w-full md:w-64 bg-gray-900 text-white flex-shrink-0 md:h-screen md:sticky top-0 overflow-y-auto`}>
                <div className="hidden md:block p-4 text-xl font-bold border-b border-gray-800">
                    Daily Sales Admin
                </div>
                <nav className="p-3 space-y-1">
                    {isAdmin && navLink('/admin/dashboard', '🏠 Dashboard')}

                    <div className="pt-2 pb-1 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Operations</div>
                    {navLink('/admin/todays-reports', "📅 Today's Reports", 'text-yellow-400')}
                    {isManagerOrAdmin && navLink('/admin/monthly-report', '📆 Monthly Report', 'text-yellow-300')}
                    {navLink('/admin/reports', '📊 All Reports')}

                    {isAdmin && (
                        <>
                            <div className="pt-2 pb-1 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Management</div>
                            {navLink('/admin/stores', '🏪 Stores')}
                            {navLink('/admin/categories', '🏷️ Categories')}
                            {navLink('/admin/users', '👥 Users')}
                            {navLink('/admin/work-hours', '⏱️ Work Hours', 'text-blue-400')}
                            {navLink('/admin/payroll', '💰 Payroll', 'text-green-400')}
                            {navLink('/admin/expenses', '🧾 Expenses', 'text-red-400')}
                            {navLink('/admin/reconciliation', '⚖️ Reconciliation', 'text-orange-400')}
                            {isManagerOrAdmin && navLink('/admin/schedule', '📅 Shift Schedule', 'text-violet-400')}
                            {navLink('/admin/analytics', '📈 Analytics')}

                        </>
                    )}

                    <div className="pt-2 pb-1 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">System</div>

                    {/* Notifications link with badge */}
                    <Link
                        href="/admin/notifications"
                        onClick={() => setIsSidebarOpen(false)}
                        className={`flex items-center justify-between py-2 px-4 rounded transition text-sm font-medium
                            ${pathname === '/admin/notifications' ? 'bg-gray-700 text-white' : 'hover:bg-gray-800 text-gray-200'}`}
                    >
                        <span>🔔 Notifications</span>
                        {unreadCount > 0 && (
                            <span className="bg-red-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </Link>

                    {isAdmin && navLink('/admin/logs', '📋 Activity Logs')}
                    {navLink('/admin/settings/security', '🔐 Security (2FA)')}
                </nav>
            </aside>

            {/* Main content */}
            <div className="flex-1 flex flex-col min-w-0">
                <header className="bg-white shadow px-4 sm:px-6 py-3 flex flex-wrap gap-4 justify-between items-center shrink-0">
                    <h1 className="text-lg font-semibold text-gray-800">Admin Portal</h1>
                    <div className="flex items-center gap-3">
                        {/* Bell icon */}
                        <Link href="/admin/notifications" className="relative text-gray-500 hover:text-indigo-600 transition p-1.5 rounded-lg hover:bg-indigo-50">
                            <BellIcon />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </Link>
                        <span className="text-sm text-gray-500 hidden sm:block">{session?.user?.name}</span>
                        <button
                            onClick={() => signOut()}
                            className="text-sm bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded transition"
                        >
                            Logout
                        </button>
                    </div>
                </header>
                <main className="flex-1 p-4 sm:p-6 overflow-x-hidden">
                    {children}
                </main>
            </div>
        </div>
    )
}
