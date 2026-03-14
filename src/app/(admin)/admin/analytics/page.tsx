"use client"
import { useState, useEffect } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, ComposedChart } from 'recharts'
import { SkeletonCard, Skeleton } from "@/components/Skeleton"

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#a855f7', '#ef4444', '#f97316'];

export default function AnalyticsPage() {
    const [data, setData] = useState<any[]>([])
    const [storeData, setStoreData] = useState<any[]>([])
    const [costBreakdown, setCostBreakdown] = useState<any[]>([])
    const [funnelData, setFunnelData] = useState<any[]>([])
    const [summary, setSummary] = useState<any>(null)
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
                setData(d.chartData || [])
                setStoreData(d.storeData || [])
                setCostBreakdown(d.costBreakdown || [])
                setFunnelData(d.funnelData || [])
                setSummary(d.summary || null)
                setLoading(false)
            })
    }, [range, customStart, customEnd])

    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-800">Profitability Engine</h2>

                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                    {/* Quick Ranges */}
                    <select
                        value={range}
                        onChange={(e) => setRange(e.target.value)}
                        className="border border-gray-300 rounded px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white min-w-[140px]"
                    >
                        <option value="1d">1 Day (1D)</option>
                        <option value="3d">3 Days (3D)</option>
                        <option value="1w">1 Week (1W)</option>
                        <option value="15d">15 Days (15D)</option>
                        <option value="1m">1 Month (1M)</option>
                        <option value="3m">3 Months (3M)</option>
                        <option value="6m">6 Months (6M)</option>
                        <option value="1y">1 Year (1Y)</option>
                        <option value="2y">2 Years (2Y)</option>
                        <option value="custom">Custom Range</option>
                    </select>

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

            {summary && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
                        <h3 className="text-gray-500 font-medium text-sm">Gross Sales (Revenue)</h3>
                        <p className="text-2xl font-bold text-gray-900">${summary.totalSales.toFixed(2)}</p>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow border-l-4 border-red-400">
                        <h3 className="text-gray-500 font-medium text-sm">Petty Cash (Daily)</h3>
                        <p className="text-2xl font-bold text-red-600">-${summary.totalPettyCashExpenses.toFixed(2)}</p>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow border-l-4 border-orange-400">
                        <h3 className="text-gray-500 font-medium text-sm">Store Expenses (Admin)</h3>
                        <p className="text-2xl font-bold text-orange-600">-${summary.totalStoreExpenses.toFixed(2)}</p>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow border-l-4 border-indigo-500">
                        <h3 className="text-gray-500 font-medium text-sm">Gross Profit</h3>
                        <p className="text-2xl font-black text-indigo-700">${summary.grossProfit.toFixed(2)}</p>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow border-l-4 border-yellow-500">
                        <h3 className="text-gray-500 font-medium text-sm">Staff Payroll Paid</h3>
                        <p className="text-2xl font-bold text-yellow-600">-${summary.totalPayroll.toFixed(2)}</p>
                    </div>
                    <div className="bg-gray-900 p-6 rounded-lg shadow border-l-4 border-green-500">
                        <h3 className="text-gray-400 font-medium text-sm">Company Net Profit</h3>
                        <p className="text-3xl font-black text-green-400">${summary.netProfit.toFixed(2)}</p>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                    <SkeletonCard />
                    <SkeletonCard />
                </div>
            ) : data.length === 0 ? (
                <div className="p-12 text-center text-gray-500 bg-white shadow rounded-lg">No data available for the selected range.</div>
            ) : (
                <div className="flex flex-col gap-6">
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* 1. Top Performing Stores */}
                        <div className="bg-white p-6 rounded-lg shadow border">
                            <h3 className="text-lg font-bold text-gray-800 mb-6">Top Performing Stores</h3>
                            <div className="h-80 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={storeData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-30} textAnchor="end" height={60} />
                                        <YAxis />
                                        <Tooltip cursor={{fill: 'transparent'}} />
                                        <Legend verticalAlign="top" height={36} />
                                        <Bar dataKey="revenue" fill="#0088FE" name="Total Revenue" radius={[4, 4, 0, 0]}>
                                            {storeData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* 2. Cost Breakdown */}
                        <div className="bg-white p-6 rounded-lg shadow border">
                            <h3 className="text-lg font-bold text-gray-800 mb-6">Cost Breakdown</h3>
                            <div className="h-80 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={costBreakdown}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            fill="#8884d8"
                                            paddingAngle={5}
                                            dataKey="value"
                                            label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                        >
                                            {costBreakdown.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[(index + 1) % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* 3. Daily Petty Cash Tracker */}
                        <div className="bg-white p-6 rounded-lg shadow border">
                            <h3 className="text-lg font-bold text-gray-800 mb-6">Daily Petty Cash Outflow Tracker</h3>
                            <div className="h-80 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" />
                                        <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                                        <YAxis yAxisId="right" orientation="right" stroke="#ff7300" />
                                        <Tooltip />
                                        <Legend />
                                        <Bar yAxisId="left" dataKey="total" fill="#8884d8" name="Revenue" opacity={0.5} />
                                        <Line yAxisId="right" type="monotone" dataKey="pettyCash" stroke="#ff7300" name="Daily Petty Cash Used" strokeWidth={3} dot={{ r: 4 }} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* 4. Financial Funnel */}
                        <div className="bg-white p-6 rounded-lg shadow border">
                            <h3 className="text-lg font-bold text-gray-800 mb-6">Financial Funnel (Waterfall View)</h3>
                            <div className="h-80 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={funnelData} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" />
                                        <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 13 }} />
                                        <Tooltip />
                                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                            {funnelData.map((entry, index) => {
                                                const color = entry.value > 0 
                                                                ? (entry.name === 'Gross Sales' ? '#0088FE' : entry.name === 'Gross Profit' ? '#6366f1' : '#10b981') 
                                                                : '#ef4444';
                                                return <Cell key={`cell-${index}`} fill={color} />;
                                            })}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
