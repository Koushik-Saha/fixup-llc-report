import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import prisma from "@/lib/prisma"
import Link from "next/link"

export default async function StaffHomePage() {
    const session = await getServerSession(authOptions)
    const storeId = session?.user?.storeId

    if (!storeId) {
        return <div className="p-8 text-center text-red-600">You are not assigned to an active store.</div>
    }

    const store = await prisma.store.findUnique({
        where: { id: storeId }
    })

    // Check today's report
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const todayReport = await prisma.dailyReport.findFirst({
        where: {
            store_id: storeId,
            report_date: today
        }
    })

    const currentMonth = new Date().toISOString().slice(0, 7) // "YYYY-MM"
    const payrollRecord = await (prisma as any).payrollRecord.findUnique({
        where: {
            user_id_month_year: {
                user_id: session?.user?.id as string,
                month_year: currentMonth
            }
        },
        include: {
            payments: { orderBy: { payment_date: 'desc' } }
        }
    })

    let userBaseSalary = 0
    if (!payrollRecord) {
        const userRec = await prisma.user.findUnique({ where: { id: session?.user?.id as string } })
        userBaseSalary = Number((userRec as any)?.base_salary || 0)
    }

    const baseSalary = Number(payrollRecord?.base_salary || userBaseSalary)
    const totalPaid = Number(payrollRecord?.total_paid || 0)
    const balance = Math.max(0, baseSalary - totalPaid)

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
                <h2 className="text-2xl font-bold text-gray-800">{store?.name}</h2>
                <p className="text-gray-600">{store?.city}, {store?.state}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div className="bg-white rounded-lg shadow border border-gray-100 p-6">
                    <h3 className="text-lg font-semibold mb-4 text-gray-800">Today's Report Status</h3>
                    {todayReport ? (
                        <div>
                            <p className="text-green-600 font-medium mb-4 flex items-center">
                                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                                Submitted
                            </p>
                            <Link href={`/staff/report/${todayReport.id}`} className="bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 px-4 rounded transition inline-block">
                                View Today's Report
                            </Link>
                        </div>
                    ) : (
                        <div>
                            <p className="text-yellow-600 font-medium mb-4 flex items-center">
                                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742-2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path></svg>
                                Not submitted yet
                            </p>
                            <Link href="/staff/report/new" className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition inline-block">
                                Submit Today's Report
                            </Link>
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-lg shadow border border-gray-100 p-6 flex flex-col">
                    <h3 className="text-lg font-semibold mb-4 text-gray-800">My Wallet ({new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })})</h3>
                    <div className="flex-1 space-y-4">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500 font-medium">Expected Salary</span>
                            <span className="text-gray-900 font-bold">${baseSalary.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm border-b border-gray-100 pb-4">
                            <span className="text-gray-500 font-medium">Total Received</span>
                            <span className="text-green-600 font-bold">${totalPaid.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center bg-gray-50 p-3 rounded">
                            <span className="text-gray-700 font-bold">Remaining Balance</span>
                            <span className="text-indigo-600 text-lg font-bold">${balance.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
