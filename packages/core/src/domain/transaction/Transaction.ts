import { DomainError } from '../errors/DomainError'
import { CalendarDate } from '../value-objects/CalendarDate'
import { Money } from '../value-objects/Money'
import { isTransactionType, transactionDirection, type TransactionType } from './TransactionType'

export interface TransactionProps {
  id: string
  userId: string
  type: TransactionType
  amount: Money
  date: CalendarDate
  attachment?: string
}

export type TransactionChanges = Partial<Pick<TransactionProps, 'type' | 'amount' | 'date' | 'attachment'>>

export interface TransactionPrimitives {
  id: string
  userId: string
  type: TransactionType
  amountInCents: number
  date: string
  attachment?: string
}

// Raw input (storage, API): the type is still an unchecked string
export type RawTransactionPrimitives = Omit<TransactionPrimitives, 'type'> & { type: string }

export class Transaction {
  private readonly props: Readonly<TransactionProps>

  private constructor(props: TransactionProps) {
    this.props = Object.freeze({ ...props })
    Object.freeze(this)
  }

  static create(props: TransactionProps): Transaction {
    if (props.id.trim() === '') {
      throw new DomainError('TRANSACTION_INVALID_ID', 'Transaction id must not be empty')
    }
    if (props.userId.trim() === '') {
      throw new DomainError('TRANSACTION_INVALID_USER_ID', 'Transaction userId must not be empty')
    }
    if (!isTransactionType(props.type)) {
      throw new DomainError('TRANSACTION_INVALID_TYPE', `Unknown transaction type: "${props.type}"`)
    }
    if (!props.amount.isPositive()) {
      throw new DomainError('TRANSACTION_INVALID_AMOUNT', 'Transaction amount must be greater than zero')
    }
    return new Transaction(props)
  }

  static fromPrimitives(primitives: RawTransactionPrimitives): Transaction {
    return Transaction.create({
      id: primitives.id,
      userId: primitives.userId,
      // create() rejects anything that is not a TransactionType
      type: primitives.type as TransactionType,
      amount: Money.fromCents(primitives.amountInCents),
      date: CalendarDate.fromISO(primitives.date),
      attachment: primitives.attachment,
    })
  }

  get id(): string {
    return this.props.id
  }

  get userId(): string {
    return this.props.userId
  }

  get type(): TransactionType {
    return this.props.type
  }

  get amount(): Money {
    return this.props.amount
  }

  get date(): CalendarDate {
    return this.props.date
  }

  get attachment(): string | undefined {
    return this.props.attachment
  }

  monthKey(): string {
    return this.date.monthKey()
  }

  signedAmount(): Money {
    return transactionDirection(this.type) === 'income' ? this.amount : this.amount.negate()
  }

  // An explicit `attachment: undefined` removes the attachment; an absent key keeps it
  update(changes: TransactionChanges): Transaction {
    return Transaction.create({
      id: this.id,
      userId: this.userId,
      type: changes.type ?? this.type,
      amount: changes.amount ?? this.amount,
      date: changes.date ?? this.date,
      attachment: 'attachment' in changes ? changes.attachment : this.attachment,
    })
  }

  toPrimitives(): TransactionPrimitives {
    const primitives: TransactionPrimitives = {
      id: this.id,
      userId: this.userId,
      type: this.type,
      amountInCents: this.amount.toCents(),
      date: this.date.toISO(),
    }
    if (this.attachment !== undefined) primitives.attachment = this.attachment
    return primitives
  }
}
