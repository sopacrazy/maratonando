
import React, { useEffect, useRef, useState } from 'react';
import { Message, User } from '../../types';

interface ChatWindowProps {
  user: User;
  messages: Message[];
  onSend: (content: string) => Promise<void>;
  onBack: () => void;
  currentUserId: string;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ user, messages, onSend, onBack, currentUserId }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    const content = input;
    setInput(''); // Optimistic clear
    await onSend(content);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800">
      {/* Header */}
      <div className="flex items-center p-3 border-b border-gray-200 dark:border-gray-700 bg-purple-600 text-white shrink-0">
        <button onClick={onBack} className="mr-3 p-1 hover:bg-purple-700 rounded transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <img
          src={user.avatar || 'https://placeholder.pics/svg/150'}
          alt={user.name}
          className="w-8 h-8 rounded-full border border-white"
        />
        <div className="ml-2">
          <h4 className="font-bold text-sm">{user.name}</h4>
          <p className="text-xs opacity-80">@{user.handle}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, index) => {
          const isMine = msg.sender_id === currentUserId;
          return (
            <div key={msg.id || index} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-lg p-3 text-sm ${
                  isMine
                    ? 'bg-purple-600 text-white rounded-br-none'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-none'
                }`}
              >
                <p>{msg.content}</p>
                <p className={`text-[10px] mt-1 text-right ${isMine ? 'text-purple-200' : 'text-gray-400'}`}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 shrink-0 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Digite uma mensagem..."
          className="flex-1 rounded-full border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm focus:outline-none focus:border-purple-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        />
        <button
          type="submit"
          className="p-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition flex-shrink-0"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </form>
    </div>
  );
};
