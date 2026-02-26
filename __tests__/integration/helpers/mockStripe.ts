export const mockStripe = {
  paymentIntents: {
    capture: jest.fn().mockResolvedValue({
      id: 'pi_test',
      status: 'succeeded',
      amount: 10000,
    }),
    cancel: jest.fn().mockResolvedValue({
      id: 'pi_test',
      status: 'canceled',
    }),
  },
  refunds: {
    create: jest.fn().mockResolvedValue({
      id: 're_test',
      status: 'succeeded',
      amount: 10000,
    }),
  },
}

export const clearStripeMocks = () => {
  mockStripe.paymentIntents.capture.mockClear()
  mockStripe.paymentIntents.cancel.mockClear()
  mockStripe.refunds.create.mockClear()
}
