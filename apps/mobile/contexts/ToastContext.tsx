import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastContextType {
  showToast: (message: string, type?: Toast['type']) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [animations] = useState(() => new Map<string, Animated.Value>());

  const showToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const anim = new Animated.Value(-80);
    animations.set(id, anim);
    setToasts((prev) => [...prev, { id, message, type }]);

    Animated.sequence([
      Animated.timing(anim, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.delay(3000),
      Animated.timing(anim, { toValue: -80, duration: 300, useNativeDriver: true }),
    ]).start(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    });
  }, [animations]);

  const colors = {
    success: '#16a34a',
    error: '#dc2626',
    info: '#d97706',
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toasts.map((toast) => (
        <Animated.View
          key={toast.id}
          style={[
            styles.toast,
            { transform: [{ translateY: animations.get(toast.id) || 0 }] },
            { backgroundColor: colors[toast.type] },
          ]}
        >
          <Text style={styles.toastText}>{toast.message}</Text>
        </Animated.View>
      ))}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  toastText: { color: '#fff', fontSize: 14, fontWeight: '600', textAlign: 'center' },
});

export function useToast() {
  const { showToast } = useContext(ToastContext);
  return {
    success: (msg: string) => showToast(msg, 'success'),
    error: (msg: string) => showToast(msg, 'error'),
    info: (msg: string) => showToast(msg, 'info'),
  };
}
