"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { SkeletonRow } from "@/components/Skeleton"

export default function UsersPage() {
    const [users, setUsers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [statusFilter, setStatusFilter] = useState("All")
    const [roleFilter, setRoleFilter] = useState("All")

    useEffect(() => {
        fetch('/api/admin/users')
            .then(res => res.json())
            .then(data => {
                setUsers(data)
                setLoading(false)
            })
    }, [])

    if (loading) return <div className="p-6 bg-white shadow rounded-lg w-full"><SkeletonRow rows={5} /></div>

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Users</h2>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        className="border border-gray-300 rounded px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <select
                        className="border border-gray-300 rounded px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                    >
                        <option value="All">All Roles</option>
                        <option value="Admin">Admin</option>
                        <option value="Manager">Manager</option>
                        <option value="Staff">Staff</option>
                    </select>
                    <select
                        className="border border-gray-300 rounded px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="All">All Statuses</option>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                    </select>
                    <Link href="/admin/users/new" className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded text-center whitespace-nowrap">
                        Create User
                    </Link>
                </div>
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden overflow-x-auto">
                <table className="min-w-full divide-y border-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salary ($)</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Stores</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {users.filter(user => {
                            const term = searchTerm.toLowerCase();
                            const matchesSearch = user.name?.toLowerCase().includes(term) ||
                                user.email?.toLowerCase().includes(term);
                            const matchesStatus = statusFilter === "All" || user.status === statusFilter;
                            const matchesRole = roleFilter === "All" || user.role === roleFilter;
                            return matchesSearch && matchesStatus && matchesRole;
                        }).map(user => (
                            <tr key={user.id}>
                                <td className="px-6 py-4 whitespace-nowrap">{user.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                                <td className="px-6 py-4 whitespace-nowrap">${Number(user.base_salary || 0).toFixed(2)}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{user.role}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-500 whitespace-pre-wrap">
                                        {user.storeMembers?.length > 0
                                            ? user.storeMembers.map((m: any) => m.store.name).join(', ')
                                            : <span className="text-gray-400 italic">Unassigned</span>}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {user.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <Link href={`/admin/users/${user.id}/edit`} className="text-blue-600 hover:text-blue-900">Edit</Link>
                                </td>
                            </tr>
                        ))}
                        {users.filter(user => {
                            const term = searchTerm.toLowerCase();
                            const matchesSearch = user.name?.toLowerCase().includes(term) ||
                                user.email?.toLowerCase().includes(term);
                            const matchesStatus = statusFilter === "All" || user.status === statusFilter;
                            const matchesRole = roleFilter === "All" || user.role === roleFilter;
                            return matchesSearch && matchesStatus && matchesRole;
                        }).length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">No users found matching criteria.</td>
                                </tr>
                            )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
