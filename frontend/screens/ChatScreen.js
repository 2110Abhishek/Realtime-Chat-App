import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, SafeAreaView, StatusBar } from 'react-native';
import io from 'socket.io-client';
import axios from 'axios';

const API_URL = 'https://realtime-chat-app-backend-s7dx.onrender.com';

export default function ChatScreen({ route }) {
  const { user } = route.params;
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [typingUser, setTypingUser] = useState('');
  const [usersOnline, setUsersOnline] = useState({});
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const flatListRef = useRef(null);

  useEffect(() => {
    fetchUsers();
    fetchMessages();

    socketRef.current = io(API_URL);
    
    socketRef.current.on('connect', () => {
      socketRef.current.emit('user connected', user.username);
    });

    socketRef.current.on('chat message', (msg) => {
      setMessages((prevMessages) => {
        const newMessages = [...prevMessages, msg];
        if (msg.sender !== user.username) {
          socketRef.current.emit('message read', [msg.id]);
        }
        return newMessages;
      });
      // Scroll to bottom when a new message arrives
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });

    socketRef.current.on('messages read', (messageIds) => {
      setMessages((prevMessages) => 
        prevMessages.map(m => messageIds.includes(m.id) ? { ...m, status: 'read' } : m)
      );
    });

    socketRef.current.on('messages delivered update', () => {
      fetchMessages();
    });

    socketRef.current.on('typing', (data) => {
      if (data.isTyping) {
        setTypingUser(data.username);
      } else {
        setTypingUser('');
      }
    });

    socketRef.current.on('user status', (data) => {
      setUsersOnline(prev => ({ ...prev, [data.username]: data.status }));
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/users`);
      const statusMap = {};
      response.data.forEach(u => {
        statusMap[u.username] = u.status;
      });
      setUsersOnline(statusMap);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/messages`);
      const msgs = response.data;
      setMessages(msgs);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 200);

      const unreadIds = msgs.filter(m => m.sender !== user.username && m.status !== 'read').map(m => m.id);
      if (unreadIds.length > 0 && socketRef.current) {
        socketRef.current.emit('message read', unreadIds);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const sendMessage = () => {
    if (!inputText.trim()) return;

    const messageData = { sender: user.username, text: inputText.trim() };
    socketRef.current.emit('chat message', messageData);
    
    setInputText('');
    socketRef.current.emit('typing', { username: user.username, isTyping: false });
  };

  const handleTyping = (text) => {
    setInputText(text);
    
    socketRef.current.emit('typing', { username: user.username, isTyping: true });
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current.emit('typing', { username: user.username, isTyping: false });
    }, 1500);
  };

  const renderMessageStatus = (status, isMyMessage) => {
    if (!isMyMessage) return null;
    let text = '✓';
    let color = '#a78bfa'; // light purple tick for sent/delivered on a dark background

    if (status === 'delivered' || status === 'read') {
      text = '✓✓';
    }
    if (status === 'read') {
      color = '#fbbf24'; // pop of yellow/gold for read on a dark indigo bubble
    }

    return (
      <View style={styles.statusContainer}>
        <Text style={{ color, fontSize: 12, fontWeight: 'bold' }}>{text}</Text>
      </View>
    );
  };

  const renderMessage = ({ item, index }) => {
    const isMyMessage = item.sender === user.username;
    
    // Add extra margin if the previous message is from a different sender
    const prevMessage = messages[index - 1];
    const isFirstInGroup = !prevMessage || prevMessage.sender !== item.sender;

    return (
      <View style={[styles.messageWrapper, isFirstInGroup && { marginTop: 12 }]}>
        {!isMyMessage && isFirstInGroup && <Text style={styles.senderName}>{item.sender}</Text>}
        
        <View style={[styles.messageBubble, isMyMessage ? styles.myMessage : styles.otherMessage]}>
          <Text style={[styles.messageText, isMyMessage ? styles.myMessageText : styles.otherMessageText]}>
            {item.text}
          </Text>
          <View style={styles.messageFooter}>
            <Text style={[styles.timestamp, isMyMessage ? styles.myTimestamp : styles.otherTimestamp]}>
              {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            {renderMessageStatus(item.status, isMyMessage)}
          </View>
        </View>
      </View>
    );
  };

  const onlineCount = Object.values(usersOnline).filter(s => s === 'online').length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Global Lounge</Text>
            <View style={styles.onlineBadgeContainer}>
              <View style={styles.onlineDot} />
              <Text style={styles.subHeaderText}>{onlineCount} {onlineCount === 1 ? 'user' : 'users'} online</Text>
            </View>
          </View>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{user.username.charAt(0).toUpperCase()}</Text>
          </View>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />
        
        {typingUser ? (
          <View style={styles.typingContainer}>
            <Text style={styles.typingIndicator}>{typingUser} is typing...</Text>
          </View>
        ) : null}
        
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={handleTyping}
            placeholder="Message..."
            placeholderTextColor="#9ca3af"
            multiline
            maxLength={500}
          />
          <TouchableOpacity 
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]} 
            onPress={sendMessage}
            disabled={!inputText.trim()}
            activeOpacity={0.7}
          >
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', marginLeft: 2 }}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    paddingBottom: Platform.OS === 'android' ? 30 : 0, // Padding for bottom system nav bar
  },
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6', // sleek background
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1f2937',
    letterSpacing: -0.5,
  },
  onlineBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981', // emerald green
    marginRight: 6,
  },
  subHeaderText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6366f1',
  },
  messageList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  messageWrapper: {
    marginBottom: 4,
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#6366f1', // modern indigo
    borderBottomRightRadius: 4,
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 4,
    marginLeft: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  myMessageText: {
    color: '#ffffff',
  },
  otherMessageText: {
    color: '#1f2937',
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
  },
  timestamp: {
    fontSize: 11,
  },
  myTimestamp: {
    color: '#c7d2fe', // lighter indigo for contrast
  },
  otherTimestamp: {
    color: '#9ca3af',
  },
  statusContainer: {
    marginLeft: 4,
  },
  typingContainer: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  typingIndicator: {
    fontSize: 13,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'android' ? 24 : 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'flex-end', // align to bottom for multiline
  },
  input: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 16,
    color: '#1f2937',
    marginRight: 12,
    maxHeight: 100, // limit multiline height
  },
  sendButton: {
    backgroundColor: '#6366f1',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  sendButtonDisabled: {
    backgroundColor: '#d1d5db',
    shadowOpacity: 0,
    elevation: 0,
  },
});
