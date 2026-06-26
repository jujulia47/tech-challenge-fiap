export function getFirstName(fullName: string): string {
  return fullName.trim().split(' ')[0]
}
