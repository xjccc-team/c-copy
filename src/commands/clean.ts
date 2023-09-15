import { defineCommand } from 'citty'
import consola from 'consola'
import { readFile, unlink } from 'node:fs/promises'
import { COPYJSON } from '../utils'

export default defineCommand({
  meta: {
    name: 'clean',
    description: 'delete .ccopyrc'
  },
  async run () {
    const json = await readFile(COPYJSON, { encoding: 'utf8' })
    if (!json) {
      consola.success('do not need delete .ccopyrc')
      process.exit(0)
    }
    await unlink(COPYJSON)
    consola.success('success to delete .ccopyrc')
  }
})
