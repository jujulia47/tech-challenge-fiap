export interface PasswordHasher {
  hash(password: string): Promise<string>
  // False for a wrong password and for a hash it cannot read
  verify(password: string, hash: string): Promise<boolean>
}
