import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import prisma from "@/lib/prisma"
import ChangePasswordWrapper from "@/components/ChangePasswordWrapper"

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
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const todaysReports = await prisma.dailyReport.findMany({
        where: {
            report_date: {
                gte: today
            }
        }
    })

    const totalCash = todaysReports.reduce((acc: number, r: any) => acc + Number(r.cash_amount), 0)
    const totalCard = todaysReports.reduce((acc: number, r: any) => acc + Number(r.card_amount), 0)
    const totalSales = totalCash + totalCard

    // Missing Reports logic
    const reportedStoreIds = new Set(todaysReports.map((r: any) => r.store_id))
    const missingStores = activeStores.filter((s: any) => !reportedStoreIds.has(s.id))

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Admin Dashboard</h2>
            <div className="flex justify-between items-center">
                <p>Welcome, {session?.user?.name}</p>
                <ChangePasswordWrapper />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-gray-500 text-sm font-medium">Total Stores</h3>
                    <p className="text-3xl font-bold mt-2">{totalStores}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-gray-500 text-sm font-medium">Today's Cash</h3>
                    <p className="text-3xl font-bold mt-2 text-green-600">${totalCash.toFixed(2)}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-gray-500 text-sm font-medium">Today's Card</h3>
                    <p className="text-3xl font-bold mt-2 text-blue-600">${totalCard.toFixed(2)}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow border border-indigo-200">
                    <h3 className="text-gray-500 text-sm font-medium">Today's Total Sales</h3>
                    <p className="text-3xl font-bold mt-2 text-indigo-600">${totalSales.toFixed(2)}</p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border-l-4 border-red-500">
                <h3 className="text-lg font-bold text-red-700 mb-4">Missing Reports Today ({missingStores.length})</h3>
                {missingStores.length === 0 ? (
                    <p className="text-green-600 font-medium">All active stores have submitted their reports today!</p>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {missingStores.map((store: any) => (
                            <div key={store.id} className="bg-red-50 text-red-800 px-3 py-2 rounded-md font-medium text-sm">
                                {store.name}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
