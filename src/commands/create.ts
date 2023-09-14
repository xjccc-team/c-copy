import { defineCommand } from 'citty'
import { sharedArgs } from './_shared'
import { DownloadTemplateOptions, downloadTemplate } from 'giget'
import { consola } from 'consola'
import { resolve, join } from 'pathe'
import { readFile } from 'fs/promises'
import { isExistDir, removeDir } from '../utils'

type SelectOption = {
  label: string
  value: string
  hint?: string
}

interface TemplateOptions extends DownloadTemplateOptions {
  dirName: string
}

const getTemplate = async (options: TemplateOptions) => {
  const { dirName } = options
  const path = join(process.cwd(), dirName)

  if (await isExistDir(path)) {
    await removeDir(path)
  }
  if (!dirName) {
    consola.error('--template to get template')
    process.exit(1)
  }
  const { source, dir } = await downloadTemplate(
    `github:xjccc-team/${dirName}`,
    {
      ...options,
      dir: dirName
    }
  )

  return {
    source,
    dir
  }
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
    force :{
      type: 'boolean',
      description: 'update template json latest',
      alias: 'f'
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

    const jsonDir = join(import.meta.url, '../../', 'template-infos')
console.log(jsonDir);

    if (force || !(await isExistDir(jsonDir))) {
      await getTemplate({ dirName: 'template-infos', force })
    }

    const jsonPath = join(jsonDir, 'templates.json')
    
    const data = await readFile(jsonPath, {
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
    if (await isExistDir(join(projectPath, template))) {
      const confirm = await consola.prompt(
        'project is exist, do you want continue?',
        {
          type: 'confirm'
        }
      )
      if (!confirm) {
        process.exit(1)
      }
      removeDir(join(projectPath, template))
    }

    consola.start('downloading ...')

    await getTemplate({ dirName: template, cwd: join(projectPath, template) })

    consola.success('create project successful!!')
  }
})
