
import React from 'react';
import { Conversation, User } from '../../types';

interface ChatListProps {
  conversations: Conversation[];
  onSelect: (user: User) => void;
}

export const ChatList: React.FC<ChatListProps> = ({ conversations, onSelect }) => {
  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4 text-center">
        <p>Nenhuma conversa ainda.</p>
        <p className="text-sm mt-2">Visite perfis para enviar mensagens!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-white dark:bg-gray-800">
      {conversations.map((conv) => (
        <div
          key={conv.user.id}
          onClick={() => onSelect(conv.user)}
          className="flex items-center p-3 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition"
        >
          <div className="relative">
            <img
              src={conv.user.avatar || 'https://placeholder.pics/svg/150'}
              alt={conv.user.name}
              className="w-10 h-10 rounded-full object-cover"
            />
            {conv.unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                {conv.unreadCount}
              </span>
            )}
          </div>
          <div className="ml-3 flex-1 overflow-hidden">
            <div className="flex justify-between items-baseline">
              <h4 className="font-semibold text-sm truncate dark:text-white">{conv.user.name}</h4>
              <span className="text-xs text-gray-400">
                {new Date(conv.lastMessage.created_at).toLocaleDateString(undefined, { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p className={`text-sm truncate ${conv.unreadCount > 0 ? 'font-semibold text-black dark:text-gray-100' : 'text-gray-500'}`}>
              {conv.lastMessage.sender_id === conv.user.id ? '' : 'Você: '}{conv.lastMessage.content}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};
