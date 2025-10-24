import React, { useMemo, useState } from 'react';
import { Project } from '../types';

interface SidebarProps {
  projects: Project[];
  activeProjectId: string | null;
  onSelectProject: (id: string) => void;
  onCreateProject: () => void;
  onSelectVersion: (projectId: string, versionId: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ projects, activeProjectId, onSelectProject, onCreateProject, onSelectVersion }) => {
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});

  const toggleVersions = (projectId: string) => {
      setExpandedProjects(prev => ({...prev, [projectId]: !prev[projectId]}));
  }

  const projectsByCategory = useMemo(() => {
    // FIX: Replaced `reduce` with a standard for-loop for grouping projects.
    // This approach is often more readable and can avoid complex type inference issues
    // that sometimes occur with `reduce` on complex objects, resolving the 'unknown' type error.
    const categories: Record<string, Project[]> = {};
    for (const project of projects) {
        const category = project.category || 'Uncategorized';
        if (!categories[category]) {
            categories[category] = [];
        }
        categories[category].push(project);
    }
    return categories;
  }, [projects]);
  
  return (
    <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
      <div className="p-4 border-b border-gray-800 flex items-center gap-2">
         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-indigo-400">
            <path d="M11.25 4.533A9.707 9.707 0 0 0 6 3a9.735 9.735 0 0 0-3.25.555.75.75 0 0 0-.5.707v1.286a.75.75 0 0 0 .75.75h.008a.75.75 0 0 0 .75-.75v-.328a8.25 8.25 0 0 1 7.5-6.586.75.75 0 0 0 .5-.707V4.533Z" />
            <path d="M12.75 20.667A9.707 9.707 0 0 0 18 21a9.735 9.735 0 0 0 3.25-.555.75.75 0 0 0 .5-.707v-1.286a.75.75 0 0 0-.75-.75h-.008a.75.75 0 0 0-.75.75v.328a8.25 8.25 0 0 1-7.5 6.586.75.75 0 0 0-.5.707v.467Z" />
            <path fillRule="evenodd" d="M12 3.75a8.25 8.25 0 1 0 0 16.5 8.25 8.25 0 0 0 0-16.5ZM10.5 12a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Zm-2.625.75a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" clipRule="evenodd" />
        </svg>
        <h1 className="text-xl font-bold">Assignment AI</h1>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {Object.entries(projectsByCategory).map(([category, categoryProjects]) => (
            <div key={category} className="mb-4">
                <h2 className="text-xs font-bold uppercase text-gray-500 px-2 mb-1">{category}</h2>
                {categoryProjects.map(project => (
                   <div key={project.id}>
                        <div
                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                            activeProjectId === project.id ? 'bg-indigo-600' : 'hover:bg-gray-700'
                            }`}
                        >
                            <span onClick={() => onSelectProject(project.id)} className="flex-grow">{project.name}</span>
                            {project.versions && project.versions.length > 0 && (
                                <button onClick={() => toggleVersions(project.id)} className="p-1 rounded hover:bg-gray-600">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-4 h-4 transition-transform ${expandedProjects[project.id] ? 'rotate-180' : ''}`}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                    </svg>
                                </button>
                            )}
                        </div>
                        {expandedProjects[project.id] && project.versions && (
                             <div className="pl-4 mt-1 border-l-2 border-gray-700">
                                {project.versions.map(version => (
                                    <div 
                                        key={version.id} 
                                        onClick={() => onSelectVersion(project.id, version.id)}
                                        className="text-sm p-1.5 rounded text-gray-300 hover:bg-gray-700 cursor-pointer"
                                    >
                                        {version.name}
                                        <span className="text-xs text-gray-500 ml-2">{new Date(version.timestamp).toLocaleDateString()}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                   </div>
                ))}
            </div>
        ))}
      </div>
      <div className="p-4 border-t border-gray-800">
        <button
          onClick={onCreateProject}
          className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-indigo-500 transition-colors"
        >
          New Project
        </button>
      </div>
    </div>
  );
};

export default Sidebar;