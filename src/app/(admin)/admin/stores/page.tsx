"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { SkeletonRow } from "@/components/Skeleton"

export default function StoresPage() {
    const [stores, setStores] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch('/api/admin/stores')
            .then(res => res.json())
            .then(data => {
                setStores(data)
                setLoading(false)
            })
    }, [])

    if (loading) return <div className="p-6 bg-white shadow rounded-lg w-full"><SkeletonRow rows={5} /></div>

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Stores</h2>
                <Link href="/admin/stores/new" className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded">
                    Create Store
                </Link>
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
                        {stores.map(store => (
                            <tr key={store.id}>
                                <td className="px-6 py-4 whitespace-nowrap">{store.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{store.city}, {store.state}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${store.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {store.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{store._count.members} / {store.max_members}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-500 flex flex-wrap gap-2">
                                        {store.members?.length > 0
                                            ? store.members.map((m: any) => (
                                                <span key={m.user.name} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                                    {m.user.name} {m.user.role === 'Manager' && <span className="ml-1 text-purple-600 font-bold">(M)</span>}
                                                </span>
                                            ))
                                            : <span className="italic text-gray-400">None</span>}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-4">
                                    <Link href={`/admin/stores/${store.id}/edit`} className="text-blue-600 hover:text-blue-900">Edit</Link>
                                    <Link href={`/admin/stores/${store.id}/members`} className="text-indigo-600 hover:text-indigo-900">Members</Link>
                                </td>
                            </tr>
                        ))}
                        {stores.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">No stores found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
