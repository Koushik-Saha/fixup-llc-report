import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import prisma from "@/lib/prisma"
import ChangePasswordWrapper from "@/components/ChangePasswordWrapper"
import Link from "next/link"
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import timezone from "dayjs/plugin/timezone"

dayjs.extend(utc)
dayjs.extend(timezone)

const TIMEZONE = "America/Los_Angeles"

export default async function AdminDashboardPage() {
    const session = await getServerSession(authOptions)

    // Fetch quick stats
    const activeStores = await prisma.store.findMany({
        where: { status: 'Active' },
        select: { id: true, name: true }
    })

    const totalStores = activeStores.length
    const totalUsers = await prisma.user.count({ where: { status: 'Active' } })

    // Today's stats
    const todayStr = dayjs().tz(TIMEZONE).format('YYYY-MM-DD')
    const todayObj = new Date(`${todayStr}T00:00:00.000Z`)

    const todaysReports = await prisma.dailyReport.findMany({
        where: {
            report_date: todayObj
        }
    })

    const totalCash = todaysReports.reduce((acc: number, r: any) => acc + Number(r.cash_amount), 0)
    const totalCard = todaysReports.reduce((acc: number, r: any) => acc + Number(r.card_amount), 0)
    const totalSales = totalCash + totalCard

    // Missing & Submitted Reports logic
    const reportedStoreMap = new Map(todaysReports.map((r: any) => [r.store_id, r.id]))
    const missingStores = activeStores.filter((s: any) => !reportedStoreMap.has(s.id))
    const submittedStores = activeStores.filter((s: any) => reportedStoreMap.has(s.id)).map(s => ({ ...s, reportId: reportedStoreMap.get(s.id) }))

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Admin Dashboard</h2>
            <div className="flex justify-between items-center">
                <p>Welcome, {session?.user?.name}</p>
                <ChangePasswordWrapper />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Link href="/admin/stores" className="bg-white p-6 rounded-lg shadow hover:shadow-md transition block border border-transparent hover:border-gray-200">
                    <h3 className="text-gray-500 text-sm font-medium">Total Stores</h3>
                    <p className="text-3xl font-bold mt-2">{totalStores}</p>
                </Link>
                <Link href="/admin/todays-reports" className="bg-white p-6 rounded-lg shadow hover:shadow-md transition block border border-transparent hover:border-gray-200">
                    <h3 className="text-gray-500 text-sm font-medium">Today's Cash</h3>
                    <p className="text-3xl font-bold mt-2 text-green-600">${totalCash.toFixed(2)}</p>
                </Link>
                <Link href="/admin/todays-reports" className="bg-white p-6 rounded-lg shadow hover:shadow-md transition block border border-transparent hover:border-gray-200">
                    <h3 className="text-gray-500 text-sm font-medium">Today's Card</h3>
                    <p className="text-3xl font-bold mt-2 text-blue-600">${totalCard.toFixed(2)}</p>
                </Link>
                <Link href="/admin/todays-reports" className="bg-white p-6 rounded-lg shadow border border-indigo-200 hover:shadow-md transition block hover:border-indigo-300">
                    <h3 className="text-gray-500 text-sm font-medium">Today's Total Sales</h3>
                    <p className="text-3xl font-bold mt-2 text-indigo-600">${totalSales.toFixed(2)}</p>
                </Link>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border-l-4 border-red-500">
                <h3 className="text-lg font-bold text-red-700 mb-4">Missing Reports Today ({missingStores.length})</h3>
                {missingStores.length === 0 ? (
                    <p className="text-green-600 font-medium">All active stores have submitted their reports today!</p>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {missingStores.map((store: any) => (
                            <Link href={`/admin/reports/new?storeId=${store.id}&date=${todayStr}`} key={store.id} className="bg-red-50 hover:bg-red-100 transition text-red-800 px-3 py-2 rounded-md font-medium text-sm border border-red-100">
                                {store.name}
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
                <h3 className="text-lg font-bold text-green-700 mb-4">Submitted Reports Today ({submittedStores.length})</h3>
                {submittedStores.length === 0 ? (
                    <p className="text-gray-500 italic font-medium">No stores have submitted their report yet today.</p>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {submittedStores.map((store: any) => (
                            <Link href={`/admin/reports/${store.reportId}`} key={store.id} className="bg-green-50 hover:bg-green-100 transition text-green-800 px-3 py-2 rounded-md font-medium text-sm border border-green-200">
                                {store.name}
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
