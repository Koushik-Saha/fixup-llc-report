"use client"
import { useEffect, useState } from "react"
import toast from "react-hot-toast"
import { SkeletonRow } from "@/components/Skeleton"

type ExpenseData = {
    id: string
    store_id: string
    user_id: string
    category: string
    amount: number
    expense_date: string
    notes: string | null
    store: { name: string }
    user: { name: string }
}

type StoreData = {
    id: string
    name: string
}

export default function ExpensesDashboard() {
    const [expenses, setExpenses] = useState<ExpenseData[]>([])
    const [stores, setStores] = useState<StoreData[]>([])
    const [loading, setLoading] = useState(true)

    const [filterStore, setFilterStore] = useState("")
    const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7))

    const [isModalOpen, setIsModalOpen] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    // Form state
    const [expenseStore, setExpenseStore] = useState("")
    const [expenseCategory, setExpenseCategory] = useState("Inventory")
    const [expenseAmount, setExpenseAmount] = useState("")
    const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0])
    const [expenseNotes, setExpenseNotes] = useState("")

    useEffect(() => {
        // Fetch Stores for dropdowns
        fetch('/api/admin/stores')
            .then(res => res.json())
            .then(data => {
                setStores(data.filter((s: any) => s.status === 'Active'))
            })
    }, [])

    const fetchExpenses = () => {
        setLoading(true)
        // Construct date boundaries from month filter (e.g. "2026-03")
        const [year, month] = filterMonth.split('-')
        const startDate = new Date(Number(year), Number(month) - 1, 1).toISOString()
        const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59).toISOString()

        const params = new URLSearchParams()
        if (filterStore) params.append('storeId', filterStore)
        params.append('startDate', startDate)
        params.append('endDate', endDate)

        fetch(`/api/admin/expenses?${params.toString()}`)
            .then(res => res.json())
            .then(data => {
                setExpenses(data)
                setLoading(false)
            })
    }

    useEffect(() => {
        fetchExpenses()
    }, [filterStore, filterMonth])

    const openModal = () => {
        setExpenseStore(stores.length > 0 ? stores[0].id : "")
        setExpenseCategory("Inventory")
        setExpenseAmount("")
        setExpenseDate(new Date().toISOString().split('T')[0])
        setExpenseNotes("")
        setIsModalOpen(true)
    }

    const handleExpenseSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)

        const res = await fetch("/api/admin/expenses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                store_id: expenseStore,
                category: expenseCategory,
                amount: Number(expenseAmount),
                expense_date: expenseDate,
                notes: expenseNotes
            })
        })

        if (res.ok) {
            toast.success("Expense logged successfully")
            setIsModalOpen(false)
            fetchExpenses()
        } else {
            const data = await res.json()
            toast.error(data.error || "Failed to log expense")
        }
        setSubmitting(false)
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold text-gray-900">Store Expenses</h1>
                <button
                    onClick={openModal}
                    className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded shadow font-medium"
                >
                    Add Expense
                </button>
            </div>

            <div className="bg-white p-4 rounded-lg shadow flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Store</label>
                    <select
                        className="block w-full border border-gray-300 rounded px-3 py-2 text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                        value={filterStore}
                        onChange={(e) => setFilterStore(e.target.value)}
                    >
                        <option value="">All Stores</option>
                        {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
                <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Month</label>
                    <input
                        type="month"
                        className="block w-full border border-gray-300 rounded px-3 py-2 text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                        value={filterMonth}
                        onChange={(e) => setFilterMonth(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="bg-white shadow rounded-lg overflow-hidden p-6"><SkeletonRow rows={5} /></div>
            ) : (
                <div className="bg-white shadow overflow-hidden sm:rounded-lg overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Store</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Logged By</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {expenses.map((exp) => (
                                <tr key={exp.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {new Date(exp.expense_date).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                                        {exp.store.name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                            {exp.category}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600">
                                        -${Number(exp.amount).toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {exp.user.name}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {exp.notes || <span className="text-gray-400 italic">None</span>}
                                    </td>
                                </tr>
                            ))}
                            {expenses.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                                        No expenses found for this period.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
                    <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                        <div className="flex justify-between items-center pb-4 mb-4 border-b">
                            <h3 className="text-lg font-bold text-gray-900">Log Store Expense</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleExpenseSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Store</label>
                                <select
                                    required
                                    className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                                    value={expenseStore}
                                    onChange={(e) => setExpenseStore(e.target.value)}
                                >
                                    {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Category</label>
                                <select
                                    required
                                    className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                                    value={expenseCategory}
                                    onChange={(e) => setExpenseCategory(e.target.value)}
                                >
                                    <option value="Inventory">Inventory / Products</option>
                                    <option value="Rent">Rent</option>
                                    <option value="Utilities">Utilities</option>
                                    <option value="Maintenance">Maintenance</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Amount ($)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    required
                                    className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                                    value={expenseAmount}
                                    onChange={(e) => setExpenseAmount(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Expense Date</label>
                                <input
                                    type="date"
                                    required
                                    className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                                    value={expenseDate}
                                    onChange={(e) => setExpenseDate(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Screen protectors batch #4"
                                    className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                                    value={expenseNotes}
                                    onChange={(e) => setExpenseNotes(e.target.value)}
                                />
                            </div>

                            <div className="mt-6 flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="bg-blue-600 border border-transparent rounded-md shadow-sm py-2 px-4 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none disabled:opacity-50"
                                >
                                    {submitting ? 'Processing...' : 'Submit Expense'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
