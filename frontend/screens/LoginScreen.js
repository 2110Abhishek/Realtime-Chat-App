import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import axios from 'axios';

// IMPORTANT: Use your machine's local IP address if testing on a physical device, 
// e.g., http://10.34.44.199:3000
const API_URL = 'https://realtime-chat-app-backend-s7dx.onrender.com';

export default function LoginScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim()) {
      Alert.alert('Hold on!', 'Please enter a username to continue.');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/login`, { username: username.trim() });
      const user = response.data.user;
      navigation.replace('Chat', { user });
    } catch (error) {
      console.error(error);
      Alert.alert('Connection Error', 'Failed to login. Ensure your backend server is running and the URL is correct.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.card}>
        <View style={styles.logoPlaceholder}>
          <Text style={styles.logoText}>💬</Text>
        </View>
        <Text style={styles.title}>Join the Chat</Text>
        <Text style={styles.subtitle}>Enter a username to connect with others globally.</Text>
        
        <TextInput
          style={styles.input}
          placeholder="e.g., CoolUser123"
          placeholderTextColor="#9ca3af"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
        />
        
        <TouchableOpacity 
          style={[styles.button, !username.trim() && styles.buttonDisabled]} 
          onPress={handleLogin} 
          disabled={loading || !username.trim()}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Start Chatting</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f3f4f6', // sleek light gray background
  },
  card: {
    backgroundColor: '#ffffff',
    padding: 32,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
    alignItems: 'center',
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: '#e0e7ff', // light indigo
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  logoText: {
    fontSize: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1f2937', // cool dark gray
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  input: {
    width: '100%',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    fontSize: 16,
    color: '#111827',
  },
  button: {
    width: '100%',
    backgroundColor: '#6366f1', // modern indigo
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: '#a5b4fc',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
