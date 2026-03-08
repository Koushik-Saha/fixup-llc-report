"use client"
import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import toast from "react-hot-toast"

export default function SubmitReportPage() {
    const router = useRouter()
    const [storeId, setStoreId] = useState<string>("")
    const [stores, setStores] = useState<any[]>([])
    const [staffIds, setStaffIds] = useState<string[]>([])
    const [storeMembers, setStoreMembers] = useState<any[]>([])
    const [cash, setCash] = useState<number | "">("")
    const [card, setCard] = useState<number | "">("")
    const [expenses, setExpenses] = useState<number | "">("")
    const [payouts, setPayouts] = useState<number | "">("")
    const [timeIn, setTimeIn] = useState<string>("")
    const [timeOut, setTimeOut] = useState<string>("")
    const [reportDate, setReportDate] = useState<string>(new Date().toISOString().split('T')[0])
    const [notes, setNotes] = useState("")
    const [files, setFiles] = useState<File[]>([])

    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState("")

    const netCash = (Number(cash) || 0) - (Number(expenses) || 0) - (Number(payouts) || 0)
    const total = netCash + (Number(card) || 0)

    useEffect(() => {
        fetch('/api/admin/stores')
            .then(res => res.json())
            .then(data => {
                const activeStores = data.filter((s: any) => s.status === 'Active')
                setStores(activeStores)
                if (activeStores.length > 0) setStoreId(activeStores[0].id)
            })
            .catch(err => console.error("Failed to load stores", err))
    }, [])

    useEffect(() => {
        if (!storeId) return
        setStoreMembers([])
        setStaffIds([])
        fetch(`/api/admin/stores/${storeId}/members`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setStoreMembers(data.filter((m: any) => m.status === 'Active' && m.user))
                }
            })
            .catch(err => console.error("Failed to load store members", err))
    }, [storeId])

    const handleStaffCheckbox = (userId: string) => {
        setStaffIds(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        )
    }

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
            if (!storeId) {
                toast.error("Please select a valid store first.")
                setUploading(false)
                return
            }

            if (staffIds.length === 0) {
                toast.error("You must assign at least one staff member to this report.")
                setUploading(false)
                return
            }

            // 1. Upload all images sequentially or in parallel
            const publicUrls = await Promise.all(files.map(uploadFileToS3))

            // 2. Submit the report payload
            const payload = {
                store_id: storeId,
                staff_ids: staffIds,
                cash_amount: Number(cash),
                card_amount: Number(card),
                expenses_amount: Number(expenses),
                payouts_amount: Number(payouts),
                report_date: reportDate,
                time_in: timeIn.trim(),
                time_out: timeOut.trim(),
                notes: notes.trim(),
                imageUrls: publicUrls
            }

            const res = await fetch("/api/admin/reports", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            })

            if (res.ok) {
                const reportData = await res.json()
                toast.success("Manual Report created successfully")
                router.push(`/admin/reports/${reportData.id}`)
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
        <div className="max-w-xl mx-auto bg-white p-6 sm:p-8 rounded-lg shadow-md mt-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Create Missing Report (Admin Override)</h2>

            {error && <div className="bg-red-100 text-red-700 p-4 rounded mb-6">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Select Target Store</label>
                    <select
                        required
                        className="mt-1 block w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-lg"
                        value={storeId}
                        onChange={(e) => setStoreId(e.target.value)}
                    >
                        <option value="" disabled>Select a store</option>
                        {stores.map((s: any) => (
                            <option key={s.id} value={s.id}>{s.name} ({s.city})</option>
                        ))}
                    </select>
                </div>

                {storeId && storeMembers.length > 0 && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">Staff Members Assigned (Required)</label>
                        <div className="space-y-2 bg-gray-50 border border-gray-300 rounded-lg p-4">
                            {storeMembers.map((m: any) => (
                                <label key={m.user_id} className="flex items-center space-x-3 p-2 hover:bg-white rounded transition cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                        checked={staffIds.includes(m.user_id)}
                                        onChange={() => handleStaffCheckbox(m.user_id)}
                                    />
                                    <span className="text-gray-800 font-medium">
                                        {m.user.name} <span className="text-gray-500 text-sm">({m.user.role})</span>
                                    </span>
                                </label>
                            ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">Check all staff members who worked this shift so they receive Work Hours credit.</p>
                    </div>
                )}

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
                            type="number" step="0.01" min="0" required
                            className="mt-1 block w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-lg"
                            value={expenses}
                            onChange={e => setExpenses(e.target.value === "" ? "" : Number(e.target.value))}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Payouts Amount ($)</label>
                        <input
                            type="number" step="0.01" min="0" required
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

                <div>
                    <label className="block text-sm font-medium text-gray-700">Target Report Date</label>
                    <input
                        type="date" required
                        max={new Date().toISOString().split('T')[0]} // Allow today and anytime in the past
                        className="mt-1 block w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-lg"
                        value={reportDate}
                        onChange={e => setReportDate(e.target.value)}
                    />
                    <p className="text-xs text-gray-500 mt-1">Admins can create reports for any date in the past.</p>
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
