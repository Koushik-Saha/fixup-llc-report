"use client"
import Link from 'next/link'
import { signOut, useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
    { href: '/staff/home',           label: 'Home',    icon: '🏠' },
    { href: '/staff/report/new',     label: 'Submit',  icon: '➕' },
    { href: '/staff/monthly-report', label: 'Monthly', icon: '📆' },
    { href: '/staff/reports',        label: 'History', icon: '📋' },
]

export default function StaffLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const { data: session } = useSession()

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Top Header */}
            <header className="bg-white shadow shrink-0 sticky top-0 z-40">
                <div className="max-w-2xl mx-auto px-4 py-3 flex justify-between items-center">
                    <Link href="/staff/home" className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <span className="text-blue-600">⚡</span> Daily Sales
                    </Link>
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-500 hidden sm:block">{session?.user?.name}</span>
                        <button
                            onClick={() => signOut()}
                            className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 py-1.5 px-3 rounded-lg transition font-medium"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            {/* Main content — padded bottom for mobile nav */}
            <main className="flex-1 max-w-2xl w-full mx-auto px-4 pt-5 pb-24 sm:pb-8">
                {children}
            </main>

            {/* Mobile Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 sm:hidden safe-area-inset-bottom">
                <div className="flex">
                    {NAV_ITEMS.map(item => {
                        const isActive = pathname === item.href || (item.href === '/staff/report/new' && pathname.startsWith('/staff/report/new'))
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 text-xs font-medium transition
                                    ${isActive ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                <span className="text-xl leading-none">{item.icon}</span>
                                <span>{item.label}</span>
                                {isActive && <span className="absolute bottom-0 w-8 h-0.5 bg-blue-600 rounded-t-full" />}
                            </Link>
                        )
                    })}
                </div>
            </nav>

            {/* Desktop top nav links (hidden on mobile since we have bottom nav) */}
            <div className="hidden sm:block fixed top-0 right-36 h-[52px] items-center gap-6 z-50">
                {/*  intentionally empty — handled by header */}
            </div>
        </div>
    )
}
