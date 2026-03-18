"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import toast from "react-hot-toast"
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import timezone from "dayjs/plugin/timezone"

dayjs.extend(utc)
dayjs.extend(timezone)

const TIMEZONE = "America/Los_Angeles"

export default function NewCategoryReportPage() {
    const router = useRouter()
    
    const [categoryId, setCategoryId] = useState<string>("")
    const [categories, setCategories] = useState<{id: string, name: string}[]>([])

    const [cash, setCash] = useState<number | "">("")
    const [card, setCard] = useState<number | "">("")
    const [expenses, setExpenses] = useState<number | "">("")
    const [payouts, setPayouts] = useState<number | "">("")
    
    const [reportDate, setReportDate] = useState<string>(dayjs().tz(TIMEZONE).format('YYYY-MM-DD'))
    const [notes, setNotes] = useState("")
    const [files, setFiles] = useState<File[]>([])

    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState("")

    const netCash = (Number(cash) || 0) - (Number(expenses) || 0) - (Number(payouts) || 0)
    const total = netCash + (Number(card) || 0)

    useEffect(() => {
        // Fetch Categories
        fetch('/api/admin/categories')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    const activeCategories = data.filter((c: any) => c.status === 'Active')
                    setCategories(activeCategories)
                    if (activeCategories.length > 0) setCategoryId(activeCategories[0].id)
                }
            })
            .catch(console.error)
    }, [])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const selectedFiles = Array.from(e.target.files)
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
            if (!categoryId) {
                toast.error("Please select a Category.")
                setUploading(false)
                return
            }

            const publicUrls = await Promise.all(files.map(uploadFileToS3))

            const payload = {
                category_id: categoryId,
                cash_amount: Number(cash),
                card_amount: Number(card),
                expenses_amount: Number(expenses),
                payouts_amount: Number(payouts),
                report_date: reportDate,
                notes: notes.trim(),
                imageUrls: publicUrls
                // time_in and time_out are omitted
            }

            const res = await fetch("/api/admin/categories/reports", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            })

            if (res.ok) {
                const reportData = await res.json()
                toast.success("Category Report created successfully")
                router.push(`/admin/categories/reports/${reportData.id}`)
                router.refresh()
            } else {
                const data = await res.json()
                const errorMessage = data.error || "Failed to submit report. Please try again."
                toast.error(errorMessage)
                setError(errorMessage)
                setUploading(false)
            }

        } catch (err: any) {
            console.error(err)
            setError(err.message || "An unexpected error occurred.")
            setUploading(false)
        }
    }

    return (
        <div className="max-w-xl mx-auto bg-white p-6 sm:p-8 rounded-lg shadow-md mt-6 border-t-4 border-indigo-500">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Submit Category Report</h2>
                <Link href="/admin/categories" className="text-indigo-600 hover:text-indigo-800 text-sm font-medium transition">
                    &larr; Back
                </Link>
            </div>

            {error && <div className="bg-red-100 text-red-700 p-4 rounded mb-6 text-sm">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Target Category</label>
                    <select
                        required
                        className="block w-full px-4 py-3 bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-lg font-medium"
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                    >
                        <option value="" disabled>Select a Category...</option>
                        {categories.map((c: any) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Cash Received ($)</label>
                    <input
                        type="number" step="0.01" min="0" required
                        className="mt-1 block w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-lg"
                        value={cash}
                        onChange={e => setCash(e.target.value === "" ? "" : Number(e.target.value))}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Card Transactions ($)</label>
                    <input
                        type="number" step="0.01" min="0" required
                        className="mt-1 block w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-lg"
                        value={card}
                        onChange={e => setCard(e.target.value === "" ? "" : Number(e.target.value))}
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Expenses Deducted ($)</label>
                        <input
                            type="number" step="0.01" min="0"
                            className="mt-1 block w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-lg"
                            value={expenses}
                            onChange={e => setExpenses(e.target.value === "" ? "" : Number(e.target.value))}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Payouts ($)</label>
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
                        <span className="text-blue-900">Total Revenue</span>
                        <span className="text-blue-700">${total.toFixed(2)}</span>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Report Date</label>
                    <input
                        type="date" required
                        max={dayjs().tz(TIMEZONE).format('YYYY-MM-DD')}
                        className="mt-1 block w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-lg"
                        value={reportDate}
                        onChange={e => setReportDate(e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Upload Receipts/Documents</label>
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
                    <label className="block text-sm font-medium text-gray-700">Notes / Details (Optional)</label>
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
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition"
                >
                    {uploading ? "Submitting Report..." : "Submit Category Report"}
                </button>
            </form>
        </div>
    )
}
