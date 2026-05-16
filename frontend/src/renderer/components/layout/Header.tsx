import React from "react";
import {
  BellIcon,
  PlusIcon,
  CodeBracketIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";

export const Header: React.FC = () => {
  const navigate = useNavigate();

  return (
    <header className="bg-white/60 backdrop-blur-xl border-b border-indigo-100/60">
      <div className="flex items-center justify-between px-6 py-2.5">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-sm shadow-indigo-500/25">
              <CodeBracketIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#1e1b4b] tracking-tight leading-none">
                RePoChat
              </h1>
              <p className="text-[10px] text-gray-400 leading-tight">
                AI-powered Git Assistant
              </p>
            </div>
          </div>
          <div className="h-6 w-px bg-gray-200"></div>
          <nav>
            <button
              onClick={() => navigate("/github-recommendations")}
              className="flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium text-gray-500 hover:text-indigo-600 hover:bg-indigo-50/60 rounded-lg transition-all duration-200"
            >
              <MagnifyingGlassIcon className="h-4 w-4" />
              Explore
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/projects")}
            className="btn-primary text-[13px] gap-1.5"
          >
            <PlusIcon className="h-4 w-4" />
            New repository
          </button>

          <button className="p-2 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50/60 rounded-lg transition-all duration-200">
            <BellIcon className="h-5 w-5" />
          </button>

          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm shadow-indigo-500/25 cursor-pointer">
            <span>AI</span>
          </div>
        </div>
      </div>
    </header>
  );
};
