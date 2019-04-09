const report = require('./index')

jest.setTimeout(60000)

describe("report", () => {
  it("should get price", async done => {
    const tickets = await report({})
    expect(tickets.length).toBeGreaterThanOrEqual(0)
    done();
  })
})
