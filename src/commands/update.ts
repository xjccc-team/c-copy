import { defineCommand } from 'citty'
import { downloadTemplateInfo, writeDefaultTemplateInfo } from '../utils'
import consola from 'consola'

export default defineCommand({
  meta: {
    name: 'update',
    description: 'update .ccopyrc template info'
  },
  async run () {
    consola.start('updating ...')
    const data = await downloadTemplateInfo()
    await writeDefaultTemplateInfo(data)
    consola.success('update success!!')
  }
})
