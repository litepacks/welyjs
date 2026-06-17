import { describe, it, expect, withHost } from 'welyjs/test'
import './w-todo-demo'

describe('w-todo-demo', () => {
  it('renders', async () => {
    await withHost('w-todo-demo', undefined, (host) => {
      expect(host.shadowRoot).toBeTruthy()
    })
  })
})
