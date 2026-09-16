import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export const RegisterPage: React.FC = () => {
  const [name, setName] = useState('')
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
            Create an account for entity resolution
          </p>
        </div>

        {/* Register Card */}
        <div className="card-surface p-8 shadow-[var(--shadow-sm)]">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-[var(--text-primary)]">
                Full Name
              </label>
              <input
                type="text"
                placeholder="Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-[var(--bg-canvas)] border border-[var(--border)] rounded-[8px] px-3 py-2 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

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
              <label className="text-[12px] font-medium text-[var(--text-primary)]">
                Password
              </label>
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
              Sign up →
            </Button>
          </form>
        </div>

        <div className="text-center text-[13px] text-[var(--text-secondary)]">
          Already have an account?{' '}
          <Link to="/login" className="text-[var(--accent)] hover:underline font-medium">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage
