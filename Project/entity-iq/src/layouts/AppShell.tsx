import React, { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCache } from '@/context/CacheContext'

export interface AppShellProps {
  children: React.ReactNode
}

interface NavItem {
  label: string
  to: string
  matchPaths?: string[]
}

interface NavSection {
  label?: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    // Group 1 — no label
    items: [
      { label: 'Overview', to: '/dashboard', matchPaths: ['/', '/dashboard'] },
    ],
  },
  {
    // Group 2 — WORKSPACE
    label: 'WORKSPACE',
    items: [
      { label: 'Catalog', to: '/datasets', matchPaths: ['/datasets', '/upload'] },
      { label: 'Run', to: '/pipeline', matchPaths: ['/pipeline'] },
      { label: 'Results', to: '/entities', matchPaths: ['/entities', '/clusters'] },
      { label: 'Compare', to: '/match-explorer', matchPaths: ['/match-explorer', '/compare'] },
      { label: 'Analytics', to: '/analytics', matchPaths: ['/analytics'] },
    ],
  },
  {
    // Group 3 — ALGORITHMS
    label: 'ALGORITHMS',
    items: [
      { label: 'Blocking', to: '/algorithms/blocking', matchPaths: ['/algorithms/blocking'] },
      { label: 'Similarity', to: '/algorithms/similarity', matchPaths: ['/algorithms/similarity'] },
      { label: 'Clustering', to: '/algorithms/clustering', matchPaths: ['/algorithms/clustering'] },
    ],
  },
  {
    // Group 4 — SYSTEM
    label: 'SYSTEM',
    items: [
      { label: 'Export', to: '/exports', matchPaths: ['/exports'] },
      { label: 'Settings', to: '/configuration', matchPaths: ['/configuration', '/settings'] },
    ],
  },
]

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const location = useLocation()
  const { isBackgroundRefreshing } = useCache()
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('resolve-theme')
      if (saved === 'dark') return true
      return false
    }
    return false
  })

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('resolve-theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('resolve-theme', 'light')
    }
  }, [isDark])

  const toggleTheme = () => {
    setIsDark((prev) => !prev)
  }

  const isItemActive = (item: NavItem) => {
    if (location.pathname === item.to) return true
    if (item.matchPaths?.includes(location.pathname)) return true
    if (item.matchPaths?.some((p) => p !== '/' && location.pathname.startsWith(p))) return true
    if (item.to !== '/' && location.pathname.startsWith(item.to)) return true
    return false
  }

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] flex font-sans">
      {/* Subtle Background Syncing Indicator */}
      {isBackgroundRefreshing && (
        <div className="fixed top-3 right-6 z-50 flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-surface)]/90 backdrop-blur border border-[var(--border)] rounded-full shadow-md text-[11px] font-mono text-[var(--accent)] pointer-events-none transition-all duration-200">
          <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-ping" />
          <span>Syncing data...</span>
        </div>
      )}

      {/* 240px Fixed Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-[240px] h-screen bg-[var(--bg-sidebar)] border-r border-[var(--border)] flex flex-col z-30 select-none">
        {/* Top: 20x20px SVG Overlapping Rectangles + RESOLVE */}
        <div className="px-5 pt-6 pb-2 shrink-0">
          <NavLink
            to="/dashboard"
            className="inline-flex items-center gap-2.5 focus:outline-none select-none group"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="shrink-0"
            >
              {/* Back / Left Rect */}
              <rect
                x="2"
                y="2"
                width="11"
                height="11"
                rx="2"
                fill="var(--accent)"
                opacity="0.65"
              />
              {/* Front / Right Rect */}
              <rect
                x="7"
                y="7"
                width="11"
                height="11"
                rx="2"
                fill="var(--accent)"
                opacity="1.0"
              />
            </svg>
            <span className="text-[14px] font-extrabold text-[var(--text-primary)] font-sans tracking-[0.02em]">
              RESOLVE
            </span>
          </NavLink>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 overflow-y-auto py-2">
          {navSections.map((section, sIdx) => (
            <div key={section.label || `group-${sIdx}`} className={sIdx === 0 ? 'mt-2' : ''}>
              {/* Group Label */}
              {section.label && (
                <div className="px-5 mt-6 mb-1.5 section-label select-none">
                  {section.label}
                </div>
              )}

              {/* Nav Items */}
              <div className="flex flex-col gap-0.5 px-3">
                {section.items.map((item) => {
                  const active = isItemActive(item)

                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={cn(
                        'relative flex items-center h-[34px] px-3 text-[13px] font-sans rounded-[6px] border-l-2 transition-all duration-[120ms] ease focus-visible:outline-none',
                        active
                          ? 'border-[var(--accent)] bg-[var(--bg-active)] text-[var(--accent)] font-medium'
                          : 'border-transparent text-[var(--text-secondary)] font-normal hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                      )}
                    >
                      <span>{item.label}</span>
                    </NavLink>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom Section: Theme Toggle and Version */}
        <div className="px-5 py-4 shrink-0 select-none flex flex-col gap-2">
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="w-7 h-7 flex items-center justify-center rounded-[6px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors duration-[120ms] focus:outline-none cursor-pointer"
            >
              {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div className="flex items-center">
            <span className="font-mono text-[11px] text-[var(--text-muted)]">
              v2.4.0
            </span>
          </div>
        </div>
      </aside>

      {/* Main Canvas Area with Subtle Texture */}
      <div className="flex-1 ml-[240px] min-h-screen bg-[var(--bg-canvas)] canvas-texture flex flex-col">
        <main className="flex-1 p-[40px_48px]">
          {children}
        </main>
      </div>
    </div>
  )
}

export default AppShell
