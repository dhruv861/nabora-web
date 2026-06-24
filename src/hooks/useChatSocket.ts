'use client';

import { useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/useAuthStore';
import { useQueryClient } from '@tanstack/react-query';

const SOCKET_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/v1').replace('/v1', '');

let globalSocket: Socket | null = null;

export function useChatSocket(chatId?: string) {
  const { token, isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  const joinedRoom = useRef<string | null>(null);

  // ── Connect / disconnect ───────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (globalSocket?.connected) { globalSocket.disconnect(); globalSocket = null; }
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

    // Notification push — invalidate query so bell badge updates
    const handleNotification = () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
      queryClient.invalidateQueries({ queryKey: ['my-chats'] });
    };
    socket.on('notification', handleNotification);

    return () => { socket.off('notification', handleNotification); };
  }, [isAuthenticated, token, queryClient]);

  // ── Join/leave chat room ─────────────────────────────────────────────
  useEffect(() => {
    if (!chatId || !globalSocket) return;
    const socket = globalSocket;

    socket.emit('join_chat', { chatId });
    joinedRoom.current = chatId;

    const handleNewMessage = (message: any) => {
      queryClient.setQueryData(['chat-messages', chatId], (old: any) => {
        if (!old) return old;
        const pages = old.pages as any[];
        const alreadyExists = pages.some((page: any) => page.data?.some((m: any) => m.id === message.id));
        if (alreadyExists) return old;
        return {
          ...old,
          pages: pages.map((page: any, idx: number) =>
            idx === pages.length - 1
              ? { ...page, data: [...(page.data ?? []), message] }
              : page
          ),
        };
      });
      queryClient.invalidateQueries({ queryKey: ['my-chats'] });
    };

    const handleMessageRead = () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', chatId] });
      queryClient.invalidateQueries({ queryKey: ['my-chats'] });
    };

    // Relay typing to the page via a custom DOM event (avoids prop drilling)
    const handleTyping = (data: { userId: string; chatId: string }) => {
      window.dispatchEvent(new CustomEvent('nabora:user_typing', { detail: data }));
    };

    socket.on('new_message', handleNewMessage);
    socket.on('message_read', handleMessageRead);
    socket.on('user_typing', handleTyping);

    return () => {
      socket.emit('leave_chat', { chatId });
      socket.off('new_message', handleNewMessage);
      socket.off('message_read', handleMessageRead);
      socket.off('user_typing', handleTyping);
      joinedRoom.current = null;
    };
  }, [chatId, queryClient]);

  const sendTyping = useCallback(() => {
    if (chatId && globalSocket?.connected) globalSocket.emit('typing', { chatId });
  }, [chatId]);

  return { sendTyping, isConnected: globalSocket?.connected ?? false };
}
