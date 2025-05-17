'use client';

import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { FaRegComment, FaTimes } from 'react-icons/fa';
import styles from './Chatbot.module.css';
import NavButton from './NavButton';

const Chatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<
    { role: string; content: string; buttons?: { title: string; route: string }[] }[]
  >([]);
  const [inputMessage, setInputMessage] = useState('');
  const [welcomeSent, setWelcomeSent] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const toggleChat = () => setIsOpen((prev) => !prev);

  useEffect(() => {
    if (isOpen && !welcomeSent) {
      sendBotWelcomeMessage();
      setWelcomeSent(true);
    }
  }, [isOpen, welcomeSent]);

  const sendBotWelcomeMessage = () => {
    const welcomeMessage = "Hi, I'm WozBot! How can I assist you today?";
    const botMessage = { role: 'bot', content: welcomeMessage };
    setMessages((prev) => [...prev, botMessage]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSendMessage();
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = { role: 'user', content: inputMessage };
    const filteredMessages = messages
      .filter((msg) => msg.role === 'user' || msg.role === 'bot')
      .slice(-4)
      .map((msg) =>
        msg.role === 'bot' ? { ...msg, role: 'assistant' } : msg
      );

    const conversationPayload = [...filteredMessages, userMessage];
    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');

    try {
      const response = await axios.post('/api/chatbot', {
        messages: conversationPayload,
      });

      const { response: botResponse, buttons } = response.data;
      const botMessage = { role: 'bot', content: botResponse, buttons };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error('Chatbot error:', error);
      setMessages((prev) => [
        ...prev,
        { role: 'bot', content: 'Sorry, something went wrong.' },
      ]);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  return (
    <div className={styles.chatbot}>
      {isOpen ? (
        <div className={styles.chatWindow}>
          <div className={styles.chatHeader}>
            <h4>WozBot</h4>
            <button onClick={toggleChat} className={styles.closeButton}>
              <FaTimes />
            </button>
          </div>
          <div className={styles.chatContainer} ref={chatContainerRef}>
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`${styles.chatMessage} ${
                  msg.role === 'user' ? styles.userMessage : styles.botMessage
                }`}
              >
                {msg.content}
                {msg.buttons && (
                  <div className={styles.chatButtons}>
                    {msg.buttons.map((button, btnIndex) => (
                      <NavButton className={styles.chatbotButton} key={btnIndex} to={button.route} label={button.title} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className={styles.chatInput}>
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
            />
            <button onClick={handleSendMessage}>Send</button>
          </div>
        </div>
      ) : (
        <button onClick={toggleChat} className={styles.chatCircle}>
          <span className={styles.icon}><FaRegComment /></span>
        </button>
      )}
    </div>
  );
};

export default Chatbot;
