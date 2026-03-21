"use client"
import { useEffect, useState, Suspense, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import toast from "react-hot-toast"
import { SkeletonRow } from "@/components/Skeleton"
import { Pagination } from "@/components/Pagination"
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import timezone from "dayjs/plugin/timezone"

dayjs.extend(utc)
dayjs.extend(timezone)

const TIMEZONE = "America/Los_Angeles"

type ExpenseData = {
    id: string
    store_id: string
    user_id: string
    category: string
    amount: number
    expense_date: string
    notes: string | null
    approval_status: string
    review_note: string | null
    reviewed_at: string | null
    store: { name: string }
    user: { name: string }
    reviewed_by?: { name: string } | null
}

function statusBadge(status: string) {
    if (status === 'Approved') return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-700">✓ Approved</span>
    if (status === 'Rejected') return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-700">✕ Rejected</span>
    return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-700">⏳ Pending</span>
}

function ExpensesDashboard() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [expenses, setExpenses] = useState<ExpenseData[]>([])
    const [stores, setStores] = useState<{ id: string; name: string }[]>([])
    const [loading, setLoading] = useState(true)

    const [tab, setTab] = useState<'Pending' | 'All'>(searchParams.get('tab') === 'All' ? 'All' : 'Pending')
    const [filterStore, setFilterStore] = useState(searchParams.get('storeId') || "")
    const [filterMonth, setFilterMonth] = useState(searchParams.get('month') || dayjs().tz(TIMEZONE).format('YYYY-MM'))
    const [page, setPage] = useState(Number(searchParams.get('page') || '1'))
    const [limit] = useState(15)

    // Add expense modal
    const [addOpen, setAddOpen] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [expenseStore, setExpenseStore] = useState("")
    const [expenseCategory, setExpenseCategory] = useState("Inventory")
    const [expenseAmount, setExpenseAmount] = useState("")
    const [expenseDate, setExpenseDate] = useState(dayjs().tz(TIMEZONE).format('YYYY-MM-DD'))
    const [expenseNotes, setExpenseNotes] = useState("")

    // Review modal
    const [reviewTarget, setReviewTarget] = useState<ExpenseData | null>(null)
    const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve')
    const [reviewNote, setReviewNote] = useState("")
    const [reviewing, setReviewing] = useState(false)

    const pushParams = useCallback((overrides: Record<string, string> = {}) => {
        const vals = { storeId: filterStore, month: filterMonth, tab, ...overrides }
        const p = new URLSearchParams()
        Object.entries(vals).forEach(([k, v]) => { if (v) p.set(k, v) })
        router.replace(`/admin/expenses?${p.toString()}`, { scroll: false })
    }, [filterStore, filterMonth, tab, router])

    useEffect(() => {
        fetch('/api/admin/stores').then(r => r.json()).then(d => setStores(d.filter((s: any) => s.status === 'Active')))
    }, [])

    const fetchExpenses = useCallback(() => {
        setLoading(true)
        const start = dayjs.tz(`${filterMonth}-01T00:00:00`, TIMEZONE).format('YYYY-MM-DD')
        const end = dayjs.tz(`${filterMonth}-01T00:00:00`, TIMEZONE).endOf('month').format('YYYY-MM-DD')
        const params = new URLSearchParams()
        if (filterStore) params.set('storeId', filterStore)
        params.set('startDate', start)
        params.set('endDate', end)
        fetch(`/api/admin/expenses?${params}`)
            .then(r => r.json())
            .then(d => { setExpenses(Array.isArray(d) ? d : []); setLoading(false) })
    }, [filterStore, filterMonth])

    useEffect(() => { fetchExpenses() }, [fetchExpenses])

    const handleAddExpense = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)
        const res = await fetch("/api/admin/expenses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ store_id: expenseStore, category: expenseCategory, amount: Number(expenseAmount), expense_date: expenseDate, notes: expenseNotes })
        })
        if (res.ok) { toast.success("Expense logged"); setAddOpen(false); fetchExpenses() }
        else { const d = await res.json(); toast.error(d.error || "Failed") }
        setSubmitting(false)
    }

    const handleReview = async () => {
        if (!reviewTarget) return
        setReviewing(true)
        const res = await fetch(`/api/admin/expenses/${reviewTarget.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: reviewAction, review_note: reviewNote })
        })
        if (res.ok) {
            toast.success(reviewAction === 'approve' ? '✓ Expense Approved' : '✕ Expense Rejected')
            setReviewTarget(null)
            setReviewNote("")
            fetchExpenses()
        } else {
            const d = await res.json(); toast.error(d.error || "Failed")
        }
        setReviewing(false)
    }

    const displayed = tab === 'Pending'
        ? expenses.filter(e => e.approval_status === 'Pending')
        : expenses
    const paged = displayed.slice((page - 1) * limit, page * limit)
    const totalPages = Math.ceil(displayed.length / limit)

    const pendingCount = expenses.filter(e => e.approval_status === 'Pending').length
    const totalAmount = expenses.filter(e => e.approval_status === 'Approved').reduce((a, e) => a + Number(e.amount), 0)

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Store Expenses</h1>
                    <p className="text-sm text-gray-400 mt-0.5">Review and approve expense submissions</p>
                </div>
                <button onClick={() => { setExpenseStore(stores[0]?.id || ""); setAddOpen(true) }}
                    className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg shadow font-medium text-sm transition">
                    + Add Expense
                </button>
            </div>

            {/* KPI row */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
                    <p className="text-2xl font-black text-yellow-700">{pendingCount}</p>
                    <p className="text-xs text-yellow-600 font-semibold mt-0.5">Pending Review</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                    <p className="text-2xl font-black text-green-700">${totalAmount.toFixed(2)}</p>
                    <p className="text-xs text-green-600 font-semibold mt-0.5">Approved This Month</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                    <p className="text-2xl font-black text-gray-900">{expenses.length}</p>
                    <p className="text-xs text-gray-400 font-semibold mt-0.5">Total Submitted</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[160px]">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Store</label>
                    <select className="block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                        value={filterStore} onChange={e => { setFilterStore(e.target.value); pushParams({ storeId: e.target.value }) }}>
                        <option value="">All Stores</option>
                        {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
                <div className="flex-1 min-w-[140px]">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Month</label>
                    <input type="month" className="block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                        value={filterMonth} onChange={e => { setFilterMonth(e.target.value); pushParams({ month: e.target.value }) }} />
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
                {(['Pending', 'All'] as const).map(t => (
                    <button key={t} onClick={() => { setTab(t); setPage(1); pushParams({ tab: t }) }}
                        className={`px-5 py-1.5 rounded-lg text-sm font-semibold transition ${tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                        {t === 'Pending' ? `⏳ Pending (${pendingCount})` : `📋 All (${expenses.length})`}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white shadow rounded-xl overflow-hidden overflow-x-auto">
                {loading ? (
                    <div className="p-6"><SkeletonRow rows={5} /></div>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Store</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Submitted By</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Notes</th>
                                {tab === 'Pending' && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {paged.map(exp => (
                                <tr key={exp.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{dayjs.utc(exp.expense_date).format('M/D/YY')}</td>
                                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 whitespace-nowrap">{exp.store.name}</td>
                                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                                        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-700">{exp.category}</span>
                                    </td>
                                    <td className="px-4 py-3 text-sm font-bold text-red-600 whitespace-nowrap">-${Number(exp.amount).toFixed(2)}</td>
                                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{exp.user.name}</td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        {statusBadge(exp.approval_status)}
                                        {exp.reviewed_by && <p className="text-xs text-gray-400 mt-0.5">by {exp.reviewed_by.name}</p>}
                                        {exp.review_note && <p className="text-xs text-gray-400 italic mt-0.5">"{exp.review_note}"</p>}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-500 max-w-[180px] truncate">{exp.notes || <span className="italic text-gray-300">—</span>}</td>
                                    {tab === 'Pending' && (
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {exp.approval_status === 'Pending' && (
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => { setReviewTarget(exp); setReviewAction('approve'); setReviewNote("") }}
                                                        className="text-xs font-semibold bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1.5 rounded-lg transition">
                                                        ✓ Approve
                                                    </button>
                                                    <button
                                                        onClick={() => { setReviewTarget(exp); setReviewAction('reject'); setReviewNote("") }}
                                                        className="text-xs font-semibold bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1.5 rounded-lg transition">
                                                        ✕ Reject
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            ))}
                            {paged.length === 0 && (
                                <tr><td colSpan={tab === 'Pending' ? 8 : 7} className="px-6 py-10 text-center text-gray-400">
                                    {tab === 'Pending' ? '🎉 No pending expenses — all caught up!' : 'No expenses found for this period.'}
                                </td></tr>
                            )}
                        </tbody>
                    </table>
                )}
                {!loading && totalPages > 1 && (
                    <Pagination currentPage={page} totalPages={totalPages} totalItems={displayed.length}
                        onPageChange={v => { setPage(v) }} label="expenses" limit={limit} onLimitChange={() => {}} />
                )}
            </div>

            {/* Add Expense Modal */}
            {addOpen && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setAddOpen(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="text-lg font-bold text-gray-900">Log Store Expense</h3>
                            <button onClick={() => setAddOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl font-bold">×</button>
                        </div>
                        <form onSubmit={handleAddExpense} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Store</label>
                                <select required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                                    value={expenseStore} onChange={e => setExpenseStore(e.target.value)}>
                                    {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Category</label>
                                <select required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                                    value={expenseCategory} onChange={e => setExpenseCategory(e.target.value)}>
                                    {['Inventory', 'Rent', 'Utilities', 'Maintenance', 'Marketing', 'Supplies', 'Other'].map(c =>
                                        <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Amount ($)</label>
                                    <input type="number" step="0.01" min="0.01" required
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                                        value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Date</label>
                                    <input type="date" required
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                                        value={expenseDate} onChange={e => setExpenseDate(e.target.value)} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Notes (optional)</label>
                                <input type="text" placeholder="e.g. Screen protectors batch #4"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                                    value={expenseNotes} onChange={e => setExpenseNotes(e.target.value)} />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setAddOpen(false)}
                                    className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl font-semibold text-sm transition hover:bg-gray-50">Cancel</button>
                                <button type="submit" disabled={submitting}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-semibold text-sm transition disabled:opacity-50">
                                    {submitting ? 'Saving...' : 'Log Expense'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Review Modal */}
            {reviewTarget && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setReviewTarget(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
                        <h3 className={`text-lg font-bold mb-1 ${reviewAction === 'approve' ? 'text-green-700' : 'text-red-700'}`}>
                            {reviewAction === 'approve' ? '✓ Approve Expense' : '✕ Reject Expense'}
                        </h3>
                        <div className="bg-gray-50 rounded-xl p-4 mb-4 mt-3 text-sm space-y-1">
                            <div className="flex justify-between"><span className="text-gray-400">Store</span><span className="font-semibold text-gray-900">{reviewTarget.store.name}</span></div>
                            <div className="flex justify-between"><span className="text-gray-400">Category</span><span className="font-semibold">{reviewTarget.category}</span></div>
                            <div className="flex justify-between"><span className="text-gray-400">Amount</span><span className="font-bold text-red-600">-${Number(reviewTarget.amount).toFixed(2)}</span></div>
                            <div className="flex justify-between"><span className="text-gray-400">Submitted by</span><span>{reviewTarget.user.name}</span></div>
                            {reviewTarget.notes && <div className="flex justify-between"><span className="text-gray-400">Notes</span><span className="italic">{reviewTarget.notes}</span></div>}
                        </div>
                        <div className="mb-4">
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                                {reviewAction === 'reject' ? 'Reason for rejection (required)' : 'Comment (optional)'}
                            </label>
                            <textarea
                                value={reviewNote}
                                onChange={e => setReviewNote(e.target.value)}
                                rows={2}
                                placeholder={reviewAction === 'approve' ? 'Optional note...' : 'State the reason for rejection...'}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                            />
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setReviewTarget(null)}
                                className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-50 transition">Cancel</button>
                            <button
                                onClick={handleReview}
                                disabled={reviewing || (reviewAction === 'reject' && !reviewNote.trim())}
                                className={`flex-1 text-white py-2.5 rounded-xl font-semibold text-sm transition disabled:opacity-50 ${reviewAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                                {reviewing ? 'Processing...' : reviewAction === 'approve' ? '✓ Confirm Approve' : '✕ Confirm Reject'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default function ExpensesPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading...</div>}>
            <ExpensesDashboard />
        </Suspense>
    )
}
