import { lazyModal } from '@bytebank/design-system'
import { preloadable } from '@bytebank/utils'

const loginModal = preloadable(() =>
  import('@/app/(public)/components/ModalLogin').then(module => module.ModalLogin),
)
const signupModal = preloadable(() =>
  import('@/app/(public)/components/ModalCadastro').then(module => module.ModalCadastro),
)

export const LazyModalLogin = lazyModal(loginModal, props => props.isOpen)
export const LazyModalCadastro = lazyModal(signupModal, props => props.isOpen)

export const preloadLoginModal = loginModal.preload
export const preloadSignupModal = signupModal.preload
