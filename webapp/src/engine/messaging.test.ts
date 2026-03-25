import { describe, it, expect, beforeEach } from 'vitest';
import { MessagingEngine, getConversationId, setOnline, isOnline } from './messaging';

describe('MessagingEngine', () => {
  beforeEach(() => localStorage.clear());

  it('generates deterministic conversation IDs', () => {
    expect(getConversationId('STZ_a', 'STZ_b')).toBe(getConversationId('STZ_b', 'STZ_a'));
  });

  it('sends and retrieves messages', () => {
    const engine = MessagingEngine.load();
    engine.sendMessage('STZ_alice', 'STZ_bob', 'Hello!');
    engine.sendMessage('STZ_bob', 'STZ_alice', 'Hi there!');

    const convo = engine.getConversation('STZ_alice', 'STZ_bob');
    expect(convo).not.toBeNull();
    expect(convo!.messages).toHaveLength(2);
    expect(convo!.messages[0].content).toBe('Hello!');
    expect(convo!.messages[1].content).toBe('Hi there!');
  });

  it('supports message types', () => {
    const engine = MessagingEngine.load();
    engine.sendMessage('STZ_alice', 'STZ_bob', 'Check this wart!', 'wart_share', 'wart_123');
    const convo = engine.getConversation('STZ_alice', 'STZ_bob');
    expect(convo!.messages[0].type).toBe('wart_share');
    expect(convo!.messages[0].refId).toBe('wart_123');
  });

  it('tracks unread counts', () => {
    const engine = MessagingEngine.load();
    engine.sendMessage('STZ_alice', 'STZ_bob', 'msg 1');
    engine.sendMessage('STZ_alice', 'STZ_bob', 'msg 2');
    engine.sendMessage('STZ_bob', 'STZ_alice', 'reply');

    const convoId = getConversationId('STZ_alice', 'STZ_bob');
    expect(engine.getUnreadCount(convoId, 'STZ_bob')).toBe(2); // 2 unread for bob
    expect(engine.getUnreadCount(convoId, 'STZ_alice')).toBe(1); // 1 unread for alice

    expect(engine.getTotalUnread('STZ_bob')).toBe(2);
  });

  it('marks conversation as read', () => {
    const engine = MessagingEngine.load();
    engine.sendMessage('STZ_alice', 'STZ_bob', 'Hello');
    const convoId = getConversationId('STZ_alice', 'STZ_bob');

    expect(engine.getUnreadCount(convoId, 'STZ_bob')).toBe(1);
    engine.markConversationRead(convoId, 'STZ_bob');
    expect(engine.getUnreadCount(convoId, 'STZ_bob')).toBe(0);
  });

  it('lists conversations sorted by last activity', () => {
    const engine = MessagingEngine.load();
    engine.sendMessage('STZ_alice', 'STZ_bob', 'old');
    engine.sendMessage('STZ_alice', 'STZ_carol', 'new');

    const convos = engine.getConversations('STZ_alice');
    expect(convos).toHaveLength(2);
    // Second message sent later, so its conversation should be first
    expect(convos[0].lastActivity).toBeGreaterThanOrEqual(convos[1].lastActivity);
  });

  it('persists across loads', () => {
    const e1 = MessagingEngine.load();
    e1.sendMessage('STZ_alice', 'STZ_bob', 'persistent');
    const e2 = MessagingEngine.load();
    expect(e2.getConversations('STZ_alice')).toHaveLength(1);
  });

  it('deletes conversations', () => {
    const engine = MessagingEngine.load();
    engine.sendMessage('STZ_alice', 'STZ_bob', 'msg');
    const convoId = getConversationId('STZ_alice', 'STZ_bob');
    engine.deleteConversation(convoId);
    expect(engine.getConversations('STZ_alice')).toHaveLength(0);
  });
});

describe('Online Status', () => {
  beforeEach(() => localStorage.clear());

  it('sets and checks online status', () => {
    setOnline('STZ_alice');
    expect(isOnline('STZ_alice')).toBe(true);
    expect(isOnline('STZ_bob')).toBe(false);
  });
});
