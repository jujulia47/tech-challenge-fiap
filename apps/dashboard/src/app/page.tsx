'use client'

import { useMemo } from 'react'
import { CardNewTransaction } from '@/components/dashboard/CardNewTransaction'
import { CardCharts } from '@/components/dashboard/CardCharts'
import { CardStatement } from '@/components/dashboard/CardStatement'
import { TransactionActions } from '@bytebank/design-system'
import { useDeleteTransactionMutation, useGetStatementQuery, useUpdateTransactionMutation } from '@/store/transactionsApi'
import { DashboardWelcome } from '@/components/layout/DashboardWelcome'

export default function DashboardPage() {
  const { data: statement, isLoading, isError } = useGetStatementQuery()
  const [deleteTransaction] = useDeleteTransactionMutation()
  const [updateTransaction] = useUpdateTransactionMutation()

  const groups = useMemo(() => statement?.groups ?? [], [statement])
  const transactions = useMemo(() => groups.flatMap(group => group.transactions), [groups])

  return (
    <TransactionActions
      transactions={transactions}
      remove={id => deleteTransaction(id).unwrap()}
      save={(id, changes) => updateTransaction({ id, changes }).unwrap()}
    >
      {({ actions, showToast }) => (
        <div className="w-card-sm mx-auto md:w-card-md lg:w-full flex flex-col gap-4 lg:gap-6">
          <DashboardWelcome />
          <CardCharts />
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 lg:items-start">
            <div className="flex-1">
              <CardNewTransaction
                onSuccess={(msg) => showToast(msg, 'success')}
                onError={(msg) => showToast(msg, 'error')}
              />
            </div>
            <div className="lg:w-[380px] shrink-0">
              <CardStatement
                groups={groups}
                loading={isLoading}
                loadFailed={isError}
                {...actions}
                limit={4}
                showViewMore
              />
            </div>
          </div>
        </div>
      )}
    </TransactionActions>
  )
}
