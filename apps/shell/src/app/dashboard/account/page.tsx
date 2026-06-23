import { CardAccount } from '@/app/dashboard/account/components/CardAccount'

export default function AccountPage() {
  return (
    <div className="w-card-sm mx-auto md:w-card-md lg:w-full flex flex-col gap-4">
      <CardAccount />
    </div>
  )
}
