import { mkdtemp, rm } from 'node:fs/promises'
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
  const update = (await import('../src/commands/update')).default

  return {
    update,
    utils,
  }
}

const silenceConsola = () => {
  vi.spyOn(consola, 'start').mockImplementation(() => consola)
  vi.spyOn(consola, 'success').mockImplementation(() => consola)
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

describe('update command', () => {
  it('reports registry resolution errors with a clean CLI message', async () => {
    const home = await createTempHome()
    const { update, utils } = await loadModules(home)

    silenceConsola()
    vi.stubEnv('C_COPY_REGISTRY_PROVIDER', 'invalid-provider')

    const downloadTemplateInfoSpy = vi.spyOn(utils, 'downloadTemplateInfo')
    const exitSpy = mockProcessExit()

    await expect(update.run!({
      args: {}
    } as never)).rejects.toThrow('process.exit')

    expect(exitSpy).toHaveBeenCalledWith(1)
    expect(downloadTemplateInfoSpy).not.toHaveBeenCalled()
    expect(consola.error).toHaveBeenCalledWith('Unsupported template registry provider: invalid-provider')
  })

  it('reports registry download failures with a clean CLI message', async () => {
    const home = await createTempHome()
    const { update, utils } = await loadModules(home)

    silenceConsola()

    const downloadTemplateInfoSpy = vi.spyOn(utils, 'downloadTemplateInfo').mockRejectedValue(new Error('registry fetch failed'))
    const exitSpy = mockProcessExit()

    await expect(update.run!({
      args: {}
    } as never)).rejects.toThrow('process.exit')

    expect(downloadTemplateInfoSpy).toHaveBeenCalledOnce()
    expect(exitSpy).toHaveBeenCalledWith(1)
    expect(consola.error).toHaveBeenCalledWith('registry fetch failed')
  })

  it('reports non-Error registry failures with a clean CLI message', async () => {
    const home = await createTempHome()
    const { update, utils } = await loadModules(home)

    silenceConsola()

    const downloadTemplateInfoSpy = vi.spyOn(utils, 'downloadTemplateInfo').mockRejectedValue('registry fetch failed')
    const exitSpy = mockProcessExit()

    await expect(update.run!({
      args: {}
    } as never)).rejects.toThrow('process.exit')

    expect(downloadTemplateInfoSpy).toHaveBeenCalledOnce()
    expect(exitSpy).toHaveBeenCalledWith(1)
    expect(consola.error).toHaveBeenCalledWith('registry fetch failed')
  })
})