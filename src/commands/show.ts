import { defineCommand } from 'citty'
import consola from 'consola'
import { getErrorMessage } from './_shared'
import { COPYJSON, isFile, readTemplateCache } from '../utils'

export default defineCommand({
  meta: {
    name: 'show',
    description: 'show .ccopyrc config'
  },
  async run () {
    if (await isFile(COPYJSON)) {
      try {
        const data = await readTemplateCache()
        consola.info(JSON.stringify(data, null, 2))
      } catch (error) {
        consola.error(getErrorMessage(error))
        process.exit(1)
      }
    } else {
      consola.error('.ccopyrc was not found or is not a file')
      process.exit(1)
    }
  }
})
