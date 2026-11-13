import type { Decorator } from '@storybook/nextjs-vite'
import { SessionProvider } from 'next-auth/react'

// A made-up session for the stories of components that read it. Given to the provider, it is
// never fetched: with no refetch on focus, a story makes no request to /api/auth.
export const STORY_SESSION = {
  user: { id: 'story', name: 'Joana Silva', email: 'joana@exemplo.com' },
  expires: '2099-01-01T00:00:00.000Z',
}

export const withSession: Decorator = Story => (
  <SessionProvider session={STORY_SESSION} refetchOnWindowFocus={false}>
    <Story />
  </SessionProvider>
)
