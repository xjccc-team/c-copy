import { defineCommand } from 'citty'
import { sharedArgs } from './_shared'
import { DownloadTemplateOptions, downloadTemplate } from 'giget'
import { consola } from 'consola'
import { resolve, join } from 'pathe'
import { readFile, writeFile } from 'node:fs/promises'
import { isExist, removeDir, __dirname, COPYJSON } from '../utils'
import ini from 'ini'

type SelectOption = {
  label: string
  value: string
  hint?: string
}

interface TemplateOptions extends DownloadTemplateOptions {
  dirName: string
  template?: string
  fileName?: string
}

async function confirm (path: string) {
  const isConfirm = await consola.prompt(
    `project: ${path} is exist, do you want continue?`,
    {
      type: 'confirm'
    }
  )
  
  if (!isConfirm || typeof isConfirm !== 'boolean') {
    process.exit(1)
  }
  
  consola.success('continue ...')

  return isConfirm
}

// const files: TemplateProvider = async (input, { auth }) => {
//   return {
//     name: "rainbow",
//     url: `https://github.com/xjccc-team/template-infos/blob/main/${input}`,
//     tar: `https://raw.githubusercontent.com/xjccc-team/template-infos/main/${input}`,
//   };
// };
// const files = registryProvider("https://raw.githubusercontent.com/xjccc-team/main/template-infos")

const getTemplate = async (options: TemplateOptions) => {
  const { dirName, template = dirName, fileName = '' } = options
  const cwd = options.cwd || process.cwd() || '.'
  const path = join(cwd, dirName)

  if (await isExist(path)) {
    options.forceClean = await confirm(path)
  }
  if (!template) {
    consola.error('--template to get template')
    process.exit(1)
  }

  const defaultGithub = `github:xjccc-team/${template}`

  const source = fileName ? fileName : defaultGithub

  return await downloadTemplate(source, {
    ...options,
    cwd,
    dir: dirName
  })
}

export default defineCommand({
  meta: {
    name: 'create',
    description: 'create a new project'
  },
  args: {
    ...sharedArgs,
    template: {
      type: 'string',
      description: 'vue template name'
    },
    force: {
      type: 'boolean',
      description: 'update template json latest',
      alias: 'f',
      default: false
    },
    name: {
      type: 'positional',
      required: false,
      valueHint: 'name'
    }
  },
  async run ({ args }) {
    const projectPath = resolve(args.cwd || '.')
    let template = args.template

    const projectName = args.name || template

    consola.start('get templates ...')

    const force = args.force || false

    const hasJsonFile = await isExist(COPYJSON)

    if (force || !hasJsonFile) {
      const { dir } = await getTemplate({
        template: 'template-infos',
        // fileName: 'files:templates.json',
        // providers: { files },
        dirName: '__temp__',
        force: true
      })

      const json = await readFile(join(dir, 'templates.json'), {
        encoding: 'utf8'
      })

      const iniData = (JSON.parse(json) as SelectOption[]).reduce(
        (prev, next) => {
          prev[next.value] = next
          return prev
        },
        {} as { [key: string]: SelectOption }
      )

      await removeDir(dir)

      await writeFile(COPYJSON, ini.stringify(iniData))
    }

    const data = ini.parse(
      await readFile(COPYJSON, {
        encoding: 'utf8'
      })
    )

    const projectOptions: SelectOption[] = Object.keys(data).map(item => {
      return data[item]
    })

    const templateNames = projectOptions.map(item => item.value)
    if (!template || !templateNames.includes(template)) {
      template = (await consola.prompt('select a template', {
        type: 'select',
        options: projectOptions
      })) as unknown as string
    }

    consola.start('start downloading ...')
    const dirName = projectName || template
    await getTemplate({
      dirName,
      template,
      cwd: projectPath
    })

    consola.success('create project successful!!')
    consola.box(`cd ${dirName} && pnpm install`)
  }
})
