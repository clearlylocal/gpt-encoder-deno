import tokenMapping from './token-mapping-gpt3.json' assert { type: 'json' }
import { encode, decode, tokenLength, getBpeRankFrom, getTokenFrom, getWordFrom, getBpePairs } from './mod.ts'
import { assert, assertEquals } from 'https://deno.land/std@0.184.0/testing/asserts.ts'
import { KEYABLE_PAIR_DELIM } from "./codec.ts";

Deno.test('getBpePairs', async () => {
	const filePath = './vocab-gpt3.bpe'

	const bpe = await Deno.readTextFile(filePath)

	for (const pair of getBpePairs(bpe)) {
		assertEquals(pair.length, 2)
		assert(pair[0])
		assert(pair[1])
		assert(!pair.join('').includes(KEYABLE_PAIR_DELIM))
	}
})

const getToken = getTokenFrom(tokenMapping)
const getWord = getWordFrom(tokenMapping)
const getBpeRank = getBpeRankFrom(await (await fetch(import.meta.resolve('./vocab-gpt3.bpe'))).text())

Deno.test('docs', async (t) => {
	const docFiles = ['./README.md']

	for (const filePath of docFiles) {
		const fileContent = await Deno.readTextFile(filePath)
		const codeBlocks = [...fileContent.matchAll(/```\w*\r?\n([\s\S]+)\r?\n```/g)].map((m) => m[1].trim())

		await t.step(filePath, async (t) => {
			for (const [idx, codeBlock] of codeBlocks.entries()) {
				const uri = `data:text/typescript;charset=utf-8,${encodeURIComponent(codeBlock)}`

				await t.step(`run code block ${idx + 1}`, async () => {
					await import(uri)
				})
			}
		})
	}
})

Deno.test('empty string', async () => {
	const str = ''

	const expectedTokens: number[] = []
	const encoded = await encode(str, { getToken, getBpeRank })
	const decoded = await decode(encoded, { getWord })
	const len = await tokenLength(str, { getBpeRank })

	assertEquals(encoded, expectedTokens)
	assertEquals(decoded, str)
	assertEquals(len, expectedTokens.length)
})

Deno.test('space', async () => {
	const str = ' '

	const expectedTokens = [220]
	const encoded = await encode(str, { getToken, getBpeRank })
	const decoded = await decode(encoded, { getWord })
	const len = await tokenLength(str, { getBpeRank })

	assertEquals(encoded, expectedTokens)
	assertEquals(decoded, str)
	assertEquals(len, expectedTokens.length)
})

Deno.test('tab', async () => {
	const str = '\t'

	const expectedTokens = [197]
	const encoded = await encode(str, { getToken, getBpeRank })
	const decoded = await decode(encoded, { getWord })
	const len = await tokenLength(str, { getBpeRank })

	assertEquals(encoded, expectedTokens)
	assertEquals(decoded, str)
	assertEquals(len, expectedTokens.length)
})

Deno.test('simple text', async () => {
	const str = 'This is some text'

	const expectedTokens = [1212, 318, 617, 2420]
	const encoded = await encode(str, { getToken, getBpeRank })
	const decoded = await decode(encoded, { getWord })
	const len = await tokenLength(str, { getBpeRank })

	assertEquals(encoded, expectedTokens)
	assertEquals(decoded, str)
	assertEquals(len, expectedTokens.length)
})

Deno.test('multi-token word', async () => {
	const str = 'indivisible'

	const expectedTokens = [521, 452, 12843]
	const encoded = await encode(str, { getToken, getBpeRank })
	const decoded = await decode(encoded, { getWord })
	const len = await tokenLength(str, { getBpeRank })

	assertEquals(encoded, expectedTokens)
	assertEquals(decoded, str)
	assertEquals(len, expectedTokens.length)
})

Deno.test('repetition (no cache)', async () => {
	const str = 'This is some text, This is some text'

	const expectedTokens = [1212, 318, 617, 2420, 11, 770, 318, 617, 2420]
	const encoded = await encode(str, { getToken, getBpeRank })
	const decoded = await decode(encoded, { getWord })
	const len = await tokenLength(str, { getBpeRank })

	assertEquals(encoded, expectedTokens)
	assertEquals(decoded, str)
	assertEquals(len, expectedTokens.length)
})

Deno.test('repetition (with cache)', async () => {
	const str = 'This is some text, This is some text'

	const expectedTokens = [1212, 318, 617, 2420, 11, 770, 318, 617, 2420]
	const encoded = await encode(str, { getToken, getBpeRank, cache: new Map<string, string>() })
	const decoded = await decode(encoded, { getWord })
	const len = await tokenLength(str, { getBpeRank, cache: new Map<string, string>() })

	assertEquals(encoded, expectedTokens)
	assertEquals(decoded, str)
	assertEquals(len, expectedTokens.length)
})

Deno.test('emojis', async () => {
	const str = 'hello 👋 world 🌍'

	const expectedTokens = [31373, 50169, 233, 995, 12520, 234, 235]
	const encoded = await encode(str, { getToken, getBpeRank })
	const decoded = await decode(encoded, { getWord })
	const len = await tokenLength(str, { getBpeRank })

	assertEquals(encoded, expectedTokens)
	assertEquals(decoded, str)
	assertEquals(len, expectedTokens.length)
})

Deno.test('properties of Object', async () => {
	const str = 'toString constructor hasOwnProperty valueOf'

	const expectedTokens = [1462, 10100, 23772, 468, 23858, 21746, 1988, 5189]
	const encoded = await encode(str, { getToken, getBpeRank })
	const decoded = await decode(encoded, { getWord })
	const len = await tokenLength(str, { getBpeRank })

	assertEquals(encoded, expectedTokens)
	assertEquals(decoded, str)
	assertEquals(len, expectedTokens.length)
})
