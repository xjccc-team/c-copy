import { defineCommand } from 'citty'
import consola from 'consola'
import { unlink, rm } from 'node:fs/promises'
import { COPYJSON, gigetDir, isExist } from '../utils'

export default defineCommand({
  meta: {
    name: 'clean',
    description: 'delete .ccopyrc & .cache/giget'
  },
  async run () {
    if (await isExist(COPYJSON)) {
      await unlink(COPYJSON)
    }
    
    if (await isExist(gigetDir)) {
      await rm(gigetDir, { recursive: true, force: true })
    }
    consola.success('success to delete .ccopyrc & .cache/giget')
  }
})
