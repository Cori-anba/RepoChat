import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import {
  FolderIcon,
  DocumentTextIcon,
  TrashIcon,
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CodeBracketIcon,
  UserIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { api } from "../../services/api";
import { FileViewer } from "./FileViewer";
import { ChatPanel } from "../session/ChatPanel";

interface Project {
  info: {
    name: string;
    path: string;
    current_branch: string;
    commits_count: number;
    remote_url?: string;
  };
  recent_commits?: Array<{
    hash: string;
    message: string;
    author: string;
    date: string;
  }>;
  branches?: Array<{
    name: string;
    is_active: boolean;
  }>;
  file_tree?: {
    type: "file" | "directory";
    name: string;
    children?: any[];
    size?: number;
    extension?: string;
  };
}

interface FileTreeNode {
  type: "file" | "directory";
  name: string;
  children?: FileTreeNode[];
  size?: number;
  extension?: string;
}

export const ProjectDetail: React.FC = () => {
  const { path } = useParams<{ path: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<
    Record<string, boolean>
  >({});

  const [isUpdating, setIsUpdating] = useState(false);
  const [previewFile, setPreviewFile] = useState<{
    path: string;
    content: string;
  } | null>(null);

  const decodedPath = decodeURIComponent(path || "");

  const { data: project, isLoading } = useQuery<Project>({
    queryKey: ["project", decodedPath],
    queryFn: () => api.getProjectOverview(decodedPath),
    enabled: !!decodedPath,
  });

  useEffect(() => {
    if (
      project?.file_tree &&
      project.file_tree.type === "directory" &&
      project.file_tree.children
    ) {
      const initialExpanded: Record<string, boolean> = {};
      project.file_tree.children.forEach((child) => {
        if (child.type === "directory") {
          initialExpanded[child.name] = true;
        }
      });
      setExpandedFolders(initialExpanded);
    }
  }, [project?.file_tree]);

  const handleDeleteProject = async () => {
    setIsDeleting(true);
    try {
      const result = await api.deleteProject(decodedPath);

      if (result.success) {
        toast.success(result.message || "项目删除成功");

        queryClient.removeQueries({ queryKey: ["project", decodedPath] });

        navigate("/projects");
      } else {
        if (result.manual_action_needed) {
          toast.error(result.error || "删除失败，需要手动操作");
          alert(
            `删除失败详情：\n${result.details}\n\n请手动删除文件夹：${decodedPath}`
          );
        } else {
          toast.error(result.error || "删除项目失败");
        }
      }
    } catch (error: any) {
      console.error("删除项目错误:", error);
      const errorMessage =
        error.response?.data?.detail || error.message || "删除项目失败";
      toast.error(`删除失败: ${errorMessage}`);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleFileClick = async (filePath: string) => {
    setIsLoadingFile(true);
    try {
      const cleanFilePath = filePath.replace(/^[^\/]+\//, "");

      console.log("原始文件路径:", filePath);
      console.log("清理后文件路径:", cleanFilePath);

      const result = await api.getFileContent(decodedPath, cleanFilePath);
      setFileContent(result.content);
      setSelectedFile(cleanFilePath);
    } catch (error) {
      console.error("文件读取错误:", error);
      toast.error("无法读取文件内容");
    } finally {
      setIsLoadingFile(false);
    }
  };

  const handleFolderClick = (folderPath: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderPath]: !prev[folderPath],
    }));
  };

  const handleUpdateRepository = async () => {
    setIsUpdating(true);
    try {
      const result = await api.pullUpdates(decodedPath);

      if (result.success) {
        toast.success("仓库更新成功");

        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ["project", decodedPath] });
        }, 1000);
      } else {
        toast.error(result.error || "仓库更新失败");
      }
    } catch (error) {
      console.error("更新仓库失败:", error);
      toast.error("更新仓库失败");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFilePreview = (filePath: string, content: string) => {
    setPreviewFile({ path: filePath, content });
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<string[]>([]);

  const searchFiles = (
    node: FileTreeNode,
    term: string,
    currentPath = ""
  ): string[] => {
    if (!term.trim()) return [];

    const results: string[] = [];
    const fullPath = currentPath ? `${currentPath}/${node.name}` : node.name;

    if (node.name.toLowerCase().includes(term.toLowerCase())) {
      results.push(fullPath);
    }

    if (node.type === "directory" && node.children) {
      for (const child of node.children) {
        results.push(...searchFiles(child, term, fullPath));
      }
    }

    return results;
  };

  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
    if (project?.file_tree) {
      const results = searchFiles(project.file_tree, term);
      setSearchResults(results);
    }
  };

  const handleClosePreview = () => {
    setPreviewFile(null);
  };

  const renderFileTree = (node: FileTreeNode, level = 0, currentPath = "") => {
    const indent = level * 16;
    const fullPath = currentPath ? `${currentPath}/${node.name}` : node.name;
    const isExpanded = expandedFolders[fullPath] === true;

    if (node.type === "file") {
      return (
        <div
          key={fullPath}
          className={`flex items-center py-1.5 px-2 rounded-lg cursor-pointer transition-all duration-150 ${
            selectedFile === fullPath
              ? "bg-indigo-50 text-indigo-700 border-l-[3px] border-indigo-500"
              : "hover:bg-gray-50 text-gray-600"
          }`}
          style={{ paddingLeft: indent + 8 }}
          onClick={() => handleFileClick(fullPath)}
        >
          <DocumentTextIcon className="h-3.5 w-3.5 mr-2 text-indigo-400 flex-shrink-0" />
          <span className="text-xs truncate">{node.name}</span>
        </div>
      );
    }

    return (
      <div key={fullPath}>
        <div
          className={`flex items-center py-1.5 px-2 rounded-lg cursor-pointer transition-all duration-150 ${
            isExpanded ? "bg-gray-50" : "hover:bg-gray-50"
          } text-gray-700`}
          style={{ paddingLeft: indent + 8 }}
          onClick={() => handleFolderClick(fullPath)}
        >
          {isExpanded ? (
            <ChevronDownIcon className="h-3.5 w-3.5 mr-2 text-gray-400 flex-shrink-0" />
          ) : (
            <ChevronRightIcon className="h-3.5 w-3.5 mr-2 text-gray-400 flex-shrink-0" />
          )}
          <FolderIcon className="h-3.5 w-3.5 mr-2 text-amber-400 flex-shrink-0" />
          <span className="text-xs font-medium truncate">{node.name}</span>
        </div>
        {isExpanded && (
          <div className="ml-2 border-l border-gray-100 pl-2">
            {node.children?.map((child) =>
              renderFileTree(child, level + 1, fullPath)
            )}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <div className="w-10 h-10 border-[3px] border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8">
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <p className="text-sm text-gray-400">Project not found</p>
        </div>
      </div>
    );
  }

  if (selectedFile && fileContent) {
    return (
      <div className="p-8">
        <FileViewer
          fileName={selectedFile.split("/").pop() || ""}
          fileContent={fileContent}
          filePath={selectedFile}
          projectRoot={decodedPath}
          onClose={() => {
            setSelectedFile(null);
            setFileContent(null);
          }}
        />
      </div>
    );
  }

  if (previewFile) {
    return (
      <div className="p-8">
        <div className="mb-4">
          <button
            onClick={handleClosePreview}
            className="text-indigo-500 hover:text-indigo-700 text-sm font-medium transition-colors"
          >
            ← Back to AI Chat
          </button>
        </div>
        <FileViewer
          fileName={previewFile.path.split("/").pop() || ""}
          fileContent={previewFile.content}
          filePath={previewFile.path}
          projectRoot={decodedPath}
          onClose={handleClosePreview}
        />
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Hero banner */}
      <div className="glass-card-static overflow-hidden mb-6">
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 px-6 py-5">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <FolderIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">
                  {project.info?.name}
                </h1>
                <p className="text-white/70 text-xs">{project.info?.path}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleUpdateRepository}
                disabled={isUpdating}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white/20 backdrop-blur-sm text-white text-[13px] font-medium rounded-xl hover:bg-white/30 disabled:opacity-50 transition-all border border-white/20"
              >
                {isUpdating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <ArrowPathIcon className="h-4 w-4" />
                    Update
                  </>
                )}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white/15 backdrop-blur-sm text-white text-[13px] font-medium rounded-xl hover:bg-red-500/40 disabled:opacity-50 transition-all border border-white/15"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <TrashIcon className="h-4 w-4" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-indigo-50/60 rounded-xl p-4 border border-indigo-100/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 bg-indigo-500 rounded-lg flex items-center justify-center">
                  <FolderIcon className="h-3.5 w-3.5 text-white" />
                </div>
                <p className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider">Repository</p>
              </div>
              <p className="text-base font-bold text-indigo-900 truncate">{project.info?.name}</p>
            </div>

            <div className="bg-purple-50/60 rounded-xl p-4 border border-purple-100/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 bg-purple-500 rounded-lg flex items-center justify-center">
                  <CodeBracketIcon className="h-3.5 w-3.5 text-white" />
                </div>
                <p className="text-[11px] font-semibold text-purple-600 uppercase tracking-wider">Branch</p>
              </div>
              <p className="text-base font-bold text-purple-900">{project.info?.current_branch}</p>
            </div>

            <div className="bg-pink-50/60 rounded-xl p-4 border border-pink-100/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 bg-pink-500 rounded-lg flex items-center justify-center">
                  <CodeBracketIcon className="h-3.5 w-3.5 text-white" />
                </div>
                <p className="text-[11px] font-semibold text-pink-600 uppercase tracking-wider">Commits</p>
              </div>
              <p className="text-base font-bold text-pink-900">{project.info?.commits_count}</p>
            </div>

            <div className="bg-emerald-50/60 rounded-xl p-4 border border-emerald-100/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center">
                  <ArrowPathIcon className="h-3.5 w-3.5 text-white" />
                </div>
                <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">Remote</p>
              </div>
              <a
                href={project.info?.remote_url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="text-base font-bold text-emerald-900 hover:text-emerald-700 hover:underline transition-colors truncate block"
                title={project.info?.remote_url || "None"}
              >
                {project.info?.remote_url || "None"}
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass-card-static max-w-md w-full mx-4 p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <TrashIcon className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1e1b4b]">Confirm Delete</h3>
                <p className="text-xs text-gray-400">This action cannot be undone</p>
              </div>
            </div>

            <div className="bg-red-50/60 border border-red-100 rounded-xl p-4 mb-5">
              <p className="text-sm text-gray-700 mb-2">
                Are you sure you want to delete{" "}
                <span className="font-semibold text-red-600">{project.info?.name}</span>?
              </p>
              <div className="text-xs text-gray-500 space-y-1">
                <p>• Database records will be permanently deleted</p>
                <p>• Local folder will be removed</p>
                <p>• This action is irreversible</p>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn-secondary text-[13px]"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProject}
                disabled={isDeleting}
                className="btn-danger text-[13px] disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1.5" />
                    Deleting...
                  </>
                ) : (
                  "Confirm Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content: 3-col layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Left column: file tree + commits + branches */}
        <div className="xl:col-span-1 space-y-5">
          {/* File tree */}
          <div className="glass-card-static p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-lg flex items-center justify-center shadow-sm shadow-emerald-500/20">
                <DocumentTextIcon className="h-4 w-4 text-white" />
              </div>
              <h2 className="text-sm font-bold text-[#1e1b4b]">Files</h2>
            </div>

            <div className="mb-3 relative">
              <input
                type="text"
                placeholder="Search files..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-gray-200 bg-white/60 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400 transition-all"
              />
              <MagnifyingGlassIcon className="absolute left-2.5 top-2 h-3.5 w-3.5 text-gray-400" />
            </div>

            {searchTerm && searchResults.length > 0 && (
              <div className="mb-3 p-2 bg-emerald-50/60 border border-emerald-100 rounded-lg">
                <p className="text-[10px] text-emerald-600 mb-1">Found {searchResults.length} matches:</p>
                <div className="space-y-0.5">
                  {searchResults.slice(0, 5).map((result) => (
                    <div
                      key={result}
                      className="px-2 py-1 text-[11px] text-emerald-700 hover:bg-emerald-100 rounded cursor-pointer transition-colors truncate"
                      onClick={() => handleFileClick(result)}
                    >
                      {result}
                    </div>
                  ))}
                  {searchResults.length > 5 && (
                    <p className="text-[10px] text-emerald-500">+ {searchResults.length - 5} more...</p>
                  )}
                </div>
              </div>
            )}

            {searchTerm && searchResults.length === 0 && (
              <div className="mb-3 p-2 bg-gray-50 border border-gray-100 rounded-lg">
                <p className="text-[10px] text-gray-400">No matching files</p>
              </div>
            )}

            {isLoadingFile && (
              <div className="flex items-center justify-center py-8 gap-2">
                <div className="w-5 h-5 border-2 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
                <span className="text-xs text-gray-400">Loading...</span>
              </div>
            )}
            <div className="border border-gray-100 rounded-lg p-3 h-[calc(100vh-420px)] min-h-[300px] overflow-y-auto">
              {project?.file_tree && renderFileTree(project.file_tree)}
            </div>
          </div>

          {/* Recent commits */}
          <div className="glass-card-static p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-lg flex items-center justify-center shadow-sm shadow-blue-500/20">
                <ArrowPathIcon className="h-4 w-4 text-white" />
              </div>
              <h2 className="text-sm font-bold text-[#1e1b4b]">Recent Commits</h2>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {project.recent_commits?.slice(0, 5).map((commit) => (
                <div
                  key={commit.hash}
                  className="bg-indigo-50/40 rounded-xl p-3.5 border-l-[3px] border-indigo-400 hover:bg-indigo-50/80 transition-colors"
                >
                  <p className="text-xs font-semibold text-gray-700 mb-1.5 leading-relaxed line-clamp-2">
                    {commit.message}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-gray-400">
                    <span className="flex items-center gap-1">
                      <UserIcon className="h-3 w-3" />
                      {commit.author}
                    </span>
                    <span>{commit.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Branches */}
          <div className="glass-card-static p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-500 rounded-lg flex items-center justify-center shadow-sm shadow-purple-500/20">
                <CodeBracketIcon className="h-4 w-4 text-white" />
              </div>
              <h2 className="text-sm font-bold text-[#1e1b4b]">Branches</h2>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {project.branches?.map((branch) => (
                <div
                  key={branch.name}
                  className={`flex items-center justify-between p-2.5 rounded-xl transition-all ${
                    branch.name === project?.info?.current_branch
                      ? "bg-purple-50/60 border border-purple-200/50"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        branch.name === project?.info?.current_branch
                          ? "bg-gradient-to-r from-purple-500 to-pink-500"
                          : "bg-gray-300"
                      }`}
                    />
                    <span
                      className={`text-xs font-medium truncate ${
                        branch.name === project?.info?.current_branch
                          ? "text-purple-700"
                          : "text-gray-600"
                      }`}
                    >
                      {branch.name}
                    </span>
                  </div>
                  {branch.name === project?.info?.current_branch && (
                    <span className="text-[10px] bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 py-0.5 rounded-full font-medium flex-shrink-0 ml-2">
                      current
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: AI Chat */}
        <div className="xl:col-span-2">
          <div className="glass-card-static flex flex-col overflow-hidden h-full">
            <div className="bg-gradient-to-r from-indigo-50/60 to-purple-50/60 px-5 py-4 border-b border-indigo-100/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center shadow-sm shadow-indigo-500/20">
                  <ChatBubbleLeftRightIcon className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#1e1b4b]">AI Assistant</h2>
                  <p className="text-[10px] text-gray-400">MCP-enhanced intelligent code analysis</p>
                </div>
              </div>
            </div>

            <div className="flex-1 p-5 overflow-hidden">
              <div className="h-full flex flex-col">
                <div className="flex-1 bg-white rounded-xl border border-gray-100 overflow-hidden h-[calc(100vh-320px)]">
                  <ChatPanel
                    projectPath={decodedPath}
                    fileTree={project?.file_tree}
                    onFilePreview={handleFilePreview}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
