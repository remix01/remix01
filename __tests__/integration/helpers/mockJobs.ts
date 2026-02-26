export const enqueuedJobs: Array<{ type: string; payload: Record<string, any> }> = []

export const mockEnqueue = jest.fn((type: string, payload: Record<string, any>) => {
  enqueuedJobs.push({ type, payload })
  return Promise.resolve(`job-${Date.now()}`)
})

export const clearEnqueuedJobs = () => {
  enqueuedJobs.length = 0
  mockEnqueue.mockClear()
}
