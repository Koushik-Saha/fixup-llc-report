"use client"
import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import timezone from "dayjs/plugin/timezone"

dayjs.extend(utc)
dayjs.extend(timezone)

const TIMEZONE = "America/Los_Angeles"
import Link from "next/link"
import toast from "react-hot-toast"

export default function SubmitReportPage() {
    const router = useRouter()
    const [cash, setCash] = useState<number | "">("")
    const [card, setCard] = useState<number | "">("")
    const [expenses, setExpenses] = useState<number | "">("")
    const [payouts, setPayouts] = useState<number | "">("")
    const [timeIn, setTimeIn] = useState<string>("")
    const [timeOut, setTimeOut] = useState<string>("")
    function getLosAngelesToday() {
        return dayjs().tz(TIMEZONE).format("YYYY-MM-DD")
    }

    const [reportDate, setReportDate] = useState<string>(getLosAngelesToday())
    const [notes, setNotes] = useState("")
    const [files, setFiles] = useState<File[]>([])

    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState("")
    const [saleItems, setSaleItems] = useState<{ category: string, description: string, quantity: number, unit_price: number | '' }[]>([])

    // Inventory
    const [inventoryItems, setInventoryItems] = useState<any[]>([])
    const [inventoryUsage, setInventoryUsage] = useState<{ item_id: string, quantity: number }[]>([])
    
    // Store Context
    const [storeName, setStoreName] = useState('Loading Store...')

    useEffect(() => {
        // Hydrate default target date if navigating from a missing report link
        const params = new URLSearchParams(window.location.search)
        const dateParam = params.get("date")
        if (dateParam) {
            setReportDate(dateParam)
        }

        const fetchData = async () => {
            try {
                // Fetch context store name
                const dashRes = await fetch('/api/staff/dashboard')
                const dashData = await dashRes.json()
                if (dashData.storeName) setStoreName(dashData.storeName)

                // Fetch inventory for context store
                const res = await fetch('/api/staff/inventory')
                const data = await res.json()
                if (data.success) setInventoryItems(data.data)
            } catch (err) {
                console.error('Failed to load initial context', err)
            }
        }

        fetchData()
    }, [])

    const netCash = (Number(cash) || 0) - (Number(expenses) || 0) - (Number(payouts) || 0)
    const total = netCash + (Number(card) || 0)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const selectedFiles = Array.from(e.target.files)
            // Enforce max 10 images policy
            if (files.length + selectedFiles.length > 10) {
                toast.error("Maximum 10 images allowed.")
                return
            }
            setFiles([...files, ...selectedFiles])
        }
    }

    const removeFile = (index: number) => {
        setFiles(files.filter((_, i) => i !== index))
    }

    const uploadFileToS3 = async (file: File) => {
        // Get presigned URL
        const presignRes = await fetch("/api/staff/upload/presign", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filename: file.name, contentType: file.type })
        })

        if (!presignRes.ok) {
            const errorData = await presignRes.json().catch(() => ({}))
            throw new Error(errorData.error || "Failed to get upload securely")
        }

        const { presignedUrl, publicUrl } = await presignRes.json()

        // Upload actual file to S3
        const uploadRes = await fetch(presignedUrl, {
            method: "PUT",
            headers: { "Content-Type": file.type },
            body: file
        })

        if (!uploadRes.ok) throw new Error("Failed to upload image")

        return publicUrl
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setUploading(true)
        setError("")

        try {
            // 1. Upload all images sequentially or in parallel
            const publicUrls = await Promise.all(files.map(uploadFileToS3))

            // 2. Submit the report payload
            const payload = {
                cash_amount: Number(cash),
                card_amount: Number(card),
                expenses_amount: Number(expenses),
                payouts_amount: Number(payouts),
                report_date: reportDate,
                time_in: timeIn.trim(),
                time_out: timeOut.trim(),
                notes: notes.trim(),
                imageUrls: publicUrls,
                sale_items: saleItems.filter(i => i.description.trim() !== "" && i.unit_price !== ""),
                inventory_usage: inventoryUsage.filter(u => u.item_id && u.quantity > 0)
            }

            const res = await fetch("/api/staff/reports", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            })

            if (res.ok) {
                const reportData = await res.json()
                toast.success("Report submitted successfully")
                router.push(`/staff/report/${reportData.id}`)
                router.refresh()
            } else {
                const data = await res.json()
                const errorMessage = data.error || "Failed to submit report. Please try again."
                toast.error(errorMessage)
                setError(errorMessage)
                setUploading(false) // Ensure uploading state is reset on failure
            }

        } catch (err: any) {
            console.error(err)
            setError(err.message || "An unexpected error occurred.")
            setUploading(false)
        }
    }

    return (
        <div className="max-w-xl mx-auto bg-white p-6 sm:p-8 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Submit Daily Report</h2>
            <div className="bg-indigo-50 border border-indigo-100 rounded-md p-3 mb-6 flex items-center justify-between">
                <div>
                   <p className="text-xs text-indigo-800 font-semibold uppercase tracking-wider">Active Store</p>
                   <p className="text-sm text-indigo-900 font-medium">{storeName}</p>
                </div>
            </div>

            {error && <div className="bg-red-100 text-red-700 p-4 rounded mb-6">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Cash Amount ($)</label>
                    <input
                        type="number" step="0.01" min="0" required
                        className="mt-1 block w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-lg"
                        value={cash}
                        onChange={e => setCash(e.target.value === "" ? "" : Number(e.target.value))}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Card Amount ($)</label>
                    <input
                        type="number" step="0.01" min="0" required
                        className="mt-1 block w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-lg"
                        value={card}
                        onChange={e => setCard(e.target.value === "" ? "" : Number(e.target.value))}
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Expenses Amount ($)</label>
                        <input
                            type="number" step="0.01" min="0"
                            className="mt-1 block w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-lg"
                            value={expenses}
                            onChange={e => setExpenses(e.target.value === "" ? "" : Number(e.target.value))}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Payouts Amount ($)</label>
                        <input
                            type="number" step="0.01" min="0"
                            className="mt-1 block w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-lg"
                            value={payouts}
                            onChange={e => setPayouts(e.target.value === "" ? "" : Number(e.target.value))}
                        />
                    </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 space-y-2">
                    <div className="flex justify-between items-center text-sm font-semibold text-gray-700">
                        <span>Net Cash (Cash - Exp - Payouts)</span>
                        <span>${netCash.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xl font-bold">
                        <span className="text-blue-900">Total Deposit</span>
                        <span className="text-blue-700">${total.toFixed(2)}</span>
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

                <div className="pt-4 border-t border-gray-200">
                    <label className="block text-sm font-medium text-gray-700">Report Date</label>
                    <input
                        type="date" required
                        min={dayjs().tz(TIMEZONE).subtract(1, 'day').format('YYYY-MM-DD')}
                        max={dayjs().tz(TIMEZONE).format('YYYY-MM-DD')}
                        className="mt-1 block w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-lg"
                        value={reportDate}
                        onChange={e => setReportDate(e.target.value)}
                    />
                    <p className="text-xs text-gray-500 mt-1">You may only submit reports for Today or Yesterday.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Time In</label>
                        <input
                            type="time" required
                            className="mt-1 block w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-lg"
                            value={timeIn}
                            onChange={e => setTimeIn(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Time Out</label>
                        <input
                            type="time" required
                            className="mt-1 block w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-lg"
                            value={timeOut}
                            onChange={e => setTimeOut(e.target.value)}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Upload Receipts/Closing (Max 10 images)</label>
                    <input
                        type="file" multiple accept="image/*"
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        onChange={handleFileChange}
                    />
                    {files.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                            {files.map((file, idx) => (
                                <div key={idx} className="relative inline-block border rounded bg-gray-50 p-1">
                                    <p className="text-xs max-w-[100px] truncate">{file.name}</p>
                                    <button type="button" onClick={() => removeFile(idx)} className="text-red-500 text-xs mt-1 underline">Remove</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
                    <textarea
                        rows={3}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                    ></textarea>
                </div>

                <button
                    type="submit"
                    disabled={uploading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg shadow-md transition disabled:opacity-50"
                >
                    {uploading ? "Uploading & Submitting..." : "Submit Report"}
                </button>
            </form>
        </div>
    )
}
