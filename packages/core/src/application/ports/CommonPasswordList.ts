export interface CommonPasswordList {
  // Receives the password from comparablePassword(): lower case, no spaces, no accents
  has(comparablePassword: string): Promise<boolean>
}
