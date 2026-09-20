import { StyleSheet, View } from 'react-native';
import { FriendRequestView } from '../screens/FriendRequestView';

export default function FriendsScreen() {
  return <FriendRequestView />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fffbeb' },
});
