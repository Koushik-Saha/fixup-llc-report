"use client"
import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import {
    DEFAULT_MANAGER_PERMISSIONS, type ManagerPermissions,
    DEFAULT_STAFF_PERMISSIONS, type StaffPermissions
} from "@/lib/permissions"

type ToggleRowProps = {
    label: string
    description: string
    checked: boolean
    locked?: boolean
    lockedLabel?: string
    onChange?: (v: boolean) => void
}

function ToggleRow({ label, description, checked, locked, lockedLabel, onChange }: ToggleRowProps) {
    return (
        <div className="flex items-center justify-between py-3.5 px-5 border-b border-gray-100 last:border-0">
            <div className="flex-1 min-w-0 pr-4">
                <p className="text-sm font-medium text-gray-800">{label}</p>
                {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
            </div>
            {locked ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 bg-gray-100 px-3 py-1.5 rounded-full whitespace-nowrap">
                    🔒 {lockedLabel || 'Admin Only'}
                </span>
            ) : (
                <button
                    type="button"
                    onClick={() => onChange?.(!checked)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${checked ? 'bg-indigo-600' : 'bg-gray-200'}`}
                    role="switch"
                    aria-checked={checked}
                >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
            )}
        </div>
    )
}

function SectionCard({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3 bg-gray-50 border-b border-gray-200">
                <span className="text-lg">{icon}</span>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{title}</h3>
            </div>
            <div>{children}</div>
        </div>
    )
}

export default function PermissionsPage() {
    const { data: session } = useSession()
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<'Manager' | 'Staff'>('Manager')
    const [managerPerms, setManagerPerms] = useState<ManagerPermissions>(DEFAULT_MANAGER_PERMISSIONS)
    const [staffPerms, setStaffPerms] = useState<StaffPermissions>(DEFAULT_STAFF_PERMISSIONS)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (session?.user?.role && session.user.role !== 'Admin') {
            router.replace('/admin/dashboard')
            return
        }
        fetch('/api/admin/permissions')
            .then(r => r.json())
            .then(d => {
                if (d.manager) setManagerPerms(d.manager)
                if (d.staff) setStaffPerms(d.staff)
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }, [session, router])

    const setM = (path: string, value: boolean) => {
        const [section, key] = path.split('.')
        setManagerPerms(prev => ({ ...prev, [section]: { ...(prev as any)[section], [key]: value } }))
    }

    const setS = (path: string, value: boolean) => {
        const [section, key] = path.split('.')
        setStaffPerms(prev => ({ ...prev, [section]: { ...(prev as any)[section], [key]: value } }))
    }

    const handleSave = async () => {
        setSaving(true)
        const config = activeTab === 'Manager' ? managerPerms : staffPerms
        const res = await fetch('/api/admin/permissions', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: activeTab, config })
        })
        if (res.ok) {
            toast.success(`${activeTab} permissions saved`)
        } else {
            const d = await res.json()
            toast.error(d.error || 'Failed to save')
        }
        setSaving(false)
    }

    if (loading) {
        return <div className="flex items-center justify-center h-64 text-sm text-gray-400">Loading permissions...</div>
    }

    const tabs: { key: 'Manager' | 'Staff'; label: string; color: string; avatar: string; desc: string }[] = [
        {
            key: 'Manager',
            label: 'Manager',
            color: 'bg-indigo-600',
            avatar: 'M',
            desc: 'Managers are scoped to their assigned stores. Admin features are always locked.'
        },
        {
            key: 'Staff',
            label: 'Staff',
            color: 'bg-emerald-600',
            avatar: 'S',
            desc: 'Staff access the staff portal only. Control which sections they can use.'
        },
    ]

    const activeTabInfo = tabs.find(t => t.key === activeTab)!

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Permission Management</h1>
                    <p className="text-sm text-gray-400 mt-0.5">Control what each role can access and do</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-6 rounded-lg text-sm transition disabled:opacity-50 shadow-sm whitespace-nowrap"
                >
                    {saving ? 'Saving...' : `Save ${activeTab} Permissions`}
                </button>
            </div>

            {/* Role Tabs */}
            <div className="flex gap-2 bg-gray-100 p-1.5 rounded-xl w-fit">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition ${activeTab === tab.key ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <span className={`w-5 h-5 rounded-full ${tab.color} text-white text-[10px] font-black flex items-center justify-center`}>{tab.avatar}</span>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Active role banner */}
            <div className={`flex items-center gap-3 rounded-xl px-5 py-4 border ${activeTab === 'Manager' ? 'bg-indigo-50 border-indigo-200' : 'bg-emerald-50 border-emerald-200'}`}>
                <div className={`w-10 h-10 ${activeTabInfo.color} rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0`}>
                    {activeTabInfo.avatar}
                </div>
                <div>
                    <p className={`text-sm font-bold ${activeTab === 'Manager' ? 'text-indigo-900' : 'text-emerald-900'}`}>
                        {activeTab} Role Permissions
                    </p>
                    <p className={`text-xs mt-0.5 ${activeTab === 'Manager' ? 'text-indigo-600' : 'text-emerald-600'}`}>
                        {activeTabInfo.desc}
                    </p>
                </div>
            </div>

            {/* ── MANAGER PERMISSIONS ── */}
            {activeTab === 'Manager' && (
                <>
                    <SectionCard icon="👥" title="Users">
                        <ToggleRow label="View Users" description="Can access the Users section and see staff in their stores" checked={managerPerms.users.view} onChange={v => setM('users.view', v)} />
                        <ToggleRow label="Create New Users" description="Can create new Staff accounts" checked={managerPerms.users.create} onChange={v => setM('users.create', v)} />
                        <ToggleRow label="Edit Users" description="Can edit user details for staff in their stores" checked={managerPerms.users.edit} onChange={v => setM('users.edit', v)} />
                        <ToggleRow label="Deactivate Users" description="Permanently disable a user account" checked={false} locked />
                        <ToggleRow label="Login As User" description="Impersonate a user's session" checked={false} locked />
                    </SectionCard>

                    <SectionCard icon="🧾" title="Expenses">
                        <ToggleRow label="View Expenses" description="Can access the Expenses section for their stores" checked={managerPerms.expenses.view} onChange={v => setM('expenses.view', v)} />
                        <ToggleRow label="Add Expenses" description="Can log new expenses for their stores" checked={managerPerms.expenses.create} onChange={v => setM('expenses.create', v)} />
                        <ToggleRow label="Approve / Reject Expenses" description="Review and approve or reject pending expense submissions" checked={false} locked />
                    </SectionCard>

                    <SectionCard icon="🏪" title="Stores">
                        <ToggleRow label="View Assigned Stores" description="Can see and navigate the Stores section" checked={managerPerms.stores.view} onChange={v => setM('stores.view', v)} />
                        <ToggleRow label="Edit Store Details" description="Can update name, address, hours for their stores" checked={managerPerms.stores.edit} onChange={v => setM('stores.edit', v)} />
                        <ToggleRow label="Manage Store Members" description="Can add or remove staff members from their stores" checked={managerPerms.stores.manage_members} onChange={v => setM('stores.manage_members', v)} />
                        <ToggleRow label="Create New Stores" description="Add a new store to the company" checked={false} locked />
                        <ToggleRow label="Deactivate Stores" description="Disable a store and remove member access" checked={false} locked />
                    </SectionCard>

                    <SectionCard icon="📋" title="Reports & Schedule">
                        <ToggleRow label="Monthly Report" description="Can view monthly summary reports" checked={managerPerms.reports.monthly} onChange={v => setM('reports.monthly', v)} />
                        <ToggleRow label="Shift Schedule" description="Can view and manage shift schedules" checked={managerPerms.schedule.view} onChange={v => setM('schedule.view', v)} />
                    </SectionCard>

                    <SectionCard icon="🔐" title="Admin-Only (Always Locked)">
                        <div className="px-5 py-2.5 text-xs text-gray-400 italic border-b border-gray-100">
                            These features are permanently restricted to Admins only.
                        </div>
                        {['Dashboard & KPI metrics', 'Inventory management', 'Payroll & Tax Exports', 'Sales Analytics', 'Anomaly Detection', 'Reconciliation', 'Full Analytics', 'Activity Logs & Error Logs'].map(f => (
                            <ToggleRow key={f} label={f} description="" checked={false} locked lockedLabel="Admin Only" />
                        ))}
                    </SectionCard>
                </>
            )}

            {/* ── STAFF PERMISSIONS ── */}
            {activeTab === 'Staff' && (
                <>
                    <SectionCard icon="📊" title="Daily Reports">
                        <ToggleRow label="Submit Daily Reports" description="Can create and submit new daily sales reports" checked={staffPerms.reports.submit} onChange={v => setS('reports.submit', v)} />
                        <ToggleRow label="View Report History" description="Can browse their previously submitted reports" checked={staffPerms.reports.view_history} onChange={v => setS('reports.view_history', v)} />
                        <ToggleRow label="Edit Submitted Reports" description="Can edit a report after it has been submitted (before verification)" checked={staffPerms.reports.edit} onChange={v => setS('reports.edit', v)} />
                    </SectionCard>

                    <SectionCard icon="📅" title="Schedule">
                        <ToggleRow label="View Shift Schedule" description="Can see their assigned shifts and store schedule" checked={staffPerms.schedule.view} onChange={v => setS('schedule.view', v)} />
                    </SectionCard>

                    <SectionCard icon="📆" title="Monthly Report">
                        <ToggleRow label="View Monthly Summary" description="Can access their own monthly performance summary" checked={staffPerms.monthly_report.view} onChange={v => setS('monthly_report.view', v)} />
                    </SectionCard>

                    <SectionCard icon="🔐" title="Always Available to Staff">
                        <div className="px-5 py-2.5 text-xs text-gray-400 italic border-b border-gray-100">
                            These are core features that staff always have access to.
                        </div>
                        <ToggleRow label="Home Dashboard" description="Staff's personal performance overview" checked={true} locked lockedLabel="Always On" />
                        <ToggleRow label="Account Security (2FA)" description="Staff can manage their own 2FA settings" checked={true} locked lockedLabel="Always On" />
                    </SectionCard>
                </>
            )}

            <div className="flex justify-end pb-6">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-8 rounded-lg text-sm transition disabled:opacity-50 shadow"
                >
                    {saving ? 'Saving...' : `Save ${activeTab} Permissions`}
                </button>
            </div>
        </div>
    )
}
