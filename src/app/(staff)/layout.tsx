"use client"
import Link from 'next/link'
import { signOut } from 'next-auth/react'

export default function StaffLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <header className="bg-white shadow shrink-0">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap gap-4 justify-between items-center">
                    <Link href="/staff/home" className="text-xl font-bold text-gray-900">
                        Daily Sales
                    </Link>
                    <div className="space-x-4">
                        <Link href="/staff/reports" className="text-gray-600 hover:text-gray-900">Past Reports</Link>
                        <button
                            onClick={() => signOut()}
                            className="text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 py-1 px-3 rounded transition"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </header>
            <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8">
                {children}
            </main>
        </div>
    )
}
