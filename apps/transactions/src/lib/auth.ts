import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'

const JSON_SERVER_URL = process.env.JSON_SERVER_URL ?? 'http://localhost:3001'

interface MockUser {
  id: string
  name: string
  email: string
  password: string
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/',
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'E-mail', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined
        const password = credentials?.password as string | undefined

        if (!email || !password) return null

        // Mock validation against the json-server users collection
        const res = await fetch(
          `${JSON_SERVER_URL}/users?email=${encodeURIComponent(email)}`,
        )
        if (!res.ok) return null

        const users = (await res.json()) as MockUser[]
        const user = users[0]

        // Plain-text comparison (mock — no bcrypt)
        if (!user || user.password !== password) return null

        return { id: user.id, name: user.name, email: user.email }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.name = user.name
        token.email = user.email
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.name = token.name as string
        session.user.email = token.email as string
      }
      return session
    },
  },
})
