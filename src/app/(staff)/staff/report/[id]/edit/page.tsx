"use client"
import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function StaffEditReportPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter()
    const { id } = use(params)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState("")

    const [cash, setCash] = useState("")
    const [card, setCard] = useState("")
    const [notes, setNotes] = useState("")
    const [editCount, setEditCount] = useState(0)

    useEffect(() => {
        fetch(`/api/staff/reports/${id}`)
            .then(res => res.json())
            .then(data => {
                if (data.error) {
                    setError(data.error)
                } else if (data.staff_edit_count >= 2) {
                    setError("You have reached the maximum edit limit (2) for this report.")
                } else {
                    setCash(data.cash_amount)
                    setCard(data.card_amount)
                    setNotes(data.notes || "")
                    setEditCount(data.staff_edit_count)
                }
                setLoading(false)
            })
            .catch(() => {
                setError("Failed to load report")
                setLoading(false)
            })
    }, [id])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)
        setError("")

        try {
            const res = await fetch(`/api/staff/reports/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cash_amount: cash,
                    card_amount: card,
                    notes
                })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to update report')

            router.push(`/staff/report/${id}`)
            router.refresh()
        } catch (err: any) {
            setError(err.message)
            setSubmitting(false)
        }
    }

    if (loading) return <div className="p-8 text-center">Loading report...</div>

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
                    <div className="grid grid-cols-2 gap-4">
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

                    <div className="bg-gray-50 p-4 rounded-md flex justify-between items-center">
                        <span className="text-gray-700 font-medium">New Total:</span>
                        <span className="text-xl font-bold text-gray-900">
                            ${(Number(cash || 0) + Number(card || 0)).toFixed(2)}
                        </span>
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
