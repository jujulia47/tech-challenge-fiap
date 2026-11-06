import NextAuth from 'next-auth'
import { baseAuthConfig } from './sessionConfig'

// Loaded on demand: the proxy imports this file and has no use for the repository.
// The backend is the one of DATA_BACKEND, like everywhere else.
async function findUser(id: string): Promise<{ name: string } | null> {
  const { createDataAdapters } = await import('@bytebank/bff')
  const user = await createDataAdapters().users.findById(id)
  return user && { name: user.name }
}

// The session of a zone. No provider on purpose: the only login is in the shell.
// Each app that imports this gets its own instance, under its own basePath.
export const { handlers, auth } = NextAuth({ ...baseAuthConfig(process.env, { refreshUser: findUser }), providers: [] })
