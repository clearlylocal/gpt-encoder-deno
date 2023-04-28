// This file includes code which was modified from https://github.com/openai/gpt-2

export const KEYABLE_PAIR_DELIM = ' ' // space

type Pair = [string, string]
type KeyablePair = string & { readonly KeyablePair: unique symbol }

function reverseObj<K extends string | number, V extends string | number>(x: Record<K, V>): Record<V, K> {
	return Object.fromEntries(Object.entries(x).map((x) => x.reverse()))
}

const parseKeyablePair = (stringPair: KeyablePair) => {
	return stringPair.split(KEYABLE_PAIR_DELIM) as Pair
}

export const pairToKeyable = (pair: [string, string]) => {
	return pair.join(KEYABLE_PAIR_DELIM) as KeyablePair
}

const range = (x: number, y: number) => {
	const res = Array.from(Array(y).keys()).slice(x)
	return res
}

const ord = (x: string) => {
	return x.charCodeAt(0)!
}

const chr = (x: number) => {
	return String.fromCharCode(x)
}

const textEncoder = new TextEncoder()

const encodeStr = (str: string) => {
	return textEncoder.encode(str)
}

const textDecoder = new TextDecoder()
const decodeStr = (arr: Uint8Array | number[]) => {
	return textDecoder.decode(new Uint8Array(arr))
}

function bytesToUnicode() {
	const bs = range(ord('!'), ord('~') + 1).concat(range(ord('¡'), ord('¬') + 1), range(ord('®'), ord('ÿ') + 1))
	const cs = [...bs]

	let n = 0
	for (let b = 0; b < 2 ** 8; ++b) {
		if (!bs.includes(b)) {
			bs.push(b)
			cs.push(2 ** 8 + n)
			n = n + 1
		}
	}

	const chars = cs.map((x) => chr(x))

	return Object.fromEntries(bs.map((b, i) => [b, chars[i]])) as Record<number, string>
}

function getPairs(word: string[]) {
	const pairs = new Set<KeyablePair>()

	for (const [idx, char] of word.slice(1).entries()) {
		pairs.add(pairToKeyable([word[idx] /* prev char */, char]))
	}

	return pairs
}

const pat = /'s|'t|'re|'ve|'m|'ll|'d| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+/gu

const byteEncoder = bytesToUnicode()
const byteDecoder = reverseObj(byteEncoder)

type Cache = {
	get(k: string): string | undefined | null
	set(k: string, v: string): void
}

export const getBpePairs = (bpeContent: string) =>
	bpeContent
		.trimEnd()
		.split('\n')
		.slice(1) // 1st line is version number
		.map((x) => x.split(/(\s+)/).filter((e) => e.trim().length)) as [string, string][]

export function getBpeRanks(bpe: string) {
	return [...getBpePairs(bpe).entries()].map(([rank, pair]) => [pair.join(KEYABLE_PAIR_DELIM), rank] as const) as [string, number][]
}

export function getBpeRankFrom(bpeContent: string): GetBpeRank {
	const ranks = Object.assign(Object.create(null), Object.fromEntries(getBpeRanks(bpeContent)))

	return (keyablePair: KeyablePair) => Promise.resolve(ranks[keyablePair])
}

export function getTokenFrom(tokenMapping: Record<string, number>): GetToken {
	const m: typeof tokenMapping = Object.assign(Object.create(null), tokenMapping)

	return (str: string) => Promise.resolve(m[str])
}

export function getWordFrom(tokenMapping: Record<string, number>): GetWord {
	const o = reverseObj(tokenMapping)
	const m: typeof o = Object.assign(Object.create(null), o)

	return (n: number) => Promise.resolve(m[n])
}

export type GetBpeRank = (keyablePair: KeyablePair) => Promise<number | undefined | null>

async function bpe(token: string, getBpeRank: GetBpeRank, cache: Cache) {
	const cached = cache.get(token)
	if (cached != null) return cached

	let word = token.split('')
	let pairs = getPairs(word)

	while (true) {
		const minPairs: Record<number, KeyablePair> = {}

		for (const pair of pairs.values()) {
			const rank = await getBpeRank(pair)
			minPairs[isNaN(rank as number) ? 10e10 : (rank as number)] = pair
		}

		const bigram = minPairs[Math.min(...Object.keys(minPairs).map(Number))]

		if ((await getBpeRank(bigram)) == null) break

		const [first, second] = parseKeyablePair(bigram)

		let newWord: string[] = []
		let i = 0

		while (i < word.length) {
			const j = word.indexOf(first, i)
			if (j === -1) {
				newWord = newWord.concat(word.slice(i))
				break
			}
			newWord = newWord.concat(word.slice(i, j))
			i = j

			if (word[i] === first && i < word.length - 1 && word[i + 1] === second) {
				newWord.push(first + second)
				i = i + 2
			} else {
				newWord.push(word[i])
				i = i + 1
			}
		}

		word = newWord
		if (word.length === 1) {
			break
		} else {
			pairs = getPairs(word)
		}
	}

	const joined = word.join(' ')
	cache.set(token, joined)

	return joined
}

export type GetToken = (word: string) => Promise<number>
export type GetWord = (token: number) => Promise<string>

type WordsOptions = { getBpeRank: GetBpeRank; cache?: Cache }
type EncodeOptions = WordsOptions & { getToken: GetToken }
type DecodeOptions = { getWord: GetWord }

export async function encode(text: string, { getToken, getBpeRank, cache }: EncodeOptions): Promise<number[]> {
	return Promise.all((await words(text, { getBpeRank, cache })).map((x) => getToken(x)))
}

export async function decode(tokens: number[], { getWord }: DecodeOptions) {
	let text = (await Promise.all(tokens.map((x) => getWord(x)))).join('')
	text = decodeStr(text.split('').map((x) => byteDecoder[x]))
	return text
}

export async function tokenLength(text: string, { getBpeRank, cache }: WordsOptions): Promise<number> {
	return (await words(text, { getBpeRank, cache })).length
}

async function words(text: string, { getBpeRank, cache }: WordsOptions): Promise<string[]> {
	cache ??= new Map<string, string>()

	let allWords: string[] = []
	const matches = Array.from(text.matchAll(pat)).map((x) => x[0])
	for (let token of matches) {
		token = [...encodeStr(token)].map((x) => byteEncoder[x]).join('')
		allWords = allWords.concat(await Promise.all((await bpe(token, getBpeRank, cache)).split(' ')))
	}
	return allWords
}
