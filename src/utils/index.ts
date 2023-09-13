import { stat, rm } from 'node:fs/promises'
export const isExistDir = async (path: string) => {
  try {
    const stats = await stat(path)
    return stats.isDirectory()
  } catch (error) {
    return false
  }
}

export const removeDir = async (path: string) => {
  return rm(path, { recursive: true, force: true })
}
