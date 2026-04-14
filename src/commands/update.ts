import { defineCommand } from 'citty'
import { downloadTemplateInfo, writeDefaultTemplateInfo } from '../utils'
import consola from 'consola'
import { registryArgs } from './_shared'
import { createTemplateCacheMeta, resolveTemplateRegistryConfig } from '../registry'
import { TemplateRegistryArgs } from '../types'

export default defineCommand({
  meta: {
    name: 'update',
    description: 'update .ccopyrc template info'
  },
  args: {
    ...registryArgs,
  },
  async run ({ args }) {
    const registryInput: TemplateRegistryArgs = {
      registryUrl: args.registryUrl,
      registryProvider: args.registryProvider,
      registryRepo: args.registryRepo,
      registryBranch: args.registryBranch,
      registryFile: args.registryFile,
    }

    try {
      const registryConfig = resolveTemplateRegistryConfig(registryInput)

      consola.start('updating ...')
      const data = await downloadTemplateInfo(registryConfig)
      await writeDefaultTemplateInfo(data, createTemplateCacheMeta(registryConfig))
      consola.success('update success!!')
    } catch (error) {
      consola.error((error as Error).message)
      process.exit(1)
    }
  }
})
