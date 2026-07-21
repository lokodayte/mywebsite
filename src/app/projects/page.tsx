import Link from 'next/link'
import { ExternalLink, Code } from 'lucide-react'
import { portfolioData } from '@/data/portfolio'

export default function ProjectsPage() {
  const projects = portfolioData.projects

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-4xl font-bold mb-8 text-zinc-900 dark:text-white">Projects</h1>
      
      {(!projects || projects.length === 0) ? (
        <div className="text-center py-20 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <p className="text-lg text-zinc-500 dark:text-zinc-400">No projects found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map((project) => (
            <div key={project.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              {project.featured_image && (
                <div className="aspect-video w-full bg-zinc-100 dark:bg-zinc-800 relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={project.featured_image} alt={project.title} className="object-cover w-full h-full" />
                </div>
              )}
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                    <Link href={`/projects/${project.slug}`} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                      {project.title}
                    </Link>
                  </h2>
                  <div className="flex gap-2">
                    {project.github_link && (
                      <a href={project.github_link} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white">
                        <Code className="w-5 h-5" />
                      </a>
                    )}
                    {project.live_link && (
                      <a href={project.live_link} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-blue-600 dark:hover:text-blue-400">
                        <ExternalLink className="w-5 h-5" />
                      </a>
                    )}
                  </div>
                </div>
                <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-4 line-clamp-3">
                  {project.short_summary}
                </p>
                {project.technologies && project.technologies.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {project.technologies.slice(0, 3).map((tech: string) => (
                      <span key={tech} className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs rounded-md">
                        {tech}
                      </span>
                    ))}
                    {project.technologies.length > 3 && (
                      <span className="px-2 py-1 text-zinc-500 text-xs">+{project.technologies.length - 3} more</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
