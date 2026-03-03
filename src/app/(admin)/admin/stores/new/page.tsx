"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function CreateStorePage() {
    const router = useRouter()
    const [formData, setFormData] = useState({ name: "", city: "", state: "", max_members: 3, status: "Active" })
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        const res = await fetch("/api/admin/stores", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData)
        })
        if (res.ok) {
            router.push("/admin/stores")
            router.refresh()
        } else {
            alert("Failed to create store")
            setLoading(false)
        }
    }

    return (
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Create New Store</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Store Name</label>
                    <input type="text" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">City</label>
                        <input type="text" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">State</label>
                        <input type="text" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" value={formData.state} onChange={e => setFormData({ ...formData, state: e.target.value })} />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Status</label>
                        <select className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Max Members</label>
                        <input type="number" min="1" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" value={formData.max_members} onChange={e => setFormData({ ...formData, max_members: Number(e.target.value) })} />
                    </div>
                </div>
                <div className="flex space-x-4 pt-4">
                    <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded">{loading ? "Saving..." : "Save Store"}</button>
                    <Link href="/admin/stores" className="bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded">Cancel</Link>
                </div>
            </form>
        </div>
    )
}
