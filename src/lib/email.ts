import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

const FROM_EMAIL = process.env.EMAIL_FROM || 'onboarding@resend.dev'

// Useful when sending to admins, defaulting to the verified dev email or configurable admin email
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.env.EMAIL_FROM || 'onboarding@resend.dev'

export async function sendIrregularEditAlert({
    storeName,
    reportDate,
    editorName,
    changesText
}: {
    storeName: string
    reportDate: string
    editorName: string
    changesText: string
}) {
    if (!resend) {
        console.warn('No RESEND_API_KEY found. Skipping irregular edit alert email.')
        return
    }

    try {
        await resend.emails.send({
            from: FROM_EMAIL,
            to: ADMIN_EMAIL,
            subject: `⚠️ Irregular Edit Alert: ${storeName}`,
            html: `
                <h2>Irregular Edit Alert</h2>
                <p>A submitted report has been modified.</p>
                <ul>
                    <li><strong>Store:</strong> ${storeName}</li>
                    <li><strong>Report Date:</strong> ${reportDate}</li>
                    <li><strong>Edited By:</strong> ${editorName}</li>
                </ul>
                <h3>Changes Made:</h3>
                <pre style="background: #f4f4f5; padding: 12px; border-radius: 6px;">${changesText}</pre>
                <p>Please log in to the admin panel to review the full edit history.</p>
            `
        })
    } catch (error) {
        console.error('Failed to send irregular edit alert:', error)
    }
}

export async function sendDailySummary({
    storeName,
    reportDate,
    netCash,
    cardAmount,
    totalDeposit,
    notes
}: {
    storeName: string
    reportDate: string
    netCash: number
    cardAmount: number
    totalDeposit: number
    notes: string | null
}) {
    if (!resend) {
        console.warn('No RESEND_API_KEY found. Skipping daily summary email.')
        return
    }

    try {
        await resend.emails.send({
            from: FROM_EMAIL,
            to: ADMIN_EMAIL, // Adjust to send to a specific list of recipients in the future
            subject: `📊 Daily Summary: ${storeName} (${reportDate})`,
            html: `
                <h2>Daily Report Summary</h2>
                <p><strong>Store:</strong> ${storeName}</p>
                <p><strong>Date:</strong> ${reportDate}</p>
                <hr />
                <p><strong>Net Cash (After Expenses):</strong> $${netCash.toFixed(2)}</p>
                <p><strong>Card Amount:</strong> $${cardAmount.toFixed(2)}</p>
                <p><strong>Total Calculated Deposit:</strong> <span style="font-size: 1.25rem; font-weight: bold;">$${totalDeposit.toFixed(2)}</span></p>
                
                ${notes ? `<h3>Notes:</h3><p style="background: #fffbeb; padding: 10px; border-left: 4px solid #f59e0b;">${notes}</p>` : ''}
                
                <p><a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/admin/reports">View Report in Dashboard</a></p>
            `
        })
    } catch (error) {
        console.error('Failed to send daily summary email:', error)
    }
}

export async function sendPasswordResetToken(email: string, token: string) {
    if (!resend) {
        console.warn('No RESEND_API_KEY found. Skipping password reset email.')
        console.log(`[DEV MODE] Password Reset Token for ${email}: ${token}`)
        return
    }

    const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/reset-password?token=${token}&email=${encodeURIComponent(email)}`

    try {
        await resend.emails.send({
            from: FROM_EMAIL,
            to: email, // If using onboarding@resend.dev, this MUST be the verified account email in Resend
            subject: 'Password Reset Request',
            html: `
                <h2>Reset Your Password</h2>
                <p>You requested a password reset. Click the link below to set a new password:</p>
                <p>
                    <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px;">
                        Reset Password
                    </a>
                </p>
                <p>If you did not request this, please ignore this email.</p>
                <p>This link will expire in 1 hour.</p>
            `
        })
    } catch (error) {
        console.error('Failed to send password reset email:', error)
    }
}
