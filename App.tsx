
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatView from './components/ChatView';
import { Project, Message } from './types';
import ApiKeySelector from './components/ApiKeySelector';

const App: React.FC = () => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

    useEffect(() => {
        try {
            const savedProjects = localStorage.getItem('projects');
            if (savedProjects) {
                const parsedProjects: Project[] = JSON.parse(savedProjects);
                setProjects(parsedProjects);
                if (parsedProjects.length > 0) {
                    setActiveProjectId(localStorage.getItem('activeProjectId') || parsedProjects[0].id);
                }
            } else {
                handleCreateProject(true);
            }
        } catch (error) {
            console.error("Failed to load projects from localStorage", error);
            handleCreateProject(true);
        }
    }, []);

    useEffect(() => {
        if (projects.length > 0) {
            localStorage.setItem('projects', JSON.stringify(projects));
        }
        if (activeProjectId) {
            localStorage.setItem('activeProjectId', activeProjectId);
        }
    }, [projects, activeProjectId]);

    const handleCreateProject = (isDefault = false) => {
        const projectName = isDefault ? "General" : prompt("Enter new project name:", `Project ${projects.length + 1}`);
        if (!projectName) return;

        let projectCategory = "General";
        if (!isDefault) {
            const categories = [...new Set(projects.map(p => p.category).filter(Boolean))];
            const categoryPromptMessage = `Enter a category for this project.\nExisting categories: ${categories.join(', ')}`;
            const categoryInput = prompt(categoryPromptMessage, "General");
            if (categoryInput === null) return; // User cancelled
            projectCategory = categoryInput;
        }

        const newProject: Project = {
            id: `proj-${Date.now()}`,
            name: projectName,
            history: [],
            category: projectCategory,
            versions: [],
        };
        setProjects(prev => [...prev, newProject]);
        setActiveProjectId(newProject.id);
    };

    const handleSelectProject = (id: string) => {
        setActiveProjectId(id);
    };

    const handleUpdateProject = (projectId: string, updates: Partial<Project>) => {
        setProjects(prevProjects =>
            prevProjects.map(p =>
                p.id === projectId ? { ...p, ...updates } : p
            )
        );
    };

    const handleSelectVersion = (projectId: string, versionId: string) => {
        const project = projects.find(p => p.id === projectId);
        const version = project?.versions?.find(v => v.id === versionId);
        if (project && version) {
            handleUpdateProject(projectId, { history: version.history });
            setActiveProjectId(projectId); // Ensure the project is active
            alert(`Loaded version "${version.name}". The current chat now reflects this version.`);
        }
    };

    const activeProject = projects.find(p => p.id === activeProjectId);

    return (
        <ApiKeySelector>
            <div className="flex h-screen font-sans">
                <Sidebar
                    projects={projects}
                    activeProjectId={activeProjectId}
                    onSelectProject={handleSelectProject}
                    onCreateProject={() => handleCreateProject()}
                    onSelectVersion={handleSelectVersion}
                />
                <main className="flex-1">
                    {activeProject ? (
                        <ChatView
                            project={activeProject}
                            onUpdateProject={handleUpdateProject}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                           <div className="text-center">
                             <h2 className="text-2xl font-semibold">No Project Selected</h2>
                             <p>Create a new project or select one from the sidebar to begin.</p>
                           </div>
                        </div>
                    )}
                </main>
            </div>
        </ApiKeySelector>
    );
};

export default App;
