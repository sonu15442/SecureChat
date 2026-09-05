import { beforeEach, describe, expect, it } from 'vitest';
import {
  createStatusUpdate,
  getActiveStatuses,
  markStatusAsViewed,
} from './statusManager';

describe('Status Management', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('creates a text status and marks it as viewed', () => {
    const status = createStatusUpdate({
      userId: 'user_alice',
      userName: 'Alice Wonder',
      type: 'text',
      text: 'Hello from SecureChat',
    });

    expect(status.text).toBe('Hello from SecureChat');
    expect(getActiveStatuses()).toContainEqual(status);

    markStatusAsViewed(status.id, 'user_bob');

    expect(getActiveStatuses().find(item => item.id === status.id).views).toContain('user_bob');
  });
});