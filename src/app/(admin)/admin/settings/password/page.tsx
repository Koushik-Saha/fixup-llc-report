"use client"
import { useState } from "react"
import toast from "react-hot-toast"

export default function ChangePasswordPage() {
    const [currentPassword, setCurrentPassword] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [showCurrent, setShowCurrent] = useState(false)
    const [showNew, setShowNew] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [saving, setSaving] = useState(false)

    const EyeIcon = ({ show }: { show: boolean }) => show ? (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
    ) : (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
    )

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (newPassword !== confirmPassword) {
            toast.error("New passwords do not match")
            return
        }
        if (newPassword.length < 6) {
            toast.error("New password must be at least 6 characters")
            return
        }

        setSaving(true)
        const res = await fetch("/api/user/change-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ currentPassword, newPassword })
        })

        if (res.ok) {
            toast.success("Password changed successfully")
            setCurrentPassword("")
            setNewPassword("")
            setConfirmPassword("")
        } else {
            const d = await res.json()
            toast.error(d.error || "Failed to change password")
        }
        setSaving(false)
    }

    return (
        <div className="max-w-md mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Change Password</h1>
                <p className="text-sm text-gray-400 mt-1">Update your account password</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Current Password */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                        <div className="relative">
                            <input
                                type={showCurrent ? "text" : "password"}
                                required
                                value={currentPassword}
                                onChange={e => setCurrentPassword(e.target.value)}
                                className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="Enter current password"
                            />
                            <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600">
                                <EyeIcon show={showCurrent} />
                            </button>
                        </div>
                    </div>

                    <hr className="border-gray-100" />

                    {/* New Password */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                        <div className="relative">
                            <input
                                type={showNew ? "text" : "password"}
                                required
                                minLength={6}
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="At least 6 characters"
                            />
                            <button type="button" onClick={() => setShowNew(!showNew)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600">
                                <EyeIcon show={showNew} />
                            </button>
                        </div>
                    </div>

                    {/* Confirm New Password */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                        <div className="relative">
                            <input
                                type={showConfirm ? "text" : "password"}
                                required
                                minLength={6}
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                className={`block w-full px-3 py-2 pr-10 border rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500 ${confirmPassword && newPassword !== confirmPassword ? 'border-red-400' : 'border-gray-300'}`}
                                placeholder="Re-enter new password"
                            />
                            <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600">
                                <EyeIcon show={showConfirm} />
                            </button>
                        </div>
                        {confirmPassword && newPassword !== confirmPassword && (
                            <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg text-sm transition disabled:opacity-50 shadow-sm"
                    >
                        {saving ? "Updating..." : "Update Password"}
                    </button>
                </form>
            </div>
        </div>
    )
}
