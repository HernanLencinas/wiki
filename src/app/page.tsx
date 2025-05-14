'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FaWikipediaW } from 'react-icons/fa';
import ThemeToggle from '@/components/theme-toggle';
//import Mermaid from '../components/Mermaid';
import ConfigurationModal from '@/components/ConfigurationModal';
import { extractUrlPath } from '@/utils/urlDecoder';

import { useLanguage } from '@/contexts/LanguageContext';

// Define the demo mermaid charts outside the component
//const DEMO_FLOW_CHART = `graph TD
//  A[Code Repository] --> B[DeepWiki]
//  B --> C[Architecture Diagrams]
//  B --> D[Component Relationships]
//  B --> E[Data Flow]
//  B --> F[Process Workflows]

//  style A fill:#f9d3a9,stroke:#d86c1f
//  style B fill:#d4a9f9,stroke:#6c1fd8
//  style C fill:#a9f9d3,stroke:#1fd86c
//  style D fill:#a9d3f9,stroke:#1f6cd8
//  style E fill:#f9a9d3,stroke:#d81f6c
//  style F fill:#d3f9a9,stroke:#6cd81f`;

//const DEMO_SEQUENCE_CHART = `sequenceDiagram
//  participant User
//  participant DeepWiki
//  participant GitHub

//  User->>DeepWiki: Enter repository URL
//  DeepWiki->>GitHub: Request repository data
//  GitHub-->>DeepWiki: Return repository data
//  DeepWiki->>DeepWiki: Process and analyze code
//  DeepWiki-->>User: Display wiki with diagrams

//  %% Add a note to make text more visible
//  Note over User,GitHub: DeepWiki supports sequence diagrams for visualizing interactions`;

