import { Link } from 'react-router-dom';
import { BookOpen, Scroll, Shield, Scale, AlertCircle, FileText } from 'lucide-react';

export default function TermsView() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center px-4 py-8">
      {/* Decorative background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 text-6xl opacity-5 rotate-12">📖</div>
        <div className="absolute top-40 right-20 text-5xl opacity-5 -rotate-12">📚</div>
        <div className="absolute bottom-20 left-1/4 text-7xl opacity-5 rotate-6">🔖</div>
      </div>

      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl p-8 w-full max-w-2xl max-h-[80vh] overflow-y-auto border border-amber-100 relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-4 shadow-inner">
            <Scroll className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold font-serif text-gray-900">Terms & Conditions</h1>
          <p className="text-gray-500 mt-1">Last updated: August 2025</p>
        </div>

        <div className="space-y-4">
          <section className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-5 border border-amber-100">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-5 h-5 text-amber-600" />
              <h2 className="font-semibold text-gray-900 font-serif">1. Intellectual Property Warning</h2>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Iraval is a platform for sharing book information and connecting readers.
              All books shared must respect copyright laws. Users are responsible for
              ensuring their use of shared content complies with applicable intellectual
              property laws.
            </p>
          </section>

          <section className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-5 border border-amber-100">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-amber-600" />
              <h2 className="font-semibold text-gray-900 font-serif">2. Appropriate Use</h2>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Users must interact respectfully with other community members. Harassment,
              hate speech, and inappropriate content are strictly prohibited. Any
              violations will result in account suspension or permanent removal.
            </p>
          </section>

          <section className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-5 border border-amber-100">
            <div className="flex items-center gap-2 mb-2">
              <Scale className="w-5 h-5 text-amber-600" />
              <h2 className="font-semibold text-gray-900 font-serif">3. Book Content Responsibility</h2>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Users are solely responsible for the content of books they share. Iraval
              does not verify or endorse the content of books listed on the platform.
              Report any concerning content to our team.
            </p>
          </section>

          <section className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-5 border border-amber-100">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <h2 className="font-semibold text-gray-900 font-serif">4. Age Requirement</h2>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Iraval is exclusively available to individuals aged <strong>21 years or
              older</strong>. By using this application, you confirm that you meet this
              age requirement. False statements regarding age may result in account
              termination.
            </p>
          </section>

          <section className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-5 border border-amber-100">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-amber-600" />
              <h2 className="font-semibold text-gray-900 font-serif">5. Disclaimer</h2>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Iraval is provided "as is" without warranties of any kind. We do not
              guarantee uninterrupted service, nor are we responsible for user-generated
              content. Your use of Iraval is at your own risk.
            </p>
          </section>
        </div>

        <div className="mt-8 text-center">
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-8 py-3 rounded-xl font-medium hover:from-amber-600 hover:to-orange-600 transition shadow-lg shadow-amber-200"
          >
            Back to Signup
          </Link>
        </div>
      </div>
    </div>
  );
}
