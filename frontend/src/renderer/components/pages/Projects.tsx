import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { Link } from 'react-router-dom'
import { FolderIcon, PlusIcon, ArrowPathIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { api } from '../../services/api'

interface Project {
  name: string
  path: string
  current_branch: string
  commits_count: number
  last_commit?: {
    date: string
  }
}

export const Projects: React.FC = () => {
  const [cloneUrl, setCloneUrl] = useState('')
  const [clonePath, setClonePath] = useState('')
  const [showCloneModal, setShowCloneModal] = useState(false)

  const queryClient = useQueryClient()

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: () => api.getProjects()
  })

  const cloneMutation = useMutation({
    mutationFn: ({ url, path }: { url: string; path?: string }) =>
      api.cloneRepository(url, path),
    onSuccess: () => {
      toast.success('仓库克隆成功！')
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setCloneUrl('')
      setClonePath('')
      setShowCloneModal(false)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || '仓库克隆失败')
    }
  })

  const handleClone = (e: React.FormEvent) => {
    e.preventDefault()
    if (!cloneUrl.trim()) {
      toast.error('请输入仓库URL')
      return
    }
    cloneMutation.mutate({ url: cloneUrl, path: clonePath || undefined })
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider mb-1">
            Repository Management
          </p>
          <h1 className="text-[26px] font-bold text-[#1e1b4b] tracking-tight">
            Projects
          </h1>
        </div>

        <button
          onClick={() => setShowCloneModal(true)}
          className="btn-primary gap-1.5 text-[13px]"
        >
          <PlusIcon className="h-4 w-4" />
          Clone Repository
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <ArrowPathIcon className="h-8 w-8 animate-spin text-indigo-400" />
          <p className="text-sm text-gray-400">Loading...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
            <FolderIcon className="h-8 w-8 text-gray-300" />
          </div>
          <h3 className="text-base font-semibold text-[#1e1b4b]">No Projects</h3>
          <p className="text-sm text-gray-400">Clone a repository to get started</p>
          <button
            onClick={() => setShowCloneModal(true)}
            className="btn-primary gap-1.5 text-[13px] mt-2"
          >
            <PlusIcon className="h-4 w-4" />
            Clone Repository
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project: Project) => (
            <div key={project.path} className="glass-card overflow-hidden">
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[15px] font-semibold text-[#1e1b4b] mb-1 truncate">
                      {project.name}
                    </h3>
                    <p className="text-xs text-gray-400 truncate">{project.path}</p>
                  </div>
                  <div className="w-9 h-9 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-xl flex items-center justify-center flex-shrink-0 ml-3 shadow-sm shadow-indigo-500/20">
                    <FolderIcon className="h-4 w-4 text-white" />
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-gray-400 mb-4">
                  <span className="badge badge-indigo">{project.current_branch}</span>
                  <span>{project.commits_count} commits</span>
                  <span>{project.last_commit?.date ? new Date(project.last_commit.date).toLocaleDateString() : 'N/A'}</span>
                </div>

                <Link
                  to={`/projects/${encodeURIComponent(project.path)}`}
                  className="btn-primary w-full justify-center text-[13px]"
                >
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Clone modal */}
      {showCloneModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass-card-static w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-[#1e1b4b] tracking-tight">Clone Repository</h2>
              <button onClick={() => setShowCloneModal(false)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleClone}>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Repository URL
                  </label>
                  <input
                    type="url"
                    value={cloneUrl}
                    onChange={(e) => setCloneUrl(e.target.value)}
                    placeholder="https://github.com/user/repo.git"
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Local Path (optional)
                  </label>
                  <input
                    type="text"
                    value={clonePath}
                    onChange={(e) => setClonePath(e.target.value)}
                    placeholder="/path/to/clone"
                    className="input-field"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  disabled={cloneMutation.isPending}
                  className="btn-primary flex-1 justify-center text-[13px] disabled:opacity-50"
                >
                  {cloneMutation.isPending ? 'Cloning...' : 'Clone'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCloneModal(false)}
                  className="btn-secondary flex-1 justify-center text-[13px]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
