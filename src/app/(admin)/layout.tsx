"use client"
import Link from 'next/link'
import { signOut } from 'next-auth/react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-gray-100 flex">
            <aside className="w-64 bg-gray-900 text-white flex-shrink-0">
                <div className="p-4 text-xl font-bold border-b border-gray-800">
                    Daily Sales Admin
                </div>
                <nav className="p-4 space-y-2">
                    <Link href="/admin/dashboard" className="block py-2 px-4 rounded hover:bg-gray-800 transition">
                        Dashboard
                    </Link>
                    <Link href="/admin/stores" className="block py-2 px-4 rounded hover:bg-gray-800 transition">
                        Stores
                    </Link>
                    <Link href="/admin/users" className="block py-2 px-4 rounded hover:bg-gray-800 transition">
                        Users
                    </Link>
                    <Link href="/admin/reports" className="block py-2 px-4 rounded hover:bg-gray-800 transition">
                        Reports
                    </Link>
                    <Link href="/admin/analytics" className="block py-2 px-4 rounded hover:bg-gray-800 transition">
                        Analytics
                    </Link>
                </nav>
            </aside>
            <div className="flex-1 flex flex-col">
                <header className="bg-white shadow px-6 py-4 flex justify-between items-center">
                    <h1 className="text-xl font-semibold text-gray-800">Admin Portal</h1>
                    <button
                        onClick={() => signOut()}
                        className="text-sm bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded transition"
                    >
                        Logout
                    </button>
                </header>
                <main className="flex-1 p-6 overflow-auto">
                    {children}
                </main>
            </div>
        </div>
    )
}
