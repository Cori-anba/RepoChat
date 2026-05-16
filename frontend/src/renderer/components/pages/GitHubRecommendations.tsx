import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { Link } from "react-router-dom";
import {
  StarIcon,
  CodeBracketIcon,
  CalendarIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import MarkdownIt from "markdown-it";
import "github-markdown-css/github-markdown-light.css";
import { api } from "../../services/api";
import {
  usePersistedState,
  clearPersistedState,
  GITHUB_STORAGE_KEYS,
  saveSearchResults,
  getSearchResults,
  SearchResultData,
} from "../../hooks/usePersistedState";

interface Repository {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    avatar_url: string;
  };
  html_url: string;
  description: string;
  stargazers_count: number;
  forks_count: number;
  watchers_count: number;
  language: string;
  updated_at: string;
  readme?: string;
}

export const GitHubRecommendations: React.FC = () => {
  const [searchQuery, setSearchQuery] = usePersistedState(
    GITHUB_STORAGE_KEYS.SEARCH_QUERY,
    ""
  );
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [clonePath, setClonePath] = useState("");
  const [showFilters, setShowFilters] = usePersistedState(
    GITHUB_STORAGE_KEYS.SHOW_FILTERS,
    false
  );
  const [filters, setFilters] = usePersistedState(GITHUB_STORAGE_KEYS.FILTERS, {
    language: "",
    sort: "",
    updatedAfter: "",
  });
  const [savedSearchResults, setSavedSearchResults] =
    useState<SearchResultData | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const md = new MarkdownIt({
    html: true,
    breaks: true,
    linkify: true,
  });

  useEffect(() => {
    const savedResults = getSearchResults(GITHUB_STORAGE_KEYS.SEARCH_RESULTS);
    if (savedResults) {
      setSavedSearchResults(savedResults);
    }
  }, []);

  const { data: trendingData, isLoading: isLoadingTrending } = useQuery({
    queryKey: ["github-trending"],
    queryFn: () => api.getGitHubTrending(),
    enabled: true,
  });

  const searchMutation = useMutation({
    mutationFn: (query: string) => {
      clearPersistedState(GITHUB_STORAGE_KEYS.SEARCH_RESULTS);
      setSavedSearchResults(null);
      return api.searchGitHubRepos(query);
    },
    onSuccess: (data) => {
      toast.success(`找到 ${data.repositories.length} 个项目`);
      saveSearchResults(GITHUB_STORAGE_KEYS.SEARCH_RESULTS, {
        repositories: data.repositories,
        searchType: "basic",
        timestamp: Date.now(),
        query: searchQuery,
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || "搜索失败");
    },
  });

  const enhancedSearchMutation = useMutation({
    mutationFn: () => {
      clearPersistedState(GITHUB_STORAGE_KEYS.SEARCH_RESULTS);
      setSavedSearchResults(null);
      return api.enhancedSearchGitHubRepos(
        searchQuery,
        filters.language,
        filters.updatedAfter,
        filters.sort
      );
    },
    onSuccess: (data) => {
      toast.success(`找到 ${data.repositories.length} 个项目`);
      data.repositories.forEach((repo: Repository) => {
        api.recordGitHubAction(repo.full_name, "search", searchQuery);
      });
      saveSearchResults(GITHUB_STORAGE_KEYS.SEARCH_RESULTS, {
        repositories: data.repositories,
        searchType: "enhanced",
        timestamp: Date.now(),
        query: searchQuery,
        filters: filters,
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || "搜索失败");
    },
  });

  const recommendationMutation = useMutation({
    mutationFn: () => {
      clearPersistedState(GITHUB_STORAGE_KEYS.SEARCH_RESULTS);
      setSavedSearchResults(null);
      return api.getGitHubRecommendations("default", 10);
    },
    onSuccess: (data) => {
      toast.success(`为您推荐了 ${data.repositories.length} 个项目`);
      saveSearchResults(GITHUB_STORAGE_KEYS.SEARCH_RESULTS, {
        repositories: data.repositories,
        searchType: "recommendation",
        timestamp: Date.now(),
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || "推荐失败");
    },
  });

  const detailMutation = useMutation({
    mutationFn: ({ owner, repo }: { owner: string; repo: string }) =>
      api.getGitHubRepoDetails(owner, repo),
    onSuccess: (data) => {
      setSelectedRepo(data);
      setShowDetailModal(true);
      setIsLoadingDetail(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || "获取详情失败");
      setIsLoadingDetail(false);
    },
  });

  const cloneMutation = useMutation({
    mutationFn: ({ url, path }: { url: string; path?: string }) =>
      api.cloneRepository(url, path),
    onSuccess: () => {
      toast.success("项目克隆成功！");
      setShowCloneModal(false);
      setClonePath("");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || "克隆失败");
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      toast.error("请输入搜索关键词");
      return;
    }

    if (
      showFilters &&
      (filters.language || filters.sort || filters.updatedAfter)
    ) {
      enhancedSearchMutation.mutate();
    } else {
      searchMutation.mutate(searchQuery.trim());
    }
  };

  const handleEnhancedSearch = () => {
    if (!searchQuery.trim()) {
      toast.error("请输入搜索关键词");
      return;
    }
    enhancedSearchMutation.mutate();
  };

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      language: "",
      sort: "",
      updatedAfter: "",
    });
  };

  const hasActiveFilters =
    filters.language || filters.sort || filters.updatedAfter;

  const handleViewDetails = (repo: Repository) => {
    setIsLoadingDetail(true);
    const [owner, repoName] = repo.full_name.split("/");
    detailMutation.mutate({ owner, repo: repoName });
  };

  const handleClone = (repo: Repository) => {
    setSelectedRepo(repo);
    setShowCloneModal(true);
  };

  const handleConfirmClone = () => {
    if (!selectedRepo) return;

    cloneMutation.mutate({
      url: selectedRepo.html_url + ".git",
      path: clonePath || undefined,
    });
  };

  const repositories =
    recommendationMutation.data?.repositories ||
    enhancedSearchMutation.data?.repositories ||
    searchMutation.data?.repositories ||
    savedSearchResults?.repositories ||
    trendingData?.repositories ||
    [];

  const formatNumber = (num: number): string => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "k";
    }
    return num.toString();
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("zh-CN");
  };

  const programmingLanguages = [
    "JavaScript",
    "TypeScript",
    "Python",
    "Java",
    "C++",
    "C#",
    "PHP",
    "Ruby",
    "Go",
    "Rust",
    "Swift",
    "Kotlin",
    "Dart",
    "Scala",
    "HTML",
    "CSS",
    "Shell",
    "Vue",
    "React",
    "Angular",
    "Svelte",
    "R",
    "Lua",
    "Perl",
    "Haskell",
  ];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider mb-1">
            发现热门的GitHub项目
          </p>
          <h1 className="text-[26px] font-bold text-[#1e1b4b] tracking-tight">
            GitHub项目推荐
          </h1>
        </div>
        <button
          onClick={() => recommendationMutation.mutate()}
          disabled={recommendationMutation.isPending}
          className="btn-primary gap-2 text-[13px] disabled:opacity-50"
        >
          {recommendationMutation.isPending ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              推送中...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              智能推送
            </>
          )}
        </button>
      </div>

      {/* Search bar */}
      <div className="mb-6">
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索GitHub项目..."
              className="w-full pl-10 pr-4 py-3 text-sm rounded-xl border border-gray-200 bg-white/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400 transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={searchMutation.isPending || enhancedSearchMutation.isPending}
            className="btn-primary text-[13px] disabled:opacity-50"
          >
            {searchMutation.isPending || enhancedSearchMutation.isPending
              ? "搜索中..."
              : "搜索"}
          </button>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium rounded-xl transition-all duration-200 ${
              showFilters || hasActiveFilters
                ? "bg-indigo-50 text-indigo-600 border border-indigo-200"
                : "bg-white/60 backdrop-blur-sm border border-gray-200 text-gray-600 hover:bg-white/80"
            }`}
          >
            <FunnelIcon className="h-4 w-4" />
            筛选
            {hasActiveFilters && (
              <span className="w-4 h-4 bg-indigo-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                !
              </span>
            )}
          </button>
        </form>

        {/* Filter panel */}
        {showFilters && (
          <div className="mt-3 p-5 rounded-xl bg-white/70 backdrop-blur-md border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">高级筛选</h3>
              <button onClick={() => setShowFilters(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded">
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  编程语言
                </label>
                <select
                  value={filters.language}
                  onChange={(e) => handleFilterChange("language", e.target.value)}
                  className="input-field text-sm"
                >
                  <option value="">所有语言</option>
                  {programmingLanguages.map((lang) => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  排序方式
                </label>
                <select
                  value={filters.sort}
                  onChange={(e) => handleFilterChange("sort", e.target.value)}
                  className="input-field text-sm"
                >
                  <option value="">默认排序</option>
                  <option value="stars-asc">星标数升序</option>
                  <option value="stars-desc">星标数降序</option>
                </select>
              </div>

              <div></div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  更新时间
                </label>
                <select
                  value={filters.updatedAfter}
                  onChange={(e) => handleFilterChange("updatedAfter", e.target.value)}
                  className="input-field text-sm"
                >
                  <option value="">全部时间</option>
                  <option value="7d">最近7天</option>
                  <option value="30d">最近30天</option>
                  <option value="90d">最近90天</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={clearFilters}
                disabled={!hasActiveFilters}
                className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-30 transition-colors"
              >
                清除筛选
              </button>
              <button
                onClick={handleEnhancedSearch}
                disabled={enhancedSearchMutation.isPending || !searchQuery.trim()}
                className="inline-flex items-center px-4 py-2 text-xs font-semibold rounded-lg text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors disabled:opacity-40"
              >
                {enhancedSearchMutation.isPending ? "搜索中..." : "应用筛选"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Repository list */}
      {isLoadingTrending && !searchMutation.data ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-10 h-10 border-[3px] border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-sm text-gray-400">加载热门项目中...</p>
        </div>
      ) : repositories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
            <CodeBracketIcon className="h-8 w-8 text-gray-300" />
          </div>
          <p className="text-sm text-gray-400">暂无项目</p>
          <p className="text-xs text-gray-300">尝试搜索或等待热门项目加载</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {repositories.map((repo: Repository) => (
            <div key={repo.id} className="glass-card p-5 flex flex-col">
              <div className="flex items-start gap-3 mb-3">
                <img
                  src={repo.owner.avatar_url}
                  alt={repo.owner.login}
                  className="w-9 h-9 rounded-full ring-2 ring-white flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-[15px] font-semibold text-[#1e1b4b] truncate leading-tight">
                    {repo.name}
                  </h3>
                  <p className="text-xs text-gray-400 truncate">{repo.owner.login}</p>
                </div>
              </div>

              {repo.description && (
                <p className="text-xs text-gray-500 mb-3 line-clamp-3 leading-relaxed">
                  {repo.description}
                </p>
              )}

              <div className="flex items-center gap-3 text-xs text-gray-400 mb-3 mt-auto">
                <div className="flex items-center gap-1">
                  <StarIcon className="h-3.5 w-3.5 text-amber-400" />
                  <span>{formatNumber(repo.stargazers_count)}</span>
                </div>
                <span>{formatNumber(repo.forks_count)} forks</span>
                {repo.language && (
                  <span className="badge badge-indigo ml-auto">{repo.language}</span>
                )}
              </div>

              <div className="flex items-center text-[11px] text-gray-300 mb-4">
                <CalendarIcon className="h-3 w-3 mr-1" />
                更新于 {formatDate(repo.updated_at)}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleViewDetails(repo)}
                  disabled={isLoadingDetail}
                  className="flex-1 py-2 text-xs font-medium rounded-lg bg-white/60 border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40"
                >
                  {isLoadingDetail ? "加载中..." : "查看详情"}
                </button>
                <button
                  onClick={() => handleClone(repo)}
                  className="flex-1 py-2 text-xs font-semibold text-white rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 transition-all shadow-sm shadow-indigo-500/20"
                >
                  克隆
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail modal */}
      {showDetailModal && selectedRepo && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card-static w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <img
                  src={selectedRepo.owner.avatar_url}
                  alt={selectedRepo.owner.login}
                  className="w-10 h-10 rounded-full ring-2 ring-white"
                />
                <div>
                  <h2 className="text-lg font-bold text-[#1e1b4b] tracking-tight">
                    {selectedRepo.full_name}
                  </h2>
                  <p className="text-xs text-gray-400">{selectedRepo.owner.login}</p>
                </div>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div className="bg-indigo-50/60 rounded-xl p-4 text-center">
                  <StarIcon className="w-5 h-5 text-indigo-500 mx-auto mb-1" />
                  <div className="text-xl font-bold text-indigo-700">{formatNumber(selectedRepo.stargazers_count)}</div>
                  <div className="text-[10px] text-indigo-400 uppercase tracking-wider">Stars</div>
                </div>
                <div className="bg-purple-50/60 rounded-xl p-4 text-center">
                  <span className="text-xl">🍴</span>
                  <div className="text-xl font-bold text-purple-700">{formatNumber(selectedRepo.forks_count)}</div>
                  <div className="text-[10px] text-purple-400 uppercase tracking-wider">Forks</div>
                </div>
                <div className="bg-pink-50/60 rounded-xl p-4 text-center">
                  <span className="text-xl">👁️</span>
                  <div className="text-xl font-bold text-pink-700">{formatNumber(selectedRepo.watchers_count)}</div>
                  <div className="text-[10px] text-pink-400 uppercase tracking-wider">Watchers</div>
                </div>
                <div className="bg-emerald-50/60 rounded-xl p-4 text-center">
                  <CodeBracketIcon className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                  <div className="text-base font-bold text-emerald-700">{selectedRepo.language || "未知"}</div>
                  <div className="text-[10px] text-emerald-400 uppercase tracking-wider">语言</div>
                </div>
              </div>

              {selectedRepo.description && (
                <div className="mb-6">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">项目描述</h3>
                  <p className="text-sm text-gray-600 leading-relaxed bg-gray-50/60 rounded-xl p-4 border border-gray-100">
                    {selectedRepo.description}
                  </p>
                </div>
              )}

              {selectedRepo.readme && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">README</h3>
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div
                      className="markdown-body p-6 bg-white"
                      dangerouslySetInnerHTML={{
                        __html: md.render(selectedRepo.readme),
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 p-5 flex flex-col sm:flex-row gap-3">
              <a
                href={selectedRepo.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary flex-1 justify-center gap-2 text-[13px]"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                在GitHub上查看
              </a>
              <button
                onClick={() => handleClone(selectedRepo)}
                className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-colors flex-1"
              >
                克隆项目
              </button>
              <button
                onClick={() => setShowDetailModal(false)}
                className="btn-secondary flex-1 justify-center text-[13px]"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clone modal */}
      {showCloneModal && selectedRepo && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass-card-static w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-[#1e1b4b] tracking-tight mb-4">克隆项目</h2>

            <div className="mb-4">
              <p className="text-xs text-gray-400 mb-1.5">项目URL:</p>
              <p className="text-sm font-mono bg-gray-50 p-2.5 rounded-lg border border-gray-100 text-gray-600">
                {selectedRepo.html_url}.git
              </p>
            </div>

            <div className="mb-5">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                本地路径（可选）
              </label>
              <input
                type="text"
                value={clonePath}
                onChange={(e) => setClonePath(e.target.value)}
                placeholder="/path/to/clone"
                className="input-field"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleConfirmClone}
                disabled={cloneMutation.isPending}
                className="btn-primary flex-1 justify-center text-[13px] disabled:opacity-50"
              >
                {cloneMutation.isPending ? "克隆中..." : "克隆"}
              </button>
              <button
                onClick={() => setShowCloneModal(false)}
                className="btn-secondary flex-1 justify-center text-[13px]"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
