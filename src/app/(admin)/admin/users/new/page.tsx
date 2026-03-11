"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import toast from "react-hot-toast"

export default function CreateUserPage() {
    const router = useRouter()
    const [formData, setFormData] = useState({ name: "", email: "", password: "", role: "Staff", status: "Active", pay_type: "MONTHLY", base_salary: 0 })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError("")

        const res = await fetch("/api/admin/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData)
        })

        if (res.ok) {
            toast.success("User created successfully")
            router.push("/admin/users")
            router.refresh()
        } else {
            const data = await res.json()
            toast.error(data.error || "Failed to create user")
            setLoading(false)
        }
    }

    return (
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Create New User</h2>
            {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input type="text" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input type="email" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Password</label>
                    <input type="password" required minLength={6} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Pay Type</label>
                        <select className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" value={formData.pay_type} onChange={e => setFormData({ ...formData, pay_type: e.target.value })}>
                            <option value="MONTHLY">Monthly Salary</option>
                            <option value="HOURLY">Hourly Wage</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            {formData.pay_type === 'HOURLY' ? 'Hourly Rate ($/hr)' : 'Monthly Base Salary ($)'}
                        </label>
                        <input type="number" min="0" step="0.01" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" value={formData.base_salary} onChange={e => setFormData({ ...formData, base_salary: Number(e.target.value) })} />
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Role</label>
                        <select className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}>
                            <option value="Staff">Staff</option>
                            <option value="Manager">Manager</option>
                            <option value="Admin">Admin</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Status</label>
                        <select className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                    </div>
                </div>
                <div className="flex space-x-4 pt-4">
                    <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded">{loading ? "Saving..." : "Save User"}</button>
                    <Link href="/admin/users" className="bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded">Cancel</Link>
                </div>
            </form>
        </div>
    )
}
