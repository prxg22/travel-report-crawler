const report = require('./index')

jest.setTimeout(60000)

const mock = {
  from: 'SAO',
  to: 'NAT',
  date1: '2019-12-01',
  date2: '2019-12-06',
  adults: 2,
  children: 0,
  babies: 1,
}

describe("report", () => {
  it("should retrieve ticket", async done => {
    const ticket = await report(mock)
    expect(ticket).toMatchObject({
      price: expect.any(String),
      routes: expect.objectContaining({
        INBOUND: expect.any(Object),
        OUTBOUND: expect.any(Object)
      }),
      airline: expect.any(String),
    })
    done();
  })
})
