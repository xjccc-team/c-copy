import { stat, rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import {dirname} from 'pathe'

export const isExistDir = async (path: string) => {
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