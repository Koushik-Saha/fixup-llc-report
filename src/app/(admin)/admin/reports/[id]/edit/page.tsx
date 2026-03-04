"use client"
import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function AdminEditReportPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter()
    const { id } = use(params)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState("")

    const [cash, setCash] = useState("")
    const [card, setCard] = useState("")
    const [notes, setNotes] = useState("")
    const [existingImages, setExistingImages] = useState<any[]>([])
    const [files, setFiles] = useState<File[]>([])

    useEffect(() => {
        fetch(`/api/admin/reports/${id}`)
            .then(res => res.json())
            .then(data => {
                if (data.error) setError(data.error)
                else {
                    setCash(data.cash_amount)
                    setCard(data.card_amount)
                    setNotes(data.notes || "")
                    setExistingImages(data.images || [])
                }
                setLoading(false)
            })
            .catch(() => {
                setError("Failed to load report")
                setLoading(false)
            })
    }, [id])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const selectedFiles = Array.from(e.target.files)
            if (existingImages.length + files.length + selectedFiles.length > 10) {
                alert("Maximum 10 images allowed.")
                return
            }
            setFiles([...files, ...selectedFiles])
        }
    }

    const removeExistingImage = (id: string) => {
        setExistingImages(existingImages.filter(img => img.id !== id))
    }

    const removeNewFile = (index: number) => {
        setFiles(files.filter((_, i) => i !== index))
    }

    const uploadFileToS3 = async (file: File) => {
        const presignRes = await fetch("/api/staff/upload/presign", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filename: file.name, contentType: file.type })
        })
        if (!presignRes.ok) throw new Error("Failed to get upload securely")
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
        setSubmitting(true)
        setError("")

        try {
            // Upload new images first
            const newImageUrls = await Promise.all(files.map(uploadFileToS3))

            const keptImageIds = existingImages.map(img => img.id)

            const res = await fetch(`/api/admin/reports/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cash_amount: cash,
                    card_amount: card,
                    notes,
                    keptImageIds,
                    newImageUrls
                })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to update report')

            router.push(`/admin/reports/${id}`)
            router.refresh()
        } catch (err: any) {
            setError(err.message)
            setSubmitting(false)
        }
    }

    if (loading) return <div className="p-8 text-center">Loading Admin Edit Console...</div>

    return (
        <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Admin Edit Capability</h1>
                <span className="text-sm font-medium text-purple-600 bg-purple-50 px-3 py-1 rounded-full border border-purple-100">
                    Unlimited Edits
                </span>
            </div>

            {error ? (
                <div className="bg-red-50 text-red-700 p-4 rounded-md mb-6">{error}</div>
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

                    <div className="pt-4 border-t">
                        <label className="block text-sm font-medium text-gray-700 mb-4">Receipt Images</label>

                        {/* Display Existing Images */}
                        {existingImages.length > 0 && (
                            <div className="mb-4">
                                <p className="text-xs text-gray-500 mb-2">Existing Images</p>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    {existingImages.map((img: any) => (
                                        <div key={img.id} className="relative group border rounded-lg overflow-hidden">
                                            <img src={img.image_url} alt="Receipt" className="w-full h-24 object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => removeExistingImage(img.id)}
                                                className="absolute top-1 right-1 bg-red-500 text-white text-xs px-2 py-1 rounded shadow-sm opacity-90 hover:opacity-100"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Upload New File Input */}
                        <div className="mt-4">
                            <label className="block text-xs text-gray-500 mb-2">Upload New Images (Max 10 total)</label>
                            <input
                                type="file" multiple accept="image/*"
                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                                onChange={handleFileChange}
                            />
                            {files.length > 0 && (
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {files.map((file, idx) => (
                                        <div key={idx} className="relative inline-block border rounded bg-gray-50 p-2 text-center">
                                            <p className="text-xs max-w-[100px] truncate">{file.name}</p>
                                            <button type="button" onClick={() => removeNewFile(idx)} className="text-red-500 text-xs mt-1 font-medium hover:underline">Remove</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Notes / Reason for Admin Edit</label>
                        <textarea
                            rows={3}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-4 pt-4 border-t">
                        <Link
                            href={`/admin/reports/${id}`}
                            className="flex-1 py-3 px-4 text-center border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex-1 py-3 px-4 border border-transparent rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 font-medium disabled:opacity-50"
                        >
                            {submitting ? 'Saving...' : 'Force Admin Save'}
                        </button>
                    </div>
                </form>
            )}
        </div>
    )
}
