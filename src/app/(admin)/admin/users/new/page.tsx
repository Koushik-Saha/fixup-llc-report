"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import toast from "react-hot-toast"

export default function CreateUserPage() {
    const router = useRouter()
    const { data: session } = useSession()
    const isManager = session?.user?.role === 'Manager'
    const [formData, setFormData] = useState({ name: "", email: "", phone: "", password: "", role: "Staff", status: "Active", pay_type: "MONTHLY", base_salary: 0 })
    const [showPassword, setShowPassword] = useState(false)
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
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <input type="text" placeholder="Optional" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                </div>
                <div className="relative">
                    <label className="block text-sm font-medium text-gray-700">Password</label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                        <input type={showPassword ? "text" : "password"} required minLength={6} className="block w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                        <button type="button" className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none" onClick={() => setShowPassword(!showPassword)}>
                            {showPassword ? (
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                            ) : (
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            )}
                        </button>
                    </div>
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
                        <select className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} disabled={isManager}>
                            <option value="Staff">Staff</option>
                            {!isManager && <option value="Manager">Manager</option>}
                            {!isManager && <option value="Admin">Admin</option>}
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
