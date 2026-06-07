import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { useAuthController } from '../../controllers/useAuthController';

// On web, wraps children in a <form> so the browser recognises the
// password field and enables credential managers / autofill.
function FormWrapper({ onSubmit, style, children }) {
  if (Platform.OS === 'web') {
    return (
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} style={style}>
        {children}
      </form>
    );
  }
  return <View style={style}>{children}</View>;
}

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { loading, error, setError, handleLogin, handleRegister } = useAuthController();

  function toggleMode() {
    setIsLogin((v) => !v);
    setError(null);
  }

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) return;
    if (isLogin) {
      await handleLogin(email, password);
    } else {
      await handleRegister(email, password);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.logo}>✦ Lumo</Text>
        <Text style={styles.tagline}>Dit kreative fællesrum</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{isLogin ? 'Log ind' : 'Opret konto'}</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <FormWrapper onSubmit={handleSubmit}>
            <TextInput
              style={styles.input}
              placeholder="E-mail"
              placeholderTextColor="#444"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
            <TextInput
              style={styles.input}
              placeholder="Adgangskode"
              placeholderTextColor="#444"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleSubmit}
              disabled={loading || !email.trim() || !password.trim()}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>
                  {isLogin ? 'Log ind' : 'Opret konto'}
                </Text>
              )}
            </TouchableOpacity>
          </FormWrapper>
        </View>

        <TouchableOpacity onPress={toggleMode} style={styles.switchRow}>
          <Text style={styles.switchText}>
            {isLogin ? 'Har du ikke en konto? ' : 'Har du allerede en konto? '}
            <Text style={styles.switchLink}>
              {isLogin ? 'Opret konto' : 'Log ind'}
            </Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logo: {
    fontSize: 52,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginBottom: 40,
  },
  card: {
    backgroundColor: '#12121a',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1e1e2e',
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 20,
  },
  errorBox: {
    backgroundColor: 'rgba(248,113,113,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.3)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#f87171',
    fontSize: 14,
  },
  input: {
    backgroundColor: '#0a0a0f',
    borderWidth: 1,
    borderColor: '#2a2a3e',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#fff',
    marginBottom: 12,
  },
  btn: {
    backgroundColor: '#a78bfa',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: {
    opacity: 0.45,
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  switchRow: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  switchText: {
    color: '#555',
    fontSize: 14,
  },
  switchLink: {
    color: '#a78bfa',
    fontWeight: '600',
  },
});
