import { NotFoundError, UserInputError } from '@vtex/api'
import { head } from 'ramda'

interface ProductArgs {
  skuId?: string
  salesChannel?: number
  country?: string
  postalCode?: string
}

export const queries = {
  sortSellers: async (_: unknown, rawArgs: ProductArgs, ctx: Context) => {
    const {
      clients: { search, checkout, masterdata },
      vtex: { segment },
    } = ctx

    const { skuId, country, postalCode } = rawArgs
    const salesChannel = rawArgs.salesChannel ?? segment?.channel

    if (!skuId) {
      throw new UserInputError('No product identifier provided')
    }

    const products = await search.productBySku(skuId, salesChannel)

    let product: SearchProduct | undefined

    if (products.length > 0) {
      product = head(products)
    } else {
      throw new NotFoundError(
        `No product was found with requested ${skuId} ${JSON.stringify(
          rawArgs
        )}`
      )
    }

    const item = product?.items.find((i) => i.itemId === skuId)

    const requestBody = {
      country,
      postalCode,
      items: item?.sellers.map((s) => {
        return {
          id: item.itemId,
          quantity: 1,
          seller: s.sellerId,
        }
      }),
    } as SimulationPayload

    const { logisticsInfo } = await checkout.simulation(requestBody)

    try {
      const [{ locale, sellersRanking }] = (await masterdata.searchDocuments({
        dataEntity: 'SR',
        fields: ['locale', 'sellersRanking'],
        where: `locale=${country}`,
        pagination: {
          page: 1,
          pageSize: 50,
        },
      })) as any

      const sellerLogisticsInfo = item?.sellers.map((seller, index) => {
        return {
          seller,
          ranking:
            sellersRanking.find((sr: any) => sr.sellerId === seller.sellerId)
              ?.sellerPriority ?? index + 1,
          logisticsInfo: logisticsInfo[index],
        }
      })

      if (locale === country && sellersRanking) {
        sellerLogisticsInfo?.sort((a, b) => {
          return a.ranking - b.ranking
        })
      }

      return { sellers: sellerLogisticsInfo?.map((sli) => sli.seller.sellerId) }
    } catch (error) {
      console.error(error)
    }

    return { sellers: [] }
  },
}
