const report = require('./index')

jest.setTimeout(60000)

const routeExpect = {
  airline: expect.any(String),
  arrival: expect.any(String),
  departure: expect.any(String),
  seats: expect.any(Number),
  stops: expect.any(Number),
}

describe("report", () => {
  it("should retrieve ticket", async done => {

    const mock = {
      from: 'sao',
      to: 'nat',
      date1: '2020-02-01',
      date2: '2020-02-10',
      adults: 2,
      children: 0,
      babies: 1,
    }

    let ticket
    try {
      ticket = await report(mock)
    } catch(e) {
      console.error(e)
    }

    expect(ticket).toMatchObject({
      price: expect.any(String),
      routes: expect.objectContaining({
        inbound: expect.objectContaining(routeExpect),
        outbound: expect.objectContaining(routeExpect),
      }),
      url: expect.any(String),
      _date: expect.any(Date),
    })


    done()
  })

  it("should fail on past dates", async done => {
    const mockFail = {
      from: 'sao',
      to: 'bsb',
      date1: '2019-02-01',
      date2: '2019-02-10',
      adults: 2,
      children: 0,
      babies: 1,
    }

    try {
      await report(mockFail)
      done.fail(Error('function returned'))
    }
    catch(e) {
      expect(e).toBeInstanceOf(Error)
      done()
    }
  })
})
