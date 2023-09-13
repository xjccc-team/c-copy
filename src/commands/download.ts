import { downloadTemplate } from 'giget'
import { consola } from 'consola'

const getTemplate = async (dirName: string) => {
  const { source, dir } = await downloadTemplate(
    'github:xjccc-team/vue2-template',
    {
      dir: dirName,
      force: false
    }
  )

  console.log(source, dir)
}

getTemplate('vue2-template')