export default function Home() {
  const router = useRouter();
  const { language, setLanguage, messages } = useLanguage();

  // Create a simple translation function
  const t = (key: string, params: Record<string, string | number> = {}): string => {
    // Split the key by dots to access nested properties
    const keys = key.split('.');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let value: any = messages;

    // Navigate through the nested properties
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Return the key if the translation is not found
        return key;
      }
    }

    // If the value is a string, replace parameters
    if (typeof value === 'string') {
      return Object.entries(params).reduce((acc: string, [paramKey, paramValue]) => {
        return acc.replace(`{${paramKey}}`, String(paramValue));
      }, value);
    }

    // Return the key if the value is not a string
    return key;
  };

  const [repositoryInput, setRepositoryInput] = useState('');

  // Provider-based model selection state
  const [provider, setProvider] = useState<string>('');
  const [model, setModel] = useState<string>('');
  const [isCustomModel, setIsCustomModel] = useState<boolean>(false);
  const [customModel, setCustomModel] = useState<string>('');

  // Wiki type state - default to comprehensive view
  const [isComprehensiveView, setIsComprehensiveView] = useState<boolean>(true);

  const [excludedDirs, setExcludedDirs] = useState('');
  const [excludedFiles, setExcludedFiles] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<'github' | 'gitlab' | 'bitbucket'>('github');
  const [accessToken, setAccessToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>(language);

  // Sync the language context with the selectedLanguage state
  useEffect(() => {
    setLanguage(selectedLanguage);
  }, [selectedLanguage, setLanguage]);

  // Parse repository URL/input and extract owner and repo
  const parseRepositoryInput = (input: string): {
    owner: string,
    repo: string,
    type: string,
    fullPath?: string,
    localPath?: string
  } | null => {
    input = input.trim();

    let owner = '', repo = '', type = 'github', fullPath;
    let localPath: string | undefined;

    // Handle Windows absolute paths (e.g., C:\path\to\folder)
    const windowsPathRegex = /^[a-zA-Z]:\\(?:[^\\/:*?"<>|\r\n]+\\)*[^\\/:*?"<>|\r\n]*$/;
    const customGitRegex = /^(?:https?:\/\/)?([^\/]+)\/(.+?)\/([^\/]+)(?:\.git)?\/?$/;

    if (windowsPathRegex.test(input)) {
      type = 'local';
      localPath = input;
      repo = input.split('\\').pop() || 'local-repo';
      owner = 'local';
    }
    // Handle Unix/Linux absolute paths (e.g., /path/to/folder)
    else if (input.startsWith('/')) {
      type = 'local';
      localPath = input;
      repo = input.split('/').filter(Boolean).pop() || 'local-repo';
      owner = 'local';
    }
    else if (customGitRegex.test(input)) {
      type = 'web';
      fullPath = extractUrlPath(input)?.replace(/\.git$/, '');
      const parts = fullPath?.split('/') ?? [];
      if (parts.length >= 2) {
        repo = parts[parts.length - 1] || '';
        owner = parts[parts.length - 2] || '';
      }
    }
    // Unsupported URL formats
    else {
      console.error('Unsupported URL format:', input);
      return null;
    }

    if (!owner || !repo) {
      return null;
    }

    // Clean values
    owner = owner.trim();
    repo = repo.trim();

    // Remove .git suffix if present
    if (repo.endsWith('.git')) {
      repo = repo.slice(0, -4);
    }

    return { owner, repo, type, fullPath, localPath };
  };

  // State for configuration modal
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Parse repository input to validate
    const parsedRepo = parseRepositoryInput(repositoryInput);

    if (!parsedRepo) {
      setError('Invalid repository format. Use "owner/repo", GitHub/GitLab/BitBucket URL, or a local folder path like "/path/to/folder" or "C:\\path\\to\\folder".');
      return;
    }

    // If valid, open the configuration modal
    setError(null);
    setIsConfigModalOpen(true);
  };

  const handleGenerateWiki = () => {
    // Prevent multiple submissions
    if (isSubmitting) {
      console.log('Form submission already in progress, ignoring duplicate click');
      return;
    }

    setIsSubmitting(true);

    // Parse repository input
    const parsedRepo = parseRepositoryInput(repositoryInput);

    if (!parsedRepo) {
      setError('Invalid repository format. Use "owner/repo", GitHub/GitLab/BitBucket URL, or a local folder path like "/path/to/folder" or "C:\\path\\to\\folder".');
      setIsSubmitting(false);
      return;
    }

    const { owner, repo, type, localPath } = parsedRepo;

    // Store tokens in query params if they exist
    const params = new URLSearchParams();
    if (accessToken) {
      params.append('token', accessToken);
    }
    // Always include the type parameter
    params.append('type', (type == 'local' ? type : selectedPlatform) || 'github');
    // Add local path if it exists
    if (localPath) {
      params.append('local_path', encodeURIComponent(localPath));
    } else {
      params.append('repo_url', encodeURIComponent(repositoryInput));
    }
    // Add model parameters
    params.append('provider', provider);
    params.append('model', model);
    if (isCustomModel && customModel) {
      params.append('custom_model', customModel);
    }
    // Add file filters configuration
    if (excludedDirs) {
      params.append('excluded_dirs', excludedDirs);
    }
    if (excludedFiles) {
      params.append('excluded_files', excludedFiles);
    }

    // Add language parameter
    params.append('language', selectedLanguage);

    // Add comprehensive parameter
    params.append('comprehensive', isComprehensiveView.toString());

    const queryString = params.toString() ? `?${params.toString()}` : '';

    // Navigate to the dynamic route
    router.push(`/${owner}/${repo}${queryString}`);

    // The isSubmitting state will be reset when the component unmounts during navigation
  };

  return (
    <div className="h-screen paper-texture p-4 md:p-8 flex flex-col">
      <header className="max-w-6xl mx-auto mb-6 h-fit w-full">
        <div
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-[var(--card-bg)] rounded-lg shadow-custom border border-[var(--border-color)] p-4">
          <div className="flex items-center">
            <div className="bg-[var(--accent-primary)] p-2 rounded-lg mr-3">
              <FaWikipediaW className="text-2xl text-white" />
            </div>
            <div className="mr-6">
              <h1 className="text-xl md:text-2xl font-bold text-[var(--accent-primary)]">{t('common.appName')}</h1>
              <div className="flex flex-wrap items-baseline gap-x-2 md:gap-x-3 mt-0.5">
                <p className="text-xs text-[var(--muted)] whitespace-nowrap">{t('common.tagline')}</p>
                <div className="hidden md:inline-block">
                  <Link href="/wiki/projects"
                    className="text-xs font-medium text-[var(--accent-primary)] hover:text-[var(--highlight)] hover:underline whitespace-nowrap">
                    {t('nav.wikiProjects')}
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleFormSubmit} className="flex flex-col gap-3 w-full max-w-3xl">
            {/* Repository URL input and submit button */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={repositoryInput}
                  onChange={(e) => setRepositoryInput(e.target.value)}
                  placeholder={t('form.repoPlaceholder') || "owner/repo, GitHub/GitLab/BitBucket URL, or local folder path"}
                  className="input-japanese block w-full pl-10 pr-3 py-2.5 border-[var(--border-color)] rounded-lg bg-transparent text-[var(--foreground)] focus:outline-none focus:border-[var(--accent-primary)]"
                />
                {error && (
                  <div className="text-[var(--highlight)] text-xs mt-1">
                    {error}
                  </div>
                )}
              </div>
              <button
                type="submit"
                className="btn-japanese px-6 py-2.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                {isSubmitting ? t('common.processing') : t('common.generateWiki')}
              </button>
            </div>
          </form>

          {/* Configuration Modal */}
          <ConfigurationModal
            isOpen={isConfigModalOpen}
            onClose={() => setIsConfigModalOpen(false)}
            repositoryInput={repositoryInput}
            selectedLanguage={selectedLanguage}
            setSelectedLanguage={setSelectedLanguage}
            isComprehensiveView={isComprehensiveView}
            setIsComprehensiveView={setIsComprehensiveView}
            provider={provider}
            setProvider={setProvider}
            model={model}
            setModel={setModel}
            isCustomModel={isCustomModel}
            setIsCustomModel={setIsCustomModel}
            customModel={customModel}
            setCustomModel={setCustomModel}
            selectedPlatform={selectedPlatform}
            setSelectedPlatform={setSelectedPlatform}
            accessToken={accessToken}
            setAccessToken={setAccessToken}
            excludedDirs={excludedDirs}
            setExcludedDirs={setExcludedDirs}
            excludedFiles={excludedFiles}
            setExcludedFiles={setExcludedFiles}
            onSubmit={handleGenerateWiki}
            isSubmitting={isSubmitting}
          />

        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full overflow-y-auto">
        <div
          className="min-h-full flex flex-col items-center p-8 pt-10 bg-[var(--card-bg)] rounded-lg shadow-custom card-japanese">
        </div>
      </main>

      <footer className="max-w-6xl mx-auto mt-8 flex flex-col gap-4 w-full">
        <div
          className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-[var(--card-bg)] rounded-lg p-4 border border-[var(--border-color)] shadow-custom">
          <p className="text-[var(--muted)] text-sm font-serif">{t('footer.copyright')}</p>

          <div className="flex items-center gap-6">
            <ThemeToggle />
          </div>
        </div>
      </footer>
    </div>
  );
}
