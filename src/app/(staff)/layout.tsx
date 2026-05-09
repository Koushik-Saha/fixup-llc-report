"use client"
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { CompanyProvider, useCompany } from '@/components/CompanyProvider'
import { DEFAULT_STAFF_PERMISSIONS, type StaffPermissions } from '@/lib/permissions'

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
    const [perms, setPerms] = useState<StaffPermissions>(DEFAULT_STAFF_PERMISSIONS)

    useEffect(() => {
        if (!session?.user) return
        fetch('/api/admin/permissions')
            .then(r => r.json())
            .then(d => { if (d.staff) setPerms(d.staff) })
            .catch(() => {})
    }, [session])

    const navItems = [
        { href: '/staff/home',           label: 'Home',     icon: '🏠', show: true },
        { href: '/staff/report/new',     label: 'Submit',   icon: '➕', show: perms.reports.submit },
        { href: '/staff/schedule',       label: 'Schedule', icon: '📅', show: perms.schedule.view },
        { href: '/staff/monthly-report', label: 'Monthly',  icon: '📆', show: perms.monthly_report.view },
        { href: '/staff/reports',        label: 'History',  icon: '📋', show: perms.reports.view_history },
    ].filter(item => item.show)

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
                    {navItems.map(item => {
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
        </div>
    )
}
