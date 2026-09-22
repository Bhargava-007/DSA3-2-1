import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] flex flex-col items-center justify-center p-6 select-none">
      <div className="w-full max-w-[380px] space-y-6">
        {/* Brand */}
        <div className="text-center space-y-2">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-[15px] font-bold text-[var(--text-primary)] tracking-[0.01em] uppercase"
          >
            <span className="w-2 h-2 bg-[var(--accent)] shrink-0 inline-block" />
            <span>RESOLVE</span>
          </Link>
          <p className="text-[13px] text-[var(--text-secondary)]">
            Sign in to access your data workspace
          </p>
        </div>

        {/* Login Card */}
        <div className="card-surface p-8 shadow-[var(--shadow-sm)]">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-[var(--text-primary)]">
                Work Email
              </label>
              <input
                type="email"
                placeholder="engineer@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-[var(--bg-canvas)] border border-[var(--border)] rounded-[8px] px-3 py-2 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[12px] font-medium text-[var(--text-primary)]">
                  Password
                </label>
              </div>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-[var(--bg-canvas)] border border-[var(--border)] rounded-[8px] px-3 py-2 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            <Button
              type="submit"
              className="btn-primary w-full h-10 text-[13px] font-medium mt-2"
            >
              Sign in →
            </Button>
          </form>
        </div>

        <div className="text-center text-[13px] text-[var(--text-secondary)]">
          Don't have an account?{' '}
          <Link to="/register" className="text-[var(--accent)] hover:underline font-medium">
            Create account
          </Link>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
