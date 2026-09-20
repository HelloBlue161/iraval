import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function TermsScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Terms & Conditions</Text>
        <Text style={styles.updated}>Last updated: September 2025</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
          <Text style={styles.body}>
            By downloading, installing, or using the Iraval application (the "App"), you agree to be
            bound by these Terms and Conditions. If you do not agree to these terms, do not use the App.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Description of Service</Text>
          <Text style={styles.body}>
            Iraval is a book exchange community platform that allows users to:
          </Text>
          <Text style={styles.body}>
            • Create and manage a personal book library
          </Text>
          <Text style={styles.body}>
            • Search for books available in the community
          </Text>
          <Text style={styles.body}>
            • Request to borrow books from other users
          </Text>
          <Text style={styles.body}>
            • Connect with other readers through friend requests
          </Text>
          <Text style={styles.body}>
            • Chat with other users to coordinate exchanges
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. User Accounts</Text>
          <Text style={styles.body}>
            You must be at least 21 years old to create an account. You are responsible for
            maintaining the confidentiality of your account credentials and for all activities
            that occur under your account. You must provide accurate and complete information
            when registering.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. User Conduct</Text>
          <Text style={styles.body}>
            You agree not to:
          </Text>
          <Text style={styles.body}>
            • Use the App for any illegal or unauthorized purpose
          </Text>
          <Text style={styles.body}>
            • Submit false or misleading book information
          </Text>
          <Text style={styles.body}>
            • Harass, abuse, or harm other users
          </Text>
          <Text style={styles.body}>
            • Copy, modify, or distribute the App's source code
          </Text>
          <Text style={styles.body}>
            • Use automated systems to access the App without permission
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Book Exchange Responsibility</Text>
          <Text style={styles.body}>
            Iraval facilitates connections between users but is not responsible for the condition
            of books, the accuracy of book descriptions, or the fulfillment of exchange agreements.
            Users are solely responsible for arranging and completing exchanges between themselves.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Privacy</Text>
          <Text style={styles.body}>
            Your use of the App is also governed by our Privacy Policy, which explains how we
            collect, use, and share your information. By using the App, you consent to our
            data practices.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Intellectual Property</Text>
          <Text style={styles.body}>
            The App and its original content, features, and functionality are owned by Iraval
            and are protected by international copyright, trademark, and other intellectual
            property laws.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Termination</Text>
          <Text style={styles.body}>
            We reserve the right to suspend or terminate your account and access to the App
            at our discretion, without notice, for conduct that we believe violates these
            Terms or is harmful to other users, us, or third parties.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Disclaimer of Warranties</Text>
          <Text style={styles.body}>
            The App is provided "as is" without warranties of any kind. We do not warrant
            that the App will be uninterrupted, secure, or free of errors.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. Contact</Text>
          <Text style={styles.body}>
            If you have questions about these Terms, please contact us at
            support@iraval.app
          </Text>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.acceptButton} onPress={() => router.back()}>
            <Text style={styles.acceptButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fffbeb' },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#92400e',
    fontFamily: 'serif',
    textAlign: 'center',
    marginBottom: 4,
  },
  updated: {
    fontSize: 12,
    color: '#a8a29e',
    textAlign: 'center',
    marginBottom: 24,
  },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#92400e',
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    color: '#44403c',
    lineHeight: 22,
    marginBottom: 4,
  },
  footer: { marginTop: 20, alignItems: 'center' },
  acceptButton: {
    backgroundColor: '#f59e0b',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
