
import React, { useContext } from 'react';
import { useChat } from '../../context/ChatContext';
import { ChatList } from './ChatList';
import { ChatWindow } from './ChatWindow';
import { AppContext } from '../../App';

export const ChatSystem: React.FC = () => {
  const {
    isOpen,
    toggleChat,
    activeConversation,
    openChatWith,
    backToList,
    conversations,
    messages,
    sendMessage,
    closeChat
  } = useChat();

  const { user: currentUser } = useContext(AppContext);

  const totalUnread = conversations.reduce((acc, curr) => acc + curr.unreadCount, 0);

  if (!currentUser?.id) return null; // Don't show if not logged in

  // Don't show on login page
  const isLoginPage = window.location.hash === '#/' || window.location.hash === '' || window.location.hash.includes('#/login');
  if (isLoginPage) return null;

  const isSeriesPage = window.location.hash.includes('#/series/'); // Simple hash check
  if (isSeriesPage) return null;

  return (
    <>
      {/* Floating Button (when closed or open, maybe just hide when open if it expands from it) */}
      <div className={`fixed bottom-20 sm:bottom-4 right-4 z-50 flex flex-col items-end gap-2`}>
        
        {/* The Chat Box */}
        {isOpen && (
          <div className="w-[350px] h-[450px] bg-white dark:bg-gray-800 rounded-t-xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700 animate-in slide-in-from-bottom-10 fade-in duration-300">
            {/* Box Header showing only in List Mode or globally? 
                ChatWindow has its own header. 
                ChatList needs a header. 
            */}
            
            {!activeConversation ? (
              <>
                <div className="p-3 bg-primary text-white flex justify-between items-center shrink-0 rounded-t-xl">
                  <h3 className="font-bold">Mensagens</h3>
                  <button onClick={toggleChat} className="hover:bg-primary/90 p-1 rounded">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <ChatList 
                  conversations={conversations} 
                  onSelect={openChatWith} 
                />
              </>
            ) : (
              <ChatWindow
                user={activeConversation}
                messages={messages}
                onSend={sendMessage}
                onBack={backToList}
                currentUserId={currentUser.id}
              />
            )}
          </div>
        )}

        {/* Toggle Button */}
        {!isOpen && (
          <button
            onClick={toggleChat}
            className="w-14 h-14 bg-primary rounded-full shadow-lg flex items-center justify-center text-white hover:bg-primary/90 transition transform hover:scale-105 relative"
          >
            {/* Icon */}
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            
            {/* Unread Badge */}
            {totalUnread > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center border-2 border-white dark:border-gray-900 animate-bounce">
                {totalUnread > 9 ? '9+' : totalUnread}
              </span>
            )}
          </button>
        )}
      </div>
    </>
  );
};
