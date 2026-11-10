import { Link } from 'react-router-dom';

const H = ({ children }) => <h2 className="mt-8 mb-2 text-lg font-semibold" style={{ color: 'var(--text-strong)' }}>{children}</h2>;

export default function Privacy() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 text-sm leading-relaxed" style={{ color: 'var(--text-body)' }}>
      <h1 className="text-2xl font-bold" style={{ color: 'var(--text-strong)' }}>Privacy Policy</h1>
      <p className="mt-1" style={{ color: 'var(--text-muted)' }}>Effective 10 November 2026 · Primers Store (store.primersgroup.ng)</p>

      <p className="mt-6">Primers Store is run by Primers Group, Abuja, Nigeria, the data controller. This policy explains what we collect and your rights under the Nigeria Data Protection Act 2023 (NDPA). Questions: primerscorperation@gmail.com, subject &ldquo;Privacy&rdquo;.</p>

      <H>What we collect</H>
      <ul className="list-disc pl-5 space-y-1.5">
        <li><strong>Your account:</strong> username, email, display name, an encrypted (hashed) password, optional avatar and bio, your role, and sign-in sessions.</li>
        <li><strong>Continue with Primers ID:</strong> if you sign in with your Primers ID (id.primersgroup.ng), Primers ID confirms your name and verified email to us and gives us an account number for linking. We never receive your Primers ID password.</li>
        <li><strong>Developers:</strong> your developer application and the apps you publish: descriptions, icons, screenshots, files and support contact details. Published app pages are public.</li>
        <li><strong>Activity:</strong> reviews and ratings you post (public with your display name), helpful votes, and downloads, which we record with your account (if signed in), IP address and browser type to count downloads and stop abuse.</li>
        <li><strong>Assistant:</strong> questions you type into the store assistant are sent to an AI model provider through Vercel&apos;s AI Gateway to answer them; we don&apos;t keep the conversations.</li>
      </ul>

      <H>Why, and our lawful basis</H>
      <ul className="list-disc pl-5 space-y-1.5">
        <li>Running your account and the store, and publishing developers&apos; apps: contract with you.</li>
        <li>Security, fraud and abuse prevention, and download counts: legitimate interest.</li>
        <li>Anything optional, such as marketing emails: your consent, which you can withdraw any time.</li>
      </ul>
      <p className="mt-2">We don&apos;t sell personal data or use it for advertising.</p>

      <H>Who we share it with</H>
      <p>Service providers who run the store for us: Vercel (website hosting and AI Gateway), Railway (our server), MongoDB Atlas (database) and, if you use it, Primers ID. They act on our instructions. Some store data outside Nigeria, under the transfer safeguards the NDPA allows. We disclose data if the law requires it.</p>

      <H>How long we keep it</H>
      <p>Your account data and download records are kept while your account is open. When you ask us to delete your account, we delete or anonymise your personal data within 30 days, except what the law requires us to keep.</p>

      <H>Your rights</H>
      <p>You can ask to access, correct, download or delete your data, object to processing, or withdraw consent, by emailing primerscorperation@gmail.com from your account&apos;s address. We reply within 30 days. You can also complain to the Nigeria Data Protection Commission (ndpc.gov.ng).</p>

      <H>Security</H>
      <p>We use encryption in transit, hashed passwords and limited staff access. If a breach is likely to put your rights at risk, we notify the NDPC within 72 hours and tell you without undue delay.</p>

      <H>Children</H>
      <p>Primers Store isn&apos;t for children under 13. Developers must not publish apps aimed at children without their own compliant privacy policy.</p>

      <p className="mt-8"><Link to="/" className="text-primer-400 hover:text-primer-300">Back to the store</Link></p>
    </div>
  );
}
