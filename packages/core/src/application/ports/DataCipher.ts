export interface DataCipher {
  // The context is authenticated, not stored: decrypting needs the same one,
  // so a sealed value moved to another owner stops opening
  encrypt(plaintext: Uint8Array, context: string): Promise<string>
  // Rejects when the value was changed, the key is wrong or the format is unknown
  decrypt(sealed: string, context: string): Promise<Uint8Array>
}
