import { describe, expect, it, vi } from 'vitest';

vi.mock('../../infra/infra.module.js', () => ({ DB: Symbol('DB'), DB_READ: Symbol('DB_READ'), REDIS: Symbol('REDIS'), STORAGE: Symbol('STORAGE'), OPENROUTER: Symbol('OPENROUTER') }));
const { hostCommand } = await import('./bot.service.js');

describe('hostCommand', () => {
  it('understands typed words in English and Hindi', () => {
    expect(hostCommand('RSVP')).toBe('status');
    expect(hostCommand(' स्थिति ')).toBe('status');
    expect(hostCommand('remind')).toBe('remind');
    expect(hostCommand('मेनू')).toBe('host');
  });
  it('understands button replies', () => {
    expect(hostCommand('', 'host:remind')).toBe('remind');
    expect(hostCommand('', 'host:new')).toBe('new');
  });
  it('leaves invitation details to the card flow', () => {
    expect(hostCommand('Rahul weds Priya on 10 Dec')).toBeNull();
  });
});
