import { preloadable } from '@bytebank/utils'
import { lazyModal } from './lazy'
import type { TransactionAction } from './TransactionItem'

const detailModal = preloadable(() => import('./ModalTransactionDetail').then(module => module.ModalTransactionDetail))
const editModal = preloadable(() => import('./ModalEditTransaction').then(module => module.ModalEditTransaction))
const deleteModal = preloadable(() => import('./ModalConfirmDelete').then(module => module.ModalConfirmDelete))

// The modals of a transaction, downloaded when they first open or on intent
export const LazyModalTransactionDetail = lazyModal(detailModal, props => props.transaction !== null)
export const LazyModalEditTransaction = lazyModal(editModal, props => props.transaction !== null)
export const LazyModalConfirmDelete = lazyModal(deleteModal, props => props.isOpen)

const MODAL_PRELOADS: Record<TransactionAction, () => void> = {
  detail: detailModal.preload,
  edit: editModal.preload,
  delete: deleteModal.preload,
}

export const preloadActionModal = (action: TransactionAction) => MODAL_PRELOADS[action]()
