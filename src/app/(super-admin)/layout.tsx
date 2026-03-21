"use client"
import Link from 'next/link'
import { signOut, useSession } from 'next-auth/react'
import { useState } from 'react'
import { usePathname } from 'next/navigation'

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
    const { data: session } = useSession()
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const isSuperAdmin = session?.user?.role === 'SuperAdmin'
    const pathname = usePathname()

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

    if (!session) return null; // Let middleware handle redirect
    if (!isSuperAdmin) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-100">
                <div className="bg-white p-8 rounded shadow text-center">
                    <h2 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h2>
                    <p className="text-gray-600 mb-4">You must be a Super Admin to view this page.</p>
                    <Link href="/" className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Go Home</Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row">
            {/* Mobile Header */}
            <div className="md:hidden bg-gray-900 text-white p-4 flex justify-between items-center shrink-0">
                <div className="text-xl font-bold">FixUp Super Admin</div>
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 bg-gray-800 rounded font-medium text-sm">
                    {isSidebarOpen ? 'Close Menu' : 'Menu'}
                </button>
            </div>

            {/* Sidebar */}
            <aside className={`${isSidebarOpen ? 'block' : 'hidden'} md:block w-full md:w-64 bg-gray-900 text-white flex-shrink-0 md:h-screen md:sticky top-0 overflow-y-auto`}>
                <div className="hidden md:block p-4 text-xl font-bold border-b border-gray-800">
                    FixUp Super Admin
                </div>
                <nav className="p-3 space-y-1">
                    {navLink('/super-admin', '🌍 Overview')}
                    
                    <div className="pt-2 pb-1 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Management</div>
                    {navLink('/super-admin/companies', '🏢 Companies')}
                    {navLink('/super-admin/users', '👥 Global Users')}
                    
                    <div className="pt-2 pb-1 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Platform Settings</div>
                    {navLink('/super-admin/settings', '⚙️ General Settings')}
                </nav>
            </aside>

            {/* Main content */}
            <div className="flex-1 flex flex-col min-w-0">
                <header className="bg-white shadow px-4 sm:px-6 py-3 flex flex-wrap gap-4 justify-between items-center shrink-0">
                    <h1 className="text-lg font-semibold text-gray-800">Platform Control Center</h1>
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-indigo-600 hidden sm:block">SUPER ADMIN</span>
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
