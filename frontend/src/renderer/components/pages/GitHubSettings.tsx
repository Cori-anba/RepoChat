import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { api } from '../../services/api'

interface GitHubConfig {
  access_token: string
}

export const GitHubSettings: React.FC = () => {
  const [accessToken, setAccessToken] = useState('')
  const [isTesting, setIsTesting] = useState(false)

  const queryClient = useQueryClient()

  const { data: config, isLoading: isLoadingConfig } = useQuery<GitHubConfig>({
    queryKey: ['github-config'],
    queryFn: () => api.getGitHubConfig(),
    enabled: false
  })

  const { data: status, refetch: refetchStatus } = useQuery({
    queryKey: ['github-status'],
    queryFn: () => api.getGitHubStatus(),
    enabled: false
  })

  useEffect(() => {
    queryClient.fetchQuery({ queryKey: ['github-config'] })
    queryClient.fetchQuery({ queryKey: ['github-status'] })
  }, [queryClient])

  useEffect(() => {
    if (config?.access_token) {
      setAccessToken(config.access_token)
    }
  }, [config])

  const testConnectionMutation = useMutation({
    mutationFn: (token: string) => api.testGitHubConnection(token),
    onSuccess: (result) => {
      setIsTesting(false)
      if (result.success) {
        toast.success(`连接成功！用户: ${result.user?.login || '未知'}`)
      } else {
        toast.error(result.error || '连接失败')
      }
    },
    onError: (error: any) => {
      setIsTesting(false)
      toast.error(error.response?.data?.detail || '连接测试失败')
    }
  })

  const saveConfigMutation = useMutation({
    mutationFn: (token: string) => api.saveGitHubConfig(token),
    onSuccess: (result) => {
      if (result.success) {
        toast.success('配置保存成功！')
        queryClient.invalidateQueries({ queryKey: ['github-status'] })
        queryClient.invalidateQueries({ queryKey: ['github-config'] })
      } else {
        toast.error(result.message || '配置保存失败')
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || '配置保存失败')
    }
  })

  const handleTestConnection = async () => {
    if (!accessToken.trim()) {
      toast.error('请输入GitHub Access Token')
      return
    }

    setIsTesting(true)
    testConnectionMutation.mutate(accessToken)
  }

  const handleSave = async () => {
    if (!accessToken.trim()) {
      toast.error('请输入GitHub Access Token')
      return
    }

    saveConfigMutation.mutate(accessToken)
  }

  const handleClear = () => {
    setAccessToken('')
    toast.success('已清空Access Token')
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <p className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider mb-1">
          Configuration
        </p>
        <h1 className="text-[26px] font-bold text-[#1e1b4b] tracking-tight">
          GitHub Settings
        </h1>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Main config */}
        <div className="glass-card-static p-6">
          <h2 className="text-sm font-semibold text-[#1e1b4b] mb-5">GitHub Configuration</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Personal Access Token
              </label>
              <input
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="Enter your GitHub Personal Access Token"
                className="input-field"
              />
              <p className="mt-1.5 text-xs text-gray-400">
                Go to GitHub Settings to create a Personal Access Token.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleTestConnection}
                disabled={isTesting || !accessToken.trim()}
                className="inline-flex items-center px-4 py-2.5 text-sm font-medium rounded-xl bg-white/60 backdrop-blur-sm border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isTesting ? 'Testing...' : 'Test Connection'}
              </button>
              <button
                onClick={handleSave}
                disabled={saveConfigMutation.isPending || !accessToken.trim()}
                className="btn-primary text-[13px] disabled:opacity-50"
              >
                {saveConfigMutation.isPending ? 'Saving...' : 'Save Settings'}
              </button>
              <button
                onClick={handleClear}
                className="btn-secondary text-[13px]"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Status card */}
        <div className="glass-card-static p-6">
          <h2 className="text-sm font-semibold text-[#1e1b4b] mb-4">Current Status</h2>

          {isLoadingConfig ? (
            <div className="flex items-center justify-center py-6 gap-3">
              <div className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
              <span className="text-sm text-gray-400">Loading...</span>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2">
                <span className="text-sm font-medium text-gray-600">Config Status</span>
                <span className={`badge ${status?.configured ? 'badge-green' : 'badge-pink'}`}>
                  {status?.configured ? 'Configured' : 'Not Configured'}
                </span>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-sm font-medium text-gray-600">Trending Cache</span>
                <span className="text-sm text-gray-400">
                  {status?.trending_count || 0} repos
                </span>
              </div>

              {status?.configured && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm font-medium text-gray-600">Access Token</span>
                  <span className="text-sm text-gray-400 truncate max-w-xs">
                    {status.access_token ? '••••••••' + status.access_token.slice(-4) : 'None'}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Instructions card */}
        <div className="glass-card-static p-5">
          <h3 className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-3">Instructions</h3>
          <div className="space-y-2 text-sm text-gray-500">
            <p>1. Go to <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:text-indigo-600 underline">GitHub Settings</a> to create a Personal Access Token</p>
            <p>2. Select appropriate permissions (recommended: repo scope)</p>
            <p>3. Copy the generated token and paste it above</p>
            <p>4. Click "Test Connection" to verify</p>
            <p>5. Click "Save Settings" to persist</p>
          </div>
        </div>
      </div>
    </div>
  )
}
