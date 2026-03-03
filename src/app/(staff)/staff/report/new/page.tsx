"use client"
import { useState, useRef } from "react"
import { useRouter } from "next/navigation"

export default function SubmitReportPage() {
    const router = useRouter()
    const [cash, setCash] = useState<number | "">("")
    const [card, setCard] = useState<number | "">("")
    const [notes, setNotes] = useState("")
    const [files, setFiles] = useState<File[]>([])

    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState("")

    const total = (Number(cash) || 0) + (Number(card) || 0)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const selectedFiles = Array.from(e.target.files)
            // Enforce max 10 images policy
            if (files.length + selectedFiles.length > 10) {
                alert("Maximum 10 images allowed.")
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
                notes: notes.trim(),
                imageUrls: publicUrls
            }

            const res = await fetch("/api/staff/reports", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || "Failed to submit report")
            }

            const reportData = await res.json()
            router.push(`/staff/report/${reportData.id}`)
            router.refresh()

        } catch (err: any) {
            console.error(err)
            setError(err.message || "An unexpected error occurred.")
            setUploading(false)
        }
    }

    return (
        <div className="max-w-xl mx-auto bg-white p-6 sm:p-8 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Submit Daily Report</h2>

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

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex justify-between items-center text-xl font-bold">
                    <span className="text-blue-900">Total Calculation</span>
                    <span className="text-blue-700">${total.toFixed(2)}</span>
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
