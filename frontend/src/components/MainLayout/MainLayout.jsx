// src/components/MainLayout/MainLayout.jsx

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import './MainLayout.css';
import {
  Menu, Plus, Cog, LogOut, Send, Mic, Share2, Pin, Trash2, Edit, PinOff, Shield, UserCircle
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import SettingsModal from '../Settings/SettingsModal.jsx';
import AccountSettingsModal from '../Settings/AccountSettingsModal.jsx';
import FeedbackModal from '../Feedback/FeedbackModal.jsx';
import ProfileModal from '../Profile/ProfileModal.jsx';
import PaywallModal from '../Paywall/PaywallModal.jsx';
import { getAiResponse } from '../../ai/aiService.js';
import {
  getUserChatHistory,
  saveUserChatHistory,
  saveTempChat,
  getTempChat,
  reportMessage,
} from '../../services/apiService.js';
import { useAuth } from '../../AuthContext';
import aiLogo from "../../assets/ai-logo.png";
import appLogo from "../../assets/Friday_Logo.png";

const API_URL = import.meta.env.VITE_API_BASE_URL.replace(/\/api\/auth$/, "");;
const SpeechRecognition = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
const BANNED_KEYWORDS = ['kill', 'suicide', 'bomb', 'terrorist', 'hate speech'];
const nowId = () => Date.now().toString();
const clamp = (str, n) => (str?.length > n ? `${str.slice(0, n)}` : (str || ''));

const MainLayout = ({ onNavigateToAuth }) => {
  const { user, isAuthenticated, logout, loading: authLoading } = useAuth();

  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [chatState, setChatState] = useState({
    history: [],
    activeId: null,
    isTemp: !isAuthenticated,
    isRenamingId: null,
  });
  const [uiState, setUiState] = useState({
    isSidebarOpen: false,
    showProfileModal: false,
    showSettingsModal: false,
    showAccountSettingsModal: false,
    showFeedbackModal: false,
    showPaywall: false,
    isGuestLocked: false,
    isListening: false,
  });
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, chatId: null });
  const [avatarUrl, setAvatarUrl] = useState('/default-avatar.png');
  const [aiVoice, setAiVoice] = useState('female');
  const [voices, setVoices] = useState([]);
  const promptInputRef = useRef(null);
  const recognitionRef = useRef(null);

  // ✅ Update avatar when user changes
  useEffect(() => {
    if (user?.avatar) {
      const fullUrl = user.avatar.startsWith("http") ? user.avatar : `${API_URL}${user.avatar}`;
      setAvatarUrl(fullUrl);
    } else {
      setAvatarUrl('/default-avatar.png');
    }
  }, [user?.avatar]);

  const getGreeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  const isInputDisabled = isTyping || (!isAuthenticated && uiState.isGuestLocked);
  const placeholderText = uiState.isGuestLocked ? "Please login to continue chatting" : "Message Friday...";

  const activeChat = useMemo(
    () => chatState.history.find((c) => c.id === chatState.activeId) || null,
    [chatState.history, chatState.activeId]
  );

  const sortedChats = useMemo(() => {
    const byIdDesc = (a, b) => {
      const an = Number(a.id);
      const bn = Number(b.id);
      if (!Number.isNaN(an) && !Number.isNaN(bn)) return bn - an;
      return String(b.id).localeCompare(String(a.id));
    };
    return [...chatState.history].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || byIdDesc(a, b));
  }, [chatState.history]);

  useEffect(() => {
    const handleVoiceChange = () => setVoices(window.speechSynthesis.getVoices());
    window.speechSynthesis.onvoiceschanged = handleVoiceChange;
    handleVoiceChange();
    if (!isTyping && promptInputRef.current) promptInputRef.current.focus();
    const handleClick = () => setContextMenu({ visible: false, x: 0, y: 0, chatId: null });
    window.addEventListener('click', handleClick);
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
      window.removeEventListener('click', handleClick);
    };
  }, [isTyping, chatState.activeId, chatState.isTemp]);

  useEffect(() => {
    let mounted = true;
    const loadChatHistory = async () => {
      if (isAuthenticated && user?.id) {
        setUiState(prev => ({ ...prev, isGuestLocked: false }));
        try {
          const historyData = await getUserChatHistory(user.id);
          if (!mounted) return;
          const history = historyData.chatHistory || [];
          setChatState(prev => {
            const newActiveId = history.length > 0 && !prev.activeId ? history[0].id : prev.activeId;
            setMessages(newActiveId ? history.find(c => c.id === newActiveId)?.messages || [] : []);
            return { ...prev, history, activeId: newActiveId, isTemp: false };
          });
        } catch (error) {
          console.error("Failed to fetch chat history:", error);
          toast.error("Failed to load chat history.");
          setChatState(prev => ({ ...prev, history: [], activeId: null }));
          setMessages([]);
        }
        // Avatar URL is now managed by the separate useEffect
      } else if (!isAuthenticated) {
        const tempMessages = getTempChat();
        setMessages(tempMessages);
        setChatState({ history: [], activeId: null, isTemp: true, isRenamingId: null });
        setAvatarUrl('/default-avatar.png');
      }
    };
    loadChatHistory();
    return () => { mounted = false; };
  }, [isAuthenticated, user?.id]); // Removed user.avatar from dependency array here

  const speakText = useCallback((text) => {
    if (!aiVoice || !text || voices.length === 0 || window.speechSynthesis.speaking) return;
    const utterance = new SpeechSynthesisUtterance(text);
    const englishVoices = voices.filter((v) => v.lang?.startsWith('en-'));
    if (englishVoices.length === 0) return;
    let selectedVoice = englishVoices.find((v) => aiVoice === 'female' ? /female|zira|samantha|susan/i.test(v.name) : /male|david|mark/i.test(v.name));
    utterance.voice = selectedVoice || englishVoices[0];
    window.speechSynthesis.speak(utterance);
  }, [aiVoice, voices]);

  const handleSendMessage = useCallback(async (e, textToSend = null) => {
    e?.preventDefault();
    const messageText = (textToSend ?? prompt) || '';
    if (messageText.trim() === '' || isTyping) return;

    if (!isAuthenticated && (messages?.length ?? 0) >= 10) {
      setUiState(prev => ({ ...prev, showPaywall: true }));
      return;
    }

    const lower = messageText.toLowerCase();
    if (isAuthenticated && BANNED_KEYWORDS.some((w) => lower.includes(w))) {
      try { await reportMessage(messageText); } catch (err) { console.error("Error reporting message:", err); }
      toast.error("This message violates our safety policy and has been reported.", { duration: 5000 });
      return;
    }

    const userMessage = { id: nowId(), text: messageText, sender: 'user' };
    const currentMessages = [...(messages || []), userMessage];
    setMessages(currentMessages);
    setIsTyping(true);
    setPrompt('');

    let currentChatId = chatState.activeId;
    let workingHistory = [...chatState.history];

    if (isAuthenticated && !chatState.isTemp) {
      if (currentChatId === null) {
        currentChatId = nowId();
        const newChat = { id: currentChatId, title: clamp(messageText, 30), messages: currentMessages, pinned: false };
        workingHistory = [newChat, ...chatState.history];
        setChatState(prev => ({ ...prev, activeId: currentChatId, history: workingHistory }));
      } else {
        workingHistory = chatState.history.map(chat => chat.id === currentChatId ? { ...chat, messages: currentMessages } : chat);
        setChatState(prev => ({ ...prev, history: workingHistory }));
      }
    }

    let aiResponseText = '';
    try {
      aiResponseText = await getAiResponse(messageText, messages);
    } catch (err) {
      console.error('AI response failed:', err);
      aiResponseText = "Sorry, I'm having trouble responding right now.";
    }

    const aiMessage = { id: nowId(), text: aiResponseText, sender: 'ai' };
    speakText(aiResponseText);
    const finalMessages = [...currentMessages, aiMessage];
    setMessages(finalMessages);
    setIsTyping(false);

    if (isAuthenticated && !chatState.isTemp) {
      const finalHistory = workingHistory.map(chat => chat.id === currentChatId ? { ...chat, messages: finalMessages } : chat);
      setChatState(prev => ({ ...prev, history: finalHistory }));
      try {
        await saveUserChatHistory(user.id, finalHistory);
      } catch (err) {
        console.error("Failed to save chat history:", err);
        toast.error("Failed to save chat history to server.");
      }
    } else if (!isAuthenticated) {
      try {
        await saveTempChat(finalMessages);
      } catch (err) {
        console.error("Failed to save temp chat:", err);
      }
    }
  }, [prompt, isTyping, isAuthenticated, messages, chatState, speakText, user?.id]);

  const handleMicClick = useCallback(() => {
    if (!SpeechRecognition) { toast.error("Sorry, your browser doesn't support this feature."); return; }
    if (uiState.isListening) { recognitionRef.current?.stop(); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognitionRef.current = recognition;
    recognition.start();
    setUiState(prev => ({ ...prev, isListening: true }));
    toast('Listening...', { icon: '🎤' });
    recognition.onresult = (event) => handleSendMessage(null, event?.results?.[0]?.[0]?.transcript || '');
    recognition.onerror = (event) => {
      if (event?.error === 'no-speech') setMessages(prev => [...prev, { id: nowId(), text: "Sorry, I didn't catch that. How can I help?", sender: 'ai' }]);
      else toast.error(`Mic error: ${event?.error || 'Unknown error'}`);
    };
    recognition.onend = () => setUiState(prev => ({ ...prev, isListening: false }));
  }, [uiState.isListening, handleSendMessage]);

  // This handleProfileUpdate is for the ProfileModal to notify parent (MainLayout)
  // But MainLayout already has its own useEffect to track user.avatar directly from AuthContext
  const handleProfileUpdate = useCallback((newUpdates) => {
    if (newUpdates?.avatar) {
      const fullUrl = newUpdates.avatar.startsWith("http") ? newUpdates.avatar : `${API_URL}${newUpdates.avatar}`;
      setAvatarUrl(fullUrl);
      // Removed this toast as the ProfileModal already shows success toast
      // toast.success("Profile picture updated!");
    }
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    toast.success('Logged out successfully!');
  }, [logout]);

  const handleNewChat = useCallback(() => {
    if (!isAuthenticated) { setMessages([]); return; }
    setChatState(prev => ({ ...prev, activeId: null, isTemp: false }));
    setMessages([]);
  }, [isAuthenticated]);

  const handleSelectChat = useCallback((chatId) => {
    const chat = chatState.history.find((c) => c.id === chatId);
    if (chat) {
      setChatState(prev => ({ ...prev, activeId: chat.id, isTemp: false }));
      setMessages(chat.messages || []);
    }
  }, [chatState.history]);

  const handleContextMenu = useCallback((e, chatId) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setContextMenu({ visible: true, x: rect.right, y: rect.top, chatId });
  }, []);

  const handleMenuAction = useCallback((action) => {
    action();
    setContextMenu(prev => ({ ...prev, visible: false }));
  }, []);

  const handlePin = useCallback(async (chatId) => {
    if (!isAuthenticated) return toast.error("Please login to pin chats.");
    const target = chatState.history.find(c => c.id === chatId);
    if (!target) return;
    const updatedHistory = chatState.history.map(c => c.id === chatId ? { ...c, pinned: !c.pinned } : c);
    setChatState(prev => ({ ...prev, history: updatedHistory }));
    try {
      if (user && user.id) {
        await saveUserChatHistory(user.id, updatedHistory);
      }
      toast.success(target.pinned ? 'Chat unpinned!' : 'Chat pinned!');
    } catch (error) {
      console.error("Failed to update pin status:", error);
      toast.error("Failed to pin/unpin chat.");
    }
  }, [isAuthenticated, chatState.history, user?.id]);

  const handleRename = useCallback(async (chatId, newTitle) => {
    if (!isAuthenticated) { toast.error("Please login to rename chats."); setChatState(prev => ({ ...prev, isRenamingId: null })); return; }
    const safeTitle = newTitle?.trim() || '';
    if (!safeTitle) { setChatState(prev => ({ ...prev, isRenamingId: null })); return; }
    const updatedHistory = chatState.history.map(c => c.id === chatId ? { ...c, title: safeTitle } : c);
    setChatState(prev => ({ ...prev, history: updatedHistory, isRenamingId: null }));
    try {
      if (user && user.id) {
        await saveUserChatHistory(user.id, updatedHistory);
      }
      toast.success('Chat renamed!');
    } catch (error) {
      console.error("Failed to rename chat:", error);
      toast.error("Failed to rename chat.");
    }
  }, [isAuthenticated, chatState.history, user?.id]);

  const handleDelete = useCallback(async (chatId) => {
    if (!isAuthenticated) { toast.error("Please login to delete chats."); return; }
    if (!window.confirm("Are you sure you want to delete this chat? This cannot be undone.")) return;
    const updatedHistory = chatState.history.filter(c => c.id !== chatId);
    setChatState(prev => {
      const newActiveId = prev.activeId === chatId ? null : prev.activeId;
      if (newActiveId === null) setMessages([]);
      return { ...prev, history: updatedHistory, activeId: newActiveId };
    });
    try {
      if (user && user.id) {
        await saveUserChatHistory(user.id, updatedHistory);
      }
      toast.success('Chat deleted!');
    } catch (error) {
      console.error("Failed to delete chat:", error);
      toast.error("Failed to delete chat.");
    }
  }, [isAuthenticated, chatState, user?.id]);

  const handleShare = useCallback((chatId) => {
    if (!isAuthenticated) { toast.error("Please login to share chats."); return; }
    const chat = chatState.history.find((c) => c.id === chatId);
    if (!chat) return;
    const shareText = `Check out my conversation with Friday.AI: "${chat.title}"`;
    if (navigator.share) navigator.share({ title: 'Friday.AI Chat', text: shareText, url: window.location.href });
    else { navigator.clipboard.writeText(`${shareText} - ${window.location.href}`); toast.success('Link copied to clipboard!'); }
  }, [isAuthenticated, chatState.history]);

  const handleHistoryDelete = useCallback(async () => {
    if (!isAuthenticated) { toast.error("Please login to delete history."); return; }
    if (!window.confirm("Are you sure you want to delete your entire chat history? This cannot be undone.")) return;
    try {
      if (user && user.id) {
        await saveUserChatHistory(user.id, []);
      }
      setChatState(prev => ({ ...prev, history: [], activeId: null }));
      setMessages([]);
      toast.success('Chat history deleted.');
    } catch (error) {
      console.error("Failed to delete chat history:", error);
      toast.error("Failed to delete chat history.");
    }
  }, [isAuthenticated, user?.id]);

  if (authLoading) return <div className="loading-container"><h2>Loading application...</h2></div>;

  return (
    <div className="layout-container">
      <div className="aurora-background"></div>
      <Toaster position="top-center" />

      {contextMenu.visible && isAuthenticated && (() => {
        const chat = chatState.history.find(c => c.id === contextMenu.chatId);
        return (
          <div className="context-menu" style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}>
            <div className="context-menu-item" onClick={() => handleMenuAction(() => handleShare(contextMenu.chatId))}> <Share2 size={16} /> Share </div>
            <div className="context-menu-item" onClick={() => handleMenuAction(() => handlePin(contextMenu.chatId))}> {chat?.pinned ? <PinOff size={16} /> : <Pin size={16} />} {chat?.pinned ? 'Unpin' : 'Pin'} </div>
            <div className="context-menu-item" onClick={() => handleMenuAction(() => setChatState(prev => ({ ...prev, isRenamingId: contextMenu.chatId })))}> <Edit size={16} /> Rename </div>
            <div className="context-menu-item delete" onClick={() => handleMenuAction(() => handleDelete(contextMenu.chatId))}> <Trash2 size={16} /> Delete </div>
          </div>
        );
      })()}

      <div className={`sidebar ${uiState.isSidebarOpen ? 'open' : ''}`} onMouseEnter={() => setUiState(prev => ({ ...prev, isSidebarOpen: true }))} onMouseLeave={() => setUiState(prev => ({ ...prev, isSidebarOpen: false }))}>
        <div className="sidebar-header"> <Menu className="menu-icon" /> <img src={appLogo} alt="Haven.AI Logo" className="sidebar-logo show-on-open" /> </div>
        <div className="sidebar-buttons">
          <div className="new-chat-button" onClick={handleNewChat}> <Plus size={20} /> <span className="show-on-open">New Chat</span> </div>
          {isAuthenticated && <div className="temp-chat-button" onClick={() => { setChatState(prev => ({ ...prev, activeId: null, isTemp: true })); setMessages(getTempChat()); }}> <Shield size={20} /> <span className="show-on-open">Temporary Chat</span> </div>}
        </div>

        <div className="sidebar-content">
          {isAuthenticated ? (
            <>
              <p className="recent-title show-on-open">Recent</p>
              {sortedChats.map(chat =>
                chatState.isRenamingId === chat.id ? (
                  <input key={chat.id} type="text" defaultValue={chat.title} className="rename-input" autoFocus
                    onBlur={(e) => handleRename(chat.id, e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleRename(chat.id, e.target.value); }}
                  />
                ) : (
                  <div key={chat.id} className={`chat-history-item ${!chatState.isTemp && chat.id === chatState.activeId ? 'active' : ''}`}
                    onClick={() => handleSelectChat(chat.id)} onContextMenu={(e) => handleContextMenu(e, chat.id)}>
                    {chat.pinned && <Pin size={14} className="pin-icon" />}
                    <span className="chat-title-text show-on-open">{chat.title}</span>
                  </div>
                )
              )}
            </>
          ) : (
            <p className="recent-title show-on-open">Login to save your chat history.</p>
          )}
        </div>

        <div className="sidebar-footer">
          <div className={`footer-item ${!isAuthenticated ? 'disabled' : ''}`} onClick={() => isAuthenticated ? setUiState(prev => ({ ...prev, showSettingsModal: true })) : toast.error("Please login to access settings.")}> <Cog size={20} /> <span className="show-on-open">Settings</span> </div>
          {isAuthenticated && <div className="footer-item" onClick={logout}> <LogOut size={20} /> <span className="show-on-open">Logout</span> </div>}
        </div>
      </div>

      <div className="main-content">
        <div className="main-header">
          <div className="header-brand"> <span>Friday.AI</span> </div>
          {isAuthenticated ? (
            <img
              key={avatarUrl} // ✨ ADD THIS KEY PROP ✨
              src={avatarUrl}
              className="user-avatar"
              alt="User Avatar"
              onClick={() => setUiState(prev => ({ ...prev, showProfileModal: true }))}
            />
          ) : (
            <button className="auth-button-header" onClick={onNavigateToAuth}> <UserCircle size={20} /> <span>Login</span> </button>
          )}
        </div>

        <div className="chat-display-area">
          {messages?.length === 0 ? (
            <div className="center-message">
              <h1 className="greeting-text"> {isAuthenticated ? `Hello, ${user?.username || 'there'} 👋` : 'Welcome to the new world FRIDAY'} </h1>
              <p className="greeting-subtitle"> {isAuthenticated ? getGreeting : "I'm here to listen. What's on your mind?"} </p>
            </div>
          ) : (
            messages?.map(msg =>
              msg.sender === 'user' ? (
                <div key={msg.id} className="message-bubble user-message">{msg.text}</div>
              ) : (
                <div key={msg.id} className="ai-message-container">
                  <img src={aiLogo} className="ai-inline-logo" />
                  <div className="message-bubble ai-message">{msg.text}</div>
                </div>
              )
            )
          )}
          {isTyping && (
            <div className="ai-message-container">
              <img src={aiLogo} className="ai-inline-logo" />
              <div className="message-bubble ai-message typing-indicator"> <span></span><span></span><span></span> </div>
            </div>
          )}
        </div>

        <div className="prompt-area">
          <form className="prompt-input-wrapper" onSubmit={handleSendMessage}>
            <input ref={promptInputRef} type="text" placeholder={placeholderText} value={prompt}
              onChange={(e) => setPrompt(e.target.value)} disabled={isInputDisabled}
            />
            <div className="prompt-buttons">
              <button type="button" className={`prompt-icon-button ${uiState.isListening ? 'listening' : ''}`} onClick={handleMicClick}
                disabled={isInputDisabled} aria-label="Voice input" title="Voice input"> <Mic size={20} /> </button>
              <button type="submit" className="prompt-icon-button" disabled={isInputDisabled || prompt.trim() === ''}
                aria-label="Send message" title="Send message"> <Send size={20} /> </button>
            </div>
          </form>
          <p className="prompt-footer">FRIDAY may produce inaccurate information.</p>
        </div>
      </div>

      {uiState.showPaywall && <PaywallModal onClose={() => setUiState(prev => ({ ...prev, showPaywall: false, isGuestLocked: true }))} onAuth={onNavigateToAuth} />}
      {isAuthenticated && uiState.showProfileModal && (
        <ProfileModal
          // user prop here is not strictly needed for the avatar update
          // as ProfileModal accesses user directly via useAuth(),
          // but if other parts of ProfileModal use it, it's fine.
          user={user}
          onUpdate={handleProfileUpdate} // This callback is still useful for general parent notification
          onClose={() => setUiState(prev => ({ ...prev, showProfileModal: false }))}
        />
      )}
      {isAuthenticated && uiState.showSettingsModal && <SettingsModal onClose={() => setUiState(prev => ({ ...prev, showSettingsModal: false }))} onThemeChange={(theme) => (document.documentElement.className = theme || '')} onVoiceChange={setAiVoice} currentVoice={aiVoice} onFeedbackClick={() => { setUiState(prev => ({ ...prev, showSettingsModal: false, showFeedbackModal: true })); }} onAccountSettingsClick={() => { setUiState(prev => ({ ...prev, showSettingsModal: false, showAccountSettingsModal: true })); }} />}
      {isAuthenticated && uiState.showAccountSettingsModal && <AccountSettingsModal user={user} onClose={() => setUiState(prev => ({ ...prev, showAccountSettingsModal: false }))} onHistoryDelete={handleHistoryDelete} />}
      {isAuthenticated && uiState.showFeedbackModal && <FeedbackModal user={user} onClose={() => setUiState(prev => ({ ...prev, showFeedbackModal: false }))} />}
    </div>
  );
};

export default MainLayout;