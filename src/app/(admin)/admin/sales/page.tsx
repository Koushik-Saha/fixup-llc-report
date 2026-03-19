"use client"
import { useState, useEffect } from "react"
import dayjs from "dayjs"
import { SkeletonRow } from "@/components/Skeleton"

export default function SalesAnalyticsDashboard() {
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<any>(null)
    const [error, setError] = useState("")

    const [stores, setStores] = useState<any[]>([])
    
    // Filters
    const [storeId, setStoreId] = useState("")
    const [timeframe, setTimeframe] = useState("this_month") // this_month, last_30, year_to_date, all_time

    useEffect(() => {
        fetch('/api/admin/stores')
            .then(res => res.json())
            .then(data => setStores(data))
            .catch(err => console.error("Error loading stores", err))
    }, [])

    useEffect(() => {
        setLoading(true)
        setError("")

        let startDate = ""
        let endDate = dayjs().format('YYYY-MM-DD')

        if (timeframe === "this_month") {
            startDate = dayjs().startOf('month').format('YYYY-MM-DD')
        } else if (timeframe === "last_30") {
            startDate = dayjs().subtract(30, 'day').format('YYYY-MM-DD')
        } else if (timeframe === "year_to_date") {
            startDate = dayjs().startOf('year').format('YYYY-MM-DD')
        } else {
            startDate = "2000-01-01" // arbitrary past date for all_time
        }

        let url = `/api/admin/sales/breakdown?startDate=${startDate}&endDate=${endDate}`
        if (storeId) url += `&storeId=${storeId}`

        fetch(url)
            .then(res => res.json())
            .then(resData => {
                if (resData.error) throw new Error(resData.error)
                setData(resData)
                setLoading(false)
            })
            .catch(err => {
                setError(err.message)
                setLoading(false)
            })
    }, [storeId, timeframe])

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold text-gray-900">Sales & Product Analytics</h1>
                
                <div className="flex gap-4 w-full sm:w-auto">
                    <select
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                        value={timeframe}
                        onChange={e => setTimeframe(e.target.value)}
                    >
                        <option value="this_month">This Month</option>
                        <option value="last_30">Last 30 Days</option>
                        <option value="year_to_date">Year to Date (YTD)</option>
                        <option value="all_time">All Time</option>
                    </select>

                    <select
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                        value={storeId}
                        onChange={e => setStoreId(e.target.value)}
                    >
                        <option value="">All Stores (Company)</option>
                        {stores.map(store => (
                            <option key={store.id} value={store.id}>{store.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {error ? (
                <div className="p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>
            ) : loading ? (
                <div className="bg-white p-6 rounded-lg shadow"><SkeletonRow rows={5} /></div>
            ) : data && (
                <div className="space-y-6">
                    {/* Top Level Metric Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white rounded-xl shadow p-6 border-l-4 border-blue-500">
                            <p className="text-sm font-medium text-gray-500 uppercase">Total Sales Volume</p>
                            <p className="text-3xl font-bold text-gray-900 mt-2">${data.metrics.totalGross.toFixed(2)}</p>
                        </div>
                        <div className="bg-white rounded-xl shadow p-6 border-l-4 border-purple-500">
                            <p className="text-sm font-medium text-gray-500 uppercase">Tracked Itemized Revenue</p>
                            <p className="text-3xl font-bold text-purple-700 mt-2">${data.metrics.totalItemizedRevenue.toFixed(2)}</p>
                            <p className="text-xs text-gray-400 mt-1">
                                {data.metrics.totalGross > 0 
                                    ? Math.round((data.metrics.totalItemizedRevenue / data.metrics.totalGross) * 100) 
                                    : 0}% match rate
                            </p>
                        </div>
                        <div className="bg-white rounded-xl shadow p-6 border-l-4 border-orange-500">
                            <p className="text-sm font-medium text-gray-500 uppercase">Untracked/Bulk Revenue</p>
                            <p className="text-3xl font-bold text-orange-600 mt-2">${Math.max(0, data.metrics.unitemizedRevenue).toFixed(2)}</p>
                            <p className="text-xs text-gray-400 mt-1">Not explicitly assigned to a category.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Category Breakdown Table */}
                        <div className="bg-white rounded-xl shadow overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between">
                                <h3 className="text-lg font-bold text-gray-800">Revenue by Category</h3>
                            </div>
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-white">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Vol (Qty)</th>
                                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Revenue</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                    {data.categoryBreakdown.length === 0 ? (
                                        <tr><td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">No category data available.</td></tr>
                                    ) : data.categoryBreakdown.map((cat: any) => (
                                        <tr key={cat.category} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-l-4 border-l-transparent hover:border-l-blue-500">{cat.category}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{cat.quantity}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">${cat.revenue.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Top Sellers Table */}
                        <div className="bg-white rounded-xl shadow overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between">
                                <h3 className="text-lg font-bold text-gray-800">Top Selling Items</h3>
                            </div>
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-white">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Item Description</th>
                                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Qty Sold</th>
                                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Revenue</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                    {data.topSellers.length === 0 ? (
                                        <tr><td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">No item data available.</td></tr>
                                    ) : data.topSellers.map((item: any, i: number) => (
                                        <tr key={i} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                                {item.description}
                                                <span className="ml-2 bg-gray-100 text-gray-600 text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wide">{item.category}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{item.quantity}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-700 text-right">${item.revenue.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
