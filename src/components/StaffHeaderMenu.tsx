"use client"
import { useState, useRef, useEffect } from 'react'
import { signOut, useSession } from 'next-auth/react'
import ChangePasswordModal from '@/components/ChangePasswordModal'

export default function StaffHeaderMenu() {
    const { data: session } = useSession()
    const [isOpen, setIsOpen] = useState(false)
    const [isPasswordModalOpen, setPasswordModalOpen] = useState(false)
    const [storeName, setStoreName] = useState<string>('Loading store...')
    const [assignedStores, setAssignedStores] = useState<{id: string, name: string}[]>([])
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    useEffect(() => {
        if (isOpen && storeName === 'Loading store...') {
            fetch('/api/staff/dashboard')
                .then(r => r.json())
                .then(d => {
                    if (d.storeName) setStoreName(d.storeName)
                    else setStoreName('Unassigned')
                    
                    if (d.assignedStores) setAssignedStores(d.assignedStores)
                })
                .catch(() => setStoreName('Unavailable'))
        }
    }, [isOpen, storeName])

    const switchStore = (storeId: string) => {
        document.cookie = `activeStoreId=${storeId}; path=/; max-age=31536000` // 1 year expiry
        window.location.reload()
    }

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 py-1.5 px-3 rounded-full transition"
            >
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold uppercase shrink-0">
                    {session?.user?.name?.charAt(0) || 'U'}
                </div>
                <span className="text-sm font-medium text-gray-700 hidden sm:block">
                    {session?.user?.name || 'Staff User'}
                </span>
                <svg className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50">
                    <div className="p-4 border-b border-gray-100 bg-gray-50">
                        <p className="text-sm font-bold text-gray-900 truncate">{session?.user?.name}</p>
                        <p className="text-xs text-gray-500 truncate">{session?.user?.email}</p>
                    </div>
                    
                    <div className="p-3 border-b border-gray-100">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Assigned Stores</p>
                        {assignedStores.length <= 1 ? (
                            <p className="text-sm font-medium text-gray-800">{storeName}</p>
                        ) : (
                            <div className="space-y-1">
                                {assignedStores.map(store => (
                                    <button 
                                        key={store.id} 
                                        onClick={() => switchStore(store.id)}
                                        className={`w-full text-left px-2 py-1.5 text-sm rounded-lg transition-colors flex items-center justify-between ${store.name === storeName ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-700 hover:bg-gray-100 font-medium'}`}
                                    >
                                        <span className="truncate">{store.name}</span>
                                        {store.name === storeName && <svg className="w-4 h-4 text-indigo-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    <div className="p-2">
                        <button
                            onClick={() => {
                                setIsOpen(false)
                                setPasswordModalOpen(true)
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 rounded-md transition flex items-center gap-2 font-medium"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                            Change Password
                        </button>
                        <button
                            onClick={() => signOut()}
                            className="w-full text-left px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 rounded-md transition flex items-center gap-2 font-medium mt-1"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                            Logout
                        </button>
                    </div>
                </div>
            )}

            <ChangePasswordModal isOpen={isPasswordModalOpen} onClose={() => setPasswordModalOpen(false)} />
        </div>
    )
}
