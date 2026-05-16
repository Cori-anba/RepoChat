import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { PlusIcon, TrashIcon, CogIcon, PlayIcon, ClipboardDocumentIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { Switch } from '@headlessui/react'
import { api } from '../../services/api'

interface MCPServer {
  name: string
  command: string
  args?: string[]
  env?: Record<string, string>
  description?: string
  enabled?: boolean
  transportType?: string
  url?: string
  headers?: Record<string, string>
  builtin?: boolean
}

export const MCPSettingsNew: React.FC = () => {
  const [showModal, setShowModal] = useState(false)
  const [currentServer, setCurrentServer] = useState<MCPServer | null>(null)
  const [isTesting, setIsTesting] = useState(false)

  const queryClient = useQueryClient()

  const { data: servers = {} } = useQuery<Record<string, MCPServer>>({
    queryKey: ['mcp-servers'],
    queryFn: () => api.getMCPServers()
  })

  const addMutation = useMutation({
    mutationFn: (server: MCPServer) => api.addMCPServer(server),
    onSuccess: () => {
      toast.success('MCP服务器添加成功！')
      queryClient.invalidateQueries({ queryKey: ['mcp-servers'] })
      setShowModal(false)
      setCurrentServer(null)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'MCP服务器添加失败')
    }
  })

  const updateMutation = useMutation({
    mutationFn: (server: MCPServer) => api.updateMCPServer(server.name, server),
    onSuccess: () => {
      toast.success('MCP服务器更新成功！')
      queryClient.invalidateQueries({ queryKey: ['mcp-servers'] })
      setShowModal(false)
      setCurrentServer(null)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'MCP服务器更新失败')
    }
  })

  const removeMutation = useMutation({
    mutationFn: (name: string) => api.removeMCPServer(name),
    onSuccess: () => {
      toast.success('MCP服务器移除成功！')
      queryClient.invalidateQueries({ queryKey: ['mcp-servers'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'MCP服务器移除失败')
    }
  })

  const toggleMutation = useMutation({
    mutationFn: ({ name, enabled }: { name: string; enabled: boolean }) =>
      api.toggleMCPServer(name, enabled),
    onSuccess: (_, variables) => {
      toast.success(`MCP服务器已${variables.enabled ? '启用' : '禁用'}！`)
      queryClient.invalidateQueries({ queryKey: ['mcp-servers'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'MCP服务器状态切换失败')
    }
  })

  const handleAddServer = (server: MCPServer) => {
    addMutation.mutate(server)
  }

  const handleUpdateServer = (server: MCPServer) => {
    updateMutation.mutate(server)
  }

  const handleRemoveServer = (name: string) => {
    if (window.confirm('确定要删除这个MCP服务器吗？')) {
      removeMutation.mutate(name)
    }
  }

  const handleTestServer = async (config: MCPServer) => {
    setIsTesting(true)
    try {
      const result = await api.testMCPServer(config)
      if (result.success) {
        toast.success('服务器连接测试成功！')
      } else {
        toast.error(`测试失败: ${result.message}`)
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || '服务器测试失败')
    } finally {
      setIsTesting(false)
    }
  }

  const handleImportFromClipboard = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText()
      const json = JSON.parse(clipboardText)

      let serversToImport = []

      if (json.mcpServers && typeof json.mcpServers === 'object') {
        for (const [serverName, config] of Object.entries(json.mcpServers)) {
          if (typeof config === 'object' && config !== null) {
            serversToImport.push({
              name: serverName,
              ...config
            })
          }
        }
      } else if (json.name && json.command) {
        serversToImport.push(json)
      } else {
        toast.error('剪贴板中的配置格式不正确，缺少必要字段')
        return
      }

      if (serversToImport.length === 0) {
        toast.error('未找到有效的MCP服务器配置')
        return
      }

      for (const config of serversToImport) {
        addMutation.mutate({
          name: config.name,
          command: config.command,
          args: config.args || [],
          env: config.env || {},
          description: config.description || '',
          enabled: config.enabled !== false,
          transportType: config.transportType || 'stdio',
          url: config.url || '',
          headers: config.headers || {}
        })
      }

      toast.success(`成功导入 ${serversToImport.length} 个MCP服务器！`)
    } catch (error) {
      console.error('导入失败:', error)
      toast.error('导入失败：请确保剪贴板中包含有效的JSON配置')
    }
  }

  const serverList = Object.entries(servers || {}).map(([serverName, config]) => ({
    ...config,
    name: serverName
  }))

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider mb-1">
            Configuration
          </p>
          <h1 className="text-[26px] font-bold text-[#1e1b4b] tracking-tight">
            MCP Server Settings
          </h1>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleImportFromClipboard}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium rounded-xl bg-white/60 backdrop-blur-sm border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-all duration-200"
          >
            <ClipboardDocumentIcon className="h-4 w-4" />
            Import
          </button>
          <button
            onClick={() => {
              setCurrentServer({
                name: '',
                command: '',
                args: [],
                env: {},
                description: '',
                enabled: true,
                transportType: 'stdio',
                url: '',
                headers: {}
              })
              setShowModal(true)
            }}
            className="btn-primary gap-1.5 text-[13px]"
          >
            <PlusIcon className="h-4 w-4" />
            Manual Config
          </button>
        </div>
      </div>

      {/* Server list */}
      <div>
        <h2 className="text-sm font-semibold text-[#1e1b4b] mb-4">MCP Servers</h2>
        {serverList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center">
              <CogIcon className="h-7 w-7 text-gray-300" />
            </div>
            <p className="text-sm text-gray-400">No MCP servers configured</p>
            <p className="text-xs text-gray-300">Click the buttons above to add or import servers</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {serverList.map((server) => (
              <ServerCard
                key={server.name}
                server={server}
                onEdit={() => {
                  setCurrentServer(server)
                  setShowModal(true)
                }}
                onTest={() => handleTestServer(server)}
                onRemove={() => handleRemoveServer(server.name)}
                onToggle={(enabled) => toggleMutation.mutate({ name: server.name, enabled })}
                isBuiltin={false}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit modal */}
      {showModal && currentServer && (
        <ServerConfigModal
          server={currentServer}
          onSave={(server) => {
            if (currentServer.name) {
              handleUpdateServer(server)
            } else {
              handleAddServer(server)
            }
          }}
          onClose={() => {
            setShowModal(false)
            setCurrentServer(null)
          }}
          onTest={handleTestServer}
          isTesting={isTesting}
        />
      )}
    </div>
  )
}

// Server Card component
const ServerCard: React.FC<{
  server: MCPServer
  onEdit: () => void
  onTest: () => void
  onRemove: () => void
  onToggle: (enabled: boolean) => void
  isBuiltin: boolean
}> = ({ server, onEdit, onTest, onRemove, onToggle }) => {
  return (
    <div className="glass-card p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-semibold text-[#1e1b4b] truncate">
            {server.name}
          </h3>
          {server.description && (
            <p className="text-xs text-gray-400 mt-1 line-clamp-2">{server.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
          <Switch
            checked={server.enabled !== false}
            onChange={onToggle}
            className={`${
              server.enabled !== false ? 'bg-indigo-500' : 'bg-gray-200'
            } relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400/40`}
          >
            <span
              className={`${
                server.enabled !== false ? 'translate-x-[18px]' : 'translate-x-[2px]'
              } inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-200 shadow-sm`}
            />
          </Switch>
          <button
            onClick={onRemove}
            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <TrashIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="space-y-1.5 text-xs text-gray-400 mb-4">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-gray-500">Type:</span> {server.transportType || 'stdio'}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-gray-500">Command:</span>
          <span className="truncate">{server.command}</span>
        </div>
        {server.args && server.args.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-gray-500">Args:</span>
            <span className="truncate">{server.args.join(' ')}</span>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={onTest}
          disabled={server.enabled === false}
          className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium rounded-lg bg-white/60 border border-emerald-200 text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <PlayIcon className="h-3 w-3" />
          Test
        </button>
        <button
          onClick={onEdit}
          className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-semibold text-white rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 transition-all shadow-sm shadow-indigo-500/20"
        >
          <CogIcon className="h-3 w-3" />
          Edit
        </button>
      </div>
    </div>
  )
}

// Env utils
const envUtils = {
  parse: (env: string): Record<string, string> => {
    const lines = env.split('\n')
    const result: Record<string, string> = {}
    for (const line of lines) {
      const eqIndex = line.indexOf('=')
      if (eqIndex === -1) continue
      const key = line.slice(0, eqIndex)
      const value = line.slice(eqIndex + 1)
      if (key && value && key.trim() && value.trim()) {
        result[key.trim()] = value.trim()
      }
    }
    return result
  },
  stringify: (env: Record<string, string>): string => {
    return Object.entries(env)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n')
  },
}

// Server config modal
const ServerConfigModal: React.FC<{
  server: MCPServer
  onSave: (server: MCPServer) => void
  onClose: () => void
  onTest: (server: MCPServer) => void
  isTesting: boolean
}> = ({ server, onSave, onClose, onTest, isTesting }) => {
  const [formData, setFormData] = useState<MCPServer>({
    ...server,
    env: server.env || {},
    headers: server.headers || {}
  })

  const [envString, setEnvString] = useState(envUtils.stringify(server.env || {}))
  const [headersString, setHeadersString] = useState(envUtils.stringify(server.headers || {}))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const serverToSave = {
      ...formData,
      env: envUtils.parse(envString),
      headers: envUtils.parse(headersString)
    }

    onSave(serverToSave)
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-card-static w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-[#1e1b4b] tracking-tight">
            {server.name ? 'Edit MCP Server' : 'Add MCP Server'}
          </h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Server Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Transport Type
                </label>
                <select
                  value={formData.transportType || 'stdio'}
                  onChange={(e) => setFormData({ ...formData, transportType: e.target.value })}
                  className="input-field"
                >
                  <option value="stdio">Standard I/O (stdio)</option>
                  <option value="http">HTTP</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Command *
              </label>
              <input
                type="text"
                value={formData.command}
                onChange={(e) => setFormData({ ...formData, command: e.target.value })}
                className="input-field"
                required
                placeholder="python -m app.core.comment_mcp_server"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Arguments (space-separated)
              </label>
              <input
                type="text"
                value={formData.args?.join(' ') || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  args: e.target.value.split(' ').filter(arg => arg.trim())
                })}
                className="input-field"
                placeholder="-m app.core.comment_mcp_server"
              />
            </div>

            {formData.transportType === 'http' && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  URL *
                </label>
                <input
                  type="url"
                  value={formData.url || ''}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="input-field"
                  placeholder="https://api.example.com/mcp"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Description
              </label>
              <input
                type="text"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input-field"
                placeholder="MCP server description"
              />
            </div>

            {formData.transportType === 'stdio' && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Environment Variables (KEY=VALUE, one per line)
                </label>
                <textarea
                  value={envString}
                  onChange={(e) => setEnvString(e.target.value)}
                  className="input-field"
                  rows={4}
                  placeholder={"MCP_MODE=stdio\nLOG_LEVEL=error\nDISABLE_CONSOLE_OUTPUT=true"}
                />
              </div>
            )}

            {formData.transportType === 'http' && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  HTTP Headers (NAME=VALUE, one per line)
                </label>
                <textarea
                  value={headersString}
                  onChange={(e) => setHeadersString(e.target.value)}
                  className="input-field"
                  rows={4}
                  placeholder={"Authorization=Bearer token\nContent-Type=application/json"}
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={() => onTest(formData)}
              disabled={isTesting}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-xl bg-white/60 border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-colors disabled:opacity-40"
            >
              {isTesting ? 'Testing...' : 'Test Connection'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary text-[13px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary text-[13px]"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default MCPSettingsNew
