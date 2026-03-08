"use client"
import { useState } from 'react'
import ChangePasswordModal from './ChangePasswordModal'

export default function ChangePasswordWrapper() {
    const [isOpen, setIsOpen] = useState(false)
    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2 px-4 rounded-lg text-sm shadow-sm transition inline-flex items-center"
            >
                <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                Change Password
            </button>
            <ChangePasswordModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
        </>
    )
}
