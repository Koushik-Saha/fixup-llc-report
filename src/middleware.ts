import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })

    const path = request.nextUrl.pathname

    if (path === '/') {
        if (token) {
            if (token.role === 'Admin' || token.role === 'Manager') {
                return NextResponse.redirect(new URL('/admin/dashboard', request.url))
            } else {
                return NextResponse.redirect(new URL('/staff/home', request.url))
            }
        }
        return NextResponse.redirect(new URL('/login', request.url))
    }

    if (path.startsWith('/login') && token) {
        if (token.role === 'Admin' || token.role === 'Manager') {
            return NextResponse.redirect(new URL('/admin/dashboard', request.url))
        } else {
            return NextResponse.redirect(new URL('/staff/home', request.url))
        }
    }

    if (path.startsWith('/admin') && (!token || (token.role !== 'Admin' && token.role !== 'Manager'))) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    if (path.startsWith('/staff') && (!token || token.role !== 'Staff')) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/', '/login', '/admin/:path*', '/staff/:path*'],
}
