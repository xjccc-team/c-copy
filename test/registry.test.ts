import { describe, expect, it } from 'vitest'
import {
  buildTemplateRegistryUrl,
  hasTemplateRegistryOverride,
  resolveTemplateRegistryConfig,
} from '../src/registry'

describe('registry helpers', () => {
  it('uses the default templates.json registry when no custom url is provided', () => {
    expect(resolveTemplateRegistryConfig({}, {})).toEqual({
      provider: 'github',
      repo: 'xjccc-team/template-infos',
      branch: 'main',
      file: 'templates.json',
      resolvedUrl: 'https://raw.githubusercontent.com/xjccc-team/template-infos/main/templates.json',
    })
  })

  it('builds registry URLs for github, gitlab and gitee', () => {
    expect(buildTemplateRegistryUrl({
      provider: 'github',
      repo: 'xjccc-team/template-infos',
      branch: 'main',
      file: 'templates.json',
    })).toBe('https://raw.githubusercontent.com/xjccc-team/template-infos/main/templates.json')

    expect(buildTemplateRegistryUrl({
      provider: 'gitlab',
      repo: 'team/template-infos',
      branch: 'main',
      file: 'templates.json',
    })).toBe('https://gitlab.com/team/template-infos/-/raw/main/templates.json')

    expect(buildTemplateRegistryUrl({
      provider: 'gitee',
      repo: 'team/template-infos',
      branch: 'main',
      file: 'templates.json',
    })).toBe('https://gitee.com/team/template-infos/raw/main/templates.json')
  })

  it('prefers direct registry URL when provided', () => {
    expect(resolveTemplateRegistryConfig({
      registryUrl: 'https://example.com/templates.json',
      registryProvider: 'gitlab',
      registryRepo: 'team/template-infos',
    }, {})).toEqual({
      provider: 'url',
      url: 'https://example.com/templates.json',
      repo: undefined,
      branch: '',
      file: '',
      resolvedUrl: 'https://example.com/templates.json',
    })
  })

  it('rejects malformed direct registry URLs with a clearer error', () => {
    expect(() => buildTemplateRegistryUrl({
      provider: 'url',
      url: 'not-a-valid-url',
      branch: '',
      file: '',
    })).toThrow('invalid registry url: not-a-valid-url')
  })

  it('rejects unsupported direct registry URL protocols', () => {
    expect(() => buildTemplateRegistryUrl({
      provider: 'url',
      url: 'file:///tmp/templates.json',
      branch: '',
      file: '',
    })).toThrow('invalid registry url protocol: file:. Only http: and https: are supported')
  })

  it('detects registry overrides from environment variables', () => {
    expect(hasTemplateRegistryOverride({}, {
      C_COPY_REGISTRY_PROVIDER: 'gitlab',
    })).toBe(true)
  })
})