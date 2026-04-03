import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="space-y-3">
          <div className="text-5xl">📞</div>
          <h1 className="text-3xl font-bold text-gray-900">AI English Coach</h1>
          <p className="text-lg text-gray-600">
            We call you at the scheduled time.
            <br />
            You practice. You improve.
          </p>
        </div>

        <div className="space-y-3">
          <Link href="/signup" className="btn-primary w-full block text-center">
            Get started — it&apos;s free
          </Link>
          <Link
            href="/login"
            className="btn-secondary w-full block text-center"
          >
            Sign in
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-4 text-sm text-gray-600 pt-4">
          <div className="card text-center p-4">
            <div className="text-2xl mb-1">📅</div>
            <div>Schedule your calls</div>
          </div>
          <div className="card text-center p-4">
            <div className="text-2xl mb-1">🤖</div>
            <div>AI calls you</div>
          </div>
          <div className="card text-center p-4">
            <div className="text-2xl mb-1">📝</div>
            <div>Get feedback</div>
          </div>
        </div>
      </div>
    </main>
  );
}
