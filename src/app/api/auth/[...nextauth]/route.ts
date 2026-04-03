import NextAuth, { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import prisma from "@/lib/prisma"
import bcrypt from "bcryptjs"

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email", placeholder: "m@example.com" },
                password: { label: "Password", type: "password" },
                totpCode: { label: "2FA Code", type: "text", optional: true }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null
                }

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email },
                    include: {
                        storeMembers: true,
                    }
                })

                if (!user || user.status !== "Active") {
                    return null
                }

                const isPasswordValid = await bcrypt.compare(credentials.password, user.password_hash)

                if (!isPasswordValid) {
                    return null
                }

                // 2FA Check
                if (user.two_factor_enabled) {
                    const providedCode = credentials?.totpCode
                    if (!providedCode) {
                        throw new Error("2FA_REQUIRED")
                    }

                    // Try verifying TOTP token
                    const otplibType = await import('otplib')
                    const authenticator = (otplibType as any).authenticator
                    const isValidTotp = user.totp_secret && authenticator.verify({ token: providedCode, secret: user.totp_secret })

                    if (!isValidTotp) {
                        // Check if it's a backup code
                        let isValidBackup = false
                        let remainingBackups = []
                        if (user.backup_codes) {
                            try {
                                const hashedBackups = JSON.parse(user.backup_codes)
                                const inputHash = providedCode.replace(/-/g, '')
                                
                                for (let i = 0; i < hashedBackups.length; i++) {
                                    const match = await bcrypt.compare(inputHash, hashedBackups[i])
                                    if (match) {
                                        isValidBackup = true
                                        // Remove the used backup code
                                        remainingBackups = hashedBackups.filter((_: any, index: number) => index !== i)
                                        break
                                    }
                                }
                            } catch (e) {
                                console.error('Error parsing backup codes', e)
                            }
                        }

                        if (!isValidBackup) {
                            throw new Error("INVALID_2FA")
                        } else {
                            // Update user to remove used backup code
                            await prisma.user.update({
                                where: { id: user.id },
                                data: { backup_codes: JSON.stringify(remainingBackups) }
                            })
                        }
                    }
                }

                let storeId = null
                if (user.role === "Staff" && user.storeMembers.length > 0) {
                    const activeMember = user.storeMembers.find((m: any) => m.status === "Active")
                    if (activeMember) {
                        storeId = activeMember.store_id
                    }
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    storeId: storeId,
                    companyId: user.company_id
                }
            }
        })
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = user.role
                token.id = user.id
                token.status = (user as any).status
                token.storeId = user.storeId
                token.companyId = (user as any).companyId
            }

            // Re-sync status from DB every 5 minutes to catch deactivated users
            const now = Math.floor(Date.now() / 1000)
            const tokenAge = now - Number(token.iat || 0)
            if (tokenAge > 300) {
                try {
                    const dbUser = await prisma.user.findUnique({
                        where: { id: token.id as string },
                        select: { status: true }
                    })
                    if (dbUser) {
                        token.status = dbUser.status
                    }
                } catch (error) {
                    console.error('Failed to re-sync status in JWT context', error)
                }
            }

            return token
        },
        async session({ session, token }) {
            if (token) {
                // If the user's status is not Active, invalidate the session immediately
                if (token.status !== 'Active') {
                    return null as any
                }

                session.user.role = token.role as string
                session.user.id = token.id as string
                session.user.storeId = token.storeId as string | null
                session.user.companyId = token.companyId as string
            }
            return session
        }
    },
    events: {
        async signIn({ user }) {
            try {
                await prisma.systemLog.create({
                    data: {
                        user_id: user.id,
                        action: 'USER_LOGIN',
                        entity: 'User',
                        entity_id: user.id,
                        details: JSON.stringify({ message: 'User logged into the system' })
                    }
                })
            } catch (error) {
                console.error('Failed to log sign-in event:', error)
            }
        }
    },
    pages: {
        signIn: "/login",
    },
    session: {
        strategy: "jwt"
    },
    secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
