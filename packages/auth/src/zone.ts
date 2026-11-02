import NextAuth from 'next-auth'
import { requireEnv } from '@bytebank/bff/env'
import { baseAuthConfig } from './sessionConfig'

// Loaded on demand: the proxy imports this file and has no use for the repository
async function findUser(id: string): Promise<{ name: string } | null> {
  const { HttpUserRepository } = await import('@bytebank/infrastructure')
  const user = await new HttpUserRepository(requireEnv('JSON_SERVER_URL')).findById(id)
  return user && { name: user.name }
}

// The session of a zone. No provider on purpose: the only login is in the shell.
// Each app that imports this gets its own instance, under its own basePath.
export const { handlers, auth } = NextAuth({ ...baseAuthConfig(process.env, { refreshUser: findUser }), providers: [] })
