import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils/cn'

interface CardVisualProps {
  bgClass: string
  holderName: string
  maskedNumber: string
  selected: boolean
  onClick: () => void
  label: string
}

function CardVisual({ bgClass, holderName, maskedNumber, selected, onClick, label }: CardVisualProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Selecionar ${label}`}
      className={cn(
        bgClass,
        'rounded-md p-6 flex flex-col justify-between min-h-40 w-full text-left',
        selected && 'ring-2 ring-success',
      )}
    >
      <div className="flex justify-between items-start">
        <span className="text-body-semibold text-inverse">Bytebank</span>
        <span className="material-icons text-icon-sm text-primary-50">credit_card</span>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-meta text-inverse opacity-70">
          {maskedNumber}
        </span>
        <span className="text-meta text-inverse">{holderName}</span>
      </div>
    </button>
  )
}

interface CardSectionProps {
  id: 'fisico' | 'digital'
  label: string
  cardBgClass: string
  holderName: string
  maskedNumber: string
  cardFunction: string
  selected: boolean
  onCardSelect: (card: 'fisico' | 'digital') => void
}

function CardSection({ id, label, cardBgClass, holderName, maskedNumber, cardFunction, selected, onCardSelect }: CardSectionProps) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-label text-text-primary">{label}</p>
      <div className="flex flex-col md:flex-row gap-4 items-start">
        <CardVisual
          bgClass={cardBgClass}
          holderName={holderName}
          maskedNumber={maskedNumber}
          selected={selected}
          onClick={() => onCardSelect(id)}
          label={label}
        />
        <div className="flex flex-col gap-3 md:justify-center md:w-36 shrink-0">
          <Button variant="accent" label="Configurar" fullWidth />
          <Button variant="error-outline" label="Bloquear" fullWidth />
          <span className="text-meta text-text-secondary">{cardFunction}</span>
        </div>
      </div>
    </div>
  )
}

interface CardMyCardsProps {
  selectedCard: 'fisico' | 'digital'
  onCardSelect: (card: 'fisico' | 'digital') => void
}

export function CardMyCards({ selectedCard, onCardSelect }: CardMyCardsProps) {
  return (
    <div className="relative bg-surface-form rounded-md p-6 overflow-hidden">
      <h2 className="text-heading text-text-primary mb-6">Meus cartões</h2>

      <div className="flex flex-col gap-8">
        <CardSection
          id="fisico"
          label="Cartão físico"
          cardBgClass="bg-primary-900"
          holderName="Joana da Silva"
          maskedNumber="•••• •••• •••• 1234"
          cardFunction="Função: Débito/Crédito"
          selected={selectedCard === 'fisico'}
          onCardSelect={onCardSelect}
        />
        <CardSection
          id="digital"
          label="Cartão digital"
          cardBgClass="bg-text-secondary"
          holderName="Joana da Silva"
          maskedNumber="•••• •••• •••• 5678"
          cardFunction="Função: Débito"
          selected={selectedCard === 'digital'}
          onCardSelect={onCardSelect}
        />
      </div>
    </div>
  )
}
