import { defineCommand } from 'citty'
import { consola } from 'consola'
import { resolve } from 'pathe'
import { resolveLogLevel, sharedArgs } from './_shared'
import { createTemplateInfoFromUrl, getTemplate, resolveTemplateDirFromUrl } from '../utils'

export default defineCommand({
  meta: {
    name: 'download',
    description: 'download template content directly from a URL'
  },
  args: {
    ...sharedArgs,
    url: {
      type: 'string',
      alias: 'u',
      required: true,
      description: 'Direct template URL to download',
    },
    force: {
      type: 'boolean',
      description: 'refresh template content before download',
      alias: 'f',
      default: false,
    },
    offline: {
      type: 'boolean',
      description: 'use giget cache only',
      alias: 'o',
      default: false,
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

    if (args.force && args.offline) {
      consola.error('--force and --offline cannot be used together')
      process.exit(1)
    }

    const invocationCwd = process.env.INIT_CWD || process.env.PWD || process.cwd()
    const projectPath = resolve(invocationCwd, args.cwd || '.')
    const directUrl = args.url?.trim()

    if (!directUrl) {
      consola.error('--url is required')
      process.exit(1)
    }

    try {
      const dir = args.name || resolveTemplateDirFromUrl(directUrl)
      const templateInfo = createTemplateInfoFromUrl(directUrl, dir)

      consola.start('start downloading ...')

      await getTemplate({
        cwd: projectPath,
        dir,
        force: args.force,
        offline: args.offline,
        template: dir,
        templateInfo,
      })

      consola.success('download template successful!!')
      consola.box(`cd ${dir} && pnpm install`)
    } catch (error) {
      consola.error((error as Error).message)
      process.exit(1)
    }
  }
})
