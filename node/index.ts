import type { Cached, RecorderState } from '@vtex/api'
import { LRUCache, Service } from '@vtex/api'
import schema from 'farmina.buybox-graphql/graphql'

import { Clients } from './clients'
import { schemaDirectives } from './directives'
import { resolvers } from './resolvers'

const THREE_SECONDS_MS = 3 * 1000

const searchCache = new LRUCache<string, Cached>({ max: THREE_SECONDS_MS })

metrics.trackCache('search', searchCache)

export default new Service<Clients, RecorderState, CustomContext>({
  clients: {
    implementation: Clients,
    options: {
      default: {
        retries: 2,
        timeout: THREE_SECONDS_MS,
      },
    },
  },
  graphql: {
    resolvers,
    schema,
    schemaDirectives,
  },
})
