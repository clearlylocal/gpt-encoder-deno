const encoder = await (await fetch(import.meta.resolve('./encoder.json'))).json()

await Deno.writeTextFile('./encoder.json', JSON.stringify(encoder))
