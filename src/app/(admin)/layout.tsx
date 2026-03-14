"use client"
import Link from 'next/link'
import { signOut, useSession } from 'next-auth/react'
import { useState } from 'react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { data: session } = useSession()
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const isAdmin = session?.user?.role === 'Admin'

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row">
            {/* Mobile Header for Sidebar Toggle */}
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
                <nav className="p-4 space-y-2">
                    <Link href="/admin/dashboard" onClick={() => setIsSidebarOpen(false)} className="block py-2 px-4 rounded hover:bg-gray-800 transition">Dashboard</Link>
                    {isAdmin && (
                        <>
                            <Link href="/admin/stores" onClick={() => setIsSidebarOpen(false)} className="block py-2 px-4 rounded hover:bg-gray-800 transition">Stores</Link>
                            <Link href="/admin/users" onClick={() => setIsSidebarOpen(false)} className="block py-2 px-4 rounded hover:bg-gray-800 transition">Users</Link>
                            <Link href="/admin/payroll" onClick={() => setIsSidebarOpen(false)} className="block py-2 px-4 rounded hover:bg-gray-800 transition text-green-400 font-medium tracking-wide">Payroll</Link>
                            <Link href="/admin/work-hours" onClick={() => setIsSidebarOpen(false)} className="block py-2 px-4 rounded hover:bg-gray-800 transition text-blue-400 font-medium tracking-wide">Work Hours</Link>
                            <Link href="/admin/expenses" onClick={() => setIsSidebarOpen(false)} className="block py-2 px-4 rounded hover:bg-gray-800 transition text-red-400 font-medium tracking-wide">Expenses</Link>
                        </>
                    )}
                    <Link href="/admin/reports" onClick={() => setIsSidebarOpen(false)} className="block py-2 px-4 rounded hover:bg-gray-800 transition">Reports</Link>
                    <Link href="/admin/todays-reports" onClick={() => setIsSidebarOpen(false)} className="block py-2 px-4 rounded hover:bg-gray-800 transition text-yellow-500 font-medium">Today's Reports</Link>
                    {isAdmin && (
                        <Link href="/admin/analytics" onClick={() => setIsSidebarOpen(false)} className="block py-2 px-4 rounded hover:bg-gray-800 transition">Analytics</Link>
                    )}
                    <Link href="/admin/logs" onClick={() => setIsSidebarOpen(false)} className="block py-2 px-4 rounded hover:bg-gray-800 transition">Activity Logs</Link>
                </nav>
            </aside>
            <div className="flex-1 flex flex-col min-w-0">
                <header className="bg-white shadow px-4 sm:px-6 py-4 flex flex-wrap gap-4 justify-between items-center shrink-0">
                    <h1 className="text-xl font-semibold text-gray-800">Admin Portal</h1>
                    <button
                        onClick={() => signOut()}
                        className="text-sm bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded transition"
                    >
                        Logout
                    </button>
                </header>
                <main className="flex-1 p-4 sm:p-6 overflow-x-hidden">
                    {children}
                </main>
            </div>
        </div>
    )
}
