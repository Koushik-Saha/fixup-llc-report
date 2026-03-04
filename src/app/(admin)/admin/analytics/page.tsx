"use client"
import { useState, useEffect } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts'
import { SkeletonCard, Skeleton } from "@/components/Skeleton"

export default function AnalyticsPage() {
    const [data, setData] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [range, setRange] = useState("1m")

    useEffect(() => {
        setLoading(true)
        fetch(`/api/admin/analytics?range=${range}`)
            .then(res => res.json())
            .then(d => {
                setData(d)
                setLoading(false)
            })
    }, [range])

    const totalSalesInRange = data.reduce((acc, curr) => acc + curr.total, 0)

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <h2 className="text-2xl font-bold text-gray-800">Sales Analytics</h2>
                <div className="flex space-x-2">
                    {['1m', '3m', '6m', '1y', '2y'].map(r => (
                        <button
                            key={r}
                            onClick={() => setRange(r)}
                            className={`px-4 py-2 rounded text-sm font-medium transition ${range === r ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border'}`}
                        >
                            {r.toUpperCase()}
                        </button>
                    ))}
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
