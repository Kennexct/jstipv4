// Support chat (ADR-007). Visitors hold a one-time token; the platform owner uses admin RPCs.
import { useEffect, useState } from 'react';
import { supabase, rpc } from './supabase';
export { chatError, mergeMessages, chatTime } from './chat-format.js';

const KEY = 'bawa-chat';
export const chatAvailable = () => Boolean(supabase);

export function savedChat() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY));
    return value?.thread && value?.token ? value : null;
  } catch {
    return null;
  }
}
export function rememberChat(value) {
  try {
    if (value) localStorage.setItem(KEY, JSON.stringify(value));
    else localStorage.removeItem(KEY);
  } catch {}
}

export const chatStart = (name, contact, body) =>
  rpc('jastip_chat_start', { p_name: name, p_contact: contact, p_body: body });
export const chatSend = (chat, body) =>
  rpc('jastip_chat_send', { p_thread: chat.thread, p_token: chat.token, p_body: body });
export const chatPoll = (chat, after = 0) =>
  rpc('jastip_chat_poll', { p_thread: chat.thread, p_token: chat.token, p_after: after });

export const adminChats = () => rpc('jastip_admin_chats');
export const adminChat = (thread) => rpc('jastip_admin_chat', { p_thread: thread });
export const adminChatReply = (thread, body) =>
  rpc('jastip_admin_chat_reply', { p_thread: thread, p_body: body });
export const adminChatStatus = (thread, status) =>
  rpc('jastip_admin_chat_status', { p_thread: thread, p_status: status });

// Admin sidebar badge: conversations with unread visitor messages. The Inbox screen
// dispatches CHAT_EVENT after loading so the badge updates without waiting for the next poll.
export const CHAT_EVENT = 'bawa-chat-updated';
export const unreadThreads = (list = []) =>
  list.filter((t) => t.status !== 'Blocked' && Number(t.unread) > 0).length;
export function useAdminUnread(enabled) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!enabled) {
      setCount(0);
      return;
    }
    let stopped = false;
    const load = async () => {
      if (document.hidden) return;
      try {
        const list = await adminChats();
        if (!stopped) setCount(unreadThreads(list));
      } catch {}
    };
    const onUpdate = (e) => (e.detail ? setCount(unreadThreads(e.detail)) : load());
    load();
    const id = setInterval(load, 30000);
    window.addEventListener(CHAT_EVENT, onUpdate);
    return () => {
      stopped = true;
      clearInterval(id);
      window.removeEventListener(CHAT_EVENT, onUpdate);
    };
  }, [enabled]);
  return count;
}
