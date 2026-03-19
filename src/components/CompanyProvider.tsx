"use client"
import { createContext, useContext, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'

type CompanyContextType = {
    name: string | null
    logo_url: string | null
    primary_color: string | null
}

const CompanyContext = createContext<CompanyContextType>({ name: null, logo_url: null, primary_color: null })

export function CompanyProvider({ children }: { children: React.ReactNode }) {
    const { data: session } = useSession()
    const [company, setCompany] = useState<CompanyContextType>({ name: null, logo_url: null, primary_color: null })

    useEffect(() => {
        if (session?.user) {
            fetch('/api/user/company')
                .then(r => r.json())
                .then(c => {
                    if (c) {
                        setCompany(c)
                        if (c.primary_color) {
                            document.documentElement.style.setProperty('--brand-primary', c.primary_color)
                        }
                    }
                })
                .catch(() => {})
        }
    }, [session])

    return (
        <CompanyContext.Provider value={company}>
            {children}
        </CompanyContext.Provider>
    )
}

export const useCompany = () => useContext(CompanyContext)
