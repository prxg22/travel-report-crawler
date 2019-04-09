const puppeteer = require('puppeteer')

const screenshot = async (page, path) => await page.screenshot({ path: `${path}.png` })
const decolarUrl = 'https://www.decolar.com/shop/flights/search/roundtrip/SAO/NAT/2019-08-01/2019-08-05/2/0/1/NA/NA/NA/NA/NA/?from=SB'
const resourceUrl = "https://www.decolar.com/shop/flights-busquets/api/v1/web/search"
const salesRegex = /^https:\/\/www.decolar.com\/shop\/flights-busquets\/api\/v1\/web\/search\?adults./g
const timeout = 60000

const getTickets = async response => {
  const type = response.request().resourceType()
  const url = response.url()
  const headers = response.headers()

  if (
    !response.ok()   ||
    ('xhr' !== type) || // allow XHR only
    !salesRegex.test(url)
  ) return


  const tickets = await response.json()
  return tickets
}


const evaluate = async ({ airport1, airport2, date1, date2 }) => {
  const browser = await puppeteer.launch()
  const page = await browser.newPage()

  page.setDefaultTimeout(timeout)

  const res = new Promise((resolve, reject) => {
    page.on('response', async response => {
      tickets = await getTickets(response)
      if (!tickets) return
      resolve(tickets)
    })
  })

  await page.goto(decolarUrl, { waitUntil: 'networkidle2' })
  await browser.close()
  
  return res
}

module.exports = evaluate
