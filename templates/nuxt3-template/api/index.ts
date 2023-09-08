import { DEBUG } from '~~/composables/env'
import type { FetchOptions } from 'ofetch'

const ajax = new CustomFetch({
  baseURL: ''
})

interface Types {
  example: string
}

const headers = {}

export const exampleApi = (params: FetchOptions['params']) =>
  ajax.get<Types>('url', {
    params,
    headers
  })
