import type { CommonPasswordList } from '../application/ports/CommonPasswordList'

export class FakeCommonPasswordList implements CommonPasswordList {
  private readonly listed: Set<string>

  constructor(listed: readonly string[] = []) {
    this.listed = new Set(listed)
  }

  async has(comparablePassword: string): Promise<boolean> {
    return this.listed.has(comparablePassword)
  }
}
