"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import toast from "react-hot-toast"

export default function NewCategoryPage() {
    const router = useRouter()
    const [name, setName] = useState("")
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const res = await fetch("/api/admin/categories", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name }),
            })

            const data = await res.json()

            if (res.ok) {
                toast.success("Category created successfully!")
                router.push("/admin/categories")
            } else {
                toast.error(data.error || "Failed to create category")
            }
        } catch {
            toast.error("Network error while creating category")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Add New Category</h1>
                <Link href="/admin/categories" className="text-sm font-medium text-blue-600 hover:text-blue-500">
                    &larr; Back to Categories
                </Link>
            </div>

            <div className="bg-white shadow rounded-xl p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                            Category Name
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Shipping"
                            className="block w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-blue-500 focus:border-blue-500"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
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
                            disabled={loading}
                            className="bg-blue-600 border border-transparent rounded-lg shadow-sm py-2 px-4 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition"
                        >
                            {loading ? "Creating..." : "Save Category"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
