import { CardServices } from '@/app/services/components/CardServices'
import { DashboardWelcome } from '@/components/layout/DashboardWelcome'

export default function ServicesPage() {
  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <DashboardWelcome />
      <CardServices />
    </div>
  )
}
