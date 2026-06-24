'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { Avatar } from '@/components/Avatar';
import { LoadingState } from '@/components/LoadingState';
import { EmptyState } from '@/components/EmptyState';
import { useChatSocket } from '@/hooks/useChatSocket';
import { ArrowLeft, Send, Loader2, MessageCircle } from 'lucide-react';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { useState } from 'react';

// ─── Typing Indicator component ─────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <div className="bg-[var(--color-neutral-100)] border border-[var(--color-neutral-200)] rounded-2xl rounded-bl-sm px-4 py-2.5 flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-[var(--color-neutral-400)] animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 rounded-full bg-[var(--color-neutral-400)] animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 rounded-full bg-[var(--color-neutral-400)] animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}

// ─── Date divider ────────────────────────────────────────────────────
function DateDivider({ date }: { date: Date }) {
  const label = isToday(date) ? 'Today' : isYesterday(date) ? 'Yesterday' : format(date, 'd MMM yyyy');
  return (
    <div className="flex items-center gap-3 my-3">
      <div className="flex-1 h-px bg-[var(--color-neutral-200)]" />
      <span className="text-[10px] font-semibold text-[var(--color-neutral-400)] px-2">{label}</span>
      <div className="flex-1 h-px bg-[var(--color-neutral-200)]" />
    </div>
  );
}

export default function ChatThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [chatId, setChatId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Resolve params
  useEffect(() => {
    params.then((p) => setChatId(p.id));
  }, [params]);

  const { sendTyping, isConnected } = useChatSocket(chatId ?? undefined);

  // Listen for typing events on the socket
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (e: CustomEvent<{ chatId: string }>) => {
      if (e.detail.chatId === chatId) {
        setIsTyping(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 3000);
      }
    };
    window.addEventListener('nabora:user_typing', handler as EventListener);
    return () => window.removeEventListener('nabora:user_typing', handler as EventListener);
  }, [chatId]);

  const { data: chats } = useQuery({
    queryKey: ['my-chats'],
    queryFn: async () => { const res = await api.get('/chats'); return res.data.data as any[]; },
    enabled: !!chatId,
  });
  const chatMeta = chats?.find((c: any) => c.id === chatId);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['chat-messages', chatId],
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) => {
      const p: Record<string, string> = { limit: '30' };
      if (pageParam) p.cursor = pageParam;
      const res = await api.get(`/chats/${chatId}/messages`, { params: p });
      return res.data.data as { data: any[]; nextCursor: string | null };
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!chatId,
  });

  const allMessages = data?.pages.flatMap((p) => p.data) ?? [];

  useEffect(() => {
    if (!chatId) return;
    api.patch(`/chats/${chatId}/read`).catch(() => {});
  }, [chatId, allMessages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allMessages.length, isTyping]);

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await api.post(`/chats/${chatId}/messages`, { content });
      return res.data.data;
    },
    onSuccess: (newMsg) => {
      setMessage('');
      queryClient.setQueryData(['chat-messages', chatId], (old: any) => {
        if (!old) return old;
        const pages = [...old.pages];
        const lastPage = pages[pages.length - 1];
        if (lastPage.data.some((m: any) => m.id === newMsg.id)) return old;
        pages[pages.length - 1] = { ...lastPage, data: [...lastPage.data, newMsg] };
        return { ...old, pages };
      });
      queryClient.invalidateQueries({ queryKey: ['my-chats'] });
    },
  });

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed || sendMutation.isPending || !chatId) return;
    sendMutation.mutate(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); return; }
    sendTyping();
  };

  // Group messages by date for dividers
  const messageGroups: { date: string; messages: any[] }[] = [];
  for (const msg of allMessages) {
    const dateKey = format(new Date(msg.createdAt), 'yyyy-MM-dd');
    const last = messageGroups[messageGroups.length - 1];
    if (!last || last.date !== dateKey) messageGroups.push({ date: dateKey, messages: [msg] });
    else last.messages.push(msg);
  }

  const counterparty = chatMeta?.counterparty;

  if (!chatId) return <LoadingState />;

  return (
    <div className="h-screen flex flex-col bg-[var(--color-neutral-50)]">
      <header className="sticky top-0 bg-white border-b border-[var(--color-neutral-200)] shadow-sm z-20 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.push('/chats')} className="p-1.5 rounded-xl hover:bg-[var(--color-neutral-100)] text-[var(--color-neutral-600)] transition">
          <ArrowLeft size={20} />
        </button>
        <Avatar src={counterparty?.avatarUrl} name={counterparty?.name} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-[var(--color-neutral-900)] truncate">{counterparty?.name ?? 'Chat'}</p>
          {chatMeta?.hireId && (
            <button onClick={() => router.push(`/hires/${chatMeta.hireId}`)} className="text-[10px] text-[var(--color-primary-600)] font-semibold hover:underline">
              View Hire →
            </button>
          )}
        </div>
        {!isConnected && <span className="text-[10px] text-[var(--color-neutral-400)]">Connecting...</span>}
      </header>

      {hasNextPage && (
        <div className="flex justify-center py-2">
          <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage} className="text-xs text-[var(--color-primary-600)] font-semibold hover:underline disabled:opacity-50">
            {isFetchingNextPage ? 'Loading...' : 'Load older messages'}
          </button>
        </div>
      )}

      <main className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-0.5">
        {isLoading ? <LoadingState /> : allMessages.length === 0 ? (
          <EmptyState title="No messages yet" description="Send the first message to get started." />
        ) : (
          messageGroups.map((group) => (
            <div key={group.date}>
              <DateDivider date={new Date(group.date)} />
              {group.messages.map((msg: any) => {
                const isMe = msg.sender?.id === user?.id;
                return (
                  <div key={msg.id} className={`flex items-end gap-2 mb-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    {!isMe && <Avatar src={msg.sender?.avatarUrl} name={msg.sender?.name} size="xs" />}
                    <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                      isMe
                        ? 'bg-[var(--color-primary-500)] text-white rounded-br-sm'
                        : 'bg-white border border-[var(--color-neutral-200)] text-[var(--color-neutral-800)] rounded-bl-sm'
                    }`}>
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                      <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : ''}`}>
                        <span className={`text-[10px] ${isMe ? 'text-white/70' : 'text-[var(--color-neutral-400)]'}`}>
                          {format(new Date(msg.createdAt), 'h:mm a')}
                        </span>
                        {isMe && (
                          <span className={`text-[10px] ${msg.isRead ? 'text-[var(--color-primary-200)]' : 'text-white/50'}`}>
                            {msg.isRead ? '✓✓' : '✓'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        {isTyping && <TypingIndicator />}
        <div ref={bottomRef} />
      </main>

      <div className="bg-white border-t border-[var(--color-neutral-200)] px-4 py-3 flex items-end gap-3">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
          className="flex-1 px-3 py-2.5 border border-[var(--color-neutral-200)] rounded-xl text-sm focus:border-[var(--color-primary-500)] focus:outline-none resize-none max-h-28 overflow-y-auto"
        />
        <button
          onClick={handleSend}
          disabled={!message.trim() || sendMutation.isPending}
          className="p-2.5 bg-[var(--color-primary-500)] text-white rounded-xl hover:bg-[var(--color-primary-600)] transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          {sendMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </div>
    </div>
  );
}
