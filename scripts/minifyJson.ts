#!/usr/bin/env -S deno run --allow-read --allow-write

const filePath = import.meta.resolve('../token-mapping-gpt3.json')

const tokenMapping = await (await fetch(filePath)).json()

await Deno.writeTextFile(new URL(filePath), JSON.stringify(tokenMapping))
