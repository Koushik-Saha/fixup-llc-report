"use client"
import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { SkeletonRow } from "@/components/Skeleton"
import { Pagination } from "@/components/Pagination"
import { ConfirmModal } from "@/components/ConfirmModal"
import { InfoModal } from "@/components/InfoModal"
import toast from "react-hot-toast"

function UsersPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [users, setUsers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || "")
    const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || "All")
    const [roleFilter, setRoleFilter] = useState(searchParams.get('role') || "All")
    const [page, setPage] = useState(Number(searchParams.get('page') || '1'))
    const [limit, setLimit] = useState(Number(searchParams.get('limit') || '10'))

    const pushParams = (overrides: Record<string, string> = {}) => {
        const vals: Record<string, string> = { search: searchTerm, status: statusFilter, role: roleFilter, page: page.toString(), limit: limit.toString(), ...overrides }
        const p = new URLSearchParams(); Object.entries(vals).forEach(([k, v]) => { if (v && v !== 'All') p.set(k, v); if (k === 'page' && v !== '1') p.set(k, v); if (k === 'limit' && v !== '10') p.set(k, v) })
        router.replace(`/admin/users?${p.toString()}`, { scroll: false })
    }

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [userToDelete, setUserToDelete] = useState<string | null>(null)

    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false)
    const [infoModalData, setInfoModalData] = useState<{ title: string, items: string[] }>({ title: '', items: [] })

    useEffect(() => {
        fetch('/api/admin/users')
            .then(res => res.json())
            .then(data => {
                setUsers(data)
                setLoading(false)
            })
    }, [])

    const requestDelete = (id: string) => {
        setUserToDelete(id)
        setIsDeleteModalOpen(true)
    }

    const confirmDelete = async () => {
        if (!userToDelete) return;
        setIsDeleteModalOpen(false);

        try {
            const res = await fetch(`/api/admin/users/${userToDelete}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('User deactivated successfully');
                setUsers(users.map(u => u.id === userToDelete ? { ...u, status: 'Inactive' } : u));
            } else {
                toast.error('Failed to deactivate user');
            }
        } catch (e) {
            toast.error('Error occurred');
        } finally {
            setUserToDelete(null);
        }
    }

    const openStoreDetails = (user: any) => {
        setInfoModalData({
            title: `Stores Assigned to ${user.name}`,
            items: user.storeMembers.map((m: any) => m.store.name)
        })
        setIsInfoModalOpen(true)
    }

    if (loading) return <div className="p-6 bg-white shadow rounded-lg w-full"><SkeletonRow rows={5} /></div>

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Users</h2>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <input type="text" placeholder="Search by name or email..." className="border border-gray-300 rounded px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                        value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(1); pushParams({ search: e.target.value, page: '1' }) }} />
                    <select className="border border-gray-300 rounded px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                        value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); pushParams({ role: e.target.value, page: '1' }) }}>
                        <option value="All">All Roles</option>
                        <option value="Admin">Admin</option>
                        <option value="Manager">Manager</option>
                        <option value="Staff">Staff</option>
                    </select>
                    <select className="border border-gray-300 rounded px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                        value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); pushParams({ status: e.target.value, page: '1' }) }}>
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
                        {(() => {
                            const filtered = users.filter(user => {
                                const term = searchTerm.toLowerCase()
                                const matchesSearch = user.name?.toLowerCase().includes(term) || user.email?.toLowerCase().includes(term)
                                const matchesStatus = statusFilter === "All" || user.status === statusFilter
                                const matchesRole = roleFilter === "All" || user.role === roleFilter
                                return matchesSearch && matchesStatus && matchesRole
                            })
                            const paged = filtered.slice((page - 1) * limit, page * limit)
                            const totalPages = Math.ceil(filtered.length / limit)
                            return (
                                <>
                                    {paged.map(user => (
                                        <tr key={user.id}>
                                            <td className="px-6 py-4 whitespace-nowrap">{user.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">${Number(user.base_salary || 0).toFixed(2)}<span className="text-gray-500 text-xs ml-1">{user.pay_type === 'HOURLY' ? '/hr' : '/mo'}</span></td>
                                            <td className="px-6 py-4 whitespace-nowrap">{user.role}</td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-500 flex flex-wrap items-center gap-1">
                                                    {user.storeMembers?.length > 0 ? (
                                                        <><span>{user.storeMembers.slice(0, 2).map((m: any) => m.store.name).join(', ')}</span>
                                                        {user.storeMembers.length > 2 && <button onClick={() => openStoreDetails(user)} className="text-blue-600 hover:text-blue-800 hover:underline text-xs font-medium ml-1 cursor-pointer">+ {user.storeMembers.length - 2} more</button>}</>
                                                    ) : <span className="text-gray-400 italic text-sm">Unassigned</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{user.status}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-4">
                                                <Link href={`/admin/users/${user.id}/edit`} className="text-blue-600 hover:text-blue-900">Edit</Link>
                                                {user.status === 'Active' && <button onClick={() => requestDelete(user.id)} className="text-red-600 hover:text-red-900">Deactivate</button>}
                                            </td>
                                        </tr>
                                    ))}
                                    {paged.length === 0 && <tr><td colSpan={7} className="px-6 py-4 text-center text-gray-500">No users found matching criteria.</td></tr>}
                                    <tr className="bg-transparent">
                                        <td colSpan={7} className="p-0">
                                            <Pagination currentPage={page} totalPages={totalPages} totalItems={filtered.length}
                                                onPageChange={v => { setPage(v); pushParams({ page: v.toString() }) }}
                                                label="users" limit={limit}
                                                onLimitChange={v => { setLimit(v); setPage(1); pushParams({ limit: v.toString(), page: '1' }) }} />
                                        </td>
                                    </tr>
                                </>
                            )
                        })()}
                    </tbody>
                </table>
            </div>

            <ConfirmModal
                isOpen={isDeleteModalOpen}
                title="Deactivate User"
                message="Are you sure you want to deactivate this user? They will no longer be able to log in or be assigned to reports."
                confirmText="Deactivate"
                cancelText="Cancel"
                onConfirm={confirmDelete}
                onCancel={() => setIsDeleteModalOpen(false)}
            />

            <InfoModal
                isOpen={isInfoModalOpen}
                title={infoModalData.title}
                items={infoModalData.items}
                onClose={() => setIsInfoModalOpen(false)}
            />
        </div>
    )
}

export default function UsersPageWrapper() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading...</div>}>
            <UsersPage />
        </Suspense>
    )
}

