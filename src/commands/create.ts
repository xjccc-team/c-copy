import { defineCommand } from 'citty'
import { sharedArgs } from './_shared'
import { DownloadTemplateOptions, downloadTemplate } from 'giget'
import { consola } from 'consola'
import { resolve, join } from 'pathe'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { isExist, removeDir, __dirname, COPYJSON, COPYDIR } from '../utils'

type SelectOption = {
  label: string
  value: string
  hint?: string
}

interface TemplateOptions extends DownloadTemplateOptions {
  dirName: string
}

async function confirm (path: string) {
  const isConfirm = await consola.prompt(
    `project: ${path} is exist, do you want continue?`,
    {
      type: 'confirm'
    }
  )
  if (!isConfirm) {
    process.exit(1)
  }
  await removeDir(path)
}

const getTemplate = async (options: TemplateOptions) => {
  const { dirName } = options
  const cwd = options.cwd || process.cwd() || '.'
  const path = join(cwd, dirName)

  if (await isExist(path)) {
    await confirm(path)
  }
  if (!dirName) {
    consola.error('--template to get template')
    process.exit(1)
  }
  return await downloadTemplate(
    `github:xjccc-team/${dirName}`,
    {
      ...options,
      cwd,
      dir: dirName
    }
  )
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
    }
    // name: {
    //   type: 'positional',
    //   required: true,
    //   valueHint: 'name'
    // }
  },
  async run ({ args }) {
    const projectPath = resolve(args.cwd || '.')
    let template = args.template
    consola.start('get templates ...')

    const force = args.force || false

    const hasJsonFile = await isExist(COPYJSON)

    console.log(force, hasJsonFile, COPYJSON)

    if (force || !hasJsonFile) {
      const { dir } = await getTemplate({ dirName: 'template-infos', force })
      
      const json = await readFile(join(dir, 'templates.json'), {
        encoding: 'utf8'
      })

      await removeDir(dir)
      console.log(COPYDIR, await isExist(COPYDIR))
      
      if (!(await isExist(COPYDIR))) {
        await mkdir(COPYDIR)
      }

      await writeFile(COPYJSON, json)
    }

    const data = await readFile(COPYJSON, {
      encoding: 'utf8'
    })

    const projectOptions: SelectOption[] = JSON.parse(data)

    const templateNames = projectOptions.map(item => item.value)
    if (!template || !templateNames.includes(template)) {
      template = (await consola.prompt('select a template', {
        type: 'select',
        options: projectOptions
      })) as unknown as string
    }

    if (await isExist(join(projectPath, template))) {
      await confirm(join(projectPath, template))
    }

    consola.start('downloading ...')

    await getTemplate({ dirName: template, cwd: projectPath })

    consola.success('create project successful!!')
  }
})
