// This file includes code which was modified from https://github.com/openai/gpt-2

const KEYABLE_PAIR_DELIM = '\x1f' // unit separator control char

type Pair = [string, string]
type KeyablePair = string & { readonly StringTuple: unique symbol }

const parseKeyablePair = (stringPair: KeyablePair) => {
	return stringPair.split(KEYABLE_PAIR_DELIM) as Pair
}

const pairToKeyable = (tuple: [string, string]) => {
	return tuple.join(KEYABLE_PAIR_DELIM) as KeyablePair
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

const zipPairs = (pairs: [string, string][], range: number[]) =>
	Object.fromEntries(pairs.map((pair, i) => [pairToKeyable(pair), range[i]])) as Record<KeyablePair, number>

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

const cache = new Map<string, string>()

const bpeCache = new Map<string, Record<KeyablePair, number>>()

const getBpeMerges = (bpeContent: string) => bpeContent
	.split('\n')
	.slice(1, -1)
	.map((x) => x.split(/(\s+)/).filter((e) => e.trim().length)) as [string, string][]

globalThis.Deno?.test('getBpeMerges', async () => {
	const filePath = './vocab-gpt3.bpe'

	await eval(`(async () => {
		const { assert, assertEquals } = await import('https://deno.land/std@0.184.0/testing/asserts.ts')

		const bpe = await Deno.readTextFile('${filePath}')

		assert(!bpe.includes('${KEYABLE_PAIR_DELIM}'))

		for (const pair of getBpeMerges(bpe)) {
			assertEquals(pair.length, 2)
			assert(pair[0])
			assert(pair[1])
		}
	})()`)
})

function getBpeRanks(bpeContent: string) {
	let ranks = bpeCache.get(bpeContent)

	if (!ranks) {
		const bpeMerges = getBpeMerges(bpeContent)

		ranks = zipPairs(bpeMerges, range(0, bpeMerges.length))
		bpeCache.set(bpeContent, ranks)
	}

	return ranks
}

function bpe(token: string, bpeContent: string) {
	const bpeRanks = getBpeRanks(bpeContent)

	if (cache.has(token)) return cache.get(token)!

	let word = token.split('')
	let pairs = getPairs(word)

	while (true) {
		const minPairs: Record<number, KeyablePair> = {}

		for (const pair of pairs.values()) {
			const rank = bpeRanks[pair]
			minPairs[isNaN(rank) ? 10e10 : rank] = pair
		}

		const bigram = minPairs[Math.min(...Object.keys(minPairs).map(Number))]

		if (!(bigram in bpeRanks)) break

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

type TokenMapping = Record<string, number>
type EncodeOptions = { tokenMapping: TokenMapping; bpe: string }
type DecodeOptions = { tokenMapping: TokenMapping }

export function encode(text: string, { tokenMapping, bpe: bpeContent }: EncodeOptions): number[] {
	let bpeTokens: number[] = []
	const matches = Array.from(text.matchAll(pat)).map((x) => x[0])
	for (let token of matches) {
		token = [...encodeStr(token)].map((x) => byteEncoder[x]).join('')
		bpeTokens = bpeTokens.concat(bpe(token, bpeContent).split(' ').map((x) => tokenMapping[x]))
	}
	return bpeTokens
}

function reverseObj<K extends string | number, V extends string | number>(x: Record<K, V>): Record<V, K> {
	return Object.fromEntries(Object.entries(x).map((x) => x.reverse()))
}

const decoderMappingCache = new Map()

const toDecoderMapping = (encoderMapping: TokenMapping): Record<string, string> => {
	let decoderMapping = decoderMappingCache.get(encoderMapping)

	if (!decoderMapping) {
		decoderMapping = reverseObj(encoderMapping)
		decoderMappingCache.set(encoderMapping, decoderMapping)
	}

	return decoderMapping
}

export function decode(tokens: number[], { tokenMapping }: DecodeOptions) {
	const decoderMapping = toDecoderMapping(tokenMapping)

	let text = tokens.map((x) => decoderMapping[x]).join('')
	text = decodeStr(text.split('').map((x) => byteDecoder[x]))
	return text
}
