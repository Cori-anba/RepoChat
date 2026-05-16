import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FolderIcon,
  CodeBracketIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";

interface Project {
  name: string;
  path: string;
  current_branch: string;
  commits_count: number;
  last_commit?: {
    date: string;
  };
}

export const Dashboard: React.FC = () => {
  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      const response = await fetch("http://localhost:8000/api/projects");
      if (!response.ok) {
        throw new Error("Failed to fetch projects");
      }
      return response.json();
    },
  });

  const recentProjects = projects.slice(0, 5);

  return (
    <div className="p-8">
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider mb-1">
            Overview
          </p>
          <h1 className="text-[26px] font-bold text-[#1e1b4b] tracking-tight">
            Dashboard
          </h1>
        </div>
        <div className="text-xs text-gray-400">
          {projects.length} projects managed
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="glass-card p-5 flex items-center gap-4">
          <div className="w-11 h-11 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-indigo-500/20 flex-shrink-0">
            <FolderIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
              Total Projects
            </p>
            <p className="text-[28px] font-bold text-[#1e1b4b] tracking-tight leading-none">
              {projects.length}
            </p>
          </div>
        </div>

        <div className="glass-card p-5 flex items-center gap-4">
          <div className="w-11 h-11 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center shadow-md shadow-purple-500/20 flex-shrink-0">
            <CodeBracketIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
              Active Repositories
            </p>
            <p className="text-[28px] font-bold text-[#1e1b4b] tracking-tight leading-none">
              {projects.length}
            </p>
          </div>
        </div>

        <div className="glass-card p-5 flex items-center gap-4">
          <div className="w-11 h-11 bg-gradient-to-br from-pink-400 to-pink-600 rounded-xl flex items-center justify-center shadow-md shadow-pink-500/20 flex-shrink-0">
            <ClockIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
              Last Updated
            </p>
            <p className="text-[28px] font-bold text-[#1e1b4b] tracking-tight leading-none">
              Now
            </p>
          </div>
        </div>
      </div>

      {/* Recent projects */}
      <div className="glass-card-static overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100/80">
          <h2 className="text-sm font-semibold text-[#1e1b4b]">
            Recent Projects
          </h2>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-14 gap-3">
            <div className="w-8 h-8 border-[3px] border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
            <p className="text-sm text-gray-400">Loading projects...</p>
          </div>
        ) : recentProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 gap-3">
            <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center">
              <FolderIcon className="h-6 w-6 text-gray-300" />
            </div>
            <p className="text-sm text-gray-400">No projects found</p>
            <p className="text-xs text-gray-300">
              Clone a repository to get started
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100/80">
            {recentProjects.map((project: Project) => (
              <Link
                key={project.path}
                to={`/projects/${encodeURIComponent(project.path)}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-indigo-50/40 transition-colors duration-200 group"
              >
                <div className="min-w-0 flex-1">
                  <h3 className="text-[13px] font-semibold text-[#1e1b4b] group-hover:text-indigo-600 transition-colors duration-200 truncate">
                    {project.name}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">
                    {project.path}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[11px] text-gray-400">
                      {project.current_branch}
                    </span>
                    <span className="text-[11px] text-gray-300">
                      {project.commits_count} commits
                    </span>
                  </div>
                </div>
                <div className="flex-shrink-0 ml-4">
                  <p className="text-[11px] text-gray-300">
                    {project.last_commit?.date
                      ? new Date(
                          project.last_commit.date
                        ).toLocaleDateString()
                      : "N/A"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
