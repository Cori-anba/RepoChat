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
          配置GitHub API访问权限
        </p>
        <h1 className="text-[26px] font-bold text-[#1e1b4b] tracking-tight">
          GitHub设置
        </h1>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Main config */}
        <div className="glass-card-static p-6">
          <h2 className="text-sm font-semibold text-[#1e1b4b] mb-5">GitHub配置</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                GitHub Personal Access Token
              </label>
              <input
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="输入您的GitHub Personal Access Token"
                className="input-field"
              />
              <p className="mt-1.5 text-xs text-gray-400">
                需要获取GitHub API访问权限。请前往GitHub设置创建Personal Access Token。
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleTestConnection}
                disabled={isTesting || !accessToken.trim()}
                className="inline-flex items-center px-4 py-2.5 text-sm font-medium rounded-xl bg-white/60 backdrop-blur-sm border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isTesting ? '测试中...' : '测试连接'}
              </button>
              <button
                onClick={handleSave}
                disabled={saveConfigMutation.isPending || !accessToken.trim()}
                className="btn-primary text-[13px] disabled:opacity-50"
              >
                {saveConfigMutation.isPending ? '保存中...' : '保存设置'}
              </button>
              <button
                onClick={handleClear}
                className="btn-secondary text-[13px]"
              >
                清空
              </button>
            </div>
          </div>
        </div>

        {/* Status card */}
        <div className="glass-card-static p-6">
          <h2 className="text-sm font-semibold text-[#1e1b4b] mb-4">当前状态</h2>

          {isLoadingConfig ? (
            <div className="flex items-center justify-center py-6 gap-3">
              <div className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
              <span className="text-sm text-gray-400">加载中...</span>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2">
                <span className="text-sm font-medium text-gray-600">配置状态:</span>
                <span className={`badge ${status?.configured ? 'badge-green' : 'badge-pink'}`}>
                  {status?.configured ? '已配置' : '未配置'}
                </span>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-sm font-medium text-gray-600">热门项目缓存:</span>
                <span className="text-sm text-gray-400">
                  {status?.trending_count || 0} 个项目
                </span>
              </div>

              {status?.configured && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm font-medium text-gray-600">Access Token:</span>
                  <span className="text-sm text-gray-400 truncate max-w-xs">
                    {status.access_token ? '••••••••' + status.access_token.slice(-4) : '无'}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Instructions card */}
        <div className="glass-card-static p-5">
          <h3 className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-3">使用说明</h3>
          <div className="space-y-2 text-sm text-gray-500">
            <p>1. 前往GitHub，点击头像-Settings，滑动到最下方，点击Developer Settings-Personal access tokens-Fine grained tokens</p>
            <p>2. 选择适当的权限范围（建议勾选repo权限）</p>
            <p>3. 复制生成的token并粘贴到上方输入框</p>
            <p>4. 点击"测试连接"验证token有效性</p>
            <p>5. 点击"保存设置"保存配置</p>
          </div>
        </div>
      </div>
    </div>
  )
}
