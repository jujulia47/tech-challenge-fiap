import { CardInvestments } from '@/app/investments/components/CardInvestments'
import { DashboardWelcome } from '@/components/layout/DashboardWelcome'

export default function InvestmentsPage() {
  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <DashboardWelcome />
      <CardInvestments />
    </div>
  )
}
