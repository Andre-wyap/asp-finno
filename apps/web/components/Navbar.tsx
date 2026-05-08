'use client';

import { Menu, X } from 'lucide-react';
import { useState } from 'react';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="fixed left-0 right-0 top-0 z-50 bg-surface-container-lowest/85 backdrop-blur-xl shadow-ambient">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <span className="font-display text-xl font-bold text-primary">FINNO</span>
          <span className="hidden text-xs text-on-surface-variant sm:block">
            Authorised Allianz General Agent · Allianz Shield Plus
          </span>
        </div>

        <nav className="hidden items-center gap-6 md:flex">
          <a
            href="#benefits"
            className="text-sm font-semibold text-on-surface-variant transition hover:text-primary"
          >
            Benefits
          </a>
          <a
            href="#plans"
            className="text-sm font-semibold text-on-surface-variant transition hover:text-primary"
          >
            Plans
          </a>
          <a
            href="#how-it-works"
            className="text-sm font-semibold text-on-surface-variant transition hover:text-primary"
          >
            How It Works
          </a>
          <a
            href="#plans"
            className="flex min-h-9 items-center rounded-full bg-primary px-5 text-sm font-semibold text-on-primary transition hover:bg-secondary"
          >
            Get a Quote
          </a>
        </nav>

        <button
          type="button"
          aria-label="Toggle menu"
          onClick={() => setIsOpen(!isOpen)}
          className="flex size-10 items-center justify-center rounded-full text-primary hover:bg-primary-fixed/40 md:hidden"
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {isOpen && (
        <div className="border-t border-outline-variant/15 bg-surface-container-lowest px-4 py-5 md:hidden">
          <div className="flex flex-col gap-4">
            <a
              href="#benefits"
              onClick={() => setIsOpen(false)}
              className="text-sm font-semibold text-on-surface-variant"
            >
              Benefits
            </a>
            <a
              href="#plans"
              onClick={() => setIsOpen(false)}
              className="text-sm font-semibold text-on-surface-variant"
            >
              Plans
            </a>
            <a
              href="#how-it-works"
              onClick={() => setIsOpen(false)}
              className="text-sm font-semibold text-on-surface-variant"
            >
              How It Works
            </a>
            <a
              href="#plans"
              onClick={() => setIsOpen(false)}
              className="flex min-h-11 items-center justify-center rounded-full bg-primary text-sm font-semibold text-on-primary"
            >
              Get a Quote
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
