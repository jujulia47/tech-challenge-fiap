import { lazyModal } from '@bytebank/design-system'
import type { TransactionAction } from '@bytebank/design-system'
import { preloadable } from '@bytebank/utils'

const detailModal = preloadable(() =>
  import('@bytebank/design-system/ModalTransactionDetail').then(module => module.ModalTransactionDetail),
)
const editModal = preloadable(() =>
  import('@/components/dashboard/ModalEditTransaction').then(module => module.ModalEditTransaction),
)
const deleteModal = preloadable(() =>
  import('@bytebank/design-system/ModalConfirmDelete').then(module => module.ModalConfirmDelete),
)

export const LazyModalTransactionDetail = lazyModal(detailModal, props => props.transaction !== null)
export const LazyModalEditTransaction = lazyModal(editModal, props => props.transaction !== null)
export const LazyModalConfirmDelete = lazyModal(deleteModal, props => props.isOpen)

const MODAL_PRELOADS: Record<TransactionAction, () => void> = {
  detail: detailModal.preload,
  edit: editModal.preload,
  delete: deleteModal.preload,
}

export const preloadActionModal = (action: TransactionAction) => MODAL_PRELOADS[action]()
