import { defineCommand } from 'citty'
import consola from 'consola'
import { COPYJSON, isFile, readTemplateCache } from '../utils'

export default defineCommand({
  meta: {
    name: 'show',
    description: 'show .ccopyrc config'
  },
  async run () {
    if (await isFile(COPYJSON)) {
      const data = await readTemplateCache()
      consola.info(JSON.stringify(data, null, 2))
    } else {
      consola.error("can't find .ccopyrc")
      process.exit(1)
    }
  }
})
