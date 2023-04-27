import tokenMapping from './token-mapping-gpt3.json' assert { type: 'json' }
import { encode, decode } from './codec.ts'
import { assertEquals } from 'https://deno.land/std@0.184.0/testing/asserts.ts'
const bpe = await (await fetch(import.meta.resolve('./vocab-gpt3.bpe'))).text()

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

Deno.test('empty string', () => {
	const str = ''
	assertEquals(encode(str, { tokenMapping, bpe }), [])
	assertEquals(decode(encode(str, { tokenMapping, bpe }), { tokenMapping }), str)
})

Deno.test('space', () => {
	const str = ' '
	assertEquals(encode(str, { tokenMapping, bpe }), [220])
	assertEquals(decode(encode(str, { tokenMapping, bpe }), { tokenMapping }), str)
})

Deno.test('tab', () => {
	const str = '\t'
	assertEquals(encode(str, { tokenMapping, bpe }), [197])
	assertEquals(decode(encode(str, { tokenMapping, bpe }), { tokenMapping }), str)
})

Deno.test('simple text', () => {
	const str = 'This is some text'
	assertEquals(encode(str, { tokenMapping, bpe }), [1212, 318, 617, 2420])
	assertEquals(decode(encode(str, { tokenMapping, bpe }), { tokenMapping }), str)
})

Deno.test('multi-token word', () => {
	const str = 'indivisible'
	assertEquals(encode(str, { tokenMapping, bpe }), [521, 452, 12843])
	assertEquals(decode(encode(str, { tokenMapping, bpe }), { tokenMapping }), str)
})

Deno.test('emojis', () => {
	const str = 'hello 👋 world 🌍'

	assertEquals(encode(str, { tokenMapping, bpe }), [31373, 50169, 233, 995, 12520, 234, 235])
	assertEquals(decode(encode(str, { tokenMapping, bpe }), { tokenMapping }), str)
})

Deno.test('properties of Object', () => {
	const str = 'toString constructor hasOwnProperty valueOf'

	assertEquals(encode(str, { tokenMapping, bpe }), [1462, 10100, 23772, 468, 23858, 21746, 1988, 5189])
	assertEquals(decode(encode(str, { tokenMapping, bpe }), { tokenMapping }), str)
})
