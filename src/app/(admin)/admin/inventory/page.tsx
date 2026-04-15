"use client"
import { useState, useEffect, useRef } from "react"
import toast from "react-hot-toast"
import { Pagination } from "@/components/Pagination"

// Icons
const ArchiveIcon = ({ className }: { className?: string }) => <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-6 h-6 ${className || ''}`}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>
const EditIcon = ({ className }: { className?: string }) => <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-4 h-4 ${className || ''}`}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
const TrashIcon = ({ className }: { className?: string }) => <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-4 h-4 ${className || ''}`}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
const SearchIcon = ({ className }: { className?: string }) => <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-4 h-4 inline ${className || ''}`}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
const CheckIcon = ({ className }: { className?: string }) => <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-4 h-4 ${className || ''}`}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
const PlusIcon = ({ className }: { className?: string }) => <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-4 h-4 ${className || ''}`}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
const AlertIcon = ({ className }: { className?: string }) => <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-4 h-4 ${className || ''}`}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
const UploadIcon = ({ className }: { className?: string }) => <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-4 h-4 ${className || ''}`}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>

// Excel column maps for known inventory sheet formats
const PART_COLS: Record<string, string[]> = {
    'iPhone':            ['LCD/AM/QV7', 'OLD/Good/QV8', 'Battery ', 'Proxcimity SC', 'Charging Port ', 'Speaker'],
    'iPad':              ['LCD/AM/QV7', 'OLD/Good/QV8', 'Battery ', 'Proxcimity SC', 'Charging Port ', 'Speaker'],
    'Samsung':           ['LCD/AM/QV7', 'OLD/Good/QV8', 'Battery ', 'Proxcimity SC', 'Charging Port ', 'Speaker'],
    'All Other Andriod': ['Screen/AM', 'Screen/original', 'Battery', 'Chaging Port'],
}

function parseWorkbook(wb: any) {
    const items: { name: string; category: string; quantity: number; sku: string }[] = []
    const XLSX = (window as any).XLSX

    for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName]
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 })
        if (!rows.length) continue

        const headers: string[] = rows[0].map((h: any) => (h ? String(h).trim() : ''))
        const cols = PART_COLS[sheetName] || []

        if (cols.length === 0) {
            // Generic mode: use all non-Model columns that have numeric values
            for (const row of rows.slice(1)) {
                const model = row[0]
                if (!model || String(model).trim() === '') continue
                const modelName = String(model).trim()
                for (let i = 1; i < headers.length; i++) {
                    const colName = headers[i]
                    if (!colName) continue
                    const val = row[i]
                    if (val === null || val === undefined) continue
                    const qty = parseInt(String(val))
                    if (isNaN(qty) || qty <= 0) continue
                    items.push({
                        name: `${modelName} - ${colName}`,
                        category: sheetName.trim(),
                        quantity: qty,
                        sku: `${sheetName.replace(/\s/g, '').toUpperCase()}-${modelName.replace(/\s/g, '-').toUpperCase()}-${colName.replace(/[\s/]+/g, '-').toUpperCase()}`.substring(0, 100),
                    })
                }
                continue
            }
            continue
        }

        // Map known column names → indices
        const colIndices: Record<string, number> = {}
        for (const col of cols) {
            const idx = headers.findIndex(h => h.trim() === col.trim())
            if (idx >= 0) colIndices[col] = idx
        }

        for (const row of rows.slice(1)) {
            const model = row[0]
            if (!model || String(model).trim() === '' || String(model).toUpperCase().trim() === 'MODEL NAME') continue
            const modelName = String(model).trim()

            for (const [colName, idx] of Object.entries(colIndices)) {
                const val = idx < row.length ? row[idx] : null
                if (val === null || val === undefined || String(val).trim() === '') continue
                const qty = parseInt(String(val))
                if (isNaN(qty) || qty <= 0) continue

                const colClean = colName.trim()
                items.push({
                    name: `${modelName} - ${colClean}`,
                    category: sheetName.trim(),
                    quantity: qty,
                    sku: `${sheetName.replace(/\s/g, '').toUpperCase()}-${modelName.replace(/\s/g, '-').toUpperCase()}-${colClean.replace(/[\s/]+/g, '-').toUpperCase()}`.substring(0, 100),
                })
            }
        }
    }
    return items
}

