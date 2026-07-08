import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Request Google Drive scopes
provider.addScope('https://www.googleapis.com/auth/drive');
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/drive.readonly');
provider.addScope('https://www.googleapis.com/auth/drive.metadata');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Initialize auth state listener. Call this on app load.
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // Try to retrieve token from storage or handle as failure (must click sign-in once)
        cachedAccessToken = localStorage.getItem('google_drive_token');
        if (cachedAccessToken && onAuthSuccess) {
          onAuthSuccess(user, cachedAccessToken);
        } else {
          cachedAccessToken = null;
          if (onAuthFailure) onAuthFailure();
        }
      }
    } else {
      cachedAccessToken = null;
      localStorage.removeItem('google_drive_token');
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Must be called from a button click or user interaction
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Firebase Auth');
    }

    cachedAccessToken = credential.accessToken;
    localStorage.setItem('google_drive_token', cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = (): string | null => {
  if (!cachedAccessToken) {
    cachedAccessToken = localStorage.getItem('google_drive_token');
  }
  return cachedAccessToken;
};

export const logoutGoogle = async () => {
  await auth.signOut();
  cachedAccessToken = null;
  localStorage.removeItem('google_drive_token');
};

// ==========================================
// GOOGLE DRIVE API OPERATIONS
// ==========================================

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime: string;
  webViewLink?: string;
  webContentLink?: string;
  thumbnailLink?: string;
  iconLink?: string;
}

/**
 * List files and folders in Google Drive under a specific parent folder or root.
 */
export async function listDriveFiles(
  parentId: string = 'root',
  searchQuery: string = ''
): Promise<DriveFile[]> {
  const token = getAccessToken();
  if (!token) throw new Error('Not authenticated with Google');

  let q = `'${parentId}' in parents and trashed = false`;
  if (searchQuery.trim()) {
    q = `name contains '${searchQuery.replace(/'/g, "\\'")}' and trashed = false`;
  }

  const fields = 'files(id,name,mimeType,size,modifiedTime,webViewLink,webContentLink,thumbnailLink,iconLink)';
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=${encodeURIComponent(fields)}&orderBy=folder%2Cname&pageSize=100`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error?.message || `Failed to list files: ${res.status}`);
  }

  const data = await res.json();
  return data.files || [];
}

/**
 * Create a new folder under a parent.
 */
export async function createDriveFolder(
  folderName: string,
  parentId: string = 'root'
): Promise<DriveFile> {
  const token = getAccessToken();
  if (!token) throw new Error('Not authenticated with Google');

  const metadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: parentId !== 'root' ? [parentId] : undefined,
  };

  const res = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error?.message || 'Failed to create folder');
  }

  return await res.json();
}

/**
 * Upload a file to Google Drive.
 */
export async function uploadDriveFile(
  file: File,
  parentId: string = 'root'
): Promise<DriveFile> {
  const token = getAccessToken();
  if (!token) throw new Error('Not authenticated with Google');

  const metadata = {
    name: file.name,
    mimeType: file.type,
    parents: parentId !== 'root' ? [parentId] : undefined,
  };

  const formData = new FormData();
  formData.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );
  formData.append('file', file);

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,modifiedTime,webViewLink,webContentLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    }
  );

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error?.message || 'Failed to upload file');
  }

  return await res.json();
}

/**
 * Delete a file or folder from Google Drive.
 */
export async function deleteDriveFile(fileId: string): Promise<boolean> {
  const token = getAccessToken();
  if (!token) throw new Error('Not authenticated with Google');

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error?.message || 'Failed to delete file');
  }

  return true;
}
