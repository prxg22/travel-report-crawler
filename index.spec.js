const report = require('./index')

jest.setTimeout(60000)

const mock = {
  from: 'sao',
  to: 'nat',
  date1: '2020-03-01',
  date2: '2019-03-06',
  adults: 2,
  children: 0,
  babies: 1,
}

const routeExpect = {
  airline: expect.any(String),
  arrival: expect.any(String),
  departure: expect.any(String),
  seats: expect.any(Number),
  stops: expect.any(Number),
}

describe("report", () => {
  it("should retrieve ticket", async done => {
    const ticket = await report(mock)
    expect(ticket).toMatchObject({
      price: expect.any(String),
      routes: expect.objectContaining({
        inbound: expect.objectContaining(routeExpect),
        outbound: expect.objectContaining(routeExpect),
      }),
      url: expect.any(String),
      _date: expect.any(Date),
    })
    done();
  })
})
