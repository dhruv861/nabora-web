'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { Avatar } from '@/components/Avatar';
import { LoadingState } from '@/components/LoadingState';
import { EmptyState } from '@/components/EmptyState';
import { useChatSocket } from '@/hooks/useChatSocket';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function ChatsPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  useChatSocket(); // global socket connection

  const { data: chats, isLoading } = useQuery({
    queryKey: ['my-chats'],
    queryFn: async () => {
      const res = await api.get('/chats');
      return res.data.data as any[];
    },
  });

  return (
    <div className="min-h-screen bg-[var(--color-neutral-50)] flex flex-col">
      <header className="sticky top-0 bg-white border-b border-[var(--color-neutral-200)] shadow-sm z-20 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.push('/feed')} className="p-1.5 rounded-xl hover:bg-[var(--color-neutral-100)] text-[var(--color-neutral-600)] transition">
          <ArrowLeft size={20} />
        </button>
        <span className="font-bold text-sm text-[var(--color-neutral-800)]">Messages</span>
      </header>

      <main className="max-w-2xl mx-auto w-full flex flex-col">
        {isLoading ? <LoadingState /> : !chats || chats.length === 0 ? (
          <div className="px-4 py-8">
            <EmptyState
              title="No Messages Yet"
              description="Once you hire someone or get hired, your chat thread will appear here."
              action={{ label: 'Browse Jobs', onClick: () => router.push('/feed') }}
            />
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-neutral-100)]">
            {chats.map((chat: any) => {
              const lastMsg = chat.lastMessage;
              const counterparty = chat.counterparty;
              const isUnread = lastMsg &&
                lastMsg.sender?.id !== user?.id &&
                (!chat.myLastReadAt || new Date(lastMsg.createdAt) > new Date(chat.myLastReadAt));

              return (
                <button
                  key={chat.id}
                  onClick={() => router.push(`/chats/${chat.id}`)}
                  className="w-full flex items-center gap-3 px-4 py-4 hover:bg-[var(--color-neutral-50)] transition text-left"
                >
                  <div className="relative shrink-0">
                    <Avatar src={counterparty?.avatarUrl} name={counterparty?.name} size="md" />
                    {isUnread && <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-[var(--color-primary-500)] rounded-full border-2 border-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm truncate ${isUnread ? 'font-bold text-[var(--color-neutral-900)]' : 'font-medium text-[var(--color-neutral-700)]'}`}>
                        {counterparty?.name ?? 'Unknown'}
                      </span>
                      {lastMsg && (
                        <span className="text-[10px] text-[var(--color-neutral-400)] shrink-0">
                          {formatDistanceToNow(new Date(lastMsg.createdAt), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                    <p className={`text-xs truncate mt-0.5 ${isUnread ? 'text-[var(--color-neutral-700)] font-medium' : 'text-[var(--color-neutral-400)]'}`}>
                      {lastMsg ? `${lastMsg.sender?.id === user?.id ? 'You: ' : ''}${lastMsg.content}` : 'No messages yet'}
                    </p>
                  </div>
                  <MessageCircle size={16} className="text-[var(--color-neutral-300)] shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
