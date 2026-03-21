import { NextResponse } from 'next/server'
import { logError } from '@/lib/logger'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        const body = await req.json()
        
        await logError({
            message: body.message || "Unknown error",
            source: 'Frontend',
            company_id: session?.user?.companyId || null,
            user_id: session?.user?.id || null,
            stack_trace: body.stack_trace || null,
            path: body.path || null,
            method: body.method || null,
            payload: body.payload || null
        })

        return NextResponse.json({ success: true })
    } catch (e: any) {
        console.error("Error Log API failed:", e)
        return NextResponse.json({ error: 'Failed to record error log' }, { status: 500 })
    }
}
