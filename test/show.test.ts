import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import consola from 'consola'
import { afterEach, describe, expect, it, vi } from 'vitest'

const tempDirs: string[] = []

const createTempHome = async () => {
  const dir = await mkdtemp(join(tmpdir(), 'c-copy-'))
  tempDirs.push(dir)
  return dir
}

const loadModules = async (home: string) => {
  vi.resetModules()
  vi.stubEnv('HOME', home)
  vi.stubEnv('USERPROFILE', home)

  const utils = await import('../src/utils/index')
  const show = (await import('../src/commands/show')).default

  return {
    show,
    utils,
  }
}

const silenceConsola = () => {
  vi.spyOn(consola, 'info').mockImplementation(() => consola)
  vi.spyOn(consola, 'error').mockImplementation(() => consola)
}

const mockProcessExit = () => {
  return vi.spyOn(process, 'exit').mockImplementation((() => {
    throw new Error('process.exit')
  }) as never)
}

afterEach(async () => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.resetModules()

  await Promise.all(tempDirs.splice(0).map(dir => rm(dir, { recursive: true, force: true })))
})

describe('show command', () => {
  it('reports when .ccopyrc exists but is not a file', async () => {
    const home = await createTempHome()
    const { show, utils } = await loadModules(home)

    silenceConsola()
    const exitSpy = mockProcessExit()

    await mkdir(utils.COPYJSON)

    await expect(show.run!({} as never)).rejects.toThrow('process.exit')

    expect(exitSpy).toHaveBeenCalledWith(1)
    expect(consola.error).toHaveBeenCalledWith('.ccopyrc was not found or is not a file')
  })
})