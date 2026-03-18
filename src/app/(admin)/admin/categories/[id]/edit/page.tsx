"use client"
import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import toast from "react-hot-toast"

export default function EditCategoryPage() {
    const router = useRouter()
    const { id } = useParams()
    
    const [name, setName] = useState("")
    const [status, setStatus] = useState("Active")
    
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        const fetchCategory = async () => {
            try {
                const res = await fetch(`/api/admin/categories/${id}`)
                if (res.ok) {
                    const data = await res.json()
                    setName(data.name || "")
                    setStatus(data.status || "Active")
                } else {
                    toast.error("Failed to load category")
                    router.push("/admin/categories")
                }
            } catch {
                toast.error("Network error while loading category")
            } finally {
                setLoading(false)
            }
        }
        if (id) fetchCategory()
    }, [id, router])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        try {
            const res = await fetch(`/api/admin/categories/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, status }),
            })

            const data = await res.json()

            if (res.ok) {
                toast.success("Category updated successfully!")
                router.push("/admin/categories")
            } else {
                toast.error(data.error || "Failed to update category")
            }
        } catch {
            toast.error("Network error while updating category")
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return <div className="p-8 text-center text-gray-500 animate-pulse font-medium">Loading category details...</div>
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Edit Category</h1>
                    <p className="text-sm text-gray-500 mt-1">ID: {id}</p>
                </div>
                <Link href="/admin/categories" className="text-sm font-medium text-blue-600 hover:text-blue-500">
                    &larr; Back to Categories
                </Link>
            </div>

            <div className="bg-white shadow rounded-xl p-6 border-t-4 border-blue-500">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                            Category Name
                        </label>
                        <input
                            type="text"
                            required
                            className="block w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-blue-500 focus:border-blue-500"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                            Status
                        </label>
                        <select
                            className="block w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-blue-500 focus:border-blue-500"
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                        >
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                        <p className="mt-1 text-xs text-gray-500">Inactive categories cannot be assigned to new reports.</p>
                    </div>

                    <div className="flex justify-end pt-4">
                        <Link
                            href="/admin/categories"
                            className="bg-white py-2 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 mr-3 transition"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={saving}
                            className="bg-blue-600 border border-transparent rounded-lg shadow-sm py-2 px-4 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition"
                        >
                            {saving ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
