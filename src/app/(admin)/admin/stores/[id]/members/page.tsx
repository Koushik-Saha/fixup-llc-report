"use client"
import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import toast from "react-hot-toast"

export default function StoreMembersPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const [members, setMembers] = useState<any[]>([])
    const [users, setUsers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedUser, setSelectedUser] = useState("")
    const [isReporter, setIsReporter] = useState(false)

    const fetchMembers = () => {
        fetch(`/api/admin/stores/${id}/members`)
            .then(res => res.json())
            .then(data => setMembers(data))
    }

    useEffect(() => {
        Promise.all([
            fetch(`/api/admin/stores/${id}/members`).then(res => res.json()),
            fetch('/api/admin/users').then(res => res.json())
        ]).then(([m, u]) => {
            setMembers(m)
            setUsers(u.filter((user: any) => (user.role === 'Staff' || user.role === 'Manager') && user.status === 'Active'))
            setLoading(false)
        })
    }, [id])

    const handleAddMember = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedUser) return toast.error("Select a user")

        const res = await fetch(`/api/admin/stores/${id}/members`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: selectedUser, is_reporter: isReporter })
        })

        if (res.ok) {
            const newMember = await res.json() // Assuming the API returns the new member
            setSelectedUser("")
            setIsReporter(false)
            setMembers([...members, newMember])
            toast.success("Member added successfully")
        } else {
            const data = await res.json()
            toast.error(data.error || "Failed to add member")
        }
    }

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [memberToDelete, setMemberToDelete] = useState<string | null>(null)

    const promptRemoveMember = (memberId: string) => {
        setMemberToDelete(memberId)
        setIsDeleteModalOpen(true)
    }

    const confirmRemoveMember = async () => {
        if (!memberToDelete) return
        
        setIsDeleteModalOpen(false)
        const memberId = memberToDelete
        setMemberToDelete(null)

        const res = await fetch(`/api/admin/stores/members/${memberId}`, {
            method: "DELETE"
        })

        if (res.ok) {
            setMembers(members.filter(m => m.id !== memberId))
            toast.success("Member removed from store")
        } else {
            toast.error("Failed to remove member")
        }
    }

    const handleToggleReporter = async (member: any) => {
        const res = await fetch(`/api/admin/stores/members/${member.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: member.status, is_reporter: !member.is_reporter })
        })

        if (res.ok) {
            setMembers(members.map(m => m.id === member.id ? { ...m, is_reporter: !m.is_reporter } : m))
            toast.success("Reporter status updated")
        } else toast.error("Failed to update status")
    }

    if (loading) return <div>Loading...</div>

    const activeCount = members.filter(m => m.status === 'Active').length

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">Manage Store Members</h2>
                <Link href="/admin/stores" className="text-blue-600 hover:text-blue-800">&larr; Back to Stores</Link>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4">Add New Member ({activeCount}/3 Active)</h3>
                <form onSubmit={handleAddMember} className="flex gap-4 items-end">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700">Select Staff User</label>
                        <select
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                            value={selectedUser}
                            onChange={e => setSelectedUser(e.target.value)}
                        >
                            <option value="">-- Select User --</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="flex items-center space-x-2 text-sm text-gray-700 mt-2 p-2">
                            <input type="checkbox" checked={isReporter} onChange={e => setIsReporter(e.target.checked)} className="rounded" />
                            <span>Is Reporter</span>
                        </label>
                    </div>
                    <button type="submit" className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded">
                        Add
                    </button>
                </form>
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden overflow-x-auto">
                <table className="min-w-full divide-y border-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role in Store</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {members.filter(m => m.status === 'Active').map(member => (
                            <tr key={member.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{member.user?.name || 'Deleted User'}</div>
                                    <div className="text-sm text-gray-500">{member.user?.email || 'N/A'}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${member.is_reporter ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                                        {member.is_reporter ? 'Reporter' : 'Member'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                        Active
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-4">
                                    <button onClick={() => promptRemoveMember(member.id)} className="text-red-600 hover:text-red-900">Remove</button>
                                    <button onClick={() => handleToggleReporter(member)} className="text-indigo-600 hover:text-indigo-900">
                                        Toggle Reporter
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {members.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-6 py-4 text-center text-gray-500">No members assigned to this store.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {isDeleteModalOpen && (
                <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Remove from Store</h3>
                        <p className="text-sm text-gray-600 mb-6">Are you sure you want to remove this user from the store? They will lose access immediately.</p>
                        <div className="flex justify-end space-x-3">
                            <button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition duration-150">Cancel</button>
                            <button onClick={confirmRemoveMember} className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md shadow-sm transition duration-150">Remove User</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