export default function AdminInventoryPage() {
    const [inventory, setInventory] = useState<any[]>([])
    const [stores, setStores] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    // Filters
    const [selectedStore, setSelectedStore] = useState("")
    const [searchQuery, setSearchQuery] = useState("")
    const [categoryFilter, setCategoryFilter] = useState("")

    // Pagination
    const [page, setPage] = useState(1)
    const [limit, setLimit] = useState(25)

    // Create Modal
    const [showAddModal, setShowAddModal] = useState(false)
    const [newItem, setNewItem] = useState({ name: '', sku: '', category: 'Parts', quantity: 0, unit_cost: 0, reorder_level: 5, store_id: '' })

    // Edit
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editForm, setEditForm] = useState<any>({})

    // Import
    const [isImporting, setIsImporting] = useState(false)
    const [importPreview, setImportPreview] = useState<{ items: any[]; store_id: string } | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const fetchData = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (selectedStore) params.append("store_id", selectedStore)
            const [invRes, storesRes] = await Promise.all([
                fetch(`/api/admin/inventory?${params.toString()}`).then(r => r.json()),
                fetch('/api/admin/stores?status=Active').then(r => r.json())
            ])
            if (invRes.success) setInventory(invRes.data)
            if (Array.isArray(storesRes)) setStores(storesRes)
        } catch {
            toast.error("Failed to load inventory")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchData() }, [selectedStore])

    // Load SheetJS from CDN on mount
    useEffect(() => {
        if ((window as any).XLSX) return
        const script = document.createElement('script')
        script.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js'
        script.async = true
        document.head.appendChild(script)
    }, [])

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!e.target.files) return
        e.target.value = ''
        if (!file) return

        if (!selectedStore) {
            toast.error('Please select a store first before importing.')
            return
        }

        const XLSX = (window as any).XLSX
        if (!XLSX) {
            toast.error('Excel parser is still loading, please try again in a moment.')
            return
        }

        setIsImporting(true)
        try {
            const buffer = await file.arrayBuffer()
            const wb = XLSX.read(buffer, { type: 'array' })
            const parsed = parseWorkbook(wb)

            if (parsed.length === 0) {
                toast.error('No inventory items with quantities found in the file.')
                setIsImporting(false)
                return
            }

            setImportPreview({ items: parsed, store_id: selectedStore })
        } catch (err) {
            toast.error('Failed to parse Excel file.')
            console.error(err)
        } finally {
            setIsImporting(false)
        }
    }

    const confirmImport = async () => {
        if (!importPreview) return
        setIsImporting(true)
        try {
            const res = await fetch('/api/admin/inventory/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(importPreview)
            })
            const data = await res.json()
            if (data.success) {
                toast.success(`✅ ${data.message}`)
                setImportPreview(null)
                fetchData()
            } else {
                toast.error(data.error || 'Import failed')
            }
        } catch {
            toast.error('Network error during import')
        } finally {
            setIsImporting(false)
        }
    }

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const res = await fetch('/api/admin/inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newItem)
            })
            const data = await res.json()
            if (data.success) {
                toast.success('Inventory item added!')
                setShowAddModal(false)
                setNewItem({ name: '', sku: '', category: 'Parts', quantity: 0, unit_cost: 0, reorder_level: 5, store_id: newItem.store_id || '' })
                fetchData()
            } else {
                toast.error(data.error || 'Failed to add item')
            }
        } catch { toast.error('Network error') }
    }

    const startEdit = (item: any) => {
        setEditingId(item.id)
        setEditForm({ name: item.name, sku: item.sku || '', category: item.category, quantity: item.quantity, unit_cost: item.unit_cost, reorder_level: item.reorder_level })
    }
    const cancelEdit = () => { setEditingId(null); setEditForm({}) }
    const saveEdit = async (id: string) => {
        try {
            const res = await fetch(`/api/admin/inventory/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm)
            })
            const data = await res.json()
            if (data.success) { toast.success("Item updated!"); setEditingId(null); fetchData() }
            else toast.error(data.error || "Update failed")
        } catch { toast.error("Network error") }
    }
    const deleteItem = async (id: string) => {
        if (!confirm("Are you sure you want to delete this item?")) return
        try {
            const res = await fetch(`/api/admin/inventory/${id}`, { method: 'DELETE' })
            if (res.ok) { toast.success("Item deleted"); fetchData() }
            else toast.error("Failed to delete item")
        } catch { toast.error("Network error") }
    }

    // Derived
    const categories = [...new Set(inventory.map(i => i.category))].sort()
    const filteredInventory = inventory.filter(item => {
        const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase()))
        const matchCategory = !categoryFilter || item.category === categoryFilter
        return matchSearch && matchCategory
    })
    const totalPages = Math.ceil(filteredInventory.length / limit)
    const paged = filteredInventory.slice((page - 1) * limit, page * limit)
    const storeName = stores.find(s => s.id === importPreview?.store_id)?.name || ''

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <ArchiveIcon className="text-indigo-600" />
                        Inventory Control
                    </h1>
                    <p className="text-slate-500 mt-1">Manage parts, track stock levels, and set reorder alerts.</p>
                </div>
                <div className="flex items-center gap-2">
                    {/* Hidden file input */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        className="hidden"
                        onChange={handleFileChange}
                    />
                    <button
                        onClick={() => {
                            if (!selectedStore) { toast.error('Select a store first'); return }
                            fileInputRef.current?.click()
                        }}
                        disabled={isImporting}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-sm transition-all active:scale-95 whitespace-nowrap disabled:opacity-60"
                    >
                        {isImporting ? (
                            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                        ) : <UploadIcon />}
                        {isImporting ? 'Reading file...' : 'Import from Excel (.xlsx)'}
                    </button>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-sm shadow-indigo-200 transition-all active:scale-95 whitespace-nowrap"
                    >
                        <PlusIcon className="w-5 h-5" /> Add Item
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-wrap gap-4 items-center">
                <div className="relative flex-1 min-w-[200px]">
                    <SearchIcon className="absolute left-3 top-3 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search parts, name, SKU..."
                        value={searchQuery}
                        onChange={e => { setSearchQuery(e.target.value); setPage(1) }}
                        className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Category</span>
                    <select
                        value={categoryFilter}
                        onChange={e => { setCategoryFilter(e.target.value); setPage(1) }}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="">All Categories</option>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Store</span>
                    <select
                        value={selectedStore}
                        onChange={e => { setSelectedStore(e.target.value); setPage(1) }}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 min-w-[200px]"
                    >
                        <option value="">All Stores</option>
                        {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
            </div>

            {/* Stats Bar */}
            {!loading && inventory.length > 0 && (
                <div className="flex gap-4 flex-wrap">
                    <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center gap-3">
                        <span className="text-2xl font-black text-indigo-700">{filteredInventory.length}</span>
                        <span className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Items{categoryFilter ? ` in ${categoryFilter}` : ''}</span>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center gap-3">
                        <span className="text-2xl font-black text-emerald-700">{filteredInventory.reduce((s, i) => s + i.quantity, 0)}</span>
                        <span className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Total Units</span>
                    </div>
                    <div className="bg-white rounded-xl border border-rose-200 px-4 py-3 flex items-center gap-3">
                        <span className="text-2xl font-black text-rose-600">{filteredInventory.filter(i => i.quantity <= i.reorder_level).length}</span>
                        <span className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Low Stock</span>
                    </div>
                </div>
            )}

            {/* Main Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider text-xs font-bold">
                            <tr>
                                <th className="p-4 pl-6">Item Name & SKU</th>
                                <th className="p-4">Category</th>
                                <th className="p-4">Store</th>
                                <th className="p-4 text-center">In Stock</th>
                                <th className="p-4">Reorder At</th>
                                <th className="p-4">Unit Cost</th>
                                <th className="p-4 pr-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={7} className="p-10 text-center text-slate-400 font-medium">Loading inventory data...</td></tr>
                            ) : paged.length === 0 ? (
                                <tr><td colSpan={7} className="p-10 text-center text-slate-500 italic">
                                    {inventory.length === 0
                                        ? 'No inventory items found. Select a store and click "Import from Excel" to get started.'
                                        : 'No items match your search.'}
                                </td></tr>
                            ) : paged.map(item => {
                                const isLowStock = item.quantity <= item.reorder_level
                                const isEditing = editingId === item.id
                                return (
                                    <tr key={item.id} className={`hover:bg-slate-50/50 transition-colors ${isLowStock ? 'bg-rose-50/30' : ''}`}>
                                        <td className="p-4 pl-6">
                                            {isEditing ? (
                                                <div className="space-y-2">
                                                    <input type="text" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="w-full border border-slate-300 rounded-lg p-2 text-sm" placeholder="Item Name" />
                                                    <input type="text" value={editForm.sku} onChange={e => setEditForm({ ...editForm, sku: e.target.value })} className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-500 font-mono" placeholder="SKU" />
                                                </div>
                                            ) : (
                                                <div>
                                                    <p className="font-bold text-slate-800 text-[15px]">{item.name}</p>
                                                    <p className="text-xs text-slate-500 font-mono mt-0.5">{item.sku || 'No SKU'}</p>
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <span className="text-xs font-semibold bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg">{item.category}</span>
                                        </td>
                                        <td className="p-4 font-medium text-slate-600">{item.store.name}</td>
                                        <td className="p-4 text-center">
                                            {isEditing ? (
                                                <input type="number" value={editForm.quantity} onChange={e => setEditForm({ ...editForm, quantity: e.target.value })} className="w-20 text-center border border-slate-300 rounded-lg p-2 text-sm mx-auto block" />
                                            ) : (
                                                <div className="flex flex-col items-center">
                                                    <span className={`inline-flex items-center justify-center min-w-[3rem] px-3 py-1.5 rounded-xl font-black text-lg ${isLowStock ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'}`}>{item.quantity}</span>
                                                    {isLowStock && <p className="text-[10px] uppercase font-bold text-rose-600 mt-1 flex items-center gap-1"><AlertIcon className="w-3 h-3" /> Low</p>}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            {isEditing ? (
                                                <input type="number" value={editForm.reorder_level} onChange={e => setEditForm({ ...editForm, reorder_level: e.target.value })} className="w-20 border border-slate-300 rounded-lg p-2 text-sm" />
                                            ) : (
                                                <span className="text-slate-500 font-medium bg-slate-100 px-2 py-1 rounded-lg text-xs">At {item.reorder_level}</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-slate-700 font-medium">
                                            {isEditing ? (
                                                <div className="relative">
                                                    <span className="absolute left-3 top-2 text-slate-400">$</span>
                                                    <input type="number" step="0.01" value={editForm.unit_cost} onChange={e => setEditForm({ ...editForm, unit_cost: e.target.value })} className="w-24 pl-7 pr-3 border border-slate-300 rounded-lg p-2 text-sm" />
                                                </div>
                                            ) : `$${Number(item.unit_cost).toFixed(2)}`}
                                        </td>
                                        <td className="p-4 pr-6 text-right">
                                            {isEditing ? (
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => saveEdit(item.id)} className="text-emerald-600 hover:text-emerald-700 p-2.5 bg-emerald-50 rounded-xl"><CheckIcon className="w-5 h-5 text-emerald-600" /></button>
                                                    <button onClick={cancelEdit} className="text-slate-500 hover:text-slate-700 p-2.5 bg-slate-100 rounded-xl text-xs font-bold px-4">Cancel</button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => startEdit(item)} className="text-blue-600 hover:text-blue-800 p-2.5 rounded-xl hover:bg-blue-50 transition-colors"><EditIcon className="w-4 h-4" /></button>
                                                    <button onClick={() => deleteItem(item.id)} className="text-rose-500 hover:text-rose-700 p-2.5 rounded-xl hover:bg-rose-50 transition-colors"><TrashIcon className="w-4 h-4" /></button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
                {/* Pagination */}
                {filteredInventory.length > 0 && (
                    <Pagination
                        currentPage={page}
                        totalPages={totalPages}
                        totalItems={filteredInventory.length}
                        onPageChange={p => setPage(p)}
                        label="parts"
                        limit={limit}
                        onLimitChange={v => { setLimit(v); setPage(1) }}
                    />
                )}
            </div>

            {/* Import Preview Modal */}
            {importPreview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="bg-emerald-50 border-b border-emerald-100 p-5 px-6 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">Confirm Import</h2>
                                <p className="text-sm text-slate-500 mt-0.5">Review before importing into <span className="font-semibold text-emerald-700">{storeName}</span></p>
                            </div>
                            <button onClick={() => setImportPreview(null)} className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-200 rounded-full">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            {/* Summary */}
                            <div className="grid grid-cols-3 gap-3">
                                {[...new Set(importPreview.items.map(i => i.category))].map(cat => (
                                    <div key={cat} className="bg-slate-50 rounded-xl p-3 text-center border border-slate-200">
                                        <p className="text-xl font-black text-indigo-700">{importPreview.items.filter(i => i.category === cat).length}</p>
                                        <p className="text-xs text-slate-500 font-semibold mt-0.5">{cat}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                                ⚠️ This will <strong>replace</strong> all existing inventory for <strong>{storeName}</strong> with <strong>{importPreview.items.length} items</strong> from the file.
                            </div>

                            {/* Preview table */}
                            <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200">
                                <table className="w-full text-xs">
                                    <thead className="bg-slate-50 sticky top-0">
                                        <tr>
                                            <th className="px-3 py-2 text-left font-bold text-slate-600">Item</th>
                                            <th className="px-3 py-2 text-left font-bold text-slate-600">Category</th>
                                            <th className="px-3 py-2 text-right font-bold text-slate-600">Qty</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {importPreview.items.slice(0, 20).map((item, i) => (
                                            <tr key={i} className="hover:bg-slate-50">
                                                <td className="px-3 py-1.5 text-slate-700">{item.name}</td>
                                                <td className="px-3 py-1.5 text-slate-500">{item.category}</td>
                                                <td className="px-3 py-1.5 text-right font-bold text-indigo-700">{item.quantity}</td>
                                            </tr>
                                        ))}
                                        {importPreview.items.length > 20 && (
                                            <tr><td colSpan={3} className="px-3 py-2 text-center text-slate-400 italic">...and {importPreview.items.length - 20} more items</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t bg-slate-50 flex gap-3">
                            <button onClick={() => setImportPreview(null)} className="flex-1 py-3 font-bold text-slate-600 hover:text-slate-900 transition-colors rounded-xl hover:bg-slate-100">Cancel</button>
                            <button onClick={confirmImport} disabled={isImporting} className="flex-[2] py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60">
                                {isImporting ? <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> : null}
                                {isImporting ? 'Importing...' : `Import ${importPreview.items.length} Items`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Item Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="bg-slate-50 border-b border-slate-100 p-5 px-6 flex justify-between items-center">
                            <h2 className="text-xl font-bold tracking-tight text-slate-900">Add New Inventory</h2>
                            <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-200 rounded-full transition-colors">
                                <PlusIcon className="w-5 h-5 rotate-45" />
                            </button>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-5">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Target Store</label>
                                <select required value={newItem.store_id} onChange={e => setNewItem({ ...newItem, store_id: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none">
                                    <option value="" disabled>Select a store...</option>
                                    {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-1 col-span-2 md:col-span-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Item Name</label>
                                    <input required type="text" placeholder="e.g. iPhone 13 Screen" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>
                                <div className="space-y-1 col-span-2 md:col-span-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">SKU / Barcode</label>
                                    <input type="text" placeholder="Optional" value={newItem.sku} onChange={e => setNewItem({ ...newItem, sku: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-5">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Starting Qty</label>
                                    <input required type="number" value={newItem.quantity} onChange={e => setNewItem({ ...newItem, quantity: Number(e.target.value) })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-center font-bold text-indigo-700" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Unit Cost ($)</label>
                                    <input required type="number" step="0.01" value={newItem.unit_cost} onChange={e => setNewItem({ ...newItem, unit_cost: Number(e.target.value) })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Alert Level</label>
                                    <input required type="number" min="0" value={newItem.reorder_level} onChange={e => setNewItem({ ...newItem, reorder_level: Number(e.target.value) })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>
                            </div>
                            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                                <button type="button" onClick={() => setShowAddModal(false)} className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors">Cancel</button>
                                <button type="submit" className="px-6 py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition-all active:scale-95">Save Item</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
