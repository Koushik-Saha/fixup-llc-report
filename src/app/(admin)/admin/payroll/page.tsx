"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import toast from "react-hot-toast"
import { SkeletonRow } from "@/components/Skeleton"

type PayrollData = {
    user_id: string
    name: string
    role: string
    base_salary: number
    record_id: string | null
    total_paid: number
    status: string
    payments: any[]
}

export default function PayrollDashboard() {
    const [monthYear, setMonthYear] = useState(new Date().toISOString().slice(0, 7))
    const [payroll, setPayroll] = useState<PayrollData[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [roleFilter, setRoleFilter] = useState("All")
    const [statusFilter, setStatusFilter] = useState("All")

    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedUser, setSelectedUser] = useState<PayrollData | null>(null)
    const [paymentAmount, setPaymentAmount] = useState("")
    const [paymentNotes, setPaymentNotes] = useState("")
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
    const [submitting, setSubmitting] = useState(false)

    const fetchPayroll = () => {
        setLoading(true)
        fetch(`/api/admin/payroll?month=${monthYear}`)
            .then(res => res.json())
            .then(data => {
                setPayroll(data)
                setLoading(false)
            })
    }

    useEffect(() => {
        fetchPayroll()
    }, [monthYear])

    const openPaymentModal = (user: PayrollData) => {
        setSelectedUser(user)
        const remaining = user.base_salary - user.total_paid
        setPaymentAmount(remaining > 0 ? remaining.toString() : "")
        setPaymentNotes("")
        setPaymentDate(new Date().toISOString().split('T')[0])
        setIsModalOpen(true)
    }

    const closePaymentModal = () => {
        setIsModalOpen(false)
        setSelectedUser(null)
    }

    const handlePaymentSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedUser) return

        setSubmitting(true)
        const res = await fetch("/api/admin/payroll", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                user_id: selectedUser.user_id,
                month_year: monthYear,
                amount: Number(paymentAmount),
                payment_date: paymentDate,
                notes: paymentNotes,
                base_salary: selectedUser.base_salary
            })
        })

        if (res.ok) {
            toast.success("Payment logged successfully")
            closePaymentModal()
            fetchPayroll()
        } else {
            const data = await res.json()
            toast.error(data.error || "Failed to log payment")
        }
        setSubmitting(false)
    }

    const renderStatusBadge = (status: string) => {
        switch (status) {
            case 'Paid': return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Paid</span>
            case 'Partial': return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">Partial ({status})</span>
            default: return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">Pending</span>
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold text-gray-900 mb-4 sm:mb-0">Staff Payroll</h1>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <input
                        type="text"
                        placeholder="Search by name..."
                        className="border border-gray-300 rounded px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <select
                        className="border border-gray-300 rounded px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                    >
                        <option value="All">All Roles</option>
                        <option value="Admin">Admin</option>
                        <option value="Manager">Manager</option>
                        <option value="Staff">Staff</option>
                    </select>
                    <select
                        className="border border-gray-300 rounded px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="All">All Statuses</option>
                        <option value="Paid">Paid</option>
                        <option value="Partial">Partial</option>
                        <option value="Pending">Pending</option>
                    </select>
                    <div className="flex items-center gap-2 bg-white px-4 py-2 border border-gray-300 rounded shadow-sm shrink-0">
                        <label className="text-sm font-medium text-gray-700">Month:</label>
                        <input
                            type="month"
                            value={monthYear}
                            onChange={(e) => setMonthYear(e.target.value)}
                            className="text-sm border-none focus:ring-0 p-0 text-gray-900 font-semibold"
                        />
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="bg-white shadow rounded-lg overflow-hidden p-6"><SkeletonRow rows={5} /></div>
            ) : (
                <div className="bg-white shadow overflow-hidden sm:rounded-lg overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Base Salary</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid this Month</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {payroll.filter(p => {
                                const term = searchTerm.toLowerCase();
                                const matchesSearch = p.name.toLowerCase().includes(term);
                                const matchesRole = roleFilter === "All" || p.role === roleFilter;
                                const matchesStatus = statusFilter === "All" || p.status === statusFilter;
                                return matchesSearch && matchesRole && matchesStatus;
                            }).map((p) => (
                                <tr key={p.user_id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{p.name}</div>
                                        <div className="text-sm text-gray-500">{p.role}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                        ${p.base_salary.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        ${p.total_paid.toFixed(2)}
                                        {p.payments.length > 0 && (
                                            <span className="ml-2 text-xs text-blue-600 block">
                                                ({p.payments.length} installments)
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                                        ${Math.max(0, p.base_salary - p.total_paid).toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {renderStatusBadge(p.status)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                                        <button
                                            onClick={() => openPaymentModal(p)}
                                            className="text-blue-600 hover:text-blue-900"
                                        >
                                            Add Payment
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {payroll.filter(p => {
                                const term = searchTerm.toLowerCase();
                                const matchesSearch = p.name.toLowerCase().includes(term);
                                const matchesRole = roleFilter === "All" || p.role === roleFilter;
                                const matchesStatus = statusFilter === "All" || p.status === statusFilter;
                                return matchesSearch && matchesRole && matchesStatus;
                            }).length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                                            No active staff found matching criteria.
                                        </td>
                                    </tr>
                                )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Payment Modal inside the page component for simplicity */}
            {isModalOpen && selectedUser && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
                    <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                        <div className="flex justify-between items-center pb-4 mb-4 border-b">
                            <h3 className="text-lg font-bold text-gray-900">Log Payment</h3>
                            <button onClick={closePaymentModal} className="text-gray-400 hover:text-gray-500">
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handlePaymentSubmit}>
                            <div className="mb-4">
                                <div className="text-sm text-gray-500 mb-1">Paying: <span className="font-bold text-gray-900">{selectedUser.name}</span></div>
                                <div className="text-sm text-gray-500 mb-4">Month: <span className="font-bold text-gray-900">{monthYear}</span></div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Amount ($)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        required
                                        className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                                        value={paymentAmount}
                                        onChange={(e) => setPaymentAmount(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Payment Date</label>
                                    <input
                                        type="date"
                                        required
                                        className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                                        value={paymentDate}
                                        onChange={(e) => setPaymentDate(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Zelle, Cash, Check #1024"
                                        className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                                        value={paymentNotes}
                                        onChange={(e) => setPaymentNotes(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={closePaymentModal}
                                    className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="bg-blue-600 border border-transparent rounded-md shadow-sm py-2 px-4 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none disabled:opacity-50 flex items-center"
                                >
                                    {submitting ? 'Processing...' : 'Submit Payment'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
