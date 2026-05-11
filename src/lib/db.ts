export interface HistoryRecord {
  id: string;
  type: 'campaign' | 'leads';
  label: string;
  data: any;
  timestamp: number;
  starred?: boolean;
}

const DB_NAME = 'MoxsendDB';
const STORE_NAME = 'history';

// Initialize IndexedDB
const getDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('starred', 'starred', { unique: false });
      }
    };
  });
};

export const saveHistory = async (record: Omit<HistoryRecord, 'timestamp'>): Promise<void> => {
  try {
    const db = await getDB();
    const fullRecord: HistoryRecord = {
      ...record,
      timestamp: Date.now(),
      starred: record.starred || false
    };
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(fullRecord);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error saving to Local Database:', error);
  }
};

export const getHistoryItem = async (id: string): Promise<HistoryRecord | null> => {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);
      
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error fetching from Local Database:', error);
    return null;
  }
};

export const deleteHistoryItem = async (id: string): Promise<void> => {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error deleting from Local Database:', error);
  }
};

export const toggleStarHistoryItem = async (id: string, starred: boolean): Promise<void> => {
  try {
    const db = await getDB();
    const item = await getHistoryItem(id);
    if (!item) return;
    
    item.starred = starred;
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(item);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error toggling star:', error);
  }
};

export const getAllHistory = async (): Promise<HistoryRecord[]> => {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      
      request.onsuccess = () => {
        const records = request.result || [];
        // Sort: Starred first, then newest first
        records.sort((a, b) => {
          if (a.starred && !b.starred) return -1;
          if (!a.starred && b.starred) return 1;
          return b.timestamp - a.timestamp;
        });
        resolve(records);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error fetching all history:', error);
    return [];
  }
};

export const generateHashId = async (input: string): Promise<string> => {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16) + '_' + input.length.toString(16);
};
