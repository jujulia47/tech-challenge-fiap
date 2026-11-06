import { InfrastructureError } from '../errors/InfrastructureError'

export function invalidList(url: string): InfrastructureError {
  return new InfrastructureError(`Expected a list of transactions: ${url}`, { code: 'UPSTREAM_INVALID_RESPONSE', url })
}
