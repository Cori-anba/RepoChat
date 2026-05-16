import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  HomeIcon,
  FolderIcon,
  CogIcon,
  BookOpenIcon,
} from "@heroicons/react/24/outline";

const navigation = [
  { name: "Overview", href: "/", icon: HomeIcon },
  { name: "Projects", href: "/projects", icon: FolderIcon },
  {
    name: "GitHub Recommendations",
    href: "/github-recommendations",
    icon: BookOpenIcon,
  },
  { name: "GitHub Settings", href: "/github-settings", icon: CogIcon },
  { name: "AI Settings", href: "/ai-settings", icon: CogIcon },
  { name: "MCP Settings", href: "/mcp-settings-new", icon: CogIcon },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();

  return (
    <aside
      className="w-60 flex-shrink-0 flex flex-col border-r border-white/5 relative overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #0f0c29 0%, #1a1040 50%, #24243e 100%)",
      }}
    >
      {/* Ambient glow orbs */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: 60,
          right: -30,
          width: 100,
          height: 100,
          background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)",
          borderRadius: "50%",
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: 120,
          left: -20,
          width: 80,
          height: 80,
          background: "radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 70%)",
          borderRadius: "50%",
        }}
      />

      {/* Logo area */}
      <div className="px-4 py-5">
        <div className="flex items-center gap-2.5 px-1">
          <div className="w-7 h-7 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </div>
          <span className="text-[15px] font-bold text-white/90 tracking-tight">
            RePoChat
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-1">
        <div className="space-y-0.5">
          {navigation.map((item) => {
            const isActive =
              location.pathname === item.href ||
              (item.href === "/projects" &&
                location.pathname.startsWith("/projects/"));
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-indigo-500/15 text-indigo-300 border border-indigo-400/20 shadow-[0_0_12px_rgba(99,102,241,0.12)]"
                    : "text-white/45 hover:text-white/75 hover:bg-white/[0.04]"
                }`}
              >
                <item.icon
                  className={`h-4 w-4 flex-shrink-0 ${
                    isActive ? "text-indigo-400" : ""
                  }`}
                />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* AI status footer */}
      <div className="px-3 py-4 border-t border-white/[0.06]">
        <div className="flex items-center gap-2.5 px-2 py-2 bg-white/[0.03] rounded-lg border border-white/[0.05]">
          <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 shadow-sm shadow-indigo-500/20">
            AI
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-medium text-white/70 truncate leading-tight">
              AI Assistant
            </div>
            <div className="text-[10px] text-emerald-400/90 leading-tight">
              Connected
            </div>
          </div>
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
        </div>
      </div>
    </aside>
  );
};
