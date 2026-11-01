/**
 * Time and Date formatting for User Presence and Last Seen
 */

export function getValidLastSeenTimestamp(user) {
  if (!user) return null;
  const candidates = [user.lastSeen, user.updatedAt, user.createdAt];
  for (const c of candidates) {
    if (c && c !== 'Online' && c !== 'Offline' && !isNaN(new Date(c).getTime())) {
      return c;
    }
  }
  return null;
}

export function formatLastSeenDate(userOrTimestamp, isOnline = false) {
  if (isOnline) return 'Online';

  let timestamp = userOrTimestamp;
  if (userOrTimestamp && typeof userOrTimestamp === 'object') {
    timestamp = getValidLastSeenTimestamp(userOrTimestamp);
  }

  if (!timestamp || timestamp === 'Online' || timestamp === 'Offline') {
    return 'Offline';
  }

  const d = new Date(timestamp);
  if (isNaN(d.getTime())) return 'Offline';

  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });

  if (isToday) {
    return `Today at ${timeStr}`;
  } else if (isYesterday) {
    return `Yesterday at ${timeStr}`;
  } else {
    const day = d.getDate();
    const month = d.toLocaleDateString([], { month: 'short' });
    const year = d.getFullYear() !== now.getFullYear() ? ` ${d.getFullYear()}` : '';
    return `${day} ${month}${year} at ${timeStr}`;
  }
}

export function formatChatHeaderStatus(userOrTimestamp, isOnline = false) {
  if (isOnline) return '● Online';
  const formatted = formatLastSeenDate(userOrTimestamp, false);
  return formatted === 'Offline' ? 'Offline' : `Last seen ${formatted}`;
}

