import React, { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import {
  PaperAirplaneIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  CodeBracketIcon,
  FolderIcon,
  CheckCircleIcon,
  XCircleIcon,
  SparklesIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { api } from "../../services/api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// 添加自定义CSS动画
const customStyles = `
  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes bounce {
    0%, 80%, 100% {
      transform: scale(0);
      opacity: 0.5;
    }
    40% {
      transform: scale(1);
      opacity: 1;
    }
  }
  
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
  
  .animate-fade-in {
    animation: fade-in 0.3s ease-out;
  }
  
  .animate-bounce {
    animation: bounce 1.4s ease-in-out infinite both;
  }
  
  .animate-pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
`;

// 动态添加样式到head
if (typeof document !== "undefined") {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = customStyles;
  document.head.appendChild(styleSheet);
}

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
}

interface ToolCall {
  id: string;
  toolName: string;
  arguments: any;
  result?: any;
  status: "pending" | "success" | "error";
  reason?: string;
}

interface SmartChatPanelProps {
  projectPath: string;
  fileTree: any;
  onFilePreview: (filePath: string, content: string) => void;
}

export const SmartChatPanel: React.FC<SmartChatPanelProps> = ({
  projectPath,
  fileTree,
  onFilePreview,
}) => {
  // 从sessionStorage加载对话状态
  const loadConversationState = useCallback(() => {
    try {
      const storageKey = `repochat-chat-${projectPath}`;
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        const state = JSON.parse(saved);

        // 将字符串timestamp转换回Date对象
        const messagesWithDate =
          state.messages?.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          })) || [];

        return {
          messages: messagesWithDate,
          conversationId: state.conversationId || "",
          isInitialized: state.isInitialized || false,
        };
      }
    } catch (error) {
      console.error("Failed to load conversation state:", error);
    }
    return {
      messages: [],
      conversationId: "",
      isInitialized: false,
    };
  }, [projectPath]);

  // 保存对话状态到sessionStorage
  const saveConversationState = useCallback(
    (state: {
      messages: Message[];
      conversationId: string;
      isInitialized: boolean;
    }) => {
      try {
        const storageKey = `repochat-chat-${projectPath}`;
        sessionStorage.setItem(
          storageKey,
          JSON.stringify({
            messages: state.messages,
            conversationId: state.conversationId,
            isInitialized: state.isInitialized,
            timestamp: Date.now(),
          })
        );
      } catch (error) {
        console.error("Failed to save conversation state:", error);
      }
    },
    [projectPath]
  );

  // 清除当前对话
  const clearConversation = () => {
    try {
      const storageKey = `repochat-chat-${projectPath}`;
      sessionStorage.removeItem(storageKey);

      setMessages([]);
      setConversationId("");
      setIsInitialized(false);

      toast.success("对话已清除");
    } catch (error) {
      console.error("清除对话失败:", error);
      toast.error("清除对话失败");
    }
  };

  // 新建对话
  const newConversation = async () => {
    clearConversation();
    await initializeConversation();
  };

  const [messages, setMessages] = useState<Message[]>(() => {
    const state = loadConversationState();
    return state.messages;
  });
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string>(() => {
    const state = loadConversationState();
    return state.conversationId;
  });
  const [isInitialized, setIsInitialized] = useState<boolean>(() => {
    const state = loadConversationState();
    return state.isInitialized;
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // 初始化对话
  const initializeConversation = async () => {
    try {
      setIsLoading(true);
      const response = await api.startSmartConversation(projectPath);
      setConversationId(response.conversation_id);

      // 添加系统欢迎消息
      const welcomeMessage: Message = {
        id: `sys-${Date.now()}`,
        role: "system",
        content: `🤖 **智能项目分析助手已就绪**\n\n我可以帮您：\n• 分析项目架构和技术栈\n• 理解代码结构和依赖关系\n• 解释配置文件和文档\n• 提供项目概览和改进建议\n\n请告诉我您想了解什么？`,
        timestamp: new Date(),
      };

      setMessages([welcomeMessage]);
      setIsInitialized(true);

      // 保存状态
      saveConversationState({
        messages: [welcomeMessage],
        conversationId: response.conversation_id,
        isInitialized: true,
      });
    } catch (error) {
      console.error("初始化对话失败:", error);
      toast.error("初始化对话失败");

      // 添加错误消息
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: "system",
        content: "❌ 无法初始化智能对话，请检查网络连接和API配置",
        timestamp: new Date(),
      };
      setMessages([errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // 发送消息 - 使用新的工具调用系统
  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !isInitialized) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const messageToSend = inputMessage;
    setInputMessage("");
    setIsLoading(true);

    // 创建一个临时的助手消息用于显示进度
    const tempAssistantId = `assistant-${Date.now()}`;
    const assistantMessage: Message = {
      id: tempAssistantId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      toolCalls: [],
    };

    setMessages((prev) => [...prev, assistantMessage]);

    try {
      await api.smartChatV2(messageToSend, projectPath, (event: any) => {
        // 处理不同类型的事件
        switch (event.type) {
          case "api_request_started":
            console.log(`[迭代 ${event.iteration}] API 请求开始`);
            break;

          case "api_response":
            // 更新助手消息内容
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === tempAssistantId
                  ? { ...msg, content: event.content || "" }
                  : msg
              )
            );
            break;

          case "tool_calls_detected":
            // 显示工具调用
            const toolCalls: ToolCall[] = event.tool_calls.map(
              (call: any, index: number) => ({
                id: `tool-${Date.now()}-${index}`,
                toolName: call.name,
                arguments: call.parameters,
                status: "pending" as const,
              })
            );

            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === tempAssistantId
                  ? { ...msg, toolCalls: [...(msg.toolCalls || []), ...toolCalls] }
                  : msg
              )
            );
            break;

          case "tool_execution_started":
            // 更新工具状态为执行中
            setMessages((prev) =>
              prev.map((msg) => ({
                ...msg,
                toolCalls: msg.toolCalls?.map((tc) =>
                  tc.toolName === event.tool_name
                    ? { ...tc, status: "pending" }
                    : tc
                ),
              }))
            );
            break;

          case "tool_execution_completed":
            // 更新工具状态和结果
            setMessages((prev) =>
              prev.map((msg) => ({
                ...msg,
                toolCalls: msg.toolCalls?.map((tc) =>
                  tc.toolName === event.tool_name
                    ? {
                        ...tc,
                        status: event.result.success ? "success" : "error",
                        result: event.result,
                      }
                    : tc
                ),
              }))
            );
            break;

          case "completion":
            // 任务完成，显示最终答案
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === tempAssistantId
                  ? { ...msg, content: event.content }
                  : msg
              )
            );
            setIsLoading(false);
            break;

          case "error":
            toast.error(`错误: ${event.message}`);
            setIsLoading(false);
            break;
        }
      });
    } catch (error) {
      console.error("发送消息失败:", error);
      toast.error("发送消息失败");

      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: "system",
        content: "❌ 发送消息失败，请检查网络连接",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      setIsLoading(false);
    }
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // 自动调整文本区域高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputMessage]);

  // 自动保存对话状态
  useEffect(() => {
    saveConversationState({
      messages,
      conversationId,
      isInitialized,
    });
  }, [messages, conversationId, isInitialized, saveConversationState]);

  // 渲染消息内容
  const renderMessageContent = (message: Message) => {
    if (message.role === "system") {
      return (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 shadow-sm">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {message.content}
          </ReactMarkdown>
        </div>
      );
    }

    return (
      <div className="prose prose-sm max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {message.content}
        </ReactMarkdown>
      </div>
    );
  };

  // 渲染工具调用
  const renderToolCalls = (toolCalls: ToolCall[]) => {
    return (
      <div className="mt-2 space-y-2">
        {toolCalls.map((toolCall) => (
          <div
            key={toolCall.id}
            className="bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200 rounded-lg p-3 shadow hover:shadow-sm transition-shadow"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <DocumentTextIcon className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-800">
                    {toolCall.toolName}
                  </span>
                  {/* 新增：显示文件名称 */}
                  {toolCall.arguments?.file_path && (
                    <span className="text-xs text-gray-600 mt-1">
                      文件: {toolCall.arguments.file_path}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {toolCall.status === "success" && (
                  <div className="flex items-center space-x-1 px-2 py-1 bg-green-100 rounded-full">
                    <CheckCircleIcon className="w-4 h-4 text-green-600" />
                    <span className="text-xs text-green-700">成功</span>
                  </div>
                )}
                {toolCall.status === "error" && (
                  <div className="flex items-center space-x-1 px-2 py-1 bg-red-100 rounded-full">
                    <XCircleIcon className="w-4 h-4 text-red-600" />
                    <span className="text-xs text-red-700">失败</span>
                  </div>
                )}
                {toolCall.status === "pending" && (
                  <div className="flex items-center space-x-1 px-2 py-1 bg-blue-100 rounded-full">
                    <ArrowPathIcon className="w-4 h-4 text-blue-600 animate-spin" />
                    <span className="text-xs text-blue-700">处理中</span>
                  </div>
                )}
              </div>
            </div>

            {toolCall.reason && (
              <p className="text-sm text-gray-600 mb-2 bg-gray-50 rounded-lg p-2">
                {toolCall.reason}
              </p>
            )}

            {toolCall.result && (
              <div className="text-sm text-gray-700">
                {toolCall.result.success ? (
                  <div className="flex items-center space-x-2 text-green-600 bg-green-50 rounded-lg p-1.5">
                    <CheckCircleIcon className="w-4 h-4" />
                    <span>操作成功完成</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 text-red-600 bg-red-50 rounded-lg p-1.5">
                    <XCircleIcon className="w-4 h-4" />
                    <span>操作执行失败</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-transparent">
      {/* 标题栏 - 包含新建对话和清除对话按钮 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white/50 backdrop-blur-sm">
        <div className="flex items-center space-x-2">
          <SparklesIcon className="w-5 h-5 text-blue-600" />
          <h3 className="text-sm font-semibold text-gray-800">智能对话</h3>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={newConversation}
            className="flex items-center space-x-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
            title="新建对话"
          >
            <PlusIcon className="w-4 h-4" />
            <span>新建</span>
          </button>
          {messages.length > 0 && (
            <button
              onClick={clearConversation}
              className="flex items-center space-x-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
              title="清除对话"
            >
              <TrashIcon className="w-4 h-4" />
              <span>清除</span>
            </button>
          )}
        </div>
      </div>

      {/* 聊天消息区域 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && !isInitialized && (
          <div className="flex flex-col items-center justify-center h-full text-gray-600 p-6">
            <div className="text-center max-w-md">
              <SparklesIcon className="w-16 h-16 text-blue-400 mx-auto mb-6" />
              <h3 className="text-xl font-semibold text-gray-800 mb-4">
                开始智能对话
              </h3>
              <p className="text-gray-600 mb-6">
                我可以帮助您分析代码、回答技术问题、生成代码片段等。
                点击下方按钮开始对话吧！
              </p>
              <button
                onClick={initializeConversation}
                className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
              >
                <PlusIcon className="w-5 h-5" />
                <span>开始对话</span>
              </button>
            </div>
          </div>
        )}
        {messages.length === 0 && isInitialized && (
          <div className="flex flex-col items-center justify-center h-full text-gray-600 p-6">
            <div className="text-center max-w-md">
              <SparklesIcon className="w-12 h-12 text-blue-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                对话已准备就绪
              </h3>
              <p className="text-gray-600 mb-4">
                请输入您的问题或指令，我将为您提供帮助。
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                💡 提示：您可以询问代码相关问题、请求代码分析或生成代码片段
              </div>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id} className="message-container animate-fade-in">
            <div
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-3xl ${
                  message.role === "user"
                    ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg"
                    : "bg-white/80 backdrop-blur-sm border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200"
                } 
                rounded-xl p-3 transition-all duration-200`}
              >
                <div className="flex items-center mb-2">
                  <div
                    className={`w-3 h-3 rounded-full mr-3 ${
                      message.role === "user"
                        ? "bg-white"
                        : message.role === "assistant"
                        ? "bg-green-500"
                        : "bg-gray-500"
                    }`}
                  />
                  <span
                    className={`text-sm font-semibold ${
                      message.role === "user" ? "text-white" : "text-gray-700"
                    }`}
                  >
                    {message.role === "user"
                      ? "您"
                      : message.role === "assistant"
                      ? "AI助手"
                      : "系统"}
                  </span>
                  <span
                    className={`text-xs ml-3 ${
                      message.role === "user"
                        ? "text-blue-100"
                        : "text-gray-400"
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                </div>

                <div className="message-content">
                  {renderMessageContent(message)}
                </div>

                {message.toolCalls && message.toolCalls.length > 0 && (
                  <div className="mt-2">
                    {renderToolCalls(message.toolCalls)}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start animate-fade-in">
            <div className="max-w-3xl bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl p-3 shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-400 rounded-full blur-md opacity-20 animate-pulse"></div>
                  <div className="relative bg-gradient-to-r from-blue-500 to-purple-600 p-2 rounded-full">
                    <ArrowPathIcon className="w-4 h-4 text-white animate-spin" />
                  </div>
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="text-sm font-medium text-gray-700">
                    AI正在思考
                  </span>
                  <div className="flex space-x-1">
                    <div
                      className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div className="border-t border-gray-200 p-2 bg-white/50 backdrop-blur-sm">
        <div className="flex items-end space-x-3">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isInitialized ? "输入您的问题..." : "请先初始化对话..."
              }
              disabled={!isInitialized || isLoading}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200"
              rows={1}
              style={{ minHeight: "52px" }}
            />
          </div>

          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isLoading || !isInitialized}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white p-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <ArrowPathIcon className="w-5 h-5 animate-spin" />
            ) : (
              <PaperAirplaneIcon className="w-5 h-5" />
            )}
          </button>
        </div>

        <div className="mt-0.5 text-xs text-gray-500 text-center">
          {isInitialized
            ? "按 Enter 发送，Shift + Enter 换行"
            : "请先点击开始对话按钮"}
        </div>
      </div>
    </div>
  );
};
