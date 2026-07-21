import * as React from 'react'

export function Footer() {
  return (
    <footer className="w-full border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 py-8 mt-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-zinc-500 dark:text-zinc-400">
        <p className="text-sm">
          &copy; {new Date().getFullYear()} Boris Sargsyan. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
