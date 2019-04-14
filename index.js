const puppeteer = require('puppeteer')

const decolarUrl = 'https://www.decolar.com/shop/flights/search/roundtrip/{from}/{to}/{date1}/{date2}/{adults}/{children}/{babies}/NA/NA/NA/NA/NA/?from=SB'
const salesRegex = /^https:\/\/www.decolar.com\/shop\/flights-busquets\/api\/v1\/web\/search\?adults=.*/g
const timeout = 60000

const formatTicketUrl = ({ from, to, date1, date2, adults, children, babies }) => decolarUrl
  .replace(/{from}/, from)
  .replace(/{to}/, to)
  .replace(/{date1}/, date1)
  .replace(/{date2}/, date2)
  .replace(/{adults}/, adults)
  .replace(/{children}/, children)
  .replace(/{babies}/, babies)

const identifyTicketResponse = response => {
  const isXHR = response.request().resourceType() === 'xhr'

  const url = response.url()
  const hasTravelUrl = salesRegex.test(url)

  const ok = response.ok()

  return (
    ok &&
    isXHR && // allow XHR only
    hasTravelUrl
  )
}

const requestTickets = (page, url) => new Promise((resolve, reject) => {
  page.on('response', async response => {
    if (!identifyTicketResponse(response)) return

    try {
      const tickets = await response.json()
      resolve(tickets)
    } catch (e) {
      reject(e)
    }
  })

  page.goto(url, { waitUntil: 'networkidle2' })
})

const parseCluster = ({
  priceDetail: { totalFare: { amount } },
  routeChoices,
  airlines,
}, { referenceData, currency }) => {
  const [ route1, route2 ] = routeChoices

  const price = `${currency}${amount}`
  const airline = referenceData.airlines[airlines[0]]
  const routes = {
    [route1.type]: route1.routes[route1.selectedRouteIndex],
    [route2.type]: route2.routes[route2.selectedRouteIndex]
  }

  return { price , routes , airline }
}

const findBestTicket = (reducer, { arg: { clusters, currencies: [{ mask: currency }], referenceData }}) => {
  const bestCluster = clusters.find(({ bestCluster: bc }) => bc)
  if (!bestCluster) return reducer
  return parseCluster(bestCluster, { referenceData, currency })
}

const parseTickets = (unparsed) =>  unparsed
  .reduce(findBestTicket, undefined)

const findTicket = async ({ from, to,  date1, date2, adults, children, babies }) => {
  const browser = await puppeteer.launch()
  const page = await browser.newPage()
  page.setDefaultTimeout(timeout)

  const ticketUrl = formatTicketUrl({ from, to,  date1, date2, adults, children, babies })
  try {
    const unparsedTickets = await requestTickets(page, ticketUrl)
    const ticket = parseTickets(unparsedTickets)
    return ticket
  } catch (e) {
    throw e
  }

}

module.exports = findTicket
