import NextAuth from 'next-auth'
import { authLogger, readSessionPolicy } from '@bytebank/utils'

const { maxAgeSeconds, updateAgeSeconds } = readSessionPolicy(process.env)

// Reads the session of the shell. No provider on purpose: the only login is in the shell.
export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
  logger: authLogger,
  session: { strategy: 'jwt', maxAge: maxAgeSeconds, updateAge: updateAgeSeconds },
  pages: {
    signIn: '/',
  },
  providers: [],
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
