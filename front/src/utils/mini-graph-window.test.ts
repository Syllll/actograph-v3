/** @jest-environment jsdom */
import { openMiniGraphWindow, type MiniGraphMessage } from './mini-graph-window';
import type { MiniGraphSnapshot } from './mini-graph-data';
class MockChannel {
  static current: MockChannel;
  onmessage: ((event: { data: MiniGraphMessage }) => void) | null = null;
  postMessage = jest.fn(); close = jest.fn();
  constructor(public name: string) { MockChannel.current = this; }
}
const snapshot = { observation: { id: 1, name: 'Test', protocol: { name: 'P' }, readings: [] }, selectedTime: null } as unknown as MiniGraphSnapshot;
function setup() {
  const popup = { closed: false, close: jest.fn() };
  jest.spyOn(window, 'open').mockReturnValue(popup as unknown as Window);
  const options = { snapshot: () => snapshot, onDetached: jest.fn(), onAttached: jest.fn(), onFailure: jest.fn() };
  const bridge = openMiniGraphWindow(options)!;
  return { options, popup, bridge, channel: MockChannel.current };
}
beforeEach(() => {
  jest.useFakeTimers(); Object.defineProperty(window, 'BroadcastChannel', { value: MockChannel, configurable: true });
  Object.defineProperty(window.crypto, 'randomUUID', { value: () => 'd578f272-aaaa-4000-8000-39c920bb8021', configurable: true });
});
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });
it('waits for readiness and sends monotone revisions with live data', () => {
  const { options, bridge, channel } = setup(); bridge.publish(); expect(channel.postMessage).not.toHaveBeenCalled();
  channel.onmessage!({ data: { type: 'ready' } }); bridge.publish();
  expect(options.onDetached).toHaveBeenCalledTimes(1);
  expect(channel.postMessage.mock.calls.map(call => call[0].revision)).toEqual([1, 2]); bridge.close();
});
it('closes everything and rejects a late ready event after route disposal', () => {
  const { options, bridge, channel, popup } = setup(); const handler = channel.onmessage!; bridge.close(); bridge.close();
  handler({ data: { type: 'ready' } }); expect(options.onDetached).not.toHaveBeenCalled();
  expect(popup.close).toHaveBeenCalledTimes(1); expect(channel.close).toHaveBeenCalledTimes(1); expect(jest.getTimerCount()).toBe(0);
});
it('returns to the floating panel when the popup closes or asks to reattach', () => {
  const { options, bridge, channel } = setup(); channel.onmessage!({ data: { type: 'attach' } });
  expect(options.onAttached).toHaveBeenCalledTimes(1); expect(jest.getTimerCount()).toBe(0); bridge.close();
});
it('recovers from an orphan or failed hydration handshake', () => {
  const { options, channel } = setup(); jest.advanceTimersByTime(21000);
  expect(options.onAttached).toHaveBeenCalledTimes(1); expect(options.onFailure).toHaveBeenCalledTimes(1);
  expect(channel.close).toHaveBeenCalledTimes(1); expect(jest.getTimerCount()).toBe(0);
});
it('keeps the panel when window.open is blocked', () => {
  jest.spyOn(window, 'open').mockReturnValue(null);
  const onFailure = jest.fn();
  expect(openMiniGraphWindow({ snapshot: () => snapshot, onDetached: jest.fn(), onAttached: jest.fn(), onFailure })).toBeNull();
  expect(onFailure).toHaveBeenCalledTimes(1); expect(MockChannel.current.close).toHaveBeenCalledTimes(1);
});
