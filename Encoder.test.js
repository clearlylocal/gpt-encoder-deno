import { encode, decode } from './mod.ts'
import { assertEquals } from 'std/testing/asserts.ts'

Deno.test('empty string', () => {
	const str = ''
	assertEquals(encode(str), [])
	assertEquals(decode(encode(str)), str)
})

Deno.test('space', () => {
	const str = ' '
	assertEquals(encode(str), [220])
	assertEquals(decode(encode(str)), str)
})

Deno.test('tab', () => {
	const str = '\t'
	assertEquals(encode(str), [197])
	assertEquals(decode(encode(str)), str)
})

Deno.test('simple text', () => {
	const str = 'This is some text'
	assertEquals(encode(str), [1212, 318, 617, 2420])
	assertEquals(decode(encode(str)), str)
})

Deno.test('multi-token word', () => {
	const str = 'indivisible'
	assertEquals(encode(str), [521, 452, 12843])
	assertEquals(decode(encode(str)), str)
})

Deno.test('emojis', () => {
	const str = 'hello 👋 world 🌍'
	assertEquals(encode(str), [31373, 50169, 233, 995, 12520, 234, 235])
	assertEquals(decode(encode(str)), str)
})

Deno.test('properties of Object', () => {
	const str = 'toString constructor hasOwnProperty valueOf'

	assertEquals(encode(str), [1462, 10100, 23772, 468, 23858, 21746, 1988, 5189])
	assertEquals(decode(encode(str)), str)
})
