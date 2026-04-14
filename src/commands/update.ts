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
    const registryArgs: TemplateRegistryArgs = {
      registryUrl: args.registryUrl,
      registryProvider: args.registryProvider,
      registryRepo: args.registryRepo,
      registryBranch: args.registryBranch,
      registryFile: args.registryFile,
    }
    const registryConfig = resolveTemplateRegistryConfig(registryArgs)

    consola.start('updating ...')
    const data = await downloadTemplateInfo(registryConfig)
    await writeDefaultTemplateInfo(data, createTemplateCacheMeta(registryConfig))
    consola.success('update success!!')
  }
})
