"use client"
import Link from 'next/link'
import { signOut, useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { CompanyProvider, useCompany } from '@/components/CompanyProvider'

const NAV_ITEMS = [
    { href: '/staff/home',           label: 'Home',     icon: '🏠' },
    { href: '/staff/report/new',     label: 'Submit',   icon: '➕' },
    { href: '/staff/schedule',       label: 'Schedule', icon: '📅' },
    { href: '/staff/monthly-report', label: 'Monthly',  icon: '📆' },
    { href: '/staff/reports',        label: 'History',  icon: '📋' },
]

export default function StaffLayout({ children }: { children: React.ReactNode }) {
    return (
        <CompanyProvider>
            <StaffLayoutInner>{children}</StaffLayoutInner>
        </CompanyProvider>
    )
}

import StaffHeaderMenu from '@/components/StaffHeaderMenu'

function StaffLayoutInner({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const { data: session } = useSession()
    const company = useCompany()

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Top Header */}
            <header className="bg-white shadow shrink-0 sticky top-0 z-40">
                <div className="max-w-2xl mx-auto px-4 py-3 flex justify-between items-center">
                    <Link href="/staff/home" className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        {company.logo_url && <img src={company.logo_url} alt="Logo" className="w-6 h-6 object-contain rounded" />}
                        {!company.logo_url && <span className="text-brand">⚡</span>}
                        {company.name || 'Daily Sales'}
                    </Link>
                    <div className="flex items-center gap-3">
                        <StaffHeaderMenu />
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
                                    ${isActive ? 'text-brand' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                <span className="text-xl leading-none">{item.icon}</span>
                                <span>{item.label}</span>
                                {isActive && <span className="absolute bottom-0 w-8 h-0.5 bg-brand rounded-t-full" />}
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
