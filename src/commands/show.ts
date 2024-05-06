import { defineCommand } from 'citty'
import consola from 'consola'
import { readFile } from 'node:fs/promises'
import { COPYJSON, isExist } from '../utils'
import ini from 'ini'

export default defineCommand({
  meta: {
    name: 'show',
    description: 'show .ccopyrc config'
  },
  async run () {
    if (await isExist(COPYJSON)) {
      const json = await readFile(COPYJSON, { encoding: 'utf8' })
      consola.info(JSON.stringify(ini.parse(json), null, 2))
    } else {
      consola.error("can't find .ccopyrc")
      process.exit(1)
    }
  }
})
