"use client"
import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import toast from "react-hot-toast"
import Image from "next/image"

type SetupData = {
    qrCode: string
    secret: string
    backupCodes: string[]
    manualEntry: { account: string; issuer: string; secret: string }
}

type Step = 'status' | 'setup' | 'verify' | 'backup' | 'done' | 'disable'

export default function SecuritySettingsPage() {
    const { data: session, update } = useSession()
    const [step, setStep] = useState<Step>('status')
    const [setupData, setSetupData] = useState<SetupData | null>(null)
    const [totpCode, setTotpCode] = useState('')
    const [disableCode, setDisableCode] = useState('')
    const [loading, setLoading] = useState(false)
    const [is2FAEnabled, setIs2FAEnabled] = useState(false)
    const [showManual, setShowManual] = useState(false)

    useEffect(() => {
        // Fetch current 2FA status from session
        fetch('/api/auth/session')
            .then(r => r.json())
            .then(d => setIs2FAEnabled(d?.user?.two_factor_enabled || false))
    }, [])

    const startSetup = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/auth/2fa/setup', { method: 'POST' })
            const data = await res.json()
            if (!res.ok) { toast.error(data.error); return }
            setSetupData(data)
            setStep('setup')
        } finally {
            setLoading(false)
        }
    }

    const verifyAndEnable = async () => {
        if (!setupData || totpCode.length !== 6) { toast.error('Enter a 6-digit code'); return }
        setLoading(true)
        try {
            const res = await fetch('/api/auth/2fa/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: totpCode, backupCodes: setupData.backupCodes, action: 'enable' })
            })
            const data = await res.json()
            if (!res.ok) { toast.error(data.error); return }
            setIs2FAEnabled(true)
            setStep('backup')
            toast.success('2FA enabled!')
        } finally {
            setLoading(false)
            setTotpCode('')
        }
    }

    const disable2FA = async () => {
        if (disableCode.length !== 6) { toast.error('Enter your authenticator code'); return }
        setLoading(true)
        try {
            const res = await fetch('/api/auth/2fa/disable', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: disableCode })
            })
            const data = await res.json()
            if (!res.ok) { toast.error(data.error); return }
            setIs2FAEnabled(false)
            setSetupData(null)
            setStep('status')
            setDisableCode('')
            toast.success('2FA disabled.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">🔐 Security Settings</h1>
                <p className="text-sm text-gray-400 mt-0.5">Manage two-factor authentication for your account</p>
            </div>

            {/* Status Card */}
            <div className={`rounded-2xl border-2 p-6 ${is2FAEnabled ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${is2FAEnabled ? 'bg-green-100' : 'bg-gray-200'}`}>
                            {is2FAEnabled ? '🔐' : '🔓'}
                        </div>
                        <div>
                            <p className="font-bold text-gray-900 text-lg">Two-Factor Authentication</p>
                            <p className={`text-sm font-semibold mt-0.5 ${is2FAEnabled ? 'text-green-700' : 'text-gray-400'}`}>
                                {is2FAEnabled ? '✓ Enabled — your account is protected' : 'Not enabled'}
                            </p>
                        </div>
                    </div>
                    {is2FAEnabled ? (
                        <button onClick={() => setStep('disable')}
                            className="text-sm font-semibold text-red-600 hover:text-red-700 border border-red-200 bg-white px-4 py-2 rounded-xl transition">
                            Disable 2FA
                        </button>
                    ) : step === 'status' ? (
                        <button onClick={startSetup} disabled={loading}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-xl text-sm transition disabled:opacity-50">
                            {loading ? 'Generating...' : 'Enable 2FA'}
                        </button>
                    ) : null}
                </div>
            </div>

            {/* Step: QR Code scan */}
            {step === 'setup' && setupData && (
                <div className="bg-white rounded-2xl shadow p-6 space-y-5">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Step 1: Scan QR Code</h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Open <strong>Google Authenticator</strong>, <strong>Authy</strong>, or any TOTP app and scan this code.
                        </p>
                    </div>

                    <div className="flex flex-col items-center gap-4">
                        <div className="bg-white border-4 border-indigo-100 rounded-2xl p-3">
                            <img src={setupData.qrCode} alt="QR Code" className="w-48 h-48" />
                        </div>
                        <button onClick={() => setShowManual(!showManual)} className="text-xs text-indigo-600 hover:underline font-medium">
                            Can't scan? Enter manually
                        </button>
                        {showManual && (
                            <div className="bg-gray-50 rounded-xl p-4 w-full text-sm space-y-1">
                                <p><span className="font-semibold text-gray-600">Account:</span> {setupData.manualEntry.account}</p>
                                <p><span className="font-semibold text-gray-600">Issuer:</span> {setupData.manualEntry.issuer}</p>
                                <div className="flex items-center gap-2 mt-2">
                                    <code className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 font-mono text-xs tracking-widest break-all">{setupData.manualEntry.secret}</code>
                                    <button onClick={() => { navigator.clipboard.writeText(setupData.manualEntry.secret); toast.success('Copied!') }}
                                        className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-lg font-semibold">Copy</button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Step 2: Enter the 6-digit code</h2>
                        <p className="text-sm text-gray-500 mt-1">Enter the code shown in your authenticator app to confirm setup.</p>
                        <div className="flex gap-3 mt-3">
                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                placeholder="000000"
                                value={totpCode}
                                onChange={e => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-center text-2xl font-mono tracking-widest focus:ring-indigo-500 focus:border-indigo-500"
                            />
                            <button onClick={verifyAndEnable} disabled={loading || totpCode.length !== 6}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-xl transition disabled:opacity-50">
                                {loading ? '...' : 'Verify & Enable'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Step: Backup Codes */}
            {step === 'backup' && setupData && (
                <div className="bg-white rounded-2xl shadow p-6 space-y-5">
                    <div className="flex items-start gap-4">
                        <div className="text-3xl">🗝️</div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Save Your Backup Codes</h2>
                            <p className="text-sm text-gray-500 mt-1">
                                Store these codes somewhere safe. Each can be used <strong>once</strong> to access your account if you lose your authenticator.
                            </p>
                        </div>
                    </div>

                    <div className="bg-gray-900 rounded-xl p-5 grid grid-cols-2 gap-2">
                        {setupData.backupCodes.map((code, i) => (
                            <code key={i} className="text-green-400 font-mono text-sm tracking-widest">{code}</code>
                        ))}
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => {
                                const text = setupData.backupCodes.join('\n')
                                navigator.clipboard.writeText(text)
                                toast.success('Codes copied!')
                            }}
                            className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-50 transition">
                            📋 Copy All
                        </button>
                        <button onClick={() => { setStep('done'); setIs2FAEnabled(true) }}
                            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-sm transition">
                            I've saved them ✓
                        </button>
                    </div>

                    <p className="text-xs text-red-500 font-medium">⚠️ These codes will not be shown again. Save them now.</p>
                </div>
            )}

            {/* Done */}
            {step === 'done' && (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
                    <div className="text-4xl mb-2">🎉</div>
                    <h2 className="text-lg font-bold text-green-800">2FA is active!</h2>
                    <p className="text-sm text-green-600 mt-1">Your account is now protected with two-factor authentication.</p>
                </div>
            )}

            {/* Disable step */}
            {step === 'disable' && (
                <div className="bg-white rounded-2xl shadow p-6 space-y-4">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Disable Two-Factor Authentication</h2>
                        <p className="text-sm text-gray-500 mt-1">Enter the current code from your authenticator app to confirm.</p>
                    </div>
                    <div className="flex gap-3">
                        <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="000000"
                            value={disableCode}
                            onChange={e => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-center text-2xl font-mono tracking-widest focus:ring-red-500 focus:border-red-500"
                        />
                        <button onClick={disable2FA} disabled={loading || disableCode.length !== 6}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3 rounded-xl transition disabled:opacity-50">
                            {loading ? '...' : 'Disable'}
                        </button>
                    </div>
                    <button onClick={() => setStep('status')} className="text-sm text-gray-400 hover:text-gray-600">← Cancel</button>
                </div>
            )}

            {/* Info box */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-sm text-indigo-700">
                <p className="font-semibold mb-1">What is 2FA?</p>
                <p>Two-factor authentication adds an extra layer of security. After entering your password, you'll be asked for a 6-digit code from your authenticator app — even if someone gets your password, they can't log in without your phone.</p>
            </div>
        </div>
    )
}
