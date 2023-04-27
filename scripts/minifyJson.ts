#!/usr/bin/env -S deno run --allow-read --allow-write

const tokenMapping = await (await fetch(import.meta.resolve('../tokenMapping.json'))).json()

await Deno.writeTextFile('./tokenMapping.json', JSON.stringify(tokenMapping))
