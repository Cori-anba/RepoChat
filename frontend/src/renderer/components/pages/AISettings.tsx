import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { api } from '../../services/api'

interface AIProvider {
  name: string
  icon: string
  description: string
  models: string[]
  default_base_url: string
  requires_api_key: boolean
}

export const AISettings: React.FC = () => {
  const [selectedProvider, setSelectedProvider] = useState<string>('')
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [selectedModel, setSelectedModel] = useState('')
  const [temperature, setTemperature] = useState<number>(0.7)
  const [maxTokens, setMaxTokens] = useState<number>(2000)
  const [topP, setTopP] = useState<number>(1.0)
  const [frequencyPenalty, setFrequencyPenalty] = useState<number>(0.0)
  const [presencePenalty, setPresencePenalty] = useState<number>(0.0)

  const { data: providers = {} } = useQuery<Record<string, AIProvider>>({
    queryKey: ['ai-providers'],
    queryFn: () => api.getAIProviders()
  })

  useQuery({
    queryKey: ['ai-config'],
    queryFn: async () => {
      const response = await api.getAIConfig()
      if (response.exists && response.config) {
        const config = response.config
        setSelectedProvider(config.ai_provider || '')
        setSelectedModel(config.ai_model || '')
        setApiKey(config.ai_api_key || '')
        setBaseUrl(config.ai_base_url || '')
        setTemperature(config.temperature || 0.7)
        setMaxTokens(config.max_tokens || 2000)
        setTopP(config.top_p || 1.0)
        setFrequencyPenalty(config.frequency_penalty || 0.0)
        setPresencePenalty(config.presence_penalty || 0.0)
      }
      return response
    }
  })

  const handleTestConnection = async () => {
    if (!selectedProvider || !apiKey) {
      toast.error('请选择提供商并输入API密钥')
      return
    }

    try {
      const result = await api.testAIConnection(selectedProvider, apiKey, baseUrl || undefined)
      if (result.success) {
        toast.success('连接成功！')
      } else {
        toast.error(result.error || '连接失败')
      }
    } catch (error) {
      toast.error('连接测试失败')
    }
  }

  const handleSave = async () => {
    localStorage.setItem('ai-provider', selectedProvider)
    localStorage.setItem('ai-model', selectedModel)
    localStorage.setItem('ai-api-key', apiKey)
    localStorage.setItem('ai-base-url', baseUrl)
    localStorage.setItem('ai-temperature', temperature.toString())
    localStorage.setItem('ai-max-tokens', maxTokens.toString())
    localStorage.setItem('ai-top-p', topP.toString())
    localStorage.setItem('ai-frequency-penalty', frequencyPenalty.toString())
    localStorage.setItem('ai-presence-penalty', presencePenalty.toString())

    try {
      await api.saveAIConfig({
        ai_provider: selectedProvider,
        ai_model: selectedModel,
        ai_api_key: apiKey,
        ai_base_url: baseUrl,
        temperature: temperature,
        max_tokens: maxTokens,
        top_p: topP,
        frequency_penalty: frequencyPenalty,
        presence_penalty: presencePenalty
      })
      toast.success('设置已保存到配置文件！')
    } catch (error) {
      toast.error('保存到配置文件失败，但已保存到本地存储')
    }
  }

  const providerList = Object.entries(providers).map(([key, provider]) => ({
    key,
    ...provider
  }))

  return (
    <div className="p-8">
      <div className="mb-8">
        <p className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider mb-1">
          配置您的AI提供商和模型
        </p>
        <h1 className="text-[26px] font-bold text-[#1e1b4b] tracking-tight">
          AI设置
        </h1>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Provider config */}
        <div className="glass-card-static p-6">
          <h2 className="text-sm font-semibold text-[#1e1b4b] mb-5">提供商配置</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                选择提供商
              </label>
              <select
                value={selectedProvider}
                onChange={(e) => {
                  setSelectedProvider(e.target.value)
                  setSelectedModel('')
                  setBaseUrl(providers[e.target.value]?.default_base_url || '')
                }}
                className="input-field"
              >
                <option value="">选择提供商</option>
                {providerList.map((provider) => (
                  <option key={provider.key} value={provider.key}>
                    {provider.icon} {provider.name} - {provider.description}
                  </option>
                ))}
              </select>
            </div>

            {selectedProvider && providers[selectedProvider] && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    模型
                  </label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="input-field"
                  >
                    <option value="">选择模型</option>
                    {providers[selectedProvider].models.map((model: string) => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                </div>

                {providers[selectedProvider].requires_api_key && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                      API密钥
                    </label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="输入您的API密钥"
                      className="input-field"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    基础URL（可选）
                  </label>
                  {selectedProvider === 'moonshot' ? (
                    <select
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                      className="input-field"
                    >
                      <option value="international">国际版 (api.moonshot.ai)</option>
                      <option value="china">中国版 (api.moonshot.cn)</option>
                    </select>
                  ) : (
                    <input
                      type="url"
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                      placeholder={providers[selectedProvider].default_base_url}
                      className="input-field"
                    />
                  )}
                </div>

                {/* AI Parameters */}
                <div className="pt-5 border-t border-gray-100">
                  <h3 className="text-sm font-semibold text-[#1e1b4b] mb-4">AI参数设置</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">
                        温度 (Temperature) <span className="text-gray-300">(0.0-2.0)</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="2"
                        step="0.1"
                        value={temperature}
                        onChange={(e) => setTemperature(parseFloat(e.target.value))}
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">
                        最大令牌数 (Max Tokens)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10000"
                        step="100"
                        value={maxTokens}
                        onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">
                        Top-P <span className="text-gray-300">(0.0-1.0)</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="1"
                        step="0.1"
                        value={topP}
                        onChange={(e) => setTopP(parseFloat(e.target.value))}
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">
                        频率惩罚 (Frequency Penalty) <span className="text-gray-300">(-2.0-2.0)</span>
                      </label>
                      <input
                        type="number"
                        min="-2"
                        max="2"
                        step="0.1"
                        value={frequencyPenalty}
                        onChange={(e) => setFrequencyPenalty(parseFloat(e.target.value))}
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">
                        存在惩罚 (Presence Penalty) <span className="text-gray-300">(-2.0-2.0)</span>
                      </label>
                      <input
                        type="number"
                        min="-2"
                        max="2"
                        step="0.1"
                        value={presencePenalty}
                        onChange={(e) => setPresencePenalty(parseFloat(e.target.value))}
                        className="input-field"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleTestConnection}
                    className="inline-flex items-center px-4 py-2.5 text-sm font-medium rounded-xl bg-white/60 backdrop-blur-sm border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-all duration-200"
                  >
                    测试连接
                  </button>
                  <button
                    onClick={handleSave}
                    className="btn-primary text-[13px]"
                  >
                    保存设置
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Available providers info */}
        <div className="glass-card-static p-5">
          <h3 className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-3">可用提供商</h3>
          <div className="space-y-2">
            {providerList.map((provider) => (
              <div key={provider.key} className="flex items-center gap-2 text-sm text-gray-600">
                <span>{provider.icon}</span>
                <span className="font-medium">{provider.name}</span>
                <span className="text-gray-300">—</span>
                <span className="text-gray-400 text-xs">{provider.description}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
