'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { Avatar } from '@/components/Avatar';
import { LoadingState } from '@/components/LoadingState';
import { EmptyState } from '@/components/EmptyState';
import { useChatSocket } from '@/hooks/useChatSocket';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function ChatThreadPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const chatId = params.id as string;

  const [message, setMessage] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Connect socket and join this chat room
  const { sendTyping } = useChatSocket(chatId);

  // Chat metadata (counterparty name, hireId)
  const { data: chats } = useQuery({
    queryKey: ['my-chats'],
    queryFn: async () => {
      const res = await api.get('/chats');
      return res.data as any[];
    },
  });
  const chatMeta = chats?.find((c: any) => c.id === chatId);

  // Messages — infinite scroll (cursor-based, oldest to newest)
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['chat-messages', chatId],
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) => {
      const params: Record<string, string> = { limit: '30' };
      if (pageParam) params.cursor = pageParam;
      const res = await api.get(`/chats/${chatId}/messages`, { params });
      return res.data as { data: any[]; nextCursor: string | null };
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  const allMessages = data?.pages.flatMap((p) => p.data) ?? [];

  // Mark as read on mount + when new messages arrive
  useEffect(() => {
    if (!chatId) return;
    api.patch(`/chats/${chatId}/read`).catch(() => {});
  }, [chatId, allMessages.length]);

  // Auto-scroll to bottom when new messages come in
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allMessages.length]);

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await api.post(`/chats/${chatId}/messages`, { content });
      return res.data;
    },
    onSuccess: (newMsg) => {
      setMessage('');
      // Optimistically append to cache — socket will also deliver it
      queryClient.setQueryData(['chat-messages', chatId], (old: any) => {
        if (!old) return old;
        const pages = [...old.pages];
        const lastPage = pages[pages.length - 1];
        // Avoid duplicate if socket already added it
        const exists = lastPage.data.some((m: any) => m.id === newMsg.id);
        if (exists) return old;
        pages[pages.length - 1] = { ...lastPage, data: [...lastPage.data, newMsg] };
        return { ...old, pages };
      });
      queryClient.invalidateQueries({ queryKey: ['my-chats'] });
    },
  });

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed || sendMutation.isPending) return;
    sendMutation.mutate(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    sendTyping();
  };

  const counterparty = chatMeta?.counterparty;

  return (
    <div className="h-screen flex flex-col bg-[var(--color-neutral-50)]">
      {/* Header */}
      <header className="sticky top-0 bg-white border-b border-[var(--color-neutral-200)] shadow-sm z-20 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.push('/chats')}
          className="p-1.5 rounded-xl hover:bg-[var(--color-neutral-100)] text-[var(--color-neutral-600)] transition"
        >
          <ArrowLeft size={20} />
        </button>
        <Avatar src={counterparty?.avatarUrl} name={counterparty?.name} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-[var(--color-neutral-900)] truncate">
            {counterparty?.name ?? 'Chat'}
          </p>
          {chatMeta?.hireId && (
            <button
              onClick={() => router.push(`/hires/${chatMeta.hireId}`)}
              className="text-[10px] text-[var(--color-primary-600)] font-semibold hover:underline"
            >
              View Hire →
            </button>
          )}
        </div>
      </header>

      {/* Load older messages button */}
      {hasNextPage && (
        <div className="flex justify-center py-2">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="text-xs text-[var(--color-primary-600)] font-semibold hover:underline disabled:opacity-50"
          >
            {isFetchingNextPage ? 'Loading...' : 'Load older messages'}
          </button>
        </div>
      )}

      {/* Message List */}
      <main className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2">
        {isLoading ? (
          <LoadingState />
        ) : allMessages.length === 0 ? (
          <EmptyState
            title="No messages yet"
            description="Send the first message to get started."
          />
        ) : (
          allMessages.map((msg: any) => {
            const isMe = msg.sender?.id === user?.id;
            return (
              <div key={msg.id} className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                {!isMe && (
                  <Avatar src={msg.sender?.avatarUrl} name={msg.sender?.name} size="xs" />
                )}
                <div
                  className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                    isMe
                      ? 'bg-[var(--color-primary-500)] text-white rounded-br-sm'
                      : 'bg-white border border-[var(--color-neutral-200)] text-[var(--color-neutral-800)] rounded-bl-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  <p className={`text-[10px] mt-1 ${isMe ? 'text-white/70 text-right' : 'text-[var(--color-neutral-400)]'}`}>
                    {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </main>

      {/* Input Bar */}
      <div className="bg-white border-t border-[var(--color-neutral-200)] px-4 py-3 flex items-end gap-3">
        <textarea
          ref={inputRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
          className="flex-1 px-3 py-2.5 border border-[var(--color-neutral-200)] rounded-xl text-sm focus:border-[var(--color-primary-500)] focus:outline-none resize-none max-h-28 overflow-y-auto"
          style={{ fieldSizing: 'content' } as React.CSSProperties}
        />
        <button
          onClick={handleSend}
          disabled={!message.trim() || sendMutation.isPending}
          className="p-2.5 bg-[var(--color-primary-500)] text-white rounded-xl hover:bg-[var(--color-primary-600)] transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          {sendMutation.isPending
            ? <Loader2 size={18} className="animate-spin" />
            : <Send size={18} />}
        </button>
      </div>
    </div>
  );
}
