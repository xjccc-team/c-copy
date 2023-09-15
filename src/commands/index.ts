import { CommandDef } from 'citty'

const _rDefault = (r: any) => (r.default || r) as Promise<CommandDef>

export const commands = {
  create: () => import('./create').then(_rDefault),
  show: () => import('./show').then(_rDefault),
  clean: () => import('./clean').then(_rDefault)
} as const
