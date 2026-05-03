import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { CardMyCards } from './CardMyCards'
import { useState } from 'react'

const meta: Meta<typeof CardMyCards> = {
  title: 'Components/Cards/CardMyCards',
  component: CardMyCards,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof CardMyCards>

const CardMyCardsWithState = () => {
  const [selected, setSelected] = useState<'fisico' | 'digital'>('fisico')
  return <CardMyCards selectedCard={selected} onCardSelect={setSelected} />
}

const CardMyCardsDigital = () => {
  const [selected, setSelected] = useState<'fisico' | 'digital'>('digital')
  return <CardMyCards selectedCard={selected} onCardSelect={setSelected} />
}

export const Default: Story = {
  render: () => <CardMyCardsWithState />,
}

export const DigitalSelected: Story = {
  render: () => <CardMyCardsDigital />,
}
