"use client"
import { useState, useEffect } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts'
import { SkeletonCard, Skeleton } from "@/components/Skeleton"

export default function AnalyticsPage() {
    const [data, setData] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [range, setRange] = useState("1m")
    const [customStart, setCustomStart] = useState("")
    const [customEnd, setCustomEnd] = useState("")

    useEffect(() => {
        setLoading(true)
        let url = `/api/admin/analytics?range=${range}`
        if (range === 'custom') {
            if (customStart && customEnd) {
                url += `&startDate=${customStart}&endDate=${customEnd}`
            } else {
                setLoading(false)
                return // Wait for both dates
            }
        }

        fetch(url)
            .then(res => res.json())
            .then(d => {
                setData(d)
                setLoading(false)
            })
    }, [range, customStart, customEnd])

    const totalSalesInRange = data.reduce((acc, curr) => acc + curr.total, 0)

    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-800">Sales Analytics</h2>

                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                    {/* Quick Ranges */}
                    <div className="flex flex-wrap gap-2">
                        {['1d', '3d', '1w', '15d', '1m', '3m', '6m', '1y', '2y', 'custom'].map(r => (
                            <button
                                key={r}
                                onClick={() => setRange(r)}
                                className={`px-3 py-1.5 rounded text-sm font-medium transition ${range === r ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border'}`}
                            >
                                {r.toUpperCase()}
                            </button>
                        ))}
                    </div>

                    {/* Custom Date Picker */}
                    {range === 'custom' && (
                        <div className="flex space-x-2 items-center">
                            <input
                                type="date"
                                className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-blue-500 focus:border-blue-500"
                                value={customStart}
                                onChange={(e) => setCustomStart(e.target.value)}
                            />
                            <span className="text-gray-500 text-sm">to</span>
                            <input
                                type="date"
                                className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-blue-500 focus:border-blue-500"
                                value={customEnd}
                                onChange={(e) => setCustomEnd(e.target.value)}
                            />
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border-l-4 border-indigo-500">
                <h3 className="text-gray-500 font-medium">Total Revenue in Selected Range</h3>
                <p className="text-3xl font-black text-indigo-700">${totalSalesInRange.toFixed(2)}</p>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                    <SkeletonCard />
                    <SkeletonCard />
                </div>
            ) : data.length === 0 ? (
                <div className="p-12 text-center text-gray-500 bg-white shadow rounded-lg">No data available for the selected range.</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-lg shadow border">
                        <h3 className="text-lg font-bold text-gray-800 mb-6">Revenue Trend (Total)</h3>
                        <div className="h-80 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Line type="monotone" dataKey="total" stroke="#4f46e5" activeDot={{ r: 8 }} name="Total Revenue" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow border">
                        <h3 className="text-lg font-bold text-gray-800 mb-6">Cash vs Card Breakdown</h3>
                        <div className="h-80 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="cash" fill="#16a34a" name="Cash" stackId="a" />
                                    <Bar dataKey="card" fill="#2563eb" name="Card" stackId="a" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
