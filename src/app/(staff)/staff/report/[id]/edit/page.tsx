"use client"
import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import toast from "react-hot-toast"

export default function StaffEditReportPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter()
    const { id } = use(params)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState("")

    const [cash, setCash] = useState("")
    const [card, setCard] = useState("")
    const [expenses, setExpenses] = useState("")
    const [payouts, setPayouts] = useState("")
    const [timeIn, setTimeIn] = useState("")
    const [timeOut, setTimeOut] = useState("")
    const [notes, setNotes] = useState("")
    const [editCount, setEditCount] = useState(0)
    const [saleItems, setSaleItems] = useState<{ category: string, description: string, quantity: number, unit_price: string | number }[]>([])

    // Inventory
    const [inventoryItems, setInventoryItems] = useState<any[]>([])
    const [inventoryUsage, setInventoryUsage] = useState<{ item_id: string, quantity: number }[]>([])

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [initialLoading, setInitialLoading] = useState(true)

    useEffect(() => {
        const fetchReport = async () => {
            try {
                const res = await fetch(`/api/staff/reports/${id}`)
                if (!res.ok) throw new Error('Failed to fetch report')
                const data = await res.json()

                if (data.error) {
                    toast.error(data.error)
                    setError(data.error)
                } else if (data.staff_edit_count >= 2) {
                    toast.error("Maximum edit limit reached.")
                    setError("You have reached the maximum edit limit (2) for this report.")
                } else {
                    setCash(data.cash_amount.toString())
                    setCard(data.card_amount.toString())
                    setExpenses(data.expenses_amount.toString())
                    setPayouts(data.payouts_amount.toString())

                    // Format the time strings for the input fields
                    if (data.time_in) {
                        const d = new Date(data.time_in)
                        setTimeIn(`${d.getUTCHours().toString().padStart(2, '0')}:${d.getUTCMinutes().toString().padStart(2, '0')}`)
                    }
                    if (data.time_out) {
                        const d = new Date(data.time_out)
                        setTimeOut(`${d.getUTCHours().toString().padStart(2, '0')}:${d.getUTCMinutes().toString().padStart(2, '0')}`)
                    }

                    setNotes(data.notes || '')
                    setEditCount(data.staff_edit_count)
                    if (data.sale_items) {
                        setSaleItems(data.sale_items.map((i: any) => ({
                            category: i.category, description: i.description, quantity: i.quantity, unit_price: i.unit_price
                        })))
                    }
                    if (data.inventory_usages) {
                        setInventoryUsage(data.inventory_usages.map((u: any) => ({
                            item_id: u.item_id, quantity: u.quantity_used
                        })))
                    }
                }
            } catch (err: any) {
                toast.error(err.message || 'Could not load report details')
                setError(err.message || 'Failed to load report')
            } finally {
                setInitialLoading(false)
            }
        }

        const fetchInventory = async () => {
            try {
                const res = await fetch('/api/staff/inventory')
                const data = await res.json()
                if (data.success) setInventoryItems(data.data)
            } catch (err) {
                console.error('Failed to load inventory', err)
            }
        }

        fetchReport()
        fetchInventory()
    }, [id])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        setError("")

        try {
            const timeInObj = timeIn ? new Date(`2000-01-01T${timeIn}:00Z`) : null
            const timeOutObj = timeOut ? new Date(`2000-01-01T${timeOut}:00Z`) : null

            const res = await fetch(`/api/staff/reports/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cash_amount: cash,
                    card_amount: card,
                    expenses_amount: expenses,
                    payouts_amount: payouts,
                    time_in: timeInObj ? timeInObj.toISOString() : null,
                    time_out: timeOutObj ? timeOutObj.toISOString() : null,
                    notes,
                    sale_items: saleItems.filter(i => i.description.trim() !== "" && i.unit_price !== ""),
                    inventory_usage: inventoryUsage.filter(u => u.item_id && u.quantity > 0)
                })
            })

            if (!res.ok) {
                const data = await res.json()
                toast.error(data.error || "Failed to update report")
                throw new Error(data.error || "Failed to update report")
            }

            toast.success("Report updated successfully")
            router.push(`/staff/report/${id}`)
            router.refresh()

        } catch (err: any) {
            console.error(err)
            toast.error(err.message)
            setError(err.message)
            setIsSubmitting(false)
        }
    }

    if (initialLoading) return <div className="p-8 text-center">Loading report...</div>

    return (
        <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Edit Report</h1>
                <span className="text-sm font-medium text-orange-600 bg-orange-50 px-3 py-1 rounded-full border border-orange-100">
                    Edit {editCount + 1} of 2
                </span>
            </div>

            {error ? (
                <div className="bg-red-50 text-red-700 p-4 rounded-md mb-6 whitespace-pre-line">
                    {error}
                    <div className="mt-4">
                        <Link href="/staff/reports" className="text-red-700 font-bold underline">Return to History</Link>
                    </div>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Cash Amount ($)</label>
                            <input
                                type="number"
                                step="0.01"
                                required
                                min="0"
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                value={cash}
                                onChange={(e) => setCash(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Card Amount ($)</label>
                            <input
                                type="number"
                                step="0.01"
                                required
                                min="0"
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                value={card}
                                onChange={(e) => setCard(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Expenses Amount ($)</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                value={expenses}
                                onChange={(e) => setExpenses(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Payouts Amount ($)</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                value={payouts}
                                onChange={(e) => setPayouts(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Time In</label>
                            <input
                                type="time"
                                required
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                value={timeIn}
                                onChange={(e) => setTimeIn(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Time Out</label>
                            <input
                                type="time"
                                required
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                value={timeOut}
                                onChange={(e) => setTimeOut(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-md space-y-2">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-700 font-medium">Net Cash:</span>
                            <span className="font-semibold text-gray-900">
                                ${(Number(cash || 0) - Number(expenses || 0) - Number(payouts || 0)).toFixed(2)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                            <span className="text-gray-700 font-bold">New Final Total:</span>
                            <span className="text-xl font-bold text-gray-900">
                                ${(Number(cash || 0) - Number(expenses || 0) - Number(payouts || 0) + Number(card || 0)).toFixed(2)}
                            </span>
                        </div>
                    </div>

                    {/* ITEM SALES SECTION */}
                    <div className="pt-6 border-t border-gray-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-900">Itemized Sales (Optional)</h3>
                            <button type="button" onClick={() => setSaleItems([...saleItems, { category: 'Repair', description: '', quantity: 1, unit_price: '' }])} className="text-sm bg-blue-50 text-blue-600 px-3 py-1.5 rounded-md font-medium hover:bg-blue-100 transition">
                                + Add Item
                            </button>
                        </div>
                        {saleItems.length === 0 ? (
                            <p className="text-sm text-gray-500">No individual items recorded. Click "Add Item" to itemize sales.</p>
                        ) : (
                            <div className="space-y-3">
                                {saleItems.map((item, index) => (
                                    <div key={index} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center bg-gray-50 p-3 rounded border border-gray-100">
                                        <select className="px-2 py-1.5 border border-gray-300 rounded text-sm w-full sm:w-auto" value={item.category} onChange={e => { const newItems = [...saleItems]; newItems[index].category = e.target.value; setSaleItems(newItems) }}>
                                            <option value="Repair">Repair</option>
                                            <option value="Accessory">Accessory</option>
                                            <option value="Device">Device Sale</option>
                                            <option value="Other">Other</option>
                                        </select>
                                        <input type="text" placeholder="Description (e.g. iPhone 13 Screen)" className="px-2 py-1.5 border border-gray-300 rounded text-sm flex-1 w-full" value={item.description} onChange={e => { const newItems = [...saleItems]; newItems[index].description = e.target.value; setSaleItems(newItems) }} />
                                        <input type="number" min="1" placeholder="Qty" className="px-2 py-1.5 border border-gray-300 rounded text-sm w-20" value={item.quantity} onChange={e => { const newItems = [...saleItems]; newItems[index].quantity = Number(e.target.value); setSaleItems(newItems) }} />
                                        <input type="number" min="0" step="0.01" placeholder="Price ($)" className="px-2 py-1.5 border border-gray-300 rounded text-sm w-28" value={item.unit_price} onChange={e => { const newItems = [...saleItems]; newItems[index].unit_price = e.target.value === '' ? '' : Number(e.target.value); setSaleItems(newItems) }} />
                                        <button type="button" onClick={() => setSaleItems(saleItems.filter((_, i) => i !== index))} className="text-red-500 hover:text-red-700 p-1 font-bold shrink-0">✕</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* INVENTORY USAGE SECTION */}
                    <div className="pt-6 border-t border-gray-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-900">Inventory Usage (Optional)</h3>
                            <button type="button" onClick={() => setInventoryUsage([...inventoryUsage, { item_id: '', quantity: 1 }])} className="text-sm bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-md font-medium hover:bg-indigo-100 transition">
                                + Log Part Used
                            </button>
                        </div>
                        {inventoryUsage.length === 0 ? (
                            <p className="text-sm text-gray-500">No inventory parts logged. Click "Log Part Used" to deduct items from store stock.</p>
                        ) : (
                            <div className="space-y-3">
                                {inventoryUsage.map((usage, index) => (
                                    <div key={index} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center bg-gray-50 p-3 rounded border border-gray-100">
                                        <select className="px-2 py-1.5 border border-gray-300 rounded text-sm flex-1 w-full" value={usage.item_id} onChange={e => { const newUsage = [...inventoryUsage]; newUsage[index].item_id = e.target.value; setInventoryUsage(newUsage) }}>
                                            <option value="" disabled>Select Item...</option>
                                            {inventoryItems.map(item => (
                                                <option key={item.id} value={item.id}>{item.name} {item.sku ? `(${item.sku})` : ''} - {item.quantity} in stock</option>
                                            ))}
                                        </select>
                                        <input type="number" min="1" placeholder="Qty Used" className="px-2 py-1.5 border border-gray-300 rounded text-sm w-24" value={usage.quantity} onChange={e => { const newUsage = [...inventoryUsage]; newUsage[index].quantity = Number(e.target.value); setInventoryUsage(newUsage) }} />
                                        <button type="button" onClick={() => setInventoryUsage(inventoryUsage.filter((_, i) => i !== index))} className="text-red-500 hover:text-red-700 p-1 font-bold shrink-0">✕</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
                        <textarea
                            rows={3}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-4 pt-4 border-t">
                        <Link
                            href={`/staff/report/${id}`}
                            className="flex-1 py-3 px-4 text-center border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex-1 py-3 px-4 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 font-medium disabled:opacity-50"
                        >
                            {submitting ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            )}
        </div>
    )
}
