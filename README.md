# GPT Encoder Deno

Deno-optimized fork of https://github.com/latitudegames/GPT-3-Encoder, a JavaScript BPE Encoder Decoder for GPT-2/GPT-3.

## About

GPT-2 and GPT-3 use byte pair encoding to turn text into a series of integers to feed into the model. This is a JS implementation of OpenAI's original python encoder/decoder which can be found [here](https://github.com/openai/gpt-2).

## Usage

Replace `$VERSION` with the version you wish to use, or import via an import map.

```ts
import { encode, decode, tokenLength, getBpeRankFrom, getTokenFrom, getWordFrom } from 'https://esm.sh/gh/clearlylocal/gpt-encoder-deno@$VERSION/mod.ts'
import tokenMapping from 'https://raw.githubusercontent.com/clearlylocal/gpt-encoder-deno/$VERSION/token-mapping-gpt3.json' assert { type: 'json' }
import { assertEquals } from 'https://deno.land/std@0.184.0/testing/asserts.ts'

const getToken = getTokenFrom(tokenMapping)
const getWord = getWordFrom(tokenMapping)
const getBpeRank = getBpeRankFrom(await (await fetch(import.meta.resolve(
	'https://raw.githubusercontent.com/clearlylocal/gpt-encoder-deno/$VERSION/vocab-gpt3.bpe',
))).text())

const str = 'my example string 🦄'
const encoded = await encode(str, { getToken, getBpeRank })
const len = await tokenLength(str, { getBpeRank })

const expectedTokens = [1820, 1672, 4731, 12520, 99, 226]

assertEquals(encoded, expectedTokens)
assertEquals(len, expectedTokens.length)

for (const [idx, data] of [
	{ token: 1820, string: 'my' },
	{ token: 1672, string: ' example' },
	{ token: 4731, string: ' string' },
	{ token: 12520, string: ' �' },
	{ token: 99, string: '�' },
	{ token: 226, string: '�' },
].entries()) {
	const token = encoded[idx]
	assertEquals(data, { token, string: await decode([token], { getWord }) })
}

const decoded = await decode(encoded, { getWord })
assertEquals(decoded, str)
```
