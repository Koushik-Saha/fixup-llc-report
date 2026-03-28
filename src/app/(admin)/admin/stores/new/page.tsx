"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import toast from "react-hot-toast"

const defaultHours = {
    Monday: { isOpen: true, open: "10:00", close: "20:00" },
    Tuesday: { isOpen: true, open: "10:00", close: "20:00" },
    Wednesday: { isOpen: true, open: "10:00", close: "20:00" },
    Thursday: { isOpen: true, open: "10:00", close: "20:00" },
    Friday: { isOpen: true, open: "10:00", close: "20:00" },
    Saturday: { isOpen: true, open: "10:00", close: "20:00" },
    Sunday: { isOpen: true, open: "10:00", close: "20:00" }
}

export default function CreateStorePage() {
    const router = useRouter()
    const [formData, setFormData] = useState<any>({ name: "", address: "", city: "", state: "", zip_code: "", block: "", max_members: 3, status: "Active", operating_hours: defaultHours })
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
            toast.success("Store created successfully")
            router.push("/admin/stores")
            router.refresh()
        } else {
            toast.error("Failed to create store")
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
                <div>
                    <label className="block text-sm font-medium text-gray-700">Address / Location</label>
                    <input type="text" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">City</label>
                        <input type="text" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">State</label>
                        <input type="text" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" value={formData.state} onChange={e => setFormData({ ...formData, state: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Zip Code</label>
                        <input type="text" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" value={formData.zip_code} onChange={e => setFormData({ ...formData, zip_code: e.target.value })} />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Block (Optional)</label>
                    <input type="text" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" value={formData.block || ""} onChange={e => setFormData({ ...formData, block: e.target.value })} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                <div className="pt-4 border-t border-gray-200 mt-6 !mb-2">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Operating Hours</h3>
                    <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-100">
                        {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(day => (
                            <div key={day} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                                <div className="w-full sm:w-32">
                                    <label className="inline-flex items-center cursor-pointer">
                                        <input type="checkbox" checked={formData.operating_hours[day]?.isOpen || false} onChange={e => setFormData({ ...formData, operating_hours: { ...formData.operating_hours, [day]: { ...formData.operating_hours[day], isOpen: e.target.checked } } })} className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 w-4 h-4" />
                                        <span className="ml-2 text-sm font-medium text-gray-700">{day}</span>
                                    </label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input type="time" disabled={!formData.operating_hours[day]?.isOpen} value={formData.operating_hours[day]?.open || "10:00"} onChange={e => setFormData({ ...formData, operating_hours: { ...formData.operating_hours, [day]: { ...formData.operating_hours[day], open: e.target.value } } })} className="border border-gray-300 rounded px-3 py-1.5 text-sm disabled:bg-gray-100 disabled:text-gray-400 focus:ring-blue-500 focus:border-blue-500" />
                                    <span className="text-gray-500 text-sm font-medium">to</span>
                                    <input type="time" disabled={!formData.operating_hours[day]?.isOpen} value={formData.operating_hours[day]?.close || "20:00"} onChange={e => setFormData({ ...formData, operating_hours: { ...formData.operating_hours, [day]: { ...formData.operating_hours[day], close: e.target.value } } })} className="border border-gray-300 rounded px-3 py-1.5 text-sm disabled:bg-gray-100 disabled:text-gray-400 focus:ring-blue-500 focus:border-blue-500" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex space-x-4 pt-6">
                    <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded">{loading ? "Saving..." : "Save Store"}</button>
                    <Link href="/admin/stores" className="bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded">Cancel</Link>
                </div>
            </form>
        </div>
    )
}
