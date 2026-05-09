import prisma from './prisma'

// ── Manager ──────────────────────────────────────────────
export type ManagerPermissions = {
    users: { view: boolean; create: boolean; edit: boolean }
    expenses: { view: boolean; create: boolean }
    stores: { view: boolean; edit: boolean; manage_members: boolean }
    reports: { monthly: boolean }
    schedule: { view: boolean }
}

export const DEFAULT_MANAGER_PERMISSIONS: ManagerPermissions = {
    users: { view: true, create: true, edit: true },
    expenses: { view: true, create: true },
    stores: { view: true, edit: true, manage_members: true },
    reports: { monthly: true },
    schedule: { view: true },
}

export async function getManagerPermissions(companyId: string): Promise<ManagerPermissions> {
    try {
        const row = await prisma.permissionConfig.findUnique({
            where: { company_id_role: { company_id: companyId, role: 'Manager' } }
        })
        if (!row) return DEFAULT_MANAGER_PERMISSIONS
        const saved = row.config as Partial<ManagerPermissions>
        return {
            users: { ...DEFAULT_MANAGER_PERMISSIONS.users, ...saved.users },
            expenses: { ...DEFAULT_MANAGER_PERMISSIONS.expenses, ...saved.expenses },
            stores: { ...DEFAULT_MANAGER_PERMISSIONS.stores, ...saved.stores },
            reports: { ...DEFAULT_MANAGER_PERMISSIONS.reports, ...saved.reports },
            schedule: { ...DEFAULT_MANAGER_PERMISSIONS.schedule, ...saved.schedule },
        }
    } catch {
        return DEFAULT_MANAGER_PERMISSIONS
    }
}

// ── Staff ─────────────────────────────────────────────────
export type StaffPermissions = {
    reports: { submit: boolean; view_history: boolean; edit: boolean }
    schedule: { view: boolean }
    monthly_report: { view: boolean }
}

export const DEFAULT_STAFF_PERMISSIONS: StaffPermissions = {
    reports: { submit: true, view_history: true, edit: true },
    schedule: { view: true },
    monthly_report: { view: true },
}

export async function getStaffPermissions(companyId: string): Promise<StaffPermissions> {
    try {
        const row = await prisma.permissionConfig.findUnique({
            where: { company_id_role: { company_id: companyId, role: 'Staff' } }
        })
        if (!row) return DEFAULT_STAFF_PERMISSIONS
        const saved = row.config as Partial<StaffPermissions>
        return {
            reports: { ...DEFAULT_STAFF_PERMISSIONS.reports, ...saved.reports },
            schedule: { ...DEFAULT_STAFF_PERMISSIONS.schedule, ...saved.schedule },
            monthly_report: { ...DEFAULT_STAFF_PERMISSIONS.monthly_report, ...saved.monthly_report },
        }
    } catch {
        return DEFAULT_STAFF_PERMISSIONS
    }
}
