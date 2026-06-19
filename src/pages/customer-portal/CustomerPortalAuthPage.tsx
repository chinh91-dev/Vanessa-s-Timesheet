import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { useNavigate } from 'react-router-dom';
import { Loader2, Phone } from 'lucide-react';

const WEBSITE_NAV = [
  { label: "Home",       href: "https://www.comansservices.com.au/" },
  { label: "About",      href: "https://www.comansservices.com.au/about" },
  { label: "Services",   href: "https://www.comansservices.com.au/services" },
  { label: "Projects",   href: "https://www.comansservices.com.au/projects" },
  { label: "Industries", href: "https://www.comansservices.com.au/industries" },
  { label: "Support",    href: "https://www.comansservices.com.au/support" },
];

export default function CustomerPortalAuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signIn } = useCustomerAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: signInError } = await signIn(email, password);

    if (signInError) {
      setError(signInError.message);
    } else {
      navigate('/customer-portal/dashboard');
    }

    setLoading(false);
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 50%, #111111 100%)' }}
    >
      {/* ── Website nav bar ── */}
      <nav className="w-full border-b border-white/10" style={{ background: '#111111' }}>
        <div className="w-full px-4 md:px-6 flex items-center justify-between h-14 sm:h-16 md:h-20 lg:h-24 xl:h-28">

          {/* Logo */}
          <a href="https://www.comansservices.com.au" target="_blank" rel="noopener noreferrer">
            <img
              src="https://comansservices.com.au/images/comansservices-logo-w.svg"
              alt="Comans Services"
              className="h-8 sm:h-10 md:h-12 lg:h-16 xl:h-20 w-auto"
            />
          </a>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-1 md:gap-2 lg:gap-3 xl:gap-4">
            {WEBSITE_NAV.map((item) => (
              <a
                key={item.label}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2 py-1 md:px-3 md:py-1.5 lg:px-4 lg:py-2 text-sm md:text-base lg:text-lg xl:text-xl font-medium text-white uppercase tracking-wider hover:text-[#e1251b] transition-colors"
              >
                {item.label}
              </a>
            ))}
          </div>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <a
              href="tel:1300112872"
              className="flex items-center gap-1.5 text-sm md:text-base lg:text-lg text-gray-300 hover:text-white transition-colors"
            >
              <Phone className="h-3.5 w-3.5 md:h-4 md:w-4 lg:h-5 lg:w-5" />
              1300 112 872
            </a>
          </div>
        </div>
      </nav>

      {/* ── Login form ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">

        <div className="w-full max-w-md mb-8 text-center">
          <h1 className="text-white text-2xl font-bold tracking-tight">Customer Portal</h1>
          <p className="text-gray-400 text-sm mt-1">Sign in to access your service dashboard</p>
        </div>

        <Card className="w-full max-w-md border-0 shadow-2xl" style={{ background: '#1e1e1e' }}>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-[#e1251b]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-300">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-[#e1251b]"
                />
              </div>

              <Button
                type="submit"
                className="w-full font-semibold text-white hover:opacity-90"
                style={{ background: '#e1251b' }}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-gray-600 text-xs mt-6">
          Don't have an account?{' '}
          <a
            href="https://www.comansservices.com.au/support"
            className="text-gray-400 hover:text-white underline transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            Contact us
          </a>
        </p>

        <p className="text-gray-700 text-xs mt-3">
          &copy; {new Date().getFullYear()} Comans Services. All rights reserved.
        </p>
      </div>
    </div>
  );
}
