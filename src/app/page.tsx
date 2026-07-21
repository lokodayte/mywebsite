import Link from 'next/link'
import { ArrowRight, FileText, Mail } from 'lucide-react'
import { portfolioData } from '@/data/portfolio'

export default function Home() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      {/* Hero Section */}
      <section className="py-20 md:py-32 flex flex-col items-center text-center">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-zinc-900 dark:text-white mb-6">
          {portfolioData.personalInfo.name}
        </h1>
        <h2 className="text-xl md:text-2xl text-zinc-600 dark:text-zinc-400 font-medium max-w-3xl mb-8">
          {portfolioData.personalInfo.headline}
        </h2>
        <p className="text-base md:text-lg text-zinc-500 dark:text-zinc-500 max-w-2xl mb-12 leading-relaxed">
          {portfolioData.personalInfo.bio}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
          <Link
            href="/projects"
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-full transition-colors w-full sm:w-auto"
          >
            View My Work
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/resume"
            className="flex items-center gap-2 px-6 py-3 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white font-medium rounded-full transition-colors w-full sm:w-auto"
          >
            <FileText className="w-4 h-4" />
            Download Résumé
          </Link>
          <a
            href={`mailto:${portfolioData.personalInfo.email}`}
            className="flex items-center gap-2 px-6 py-3 border border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700 text-zinc-900 dark:text-white font-medium rounded-full transition-colors w-full sm:w-auto"
          >
            <Mail className="w-4 h-4" />
            Contact Me
          </a>
        </div>
      </section>

      {/* Quick Summary / Featured Section */}
      <section className="py-16 border-t border-zinc-200 dark:border-zinc-800">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800">
            <h3 className="text-xl font-bold mb-3 text-zinc-900 dark:text-white">Education</h3>
            <p className="text-zinc-600 dark:text-zinc-400">
              International background with studies at UWC Dilijan and Marist University, focusing on Cybersecurity.
            </p>
          </div>
          <div className="p-6 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800">
            <h3 className="text-xl font-bold mb-3 text-zinc-900 dark:text-white">Experience</h3>
            <p className="text-zinc-600 dark:text-zinc-400">
              Hands-on technical projects, professional certificates, leadership roles, and academic achievements.
            </p>
          </div>
          <div className="p-6 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800">
            <h3 className="text-xl font-bold mb-3 text-zinc-900 dark:text-white">Skills</h3>
            <p className="text-zinc-600 dark:text-zinc-400">
              Proficient in modern security tools, programming languages, and web technologies.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
