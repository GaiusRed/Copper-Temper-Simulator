import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateCatalogSet } from '../src/catalog/validate.js'

const directory = resolve(fileURLToPath(new URL('../src/catalog/data/', import.meta.url)))
const names = ['categories', 'deities', 'materials', 'equipment', 'ingredients', 'cards', 'traits']

try {
  const catalogs = Object.fromEntries(await Promise.all(names.map(async (name) => [
    name,
    JSON.parse(await readFile(resolve(directory, `${name}.json`), 'utf8')),
  ])))
  validateCatalogSet(catalogs)
  console.log('Catalog validation passed.')
} catch (error) {
  for (const catalogError of error.errors ?? [error]) console.error(catalogError.message)
  process.exitCode = 1
}