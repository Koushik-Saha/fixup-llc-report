import { SkeletonCard, SkeletonRow } from "@/components/Skeleton"

export default function StaffHomeLoading() {
    return (
        <div className="space-y-8 max-w-2xl mx-auto">
            <div className="text-center">
                <div className="w-1/2 mx-auto"><SkeletonRow rows={1} /></div>
                <div className="mt-2 w-1/3 mx-auto"><SkeletonRow rows={1} /></div>
            </div>

            <div className="bg-white p-6 shadow rounded-lg max-w-full"><SkeletonRow rows={4} /></div>
        </div>
    )
}
