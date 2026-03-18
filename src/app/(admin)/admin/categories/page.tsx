"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import { ConfirmModal } from "@/components/ConfirmModal"
import { Pagination } from "@/components/Pagination"

type Category = {
    id: string
    name: string
    status: string
    _count?: { reports: number }
}

export default function AdminCategoriesPage() {
    const router = useRouter()
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)

    // Filters
    const [searchTerm, setSearchTerm] = useState("")
    const [statusFilter, setStatusFilter] = useState("All")
    
    // Deactivate Modal
    const [catToDeactivate, setCatToDeactivate] = useState<Category | null>(null)
    const [isDeactivating, setIsDeactivating] = useState(false)

    // Pagination
    const [page, setPage] = useState(1)
    const [limit, setLimit] = useState(10)

    const fetchCategories = async () => {
        setLoading(true)
        try {
            const res = await fetch("/api/admin/categories")
            if (res.ok) {
                const data = await res.json()
                setCategories(data)
            } else {
                toast.error("Failed to fetch categories")
            }
        } catch {
            toast.error("Failed to load categories")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchCategories()
    }, [])

    const handleDeactivate = async () => {
        if (!catToDeactivate) return
        setIsDeactivating(true)
        try {
            const res = await fetch(`/api/admin/categories/${catToDeactivate.id}`, { method: "DELETE" })
            if (res.ok) {
                toast.success("Category deactivated successfully")
                fetchCategories()
            } else {
                toast.error("Failed to deactivate category")
            }
        } catch {
            toast.error("Network error while deactivating")
        } finally {
            setIsDeactivating(false)
            setCatToDeactivate(null)
        }
    }

    // Filter logic
    const filteredCategories = categories.filter((c) => {
        const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesStatus = statusFilter === "All" || c.status === statusFilter
        return matchesSearch && matchesStatus
    })

    const totalPages = Math.ceil(filteredCategories.length / limit)
    const paginatedCategories = filteredCategories.slice((page - 1) * limit, page * limit)

    return (
        <div className="space-y-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
                    <p className="text-sm text-gray-400 mt-0.5">Manage report categories and business segments</p>
                </div>
                <div className="flex gap-2">
                    <Link
                        href="/admin/categories/report/new"
                        className="bg-purple-100 hover:bg-purple-200 text-purple-700 border border-purple-200 font-semibold py-2 px-4 rounded-lg shadow-sm transition text-sm"
                    >
                        📝 Create Category Report
                    </Link>
                    <Link
                        href="/admin/categories/new"
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow-sm transition text-sm"
                    >
                        + Add Category
                    </Link>
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-400">🔍</span>
                    </div>
                    <input
                        type="text"
                        placeholder="Search by category name..."
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <select
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500 text-sm min-w-[140px]"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="All">All Statuses</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                </select>
            </div>

            <div className="bg-white shadow rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Name
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Reports Count
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading && Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i} className="animate-pulse bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                                    <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-gray-200 rounded-full w-16"></div></td>
                                    <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-gray-200 rounded w-8 mx-auto"></div></td>
                                    <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-gray-200 rounded w-20 ml-auto"></div></td>
                                </tr>
                            ))}
                            {!loading && paginatedCategories.map((category) => (
                                <tr key={category.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-semibold text-gray-900">{category.name}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${category.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {category.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-medium">
                                        {category._count?.reports ? (
                                            <Link href={`/admin/categories/${category.id}/reports`} className="text-indigo-600 hover:text-indigo-900 border-b border-indigo-200 hover:border-indigo-600 transition">
                                                {category._count.reports} Reports
                                            </Link>
                                        ) : (
                                            <span className="text-gray-400">0</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <Link href={`/admin/categories/${category.id}/reports`} className="text-purple-600 hover:text-purple-900 mx-2 transition">
                                            View Reports
                                        </Link>
                                        <Link href={`/admin/categories/${category.id}/edit`} className="text-blue-600 hover:text-blue-900 mx-2 transition">
                                            Edit
                                        </Link>
                                        {category.status === 'Active' && (
                                            <button 
                                                onClick={() => setCatToDeactivate(category)}
                                                className="text-red-600 hover:text-red-900 mx-2 transition"
                                            >
                                                Deactivate
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {!loading && filteredCategories.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-10 text-center text-gray-400">
                                        No categories found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {!loading && totalPages > 1 && (
                    <Pagination 
                        currentPage={page} 
                        totalPages={totalPages} 
                        totalItems={filteredCategories.length}
                        limit={limit}
                        onPageChange={setPage}
                        onLimitChange={setLimit}
                        label="categories"
                    />
                )}
            </div>

            <ConfirmModal
                isOpen={!!catToDeactivate}
                title="Deactivate Category"
                message={`Are you sure you want to deactivate the category "${catToDeactivate?.name}"? New reports cannot be assigned to inactive categories.`}
                confirmText={isDeactivating ? "Deactivating..." : "Yes, deactivate it"}
                onConfirm={handleDeactivate}
                onCancel={() => setCatToDeactivate(null)}
            />
        </div>
    )
}
