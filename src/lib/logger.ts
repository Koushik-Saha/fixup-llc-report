import prisma from "@/lib/prisma"

interface LogErrorParams {
    message: string
    source: 'Frontend' | 'Backend'
    company_id?: string | null
    user_id?: string | null
    stack_trace?: string | null
    path?: string | null
    method?: string | null
    payload?: string | null
}

export async function logError(details: LogErrorParams) {
    try {
        await prisma.errorLog.create({
            data: {
                message: details.message,
                source: details.source,
                company_id: details.company_id || null,
                user_id: details.user_id || null,
                stack_trace: details.stack_trace || null,
                path: details.path || null,
                method: details.method || null,
                payload: details.payload || null
            }
        })
    } catch (e) {
        // Fallback to console if DB fails
        console.error("Failed to write to ErrorLog database table", e)
        console.error("Original error:", details)
    }
}
