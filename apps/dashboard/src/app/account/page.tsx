import { auth } from '@/lib/auth'
import { CardAccount } from '@/app/account/components/CardAccount'

export const dynamic = 'force-dynamic'

export default async function AccountPage() {
  const session = await auth()
  const user = {
    name: session?.user?.name ?? '',
    email: session?.user?.email ?? '',
  }

  return (
    <div className="w-card-sm mx-auto md:w-card-md lg:w-full flex flex-col gap-4">
      <h1 className="sr-only">Minha conta</h1>
      <CardAccount initialName={user.name} initialEmail={user.email} />
    </div>
  )
}
