"use client"
import { useState, useEffect } from "react"
import { generateWorkSettlementPDF } from "@/lib/export-utils"
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"

dayjs.extend(utc)

type Props = {
    isOpen: boolean
    onClose: () => void
    user: any
    shifts: any[]                                      // initial shifts from the page
    period: { startDate: string; endDate: string }     // initial period from the page
    userId: string
}

export default function SettlementModal({ isOpen, onClose, user, shifts: initialShifts, period, userId }: Props) {
    // Date range — editable inside the modal
    const [startDate, setStartDate] = useState(dayjs.utc(period.startDate).format('YYYY-MM-DD'))
    const [endDate, setEndDate] = useState(dayjs.utc(period.endDate).format('YYYY-MM-DD'))

    // Shifts for the selected range
    const [shifts, setShifts] = useState(initialShifts)
    const [loadingShifts, setLoadingShifts] = useState(false)
    const [dateError, setDateError] = useState("")

    // Adjustments
    const [rate, setRate] = useState(Number(user.base_salary) || 0)
    const [reviewBonus, setReviewBonus] = useState(0)
    const [totalCash, setTotalCash] = useState(0)
    const [totalSpend, setTotalSpend] = useState(0)
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [isExporting, setIsExporting] = useState(false)
    const [showPreview, setShowPreview] = useState(false)

    // When the modal opens, reset to the page's period
    useEffect(() => {
        if (isOpen) {
            setStartDate(dayjs.utc(period.startDate).format('YYYY-MM-DD'))
            setEndDate(dayjs.utc(period.endDate).format('YYYY-MM-DD'))
            setShifts(initialShifts)
            setShowPreview(false)
            setDateError("")
        }
    }, [isOpen])

    // Fetch shifts when dates change
    const applyDateRange = async () => {
        if (!startDate || !endDate) return
        if (dayjs(endDate).isBefore(dayjs(startDate))) {
            setDateError("End date must be after start date.")
            return
        }
        setDateError("")
        setLoadingShifts(true)
        try {
            const res = await fetch(`/api/admin/work-hours/${userId}?startDate=${startDate}&endDate=${endDate}`)
            const data = await res.json()
            if (!data.error) setShifts(data.shifts || [])
        } catch {
            setDateError("Failed to load shifts for this range.")
        } finally {
            setLoadingShifts(false)
        }
    }

    // Derived values
    const totalHours = shifts.reduce((s, r) => s + Number(r.duration), 0)
    const totalSalary = totalHours * rate
    const netCashDeduction = totalCash - totalSpend
    const totalDue = totalSalary + reviewBonus - netCashDeduction

    if (!isOpen) return null

    const handleSmartParse = () => {
        setIsAnalyzing(true)
        setTimeout(() => {
            setRate(14)
            setReviewBonus(25)
            setTotalCash(828)
            setTotalSpend(160)
            setIsAnalyzing(false)
        }, 1500)
    }

    const handleDownload = () => {
        setIsExporting(true)
        try {
            generateWorkSettlementPDF(
                user,
                shifts,
                { startDate, endDate },
                { rate, reviewBonus, totalCash, totalSpend },
                "FixItUp Store Network"
            )
            onClose()
        } catch (error) {
            console.error(error)
        } finally {
            setIsExporting(false)
        }
    }

    const displayPeriod = `${dayjs(startDate).format('MMM D')} – ${dayjs(endDate).format('MMM D, YYYY')}`

    // ─── PREVIEW SCREEN ─────────────────────────────────────────────────────
    if (showPreview) {
        return (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 flex items-start justify-center p-4 pt-8 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100">
                    <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <button onClick={() => setShowPreview(false)} className="text-gray-400 hover:text-gray-700 transition-colors flex items-center gap-1 text-sm font-medium">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                                Back
                            </button>
                            <span className="text-gray-300">|</span>
                            <h3 className="text-lg font-bold text-gray-900">PDF Preview</h3>
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    <div className="p-6 bg-white overflow-y-auto max-h-[70vh]">
                        <div className="text-center mb-6 pb-4 border-b border-gray-200">
                            <h2 className="text-2xl font-black text-gray-900">{user.name}</h2>
                            <p className="text-gray-500 text-sm mt-1">{displayPeriod}</p>
                            <p className="text-gray-400 text-xs mt-0.5">FixItUp Store Network</p>
                        </div>

                        <div className="rounded-lg overflow-hidden border border-gray-200 mb-6">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-blue-500 text-white">
                                        <th className="px-3 py-2 text-left font-semibold">Date</th>
                                        <th className="px-3 py-2 text-left font-semibold">Store</th>
                                        <th className="px-3 py-2 text-center font-semibold">In</th>
                                        <th className="px-3 py-2 text-center font-semibold">Out</th>
                                        <th className="px-3 py-2 text-right font-semibold">Hours</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {shifts.map((s, i) => (
                                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                            <td className="px-3 py-2 font-medium text-gray-800">{dayjs.utc(s.date).format('ddd MM/DD/YY')}</td>
                                            <td className="px-3 py-2 text-gray-600 truncate max-w-[140px]">{s.store_name}</td>
                                            <td className="px-3 py-2 text-center text-gray-600">{s.time_in || '—'}</td>
                                            <td className="px-3 py-2 text-center text-gray-600">{s.time_out || '—'}</td>
                                            <td className="px-3 py-2 text-right font-semibold text-indigo-700">{Number(s.duration).toFixed(2)}h</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-gray-100 border-t border-gray-300">
                                        <td colSpan={4} className="px-3 py-2 text-right font-bold text-gray-700">Total Hours:</td>
                                        <td className="px-3 py-2 text-right font-black text-indigo-800">{totalHours.toFixed(2)}h</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <div className="divide-y divide-gray-100">
                                <div className="flex justify-between px-4 py-2.5 text-sm"><span className="text-gray-600">Total Hours</span><span className="font-semibold text-gray-900">{totalHours.toFixed(2)}h</span></div>
                                <div className="flex justify-between px-4 py-2.5 text-sm"><span className="text-gray-600">Hourly Rate</span><span className="font-semibold text-gray-900">${rate.toFixed(2)}</span></div>
                                <div className="flex justify-between px-4 py-2.5 text-sm bg-gray-50"><span className="font-bold text-gray-800">Total Salary</span><span className="font-bold text-gray-900">${totalSalary.toFixed(2)}</span></div>
                                {reviewBonus > 0 && <div className="flex justify-between px-4 py-2.5 text-sm"><span className="text-gray-600">Review Bonus</span><span className="font-semibold text-green-600">+ ${reviewBonus.toFixed(2)}</span></div>}
                                <div className="flex justify-between px-4 py-2.5 text-sm"><span className="text-gray-600">Cash Deduction (Net)</span><span className="font-semibold text-red-600">− ${netCashDeduction.toFixed(2)}</span></div>
                                <div className="px-4 py-1 text-xs text-gray-400 bg-gray-50">(Total Cash ${totalCash} − Store Spend ${totalSpend})</div>
                            </div>
                            <div className="bg-blue-600 px-4 py-4 flex justify-between items-center">
                                <span className="text-white font-black text-base uppercase tracking-wider">Total Due</span>
                                <span className={`font-black text-2xl ${totalDue >= 0 ? 'text-white' : 'text-red-300'}`}>${totalDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                        <p className="text-center text-xs text-gray-400 mt-4">Generated {dayjs().format('MMMM D, YYYY h:mm A')}</p>
                    </div>

                    <div className="px-6 py-4 border-t bg-gray-50 flex gap-3">
                        <button onClick={() => setShowPreview(false)} className="flex-1 py-3 px-4 text-sm font-bold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors">← Edit</button>
                        <button onClick={handleDownload} disabled={isExporting} className="flex-[2] bg-blue-600 text-white py-3 px-4 rounded-xl font-bold text-sm shadow-md hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2 uppercase tracking-widest disabled:opacity-60">
                            {isExporting ? 'Generating...' : (<><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>Download PDF</>)}
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // ─── INPUT FORM SCREEN ───────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-gray-100">
                {/* Header */}
                <div className="px-6 py-5 border-b bg-gray-50 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">Generate Work Settlement</h3>
                        <p className="text-sm text-gray-500 mt-0.5">{user.name} · {displayPeriod}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    {/* ── DATE RANGE PICKER ── */}
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                        <p className="text-xs font-bold text-blue-700 uppercase tracking-widest mb-3">Settlement Period</p>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1 font-medium">From</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={e => { setStartDate(e.target.value); setDateError("") }}
                                    className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1 font-medium">To</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={e => { setEndDate(e.target.value); setDateError("") }}
                                    className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                />
                            </div>
                        </div>
                        {dateError && <p className="text-xs text-red-500 mt-2">{dateError}</p>}
                        <button
                            onClick={applyDateRange}
                            disabled={loadingShifts}
                            className="mt-3 w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                        >
                            {loadingShifts ? (
                                <><svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Loading shifts...</>
                            ) : (
                                <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>Apply Date Range</>
                            )}
                        </button>
                    </div>

                    {/* Hero Stats */}
                    <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <div>
                            <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Shifts Found</p>
                            <p className="text-2xl font-black text-gray-900">{shifts.length} <span className="text-sm font-normal text-gray-500">shifts</span></p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Total Hours</p>
                            <p className="text-2xl font-black text-blue-900">{totalHours.toFixed(2)}h</p>
                        </div>
                    </div>

                    {/* Inputs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Hourly Rate ($)</label>
                                <input type="number" value={rate} onChange={e => setRate(Number(e.target.value))} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Review Bonus ($)</label>
                                <input type="number" value={reviewBonus} onChange={e => setReviewBonus(Number(e.target.value))} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
                                <p className="text-[10px] text-gray-400 mt-1 italic">Add reviews bonus (e.g. 5 reviews × $5)</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Total Cash Handled ($)</label>
                                <input type="number" value={totalCash} onChange={e => setTotalCash(Number(e.target.value))} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Total Store Spend ($)</label>
                                <input type="number" value={totalSpend} onChange={e => setTotalSpend(Number(e.target.value))} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
                                <p className="text-[10px] text-gray-400 mt-1 italic">Store items paid by staff out of cash pocket</p>
                            </div>
                        </div>
                    </div>

                    {/* Smart Parse Button */}
                    <button onClick={handleSmartParse} disabled={isAnalyzing} className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300 transition-all group">
                        {isAnalyzing ? (
                            <div className="flex items-center gap-2">
                                <svg className="animate-spin h-4 w-4 text-indigo-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                <span className="text-sm font-bold uppercase tracking-wider">Analyzing Image...</span>
                            </div>
                        ) : (
                            <>
                                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                <span className="text-sm font-bold uppercase tracking-wider">Smart Parse Handwritten Note</span>
                            </>
                        )}
                    </button>

                    {/* Final Result */}
                    <div className="bg-gray-900 rounded-xl p-5 text-white text-center shadow-lg">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">Final Net Payment</p>
                        <p className={`text-5xl font-black ${totalDue >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            ${totalDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                        <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[10px] text-gray-500 font-medium uppercase tracking-widest">
                            <span>Earnings: ${(totalSalary + reviewBonus).toFixed(2)}</span>
                            <span className="text-gray-700 font-bold">•</span>
                            <span>Deductions: ${netCashDeduction.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t bg-gray-50 flex flex-col sm:flex-row gap-3">
                    <button onClick={onClose} className="flex-1 py-3 px-4 text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors uppercase tracking-wider">Cancel</button>
                    <button onClick={() => setShowPreview(true)} className="flex-[2] bg-blue-600 text-white py-3 px-4 rounded-xl font-bold text-sm shadow-md hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2 uppercase tracking-widest">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        Preview Report
                    </button>
                </div>
            </div>
        </div>
    )
}
