import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Sidebar from '../components/Sidebar';
import ChatPanel from '../components/ChatPanel';
import { clearAllDatabaseData } from '../utils/api';

describe('Saved User Search & Profile Messaging Flow', () => {
  const currentUser = {
    id: 'user_alice',
    name: 'Alice Wonder',
    username: '@alice',
    email: 'alice@example.com',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb'
  };

  const savedUsers = [
    {
      id: 'user_bob',
      name: 'Bob Builder',
      username: '@bob',
      email: 'bob@example.com',
      phone: '+1234567890',
      bio: 'Can we fix it? Yes we can!',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d',
      isOnline: true
    },
    {
      id: 'user_charlie',
      name: 'Charlie Chaplin',
      username: '@charlie',
      email: 'charlie@silent.com',
      bio: 'Silent comedian',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330',
      isOnline: false
    }
  ];

  beforeEach(() => {
    localStorage.clear();
  });

  it('Sidebar searches saved users by name, username, and email', () => {
    const onSelectChatTarget = vi.fn();
    render(
      <Sidebar
        allUsers={savedUsers}
        onlineUsers={savedUsers.filter(u => u.isOnline)}
        currentUser={currentUser}
        activeChatTarget="global"
        onSelectChatTarget={onSelectChatTarget}
      />
    );

    const searchInput = screen.getByPlaceholderText(/Search user to chat/i);

    // Search by Name
    fireEvent.change(searchInput, { target: { value: 'Charlie' } });
    expect(screen.getByText('Charlie Chaplin')).toBeInTheDocument();
    expect(screen.queryByText('Bob Builder')).not.toBeInTheDocument();

    // Search by email
    fireEvent.change(searchInput, { target: { value: 'bob@example.com' } });
    expect(screen.getByText('Bob Builder')).toBeInTheDocument();
    expect(screen.queryByText('Charlie Chaplin')).not.toBeInTheDocument();

    // Search by username
    fireEvent.change(searchInput, { target: { value: 'bob' } });
    expect(screen.getByText('Bob Builder')).toBeInTheDocument();
  });

  it('Sidebar allows selecting a saved user to open private chat', () => {
    const onSelectChatTarget = vi.fn();
    render(
      <Sidebar
        allUsers={savedUsers}
        onlineUsers={savedUsers.filter(u => u.isOnline)}
        currentUser={currentUser}
        activeChatTarget="global"
        onSelectChatTarget={onSelectChatTarget}
      />
    );

    const userCard = screen.getByText('Bob Builder');
    fireEvent.click(userCard);

    expect(onSelectChatTarget).toHaveBeenCalledWith(expect.objectContaining({
      id: 'user_bob',
      name: 'Bob Builder'
    }));
  });

  it('ChatPanel header search finds saved users and initiates private chat', () => {
    const onSelectChatTarget = vi.fn();
    render(
      <ChatPanel
        messages={[]}
        allUsers={savedUsers}
        activeChatTarget="global"
        onSelectChatTarget={onSelectChatTarget}
        currentUser={currentUser}
        onlineUsers={savedUsers.filter(u => u.isOnline)}
      />
    );

    // Open header search
    const searchToggle = screen.getByTitle(/Search Users & Messages/i);
    fireEvent.click(searchToggle);

    const chatSearchInput = screen.getByPlaceholderText(/Search users or messages/i);
    fireEvent.change(chatSearchInput, { target: { value: 'Charlie' } });

    // Matching user item appears in search dropdown
    const matchedUserItem = screen.getByText('Charlie Chaplin');
    expect(matchedUserItem).toBeInTheDocument();

    // Clicking matching user selects them for chat
    fireEvent.click(matchedUserItem);
    expect(onSelectChatTarget).toHaveBeenCalledWith(expect.objectContaining({
      id: 'user_charlie',
      name: 'Charlie Chaplin'
    }));
  });

  it('ChatPanel displays 1-on-1 private messages between currentUser and selected saved user', () => {
    const messages = [
      {
        id: 'msg_1',
        senderId: 'user_alice',
        senderName: 'Alice Wonder',
        recipientId: 'user_bob',
        text: 'Hello Bob! How are you?',
        timestamp: '10:00 AM',
        status: 'read'
      },
      {
        id: 'msg_2',
        senderId: 'user_bob',
        senderName: 'Bob Builder',
        recipientId: 'user_alice',
        text: 'Hey Alice! All is good.',
        timestamp: '10:01 AM',
        status: 'read'
      },
      {
        id: 'msg_3',
        senderId: 'user_alice',
        senderName: 'Alice Wonder',
        recipientId: 'global',
        text: 'Global message for everyone',
        timestamp: '10:02 AM',
        status: 'read'
      }
    ];

    render(
      <ChatPanel
        messages={messages}
        allUsers={savedUsers}
        activeChatTarget={savedUsers[0]} // Bob
        onSelectChatTarget={() => {}}
        currentUser={currentUser}
        onlineUsers={savedUsers.filter(u => u.isOnline)}
      />
    );

    // Private messages with Bob are shown
    expect(screen.getByText('Hello Bob! How are you?')).toBeInTheDocument();
    expect(screen.getByText('Hey Alice! All is good.')).toBeInTheDocument();

    // Global message is not displayed in Bob's 1-on-1 room
    expect(screen.queryByText('Global message for everyone')).not.toBeInTheDocument();
  });

  it('clearAllDatabaseData preserves saved users list in local storage on logout', () => {
    localStorage.setItem('securechat_user', JSON.stringify(currentUser));
    localStorage.setItem('securechat_all_users_db', JSON.stringify(savedUsers));

    clearAllDatabaseData();

    // Session is cleared
    expect(localStorage.getItem('securechat_user')).toBeNull();
    // Saved users database is preserved!
    expect(JSON.parse(localStorage.getItem('securechat_all_users_db') || '[]')).toHaveLength(2);
  });

  it('getOfflineUsersDB returns default saved localhost users on fresh mobile instance', async () => {
    const { getOfflineUsersDB } = await import('../utils/api');
    const users = getOfflineUsersDB();
    expect(users.length).toBeGreaterThan(0);
    const sonu = users.find(u => u.username === '@mcsonu143' || u.email === 'mcsonu143@gmail.com');
    expect(sonu).toBeDefined();
    expect(sonu.name).toBe('sonu panigrahi');
  });

  it('Sidebar searches and finds saved localhost user sonu panigrahi on mobile', async () => {
    const { getOfflineUsersDB } = await import('../utils/api');
    const offlineUsers = getOfflineUsersDB();
    const onSelectChatTarget = vi.fn();

    render(
      <Sidebar
        allUsers={offlineUsers}
        onlineUsers={[]}
        currentUser={currentUser}
        activeChatTarget="global"
        onSelectChatTarget={onSelectChatTarget}
      />
    );

    const searchInput = screen.getByPlaceholderText(/Search user to chat/i);

    // Search by username @mcsonu143
    fireEvent.change(searchInput, { target: { value: '@mcsonu143' } });
    expect(screen.getByText('sonu panigrahi')).toBeInTheDocument();

    // Search by partial name
    fireEvent.change(searchInput, { target: { value: 'sonu' } });
    expect(screen.getByText('sonu panigrahi')).toBeInTheDocument();

    // Click to start chat
    fireEvent.click(screen.getByText('sonu panigrahi'));
    expect(onSelectChatTarget).toHaveBeenCalledWith(expect.objectContaining({
      name: 'sonu panigrahi',
      username: '@mcsonu143'
    }));
  });
});
