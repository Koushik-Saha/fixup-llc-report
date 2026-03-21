"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import Link from "next/link"

export default function SuperAdminDashboard() {
    const { data: session } = useSession()
    const [stats, setStats] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch('/api/super-admin/dashboard')
            .then(res => res.json())
            .then(data => {
                setStats(data)
                setLoading(false)
            })
            .catch(err => {
                console.error(err)
                setLoading(false)
            })
    }, [])

    if (loading) return <div className="p-4 text-gray-500 animate-pulse">Loading platform metrics...</div>

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Platform Overview</h1>
                <p className="text-gray-500 text-sm mt-1">High-level metrics across all companies.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col">
                    <span className="text-gray-500 text-sm font-medium uppercase tracking-wider mb-2">Total Companies</span>
                    <span className="text-4xl font-black text-gray-900">{stats?.totalCompanies || 0}</span>
                </div>
                
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col">
                    <span className="text-gray-500 text-sm font-medium uppercase tracking-wider mb-2">Total Stores</span>
                    <span className="text-4xl font-black text-indigo-600">{stats?.totalStores || 0}</span>
                </div>
                
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col">
                    <span className="text-gray-500 text-sm font-medium uppercase tracking-wider mb-2">Platform Users</span>
                    <span className="text-4xl font-black text-emerald-600">{stats?.totalUsers || 0}</span>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-8">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
                <div className="flex gap-4">
                    <Link href="/super-admin/companies" className="px-4 py-2 bg-indigo-600 text-white rounded font-medium hover:bg-indigo-700 transition shadow">
                        Manage Companies
                    </Link>
                </div>
            </div>
        </div>
    )
}
