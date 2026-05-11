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
            to: email,
            subject: '🔐 Password Reset Request – FixItUp',
            html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Reset Your Password</title></head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

        <!-- Header -->
        <tr>
          <td align="center" style="padding-bottom:24px;">
            <div style="display:inline-block;background:#1e293b;border-radius:12px;padding:12px 24px;">
              <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:0.5px;">⚡ FixItUp</span>
            </div>
          </td>
        </tr>

        <!-- Card -->
        <tr>
          <td style="background:#ffffff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.08);overflow:hidden;">

            <!-- Top accent bar -->
            <div style="background:linear-gradient(90deg,#2563eb,#4f46e5);height:5px;"></div>

            <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 40px 32px;">

              <!-- Lock icon -->
              <tr>
                <td align="center" style="padding-bottom:24px;">
                  <div style="width:64px;height:64px;background:#eff6ff;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:28px;line-height:64px;text-align:center;">🔐</div>
                </td>
              </tr>

              <!-- Title -->
              <tr>
                <td align="center" style="padding-bottom:8px;">
                  <h1 style="margin:0;font-size:24px;font-weight:700;color:#0f172a;">Reset Your Password</h1>
                </td>
              </tr>

              <!-- Subtitle -->
              <tr>
                <td align="center" style="padding-bottom:32px;">
                  <p style="margin:0;font-size:15px;color:#64748b;line-height:1.6;">
                    We received a request to reset the password for your account.<br>Click the button below to set a new password.
                  </p>
                </td>
              </tr>

              <!-- CTA Button -->
              <tr>
                <td align="center" style="padding-bottom:32px;">
                  <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#2563eb,#4f46e5);color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 40px;border-radius:10px;letter-spacing:0.3px;">
                    Reset My Password →
                  </a>
                </td>
              </tr>

              <!-- Warning box -->
              <tr>
                <td style="padding-bottom:28px;">
                  <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:16px 20px;">
                    <p style="margin:0;font-size:13px;color:#92400e;line-height:1.6;">
                      ⏱️ <strong>This link expires in 5 minutes.</strong> If it expires, you can request a new one from the login page.
                    </p>
                  </div>
                </td>
              </tr>

              <!-- Divider -->
              <tr><td style="border-top:1px solid #f1f5f9;padding-bottom:20px;"></td></tr>

              <!-- Not you? -->
              <tr>
                <td align="center">
                  <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.6;">
                    If you didn't request this, you can safely ignore this email.<br>Your password will not be changed.
                  </p>
                </td>
              </tr>

              <!-- Fallback URL -->
              <tr>
                <td align="center" style="padding-top:16px;">
                  <p style="margin:0;font-size:11px;color:#cbd5e1;">
                    Or copy this link: <span style="color:#2563eb;">${resetUrl}</span>
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td align="center" style="padding-top:24px;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">
              © ${new Date().getFullYear()} FixItUp · This is an automated message, please do not reply.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
            `
        })
    } catch (error) {
        console.error('Failed to send password reset email:', error)
    }
}

export async function sendMissingReportReminder(email: string, name: string, storeName: string, dateStr: string) {
    if (!resend) {
        console.warn('No RESEND_API_KEY found. Skipping missing report reminder.')
        console.log(`[DEV MODE] Missing Report Reminder for ${name} (${email}) at ${storeName} for Date: ${dateStr}`)
        return
    }

    try {
        const loginUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/login`
        await resend.emails.send({
            from: FROM_EMAIL,
            to: email,
            subject: `Action Required: Missing Daily Report for ${dateStr}`,
            html: `
                <div style="font-family: sans-serif; color: #333;">
                    <h2>Missing Daily Report Notice</h2>
                    <p>Hi ${name},</p>
                    <p>Our records indicate that the daily closing report for <strong>${storeName}</strong> on <strong>${dateStr}</strong> has not yet been submitted.</p>
                    <p>Please log in immediately and submit your missing report to ensure accurate weekly reconciliation.</p>
                    <p>
                        <a href="${loginUrl}" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                            Log in to FixUp
                        </a>
                    </p>
                    <p style="font-size: 12px; color: #666; margin-top: 20px;">This is an automated system reminder. Please contact your manager if you have already submitted this report.</p>
                </div>
            `
        })
    } catch (error) {
        console.error('Failed to send missing report reminder:', error)
    }
}
