import { StyleSheet, Text, View } from 'react-native';
import { LibraryView } from '../screens/LibraryView';

export default function LibraryScreen() {
  return <LibraryView />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fffbeb' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#78716c', fontSize: 16 },
});
