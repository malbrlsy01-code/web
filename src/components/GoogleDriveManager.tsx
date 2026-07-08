import { useState, useEffect, useRef } from 'react';
import { 
  Folder, File, Upload, Trash2, ArrowLeft, Search, Plus, ExternalLink, 
  RefreshCw, CheckCircle2, AlertCircle, HardDrive, LogOut, ChevronRight, FileText, Image as ImageIcon, Loader2
} from 'lucide-react';
import { 
  initAuth, googleSignIn, logoutGoogle, listDriveFiles, 
  createDriveFolder, uploadDriveFile, deleteDriveFile, DriveFile, getAccessToken 
} from '../utils/googleDrive';
import { translations, Language } from '../utils/i18n';
import { User as FirebaseUser } from 'firebase/auth';

interface GoogleDriveManagerProps {
  lang: Language;
}

export default function GoogleDriveManager({ lang }: GoogleDriveManagerProps) {
  const isRtl = lang === 'ar';
  const t = (key: any) => (translations[lang] as any)[key] || key;

  // Authentication State
  const [googleUser, setGoogleUser] = useState<FirebaseUser | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Directory & Files State
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [folderHistory, setFolderHistory] = useState<{ id: string; name: string }[]>([
    { id: 'root', name: t('driveRoot') }
  ]);
  const currentFolder = folderHistory[folderHistory.length - 1];

  // Actions / Modals
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // References
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Initialize Google Authentication
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setGoogleToken(token);
        setIsAuthLoading(false);
      },
      () => {
        setGoogleUser(null);
        setGoogleToken(null);
        setIsAuthLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Fetch files whenever directory, authentication, or search query changes
  useEffect(() => {
    if (googleToken) {
      fetchFiles();
    }
  }, [googleToken, currentFolder.id]);

  const fetchFiles = async () => {
    setIsLoadingFiles(true);
    try {
      const data = await listDriveFiles(currentFolder.id, searchQuery);
      setFiles(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleGoogleConnect = async () => {
    setIsAuthLoading(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
        setGoogleToken(result.accessToken);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleGoogleDisconnect = async () => {
    try {
      await logoutGoogle();
      setGoogleUser(null);
      setGoogleToken(null);
      setFiles([]);
      setFolderHistory([{ id: 'root', name: t('driveRoot') }]);
    } catch (err) {
      console.error(err);
    }
  };

  // Directory Navigation
  const handleFolderClick = (folderId: string, folderName: string) => {
    setFolderHistory(prev => [...prev, { id: folderId, name: folderName }]);
    setSearchQuery('');
  };

  const handleBreadcrumbClick = (index: number) => {
    setFolderHistory(prev => prev.slice(0, index + 1));
    setSearchQuery('');
  };

  // Folder Creation
  const handleCreateFolderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      setIsLoadingFiles(true);
      await createDriveFolder(newFolderName.trim(), currentFolder.id);
      setNewFolderName('');
      setIsCreatingFolder(false);
      fetchFiles();
    } catch (err: any) {
      alert(err.message || 'Failed to create folder');
    } finally {
      setIsLoadingFiles(false);
    }
  };

  // File Upload Handlers
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      await handleUpload(selectedFile);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      await handleUpload(droppedFile);
    }
  };

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      await uploadDriveFile(file, currentFolder.id);
      setUploadSuccess(`"${file.name}" uploaded successfully!`);
      fetchFiles();
      // Clear success notification after 4 seconds
      setTimeout(() => setUploadSuccess(null), 4000);
    } catch (err: any) {
      setUploadError(err.message || 'File upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  // File Deletion
  const handleDeleteClick = async (fileId: string, fileName: string) => {
    const isConfirmed = window.confirm(
      isRtl 
        ? `هل أنت متأكد من رغبتك في حذف "${fileName}" نهائياً من جوجل درايف؟ لا يمكن التراجع عن هذا الإجراء.`
        : `Are you sure you want to permanently delete "${fileName}" from Google Drive? This action cannot be undone.`
    );

    if (isConfirmed) {
      try {
        setIsLoadingFiles(true);
        await deleteDriveFile(fileId);
        fetchFiles();
      } catch (err: any) {
        alert(err.message || 'Failed to delete file');
      } finally {
        setIsLoadingFiles(false);
      }
    }
  };

  // Utilities
  const formatBytes = (bytes?: string) => {
    if (!bytes) return '---';
    const num = parseInt(bytes, 10);
    if (isNaN(num)) return '---';
    if (num === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(num) / Math.log(k));
    return parseFloat((num / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType === 'application/vnd.google-apps.folder') {
      return <Folder className="w-5 h-5 text-amber-500 fill-amber-500/20" />;
    }
    if (mimeType.includes('pdf')) {
      return <FileText className="w-5 h-5 text-red-400" />;
    }
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('sheet')) {
      return <FileText className="w-5 h-5 text-emerald-400" />;
    }
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
      return <FileText className="w-5 h-5 text-orange-400" />;
    }
    if (mimeType.includes('image')) {
      return <ImageIcon className="w-5 h-5 text-blue-400" />;
    }
    return <File className="w-5 h-5 text-gray-400" />;
  };

  if (isAuthLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <Loader2 className="w-10 h-10 text-[#ad0404] animate-spin mb-4" />
        <p className="text-xs font-mono">{t('driveLoading')}</p>
      </div>
    );
  }

  // ==========================================
  // VIEW: AUTHENTICATION / CONNECT PROMPT
  // ==========================================
  if (!googleUser || !googleToken) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center max-w-lg mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-red-950/40 border border-red-500/20 flex items-center justify-center text-[#ad0404] mb-6">
          <HardDrive className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">{t('driveTitle')}</h2>
        <p className="text-xs text-gray-400 mb-8 leading-relaxed">
          {t('driveDesc')}
        </p>

        {/* Google Premium Button */}
        <button
          onClick={handleGoogleConnect}
          className="px-6 py-3.5 bg-gradient-to-r from-red-600 to-[#ad0404] hover:from-red-500 hover:to-red-700 active:from-red-700 active:to-red-900 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-3 cursor-pointer"
        >
          {/* Material design Google SVG */}
          <div className="w-5 h-5 bg-white p-1 rounded-md flex items-center justify-center">
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
            </svg>
          </div>
          <span>{t('driveConnect')}</span>
        </button>

        <p className="text-[10px] text-gray-500 mt-6 font-mono">
          Uses Google Secure OAuth to authenticate Drive capabilities with absolute privacy.
        </p>
      </div>
    );
  }

  // ==========================================
  // VIEW: FULL DOCUMENT MANAGER
  // ==========================================
  return (
    <div className="space-y-6">
      
      {/* Header and User Connection Row */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-5 border-b border-white/[0.05]">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-[#ad0404]" />
            <span>{t('driveTitle')}</span>
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {t('driveConnectedAs')} <span className="font-semibold text-red-400">{googleUser.email}</span>
          </p>
        </div>

        <button
          onClick={handleGoogleDisconnect}
          className="px-3 py-1.5 rounded-lg border border-red-950 bg-red-950/10 text-red-400 hover:bg-red-950/20 text-xs font-semibold flex items-center gap-2 cursor-pointer transition"
        >
          <LogOut className="w-4 h-4" />
          <span>{t('driveDisconnect')}</span>
        </button>
      </div>

      {/* Breadcrumb Navigation & Action buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#141416] p-4 rounded-xl border border-white/[0.02]">
        
        {/* Breadcrumbs */}
        <div className="flex items-center space-x-1.5 gap-1.5 text-xs text-gray-400 flex-wrap">
          {folderHistory.map((folder, index) => (
            <div key={folder.id} className="flex items-center gap-1.5">
              {index > 0 && <ChevronRight className={`w-3.5 h-3.5 text-gray-600 ${isRtl ? 'rotate-180' : ''}`} />}
              <button
                onClick={() => handleBreadcrumbClick(index)}
                className={`hover:text-white font-medium transition ${index === folderHistory.length - 1 ? 'text-white font-bold' : ''}`}
              >
                {folder.name}
              </button>
            </div>
          ))}
        </div>

        {/* Buttons: Create Folder, Upload File */}
        <div className="flex items-center gap-3.5 w-full sm:w-auto justify-end">
          <button
            onClick={() => setIsCreatingFolder(!isCreatingFolder)}
            className="px-3.5 py-2 bg-[#1d1d21] border border-[#2a2a2e] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-[#252529] transition cursor-pointer"
          >
            <Plus className="w-4 h-4 text-gray-300" />
            <span>{t('driveCreateFolderBtn')}</span>
          </button>

          <button
            onClick={triggerFileInput}
            className="px-3.5 py-2 bg-[#ad0404] hover:bg-[#c10a0a] active:bg-[#8f0303] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-md shadow-red-950/20 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>{t('driveUploadBtn')}</span>
          </button>
        </div>
      </div>

      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Create Folder Inline Modal/Drawer */}
      {isCreatingFolder && (
        <form onSubmit={handleCreateFolderSubmit} className="p-4 bg-[#171719] border border-[#ad0404]/30 rounded-xl flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-[11px] font-bold text-gray-400 mb-1.5">{t('driveCreateFolderBtn')}</label>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder={isRtl ? "مثال: عقود البيع، المستندات الرسمية..." : "e.g., Sales Contracts, ID Copies..."}
              className="w-full px-3 py-2 bg-[#111113] border border-[#2a2a2e] text-xs text-white rounded-lg focus:border-[#ad0404] outline-none"
              required
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setIsCreatingFolder(false);
                setNewFolderName('');
              }}
              className="px-4 py-2 bg-transparent text-gray-400 hover:text-white text-xs font-bold"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#ad0404] hover:bg-[#c10a0a] text-white rounded-lg text-xs font-bold transition"
            >
              {t('save')}
            </button>
          </div>
        </form>
      )}

      {/* Drag & Drop Upload Overlay */}
      <div 
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`relative p-8 rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-all ${
          dragActive 
            ? 'border-[#ad0404] bg-[#ad0404]/5 text-white' 
            : 'border-white/[0.06] hover:border-[#ad0404]/50 bg-[#121214] text-gray-400'
        }`}
      >
        <Upload className={`w-8 h-8 mb-3.5 transition-transform ${dragActive ? '-translate-y-1 text-[#ad0404]' : 'text-gray-500'}`} />
        <p className="text-xs font-medium text-center">
          {isRtl 
            ? "اسحب الملفات هنا وأفلتها للرفع، أو انقر لاختيار ملف من جهازك" 
            : "Drag and drop files here to upload, or click to browse from device"}
        </p>
        <button 
          onClick={triggerFileInput} 
          className="mt-3.5 px-3 py-1.5 bg-[#1a1a1d] hover:bg-[#222226] border border-white/[0.05] text-[11px] font-bold rounded-lg text-white transition"
        >
          {t('driveUploadBtn')}
        </button>
      </div>

      {/* Error & Success Notifications */}
      {uploadError && (
        <div className="p-3.5 bg-red-950/30 border border-red-500/20 rounded-xl text-xs text-red-200 flex items-center gap-3.5">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {uploadSuccess && (
        <div className="p-3.5 bg-emerald-950/30 border border-emerald-500/20 rounded-xl text-xs text-emerald-200 flex items-center gap-3.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{uploadSuccess}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3.5 text-gray-500 w-4 h-4" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchFiles()}
            placeholder={t('driveSearchPlaceholder')}
            className="w-full pl-10 pr-4 py-3 bg-[#171719] border border-[#2a2a2e] text-xs text-white rounded-xl focus:border-[#ad0404] outline-none"
          />
        </div>
        <button
          onClick={fetchFiles}
          className="px-4 py-3 bg-[#1d1d21] border border-[#2a2a2e] text-white rounded-xl text-xs font-bold hover:bg-[#252529] transition flex items-center gap-1.5"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${isLoadingFiles ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Drive Documents List / Grid */}
      <div className="bg-[#171719] rounded-xl border border-[#2a2a2e] overflow-hidden min-h-[300px] relative">
        {isLoadingFiles ? (
          <div className="absolute inset-0 bg-[#171719]/70 backdrop-blur-[2px] flex items-center justify-center z-10">
            <Loader2 className="w-10 h-10 text-[#ad0404] animate-spin" />
          </div>
        ) : null}

        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500 text-center">
            <Folder className="w-12 h-12 text-gray-700 mb-3.5" />
            <h4 className="font-semibold text-sm text-gray-400">{t('driveNoResults')}</h4>
            <p className="text-[11px] text-gray-500 mt-1">{t('driveFolderEmpty')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#121214] text-gray-400 uppercase font-bold border-b border-[#2a2a2e]">
                <tr>
                  <th className="px-5 py-4">{t('driveFileName')}</th>
                  <th className="px-5 py-4">{t('driveFileSize')}</th>
                  <th className="px-5 py-4">{t('driveLastModified')}</th>
                  <th className="px-5 py-4">{t('driveActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {files.map((file) => (
                  <tr key={file.id} className="hover:bg-white/[0.02] transition">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="shrink-0">{getFileIcon(file.mimeType)}</div>
                        <div className="text-right">
                          {file.mimeType === 'application/vnd.google-apps.folder' ? (
                            <button
                              onClick={() => handleFolderClick(file.id, file.name)}
                              className="font-semibold text-white hover:text-[#ad0404] transition text-right cursor-pointer"
                            >
                              {file.name}
                            </button>
                          ) : (
                            <p className="font-semibold text-gray-200">{file.name}</p>
                          )}
                          <p className="text-[10px] text-gray-500 font-mono tracking-tight">{file.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-mono text-gray-400">
                      {file.mimeType === 'application/vnd.google-apps.folder' ? '---' : formatBytes(file.size)}
                    </td>
                    <td className="px-5 py-4 text-gray-400 font-mono">
                      {new Date(file.modifiedTime).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 justify-end">
                        {file.webViewLink && (
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer referrer"
                            className="p-1.5 bg-[#1a1a1c] border border-white/[0.05] text-gray-400 hover:text-white rounded transition"
                            title="Preview File"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        <button
                          onClick={() => handleDeleteClick(file.id, file.name)}
                          className="p-1.5 bg-red-950/10 border border-red-950/30 text-red-400 hover:bg-red-950/30 hover:text-red-300 rounded transition cursor-pointer"
                          title="Delete File"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
