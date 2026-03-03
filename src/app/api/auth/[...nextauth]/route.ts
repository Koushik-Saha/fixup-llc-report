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
                password: { label: "Password", type: "password" }
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
                    storeId: storeId
                }
            }
        })
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = user.role
                token.id = user.id
                token.storeId = user.storeId
            }
            return token
        },
        async session({ session, token }) {
            if (token) {
                session.user.role = token.role as string
                session.user.id = token.id as string
                session.user.storeId = token.storeId as string | null
            }
            return session
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
