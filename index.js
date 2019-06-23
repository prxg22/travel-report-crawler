const puppeteer = require('puppeteer')

const decolarUrl = 'https://www.decolar.com/shop/flights/search/roundtrip/{from}/{to}/{date1}/{date2}/{adults}/{children}/{babies}/NA/NA/NA/NA/NA/?from=SB'
const salesRegex = /^https:\/\/www.decolar.com\/shop\/flights-busquets\/api\/v1\/web\/search\?adults=.*/g
const badRequestRegex = /^https:\/\/www.decolar.com\/shop\/flights.*/

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

const checkBadResponse = response => {
  const isBadRequest = +response.status() >= 300
  const hasBadRequestUrl = badRequestRegex.test(response.url())

  if (
    !isBadRequest ||
    !hasBadRequestUrl
  ) return

  throw Error(`bad script found ${response.url()}`)
}

// const requestTickets = (page, url) => new Promise((resolve, reject) => {
//   page.on('response', async response => {
//     try {
//       checkBadResponse(response)
//       if (!identifyTicketResponse(response)) return
//       const tickets = await response.json()
//       resolve(tickets)
//     } catch (e) {
//       await page._client.send("Page.stopLoading")
//       throw e
//     }
//   })
//
//   page.goto(url, { waitUntil: 'networkidle2' })
//     .then(resolve)
//     .catch(reject)
// })

const requestTickets = async (page, url) => {
  const tickets = new Promise((resolve, reject) => {
    page.on('response', response => {
      const close = async (e) => {
        await page.close()
      }

      try {
        checkBadResponse(response)
      } catch(e) {
        close(e)
      }

      if (!identifyTicketResponse(response)) return

      response.json()
        .then(resolve)
        .catch(close)
    })
  })

  try {
    await page.goto(url, { waitUntil: 'networkidle2' })
    return tickets
  } catch (e) {
    throw e
  }
}

const parseRound = ({ airportCode, date }) => `${airportCode} - ${date}`

const parseRoute = ({
  airlines,
  arrival,
  departure,
  seatsRemaining: seats,
  stopsCount: stops
}, referenceData) => {
  const airline = referenceData[airlines[0]]

  return {
    airline,
    stops,
    seats,
    departure: parseRound(departure),
    arrival: parseRound(arrival)
  }
}

const parseCluster = ({
  priceDetail: { totalFare: { amount } },
  routeChoices,
}, { referenceData, currency }) => {
  const [ route1, route2 ] = routeChoices

  const price = `${currency}${amount}`
  const routes = {
    [route1.type.toLowerCase()]: parseRoute(route1.routes[route1.selectedRouteIndex], referenceData.airlines),
    [route2.type.toLowerCase()]: parseRoute(route2.routes[route2.selectedRouteIndex], referenceData.airlines),
  }

  return { price , routes }
}

const findBestTicket = (reducer, { arg: { clusters, currencies: [{ mask: currency }], referenceData }}) => {
  const bestCluster = clusters.find(({ bestCluster: bc }) => bc)
  if (!bestCluster) return reducer
  return parseCluster(bestCluster, { referenceData, currency })
}

const reduceTickets = (unparsed) =>  unparsed
  .reduce(findBestTicket, undefined)

const findTicket = async ({ from: _from, to: _to,  date1, date2, adults, children, babies }) => {
  let browser, page

  const close = async () => {
    try {
      if (!page.isClosed) await page.close()
      await browser.close()
    } catch(e) {
      console.error(`error closing browser/page: ${e.message}`, e.stack)
    }
  }

  try {
    const from = _from.toUpperCase()
    const to = _to.toUpperCase()
    browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox']})
    page = await browser.newPage()
    page.setDefaultTimeout(timeout)

    const ticketUrl = formatTicketUrl({ from, to,  date1, date2, adults, children, babies })
    console.log(`starting search in`, ticketUrl)
    const unparsedTickets = await requestTickets(page, ticketUrl)
    close()
    console.log(`tickets found. starting parse`)
    const ticket = reduceTickets(unparsedTickets)
    console.log('best ticket found', ticket)

    return {
      url: ticketUrl,
      _date: new Date(),
      ...ticket
    }
  } catch (e) {
    await close()
    throw e
  }
}

module.exports = findTicket
