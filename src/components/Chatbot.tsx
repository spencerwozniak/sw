'use client';

import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { FaRegComment } from 'react-icons/fa';
import { FiArrowUpRight, FiX } from 'react-icons/fi';
import styles from './Chatbot.module.css';
import { Panel, Title, IconButton, ChatBubble, Button, Input } from '@/components/ui';

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
        <Panel padding="none" className={styles.chatWindow}>
          <div className={styles.chatHeader}>
            <Title as="h4" size="h4">WozBot</Title>
            <IconButton variant="ghost" size="sm" label="Close" icon={<FiX />} onClick={toggleChat} />
          </div>
          <hr className={styles.divider} />
          <div className={styles.chatContainer} ref={chatContainerRef}>
            {messages.map((msg, index) => (
              <React.Fragment key={index}>
                <ChatBubble from={msg.role === 'user' ? 'user' : 'bot'}>{msg.content}</ChatBubble>
                {msg.buttons && (
                  <div className={styles.chatButtons}>
                    {msg.buttons.map((button, btnIndex) => (
                      <Button key={btnIndex} size="sm" fullWidth href={button.route} iconRight={<FiArrowUpRight />}>
                        {button.title}
                      </Button>
                    ))}
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
          <hr className={styles.divider} />
          <div className={styles.chatInput}>
            <Input
              label="Message"
              placeholder="Type your message..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <Button variant="primary" size="sm" onClick={handleSendMessage} iconRight={<FiArrowUpRight />}>Send</Button>
          </div>
        </Panel>
      ) : (
        <IconButton variant="surface" label="Open chat" icon={<FaRegComment />} onClick={toggleChat} />
      )}
    </div>
  );
};

export default Chatbot;
