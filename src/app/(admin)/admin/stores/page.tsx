"use client"
import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { SkeletonRow } from "@/components/Skeleton"
import { Pagination } from "@/components/Pagination"
import { ConfirmModal } from "@/components/ConfirmModal"
import { InfoModal } from "@/components/InfoModal"
import toast from "react-hot-toast"

function StoresPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [stores, setStores] = useState<any[]>([])
    const [users, setUsers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || "")
    const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || "All")
    const [userFilter, setUserFilter] = useState(searchParams.get('userId') || "All")
    const [stateFilter, setStateFilter] = useState(searchParams.get('state') || "All")
    const [capacityFilter, setCapacityFilter] = useState(searchParams.get('capacity') || "All")
    const [page, setPage] = useState(Number(searchParams.get('page') || '1'))
    const [limit, setLimit] = useState(Number(searchParams.get('limit') || '10'))

    const pushParams = (overrides: Record<string, string> = {}) => {
        const vals: Record<string, string> = { search: searchTerm, status: statusFilter, userId: userFilter, state: stateFilter, capacity: capacityFilter, page: page.toString(), limit: limit.toString(), ...overrides }
        const p = new URLSearchParams()
        Object.entries(vals).forEach(([k, v]) => { 
            if (v && v !== 'All' && v !== '1' && v !== '10') p.set(k, v) 
            else if (k === 'page' && v !== '1') p.set(k, v) 
            else if (k === 'limit' && v !== '10') p.set(k, v) 
        })
        router.replace(`/admin/stores?${p.toString()}`, { scroll: false })
    }
    
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [storeToDelete, setStoreToDelete] = useState<string | null>(null)

    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false)
    const [infoModalData, setInfoModalData] = useState<{ title: string, items: string[] }>({ title: '', items: [] })

    useEffect(() => {
        setLoading(true)
        Promise.all([
            fetch('/api/admin/stores').then(res => res.json()),
            fetch('/api/admin/users').then(res => res.json())
        ]).then(([storesData, usersData]) => {
            setStores(storesData)
            setUsers(usersData)
            setLoading(false)
        })
    }, [])

    const requestDelete = (id: string) => {
        setStoreToDelete(id)
        setIsDeleteModalOpen(true)
    }

    const confirmDelete = async () => {
        if (!storeToDelete) return;
        setIsDeleteModalOpen(false);

        try {
            const res = await fetch(`/api/admin/stores/${storeToDelete}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('Store deactivated successfully');
                setStores(stores.map(s => s.id === storeToDelete ? { ...s, status: 'Inactive' } : s));
            } else {
                toast.error('Failed to deactivate store');
            }
        } catch (e) {
            toast.error('Error occurred');
        } finally {
            setStoreToDelete(null);
        }
    }

    const openMembersDetails = (store: any) => {
        setInfoModalData({
            title: `Members Assigned to ${store.name}`,
            items: store.members.map((m: any) => `${m.user.name}${m.user.role === 'Manager' ? ' (Manager)' : ''}`)
        })
        setIsInfoModalOpen(true)
    }

    if (loading) return <div className="p-6 bg-white shadow rounded-lg w-full"><SkeletonRow rows={5} /></div>

    const uniqueStates = Array.from(new Set(stores.map(s => s.state).filter(Boolean))).sort()

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Stores</h2>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto items-center">
                    <input type="text" placeholder="Search stores..." className="border border-gray-300 rounded px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900 w-full sm:w-auto min-w-[200px]"
                        value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(1); pushParams({ search: e.target.value, page: '1' }) }} />
                    <select className="border border-gray-300 rounded px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                        value={stateFilter} onChange={(e) => { setStateFilter(e.target.value); setPage(1); pushParams({ state: e.target.value, page: '1' }) }}>
                        <option value="All">All States</option>
                        {uniqueStates.map(st => <option key={st as string} value={st as string}>{st as string}</option>)}
                    </select>
                    <select className="border border-gray-300 rounded px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                        value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); pushParams({ status: e.target.value, page: '1' }) }}>
                        <option value="All">All Statuses</option>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                    </select>
                    <select className="border border-gray-300 rounded px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                        value={userFilter} onChange={(e) => { setUserFilter(e.target.value); setPage(1); pushParams({ userId: e.target.value, page: '1' }) }}>
                        <option value="All">Filter by User</option>
                        {users.map((u: any) => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                    </select>
                    <select className="border border-gray-300 rounded px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                        value={capacityFilter} onChange={(e) => { setCapacityFilter(e.target.value); setPage(1); pushParams({ capacity: e.target.value, page: '1' }) }}>
                        <option value="All">All Capacities</option>
                        <option value="Available">Available Space</option>
                        <option value="Full">Full (At Max)</option>
                        <option value="Empty">Empty (0 Members)</option>
                    </select>
                    <Link href="/admin/stores/new" className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded text-center whitespace-nowrap text-sm font-medium ml-auto">
                        + Create Store
                    </Link>
                </div>
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden overflow-x-auto">
                <table className="min-w-full divide-y border-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Members</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Members</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {(() => {
                            const filtered = stores.filter(store => {
                                const term = searchTerm.toLowerCase()
                                const matchesSearch = store.name.toLowerCase().includes(term) || store.city?.toLowerCase().includes(term) || store.zip_code?.toLowerCase().includes(term)
                                const matchesStatus = statusFilter === "All" || store.status === statusFilter
                                const matchesUser = userFilter === "All" || store.members?.some((m: any) => m.user_id === userFilter)
                                const matchesState = stateFilter === "All" || store.state === stateFilter
                                
                                const memCount = store._count?.members || 0
                                const matchesCapacity = capacityFilter === "All" || 
                                    (capacityFilter === "Empty" && memCount === 0) ||
                                    (capacityFilter === "Full" && memCount >= store.max_members) ||
                                    (capacityFilter === "Available" && memCount < store.max_members && memCount > 0)

                                return matchesSearch && matchesStatus && matchesUser && matchesState && matchesCapacity
                            })
                            const paged = filtered.slice((page - 1) * limit, page * limit)
                            const totalPages = Math.ceil(filtered.length / limit)
                            return (
                                <>
                                    {paged.map(store => (
                                        <tr key={store.id}>
                                            <td className="px-6 py-4 whitespace-nowrap">{store.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">{store.city}, {store.state}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${store.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{store.status}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-gray-900">{store._count.members} / {store.max_members}</div></td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-500 flex flex-wrap items-center gap-1">
                                                    {store.members?.length > 0 ? (
                                                        <><span>{store.members.slice(0, 3).map((m: any) => `${m.user.name}${m.user.role === 'Manager' ? ' (M)' : ''}`).join(', ')}</span>
                                                        {store.members.length > 3 && <button onClick={() => openMembersDetails(store)} className="text-blue-600 hover:text-blue-800 hover:underline text-xs font-medium ml-1 cursor-pointer">+ {store.members.length - 3} more</button>}</>
                                                    ) : <span className="italic text-gray-400 text-sm">None</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-4">
                                                <Link href={`/admin/stores/${store.id}/edit`} className="text-blue-600 hover:text-blue-900">Edit</Link>
                                                <Link href={`/admin/stores/${store.id}/members`} className="text-indigo-600 hover:text-indigo-900">Members</Link>
                                                {store.status === 'Active' && <button onClick={() => requestDelete(store.id)} className="text-red-600 hover:text-red-900">Deactivate</button>}
                                            </td>
                                        </tr>
                                    ))}
                                    {paged.length === 0 && <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500">No stores found matching criteria.</td></tr>}
                                    {/* Pagination row */}
                                    <tr className="bg-transparent">
                                        <td colSpan={6} className="p-0">
                                            <Pagination currentPage={page} totalPages={totalPages} totalItems={filtered.length}
                                                onPageChange={v => { setPage(v); pushParams({ page: v.toString() }) }}
                                                label="stores" limit={limit}
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
                title="Deactivate Store"
                message="Are you sure you want to deactivate this store? Assigned members will lose access and reports cannot be filed for it."
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

export default function StoresPageWrapper() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading...</div>}>
            <StoresPage />
        </Suspense>
    )
}

