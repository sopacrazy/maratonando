import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { User, Message, Conversation } from '../types';
import { AppContext } from '../App';

interface ChatContextType {
  isOpen: boolean;
  toggleChat: () => void;
  activeConversation: User | null;
  openChatWith: (user: User) => void;
  backToList: () => void;
  closeChat: () => void;
  conversations: Conversation[];
  messages: Message[];
  sendMessage: (content: string) => Promise<void>;
  markAsRead: (senderId: string) => Promise<void>;
  loading: boolean;
}

const ChatContext = createContext<ChatContextType>({
  isOpen: false,
  toggleChat: () => { },
  activeConversation: null,
  openChatWith: () => { },
  closeChat: () => { },
  conversations: [],
  messages: [],
  sendMessage: async () => { },
  markAsRead: async () => { },
  loading: false,
});

export const useChat = () => useContext(ChatContext);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user: currentUser } = useContext(AppContext);
  const [isOpen, setIsOpen] = useState(false);
  const [activeConversation, setActiveConversation] = useState<User | null>(null);
  const activeConversationRef = useRef<User | null>(null); // Ref for accessing inside callbacks
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  // Sync ref with state
  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  // Load conversations when user logs in
  useEffect(() => {
    if (!currentUser?.id) return;

    fetchConversations();
    
    // Subscribe to new messages
    const channel = supabase
      .channel('public:messages')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `receiver_id=eq.${currentUser.id}`
      }, (payload) => {
        handleNewMessage(payload.new as Message);
      })
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `sender_id=eq.${currentUser.id}`
      }, (payload) => {
        // Only handle if it wasn't added optimistically (check ID or just dedupe by Set in handleNewMessage)
        handleNewMessage(payload.new as Message); 
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id]);

  // Load messages for active conversation
  useEffect(() => {
    if (!currentUser?.id || !activeConversation?.id) return;

    fetchMessages(activeConversation.id);
    markAsRead(activeConversation.id);

  }, [activeConversation, currentUser?.id]);

  const fetchConversations = async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching conversations:', error);
      setLoading(false);
      return;
    }

    const conversationMap = new Map<string, Message>();
    const unreadMap = new Map<string, number>();

    data.forEach((msg: Message) => {
      const otherId = msg.sender_id === currentUser.id ? msg.receiver_id : msg.sender_id;
      
      if (!conversationMap.has(otherId)) {
        conversationMap.set(otherId, msg);
      }

      if (msg.receiver_id === currentUser.id && !msg.read) {
        unreadMap.set(otherId, (unreadMap.get(otherId) || 0) + 1);
      }
    });

    const userIds = Array.from(conversationMap.keys());
    
    if (userIds.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const { data: users, error: userError } = await supabase
      .from('profiles')
      .select('id, name, handle, avatar')
      .in('id', userIds);

    if (userError) {
      console.error('Error fetching users:', userError);
      setLoading(false);
      return;
    }

    const conversationsList: Conversation[] = users.map((u: any) => ({
      user: u,
      lastMessage: conversationMap.get(u.id)!,
      unreadCount: unreadMap.get(u.id) || 0
    })).sort((a, b) => new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime());

    setConversations(conversationsList);
    setLoading(false);
  };

  const fetchMessages = async (otherId: string) => {
    if (!currentUser?.id) return;
    
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${currentUser.id})`)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return;
    }

    setMessages(data as Message[]);
  };

  const handleNewMessage = async (msg: Message) => {
    // Use REF to get the current supported conversation without stale closures
    const currentActive = activeConversationRef.current;

    // Check if the message is relevant to the currently open chat window
    if (currentActive && (msg.sender_id === currentActive.id || msg.receiver_id === currentActive.id)) {
      setMessages(prev => {
        // Prevent duplicates (e.g., from optimistic update + realtime)
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      
      if (msg.sender_id === currentActive.id) {
        markAsRead(currentActive.id);
      }
    }

    // Always refresh conversation list to show new snippet/badge
    fetchConversations();
  };

  const sendMessage = async (content: string) => {
    if (!currentUser?.id || !activeConversation?.id) return;

    const tempId = crypto.randomUUID();
    const newMessage: Message = {
      id: tempId,
      sender_id: currentUser.id,
      receiver_id: activeConversation.id,
      content,
      created_at: new Date().toISOString(),
      read: false
    };

    // 1. Optimistic Update
    setMessages(prev => [...prev, newMessage]);

    // 2. Send to DB
    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: currentUser.id,
        receiver_id: activeConversation.id,
        content
      })
      .select()
      .single();

    if (error) {
      console.error('Error sending message:', error);
      // Rollback if needed, but for MVP just alert
      return;
    }

    // 3. Update with real ID from DB (replaces the optimistic one)
    if (data) {
       setMessages(prev => prev.map(m => m.id === tempId ? data : m));
    }
  };

  const markAsRead = async (senderId: string) => {
    if (!currentUser?.id) return;

    await supabase
      .from('messages')
      .update({ read: true })
      .eq('sender_id', senderId)
      .eq('receiver_id', currentUser.id)
      .eq('read', false); // Only update unread ones
      
    // Optimistically update conversation unread count
    setConversations(prev => prev.map(c => {
        if (c.user.id === senderId) {
            return { ...c, unreadCount: 0 };
        }
        return c;
    }));
  };

  const openChatWith = (user: User) => {
    setActiveConversation(user);
    setIsOpen(true);
  };

  const backToList = () => {
    setActiveConversation(null);
  };

  const closeChat = () => {
    setIsOpen(false);
  };

  const toggleChat = () => {
    setIsOpen(prev => !prev);
  };

  return (
    <ChatContext.Provider value={{
      isOpen,
      toggleChat,
      activeConversation,
      openChatWith,
      backToList,
      closeChat,
      conversations,
      messages,
      sendMessage,
      markAsRead,
      loading
    }}>
      {children}
    </ChatContext.Provider>
  );
};
