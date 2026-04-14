import { defineCommand } from 'citty'
import { registryArgs, resolveLogLevel, sharedArgs } from './_shared'
import { consola } from 'consola'
import { resolve } from 'pathe'
import { createTemplateCacheMeta, hasTemplateRegistryOverride, resolveTemplateRegistryConfig } from '../registry'
import { COPYJSON, downloadTemplateInfo, getTemplate, isExist, readTemplateCache, writeDefaultTemplateInfo } from '../utils'
import { TemplateRegistryArgs, TemplateOption } from '../types'

// const files: TemplateProvider = async (input, { auth }) => {
//   return {
//     name: "rainbow",
//     url: `https://github.com/xjccc-team/template-infos/blob/main/${input}`,
//     tar: `https://raw.githubusercontent.com/xjccc-team/template-infos/main/${input}`,
//   };
// };
// const files = registryProvider("https://raw.githubusercontent.com/xjccc-team/main/template-infos")

const selectTemplate = async (projectOptions: TemplateOption[]) => {
  const template = await consola.prompt('select a template', {
    type: 'select',
    options: projectOptions
  })

  if (!template || typeof template !== 'string') {
    consola.warn('template selection cancelled')
    process.exit(1)
  }

  return template
}

export default defineCommand({
  meta: {
    name: 'create',
    description: 'create a new project'
  },
  args: {
    ...sharedArgs,
    ...registryArgs,
    template: {
      type: 'string',
      alias: 't',
      description: 'template name from registry'
    },
    force: {
      type: 'boolean',
      description: 'refresh template registry before create',
      alias: 'f',
      default: false
    },
    offline: {
      type: 'boolean',
      description: 'use cached registry and giget cache only',
      alias: 'o',
      default: false
    },
    name: {
      type: 'positional',
      required: false,
      valueHint: 'name'
    }
  },
  async run ({ args }) {
    try {
      const logLevel = resolveLogLevel(args.logLevel)

      if (logLevel !== undefined) {
        consola.level = logLevel
      }
    } catch (error) {
      consola.error((error as Error).message)
      process.exit(1)
    }

    const invocationCwd = process.env.INIT_CWD || process.env.PWD || process.cwd()
    const projectPath = resolve(invocationCwd, args.cwd || '.')
    let template = args.template
    const registryArgs: TemplateRegistryArgs = {
      registryUrl: args.registryUrl,
      registryProvider: args.registryProvider,
      registryRepo: args.registryRepo,
      registryBranch: args.registryBranch,
      registryFile: args.registryFile,
    }
    const registryConfig = resolveTemplateRegistryConfig(registryArgs)
    const hasRegistryOverride = hasTemplateRegistryOverride(registryArgs)

    const force = args.force
    const offline = args.offline

    if (force && offline) {
      consola.error('--force and --offline cannot be used together')
      process.exit(1)
    }

    consola.start('get templates ...')

    const hasJsonFile = await isExist(COPYJSON)
    let cache = hasJsonFile
      ? await readTemplateCache()
      : undefined

    if (offline && !cache) {
      consola.error('offline mode requires cached template info, run `c-copy update` first')
      process.exit(1)
    }

    const registryChanged = cache?.meta?.registryUrl
      ? cache.meta.registryUrl !== registryConfig.resolvedUrl
      : hasRegistryOverride

    if (offline && registryChanged) {
      consola.error('offline mode cannot use cache from another registry, run `c-copy update` first')
      process.exit(1)
    }

    if (!offline && (force || !cache || registryChanged || !cache.meta)) {
      const data = await downloadTemplateInfo(registryConfig)
      const meta = createTemplateCacheMeta(registryConfig)

      await writeDefaultTemplateInfo(data, meta)

      cache = {
        meta,
        templates: data,
      }
    }

    const data = cache?.templates || {}
    const projectOptions = Object.values(data)

    if (!projectOptions.length) {
      consola.error('no templates available, run `c-copy update` first')
      process.exit(1)
    }

    const templateNames = projectOptions.map(item => item.value)
    if (!template || !templateNames.includes(template)) {
      template = await selectTemplate(projectOptions)
    }

    const templateInfo = data[template]

    consola.start('start downloading ...')

    const dir = args.name || templateInfo?.defaultDir || template
    await getTemplate({
      offline,
      dir,
      template,
      templateInfo,
      cwd: projectPath
    })

    consola.success('create project successful!!')
    consola.box(`cd ${dir} && pnpm install`)
  }
})
