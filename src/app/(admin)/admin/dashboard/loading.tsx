import { SkeletonCard, SkeletonRow } from "@/components/Skeleton"

export default function AdminDashboardLoading() {
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Admin Dashboard</h2>
            <div className="w-48"><SkeletonRow rows={1} /></div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
            </div>

            <div className="bg-white p-6 rounded-lg shadow border-l-4 border-red-500">
                <div className="mb-4 w-64"><SkeletonRow rows={1} /></div>
                <SkeletonRow rows={3} />
            </div>
        </div>
    )
}
