'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/useAuthStore';
import { useQueryClient } from '@tanstack/react-query';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/v1', '') ?? 'http://localhost:3000';

let globalSocket: Socket | null = null;

/**
 * useChatSocket
 *
 * Maintains a singleton Socket.IO connection authenticated with the JWT token.
 * Handles:
 *  - Connect/disconnect lifecycle tied to auth state
 *  - Joining a specific chat room by chatId
 *  - Listening for new_message events and updating TanStack Query cache
 *  - Listening for message_read events
 *  - Broadcasting notification events to invalidate notification queries
 */
export function useChatSocket(chatId?: string) {
  const { token, isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  const joinedRoom = useRef<string | null>(null);

  // ── Connect / disconnect ─────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (globalSocket?.connected) {
        globalSocket.disconnect();
        globalSocket = null;
      }
      return;
    }

    if (!globalSocket || !globalSocket.connected) {
      globalSocket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
      });
    }

    const socket = globalSocket;

    socket.on('notification', () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    return () => {
      socket.off('notification');
    };
  }, [isAuthenticated, token, queryClient]);

  // ── Join/leave chat room + listen for messages ────────────────────
  useEffect(() => {
    if (!chatId || !globalSocket) return;

    const socket = globalSocket;

    // Join the chat room
    socket.emit('join_chat', { chatId });
    joinedRoom.current = chatId;

    const handleNewMessage = (message: any) => {
      // Prepend message to the query cache for this chat
      queryClient.setQueryData(['chat-messages', chatId], (old: any) => {
        if (!old) return old;
        // Avoid duplicates (e.g. our own optimistic message already applied)
        const pages = old.pages as any[];
        const alreadyExists = pages.some((page: any) =>
          page.data?.some((m: any) => m.id === message.id)
        );
        if (alreadyExists) return old;
        // Append to last page
        return {
          ...old,
          pages: pages.map((page: any, idx: number) =>
            idx === pages.length - 1
              ? { ...page, data: [...(page.data ?? []), message] }
              : page
          ),
        };
      });
      // Also refresh chat list unread state
      queryClient.invalidateQueries({ queryKey: ['my-chats'] });
    };

    const handleMessageRead = () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', chatId] });
      queryClient.invalidateQueries({ queryKey: ['my-chats'] });
    };

    socket.on('new_message', handleNewMessage);
    socket.on('message_read', handleMessageRead);

    return () => {
      socket.emit('leave_chat', { chatId });
      socket.off('new_message', handleNewMessage);
      socket.off('message_read', handleMessageRead);
      joinedRoom.current = null;
    };
  }, [chatId, queryClient]);

  const sendTyping = useCallback(() => {
    if (chatId && globalSocket?.connected) {
      globalSocket.emit('typing', { chatId });
    }
  }, [chatId]);

  return { sendTyping, isConnected: globalSocket?.connected ?? false };
}
