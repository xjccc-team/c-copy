import { stat, rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'pathe'

export const isExist = async (path: string) => {
  try {
    const stats = await stat(path)
    return stats.isDirectory() || stats.isFile()
  } catch (error) {
    return false
  }
}

export const removeDir = async (path: string) => {
  return rm(path, { recursive: true, force: true })
}

export const __filename = fileURLToPath(import.meta.url)
export const __dirname = dirname(__filename)

export const HOME = process.env[process.platform === 'win32' ? 'USERPROFILE' : 'HOME'] || '/'
export const COPYDIR = join(HOME, 'c-copy')
export const COPYJSON = join(COPYDIR, 'c-copy.json')
