# GPT-3-Encoder Deno

Deno-optimized fork of https://github.com/latitudegames/GPT-3-Encoder, a JavaScript BPE Encoder Decoder for GPT-2/GPT-3.

## About

GPT-2 and GPT-3 use byte pair encoding to turn text into a series of integers to feed into the model. This is a JS implementation of OpenAI's original python encoder/decoder which can be found [here](https://github.com/openai/gpt-2).

## Usage

For convenience, you can add `gpt-encoder-deno` to your `import_map.json` and set it to the current version (e.g. `https://esm.sh/gh/clearlylocal/gpt-encoder-deno@v2.0.0`).

```ts
import { assertEquals } from 'https://deno.land/std@0.184.0/testing/asserts.ts'
import { encode, decode } from 'gpt-encoder-deno/mod.ts'
import tokenMapping from 'gpt-encoder-deno/token-mapping-gpt3.json' assert { type: 'json' }
const bpe = await (await fetch(import.meta.resolve('gpt-encoder-deno/vocab-gpt3.bpe'))).text()

const str = 'my example string 🦄'
const encoded = encode(str, { tokenMapping, bpe })

assertEquals(encoded, [1820, 1672, 4731, 12520, 99, 226])

for (const [idx, data] of [
	{ token: 1820, string: 'my' },
	{ token: 1672, string: ' example' },
	{ token: 4731, string: ' string' },
	{ token: 12520, string: ' �' },
	{ token: 99, string: '�' },
	{ token: 226, string: '�' },
].entries()) {
	const token = encoded[idx]
	assertEquals(data, { token, string: decode([token], { tokenMapping }) })
}

const decoded = decode(encoded, { tokenMapping })
assertEquals(decoded, str)
```
