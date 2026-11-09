// A rough estimate of how hard a password is to guess, in bits: the characters that count
// times log2 of the pool they come from. It measures, it does not decide: the rule that refuses
// a password is the one of the domain. Why these numbers: docs/fase4/security.md, "Strength indicator".

interface CharacterPool {
  matches: (character: string) => boolean
  size: number
}

const POOLS: readonly CharacterPool[] = [
  { matches: character => /^[a-z]$/.test(character), size: 26 },
  { matches: character => /^[A-Z]$/.test(character), size: 26 },
  { matches: character => /^\d$/.test(character), size: 10 },
  // The 32 printable ASCII symbols
  { matches: character => /^[!-/:-@[-`{-~]$/.test(character), size: 32 },
  { matches: character => character === ' ', size: 1 },
  // Accented letters, other scripts, emoji: a guess, kept low
  { matches: character => /^[^\x20-\x7E]$/u.test(character), size: 32 },
]

// Keys next to each other, in either direction: qwerty, asdf, 7890
const KEYBOARD_ROWS = ['1234567890', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm']
// A run counts as its first character only from this length: two in a row happen by chance
const MIN_RUN = 3
const MIN_REPEATED_PIECE = 3

// One character in, one out, so the positions stay those of the password
function folded(character: string): string {
  return [...character.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()][0] ?? character
}

type Step = 'same' | 'next' | 'previous' | 'next key' | 'previous key'

// Every step that leads from a to b. "op" is both the next letter and the next key.
function stepsBetween(a: string, b: string): Set<Step> {
  const steps = new Set<Step>()
  const difference = (b.codePointAt(0) ?? 0) - (a.codePointAt(0) ?? 0)
  if (difference === 0) steps.add('same')
  if (difference === 1) steps.add('next')
  if (difference === -1) steps.add('previous')
  for (const row of KEYBOARD_ROWS) {
    const index = row.indexOf(a)
    if (index >= 0 && row[index + 1] === b) steps.add('next key')
    if (index >= 0 && row[index - 1] === b) steps.add('previous key')
  }
  return steps
}

// One step, again and again: aaa, abc, cba, 123, qwerty. A change of direction (aba, 121) is not
// a run: random passwords have those by chance, and people do not type them as a pattern.
function runLength(characters: string[], start: number): number {
  let shared: Set<Step> | null = null
  let end = start
  while (end + 1 < characters.length) {
    const steps = stepsBetween(characters[end], characters[end + 1])
    const common: Set<Step> = shared ? new Set([...shared].filter(step => steps.has(step))) : steps
    if (common.size === 0) break
    shared = common
    end += 1
  }
  return end - start + 1
}

// The longest piece starting here that already appeared before: senha1senha1
// Counted in characters, like the rest: an emoji is one, not two UTF-16 units
function repeatedPieceLength(characters: string[], start: number): number {
  const before = characters.slice(0, start).join('')
  for (let length = characters.length - start; length >= MIN_REPEATED_PIECE; length -= 1) {
    if (before.includes(characters.slice(start, start + length).join(''))) return length
  }
  return 0
}

function wordAt(characters: string[], start: number, words: readonly string[]): number {
  const word = words.find(candidate => characters.slice(start, start + [...candidate].length).join('') === candidate)
  return word ? [...word].length : 0
}

export function poolSize(characters: readonly string[]): number {
  return POOLS.filter(pool => characters.some(pool.matches)).reduce((total, pool) => total + pool.size, 0)
}

// The characters that count: a run, a repeated piece and a word of the context count as one
export function effectiveLength(password: string, contextWords: readonly string[] = []): number {
  const characters = [...password.normalize('NFKC')].map(folded)
  let count = 0
  for (let index = 0; index < characters.length; count += 1) {
    const skip = wordAt(characters, index, contextWords) || repeatedPieceLength(characters, index)
    if (skip) {
      index += skip
      continue
    }
    const run = runLength(characters, index)
    index += run >= MIN_RUN ? run : 1
  }
  return count
}

export function estimatePasswordBits(password: string, contextWords: readonly string[] = []): number {
  const pool = poolSize([...password.normalize('NFKC')])
  return pool === 0 ? 0 : effectiveLength(password, contextWords) * Math.log2(pool)
}
