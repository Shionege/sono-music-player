/**
 * storage.js
 * IndexedDB Wrapper for Offline Music Player
 * Handles saving songs, cover arts, and playlists locally on the device.
 */

const DB_NAME = 'AnywhereMusicPlayerDB';
const DB_VERSION = 1;

let dbInstance = null;

function getDB() {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Store songs: id, title, artist, album, duration, file (Blob), cover (Blob/null), lyrics (string/null), favorite (boolean)
      if (!db.objectStoreNames.contains('songs')) {
        const songStore = db.createObjectStore('songs', { keyPath: 'id', autoIncrement: true });
        songStore.createIndex('title', 'title', { unique: false });
        songStore.createIndex('artist', 'artist', { unique: false });
        songStore.createIndex('favorite', 'favorite', { unique: false });
      }

      // Store playlists: id, name, songIds (array of song IDs)
      if (!db.objectStoreNames.contains('playlists')) {
        db.createObjectStore('playlists', { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      console.error('IndexedDB open error:', event.target.error);
      reject(event.target.error);
    };
  });
}

const Storage = {
  /**
   * Save a song to IndexedDB
   * @param {Object} song - { title, artist, album, duration, file, cover, lyrics, favorite }
   */
  async saveSong(song) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['songs'], 'readwrite');
      const store = transaction.objectStore('songs');
      
      // Default values
      const songData = {
        title: song.title || 'Unknown Title',
        artist: song.artist || 'Unknown Artist',
        album: song.album || 'Unknown Album',
        duration: song.duration || 0,
        file: song.file, // Blob
        cover: song.cover || null, // Blob
        lyrics: song.lyrics || '',
        favorite: song.favorite || false,
        addedAt: Date.now()
      };

      const request = store.add(songData);

      request.onsuccess = (event) => {
        resolve(event.target.result); // Returns song ID
      };

      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  },

  /**
   * Get all songs
   */
  async getAllSongs() {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['songs'], 'readonly');
      const store = transaction.objectStore('songs');
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  },

  /**
   * Get a single song by ID
   */
  async getSong(id) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['songs'], 'readonly');
      const store = transaction.objectStore('songs');
      const request = store.get(Number(id));

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  },

  /**
   * Update a song's metadata
   */
  async updateSong(song) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['songs'], 'readwrite');
      const store = transaction.objectStore('songs');
      const request = store.put(song);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  },

  /**
   * Delete a song
   */
  async deleteSong(id) {
    const db = await getDB();
    // Also remove from playlists
    const playlists = await this.getAllPlaylists();
    for (const playlist of playlists) {
      if (playlist.songIds.includes(Number(id))) {
        playlist.songIds = playlist.songIds.filter(sid => sid !== Number(id));
        await this.updatePlaylist(playlist);
      }
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['songs'], 'readwrite');
      const store = transaction.objectStore('songs');
      const request = store.delete(Number(id));

      request.onsuccess = () => {
        resolve(true);
      };

      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  },

  /**
   * Toggle favorite status
   */
  async toggleFavorite(id) {
    const song = await this.getSong(id);
    if (!song) return null;
    song.favorite = !song.favorite;
    await this.updateSong(song);
    return song.favorite;
  },

  /**
   * Create a new playlist
   */
  async createPlaylist(name) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['playlists'], 'readwrite');
      const store = transaction.objectStore('playlists');
      const playlist = {
        name,
        songIds: [],
        createdAt: Date.now()
      };
      const request = store.add(playlist);

      request.onsuccess = (event) => {
        resolve(event.target.result); // Returns playlist ID
      };

      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  },

  /**
   * Get all playlists
   */
  async getAllPlaylists() {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['playlists'], 'readonly');
      const store = transaction.objectStore('playlists');
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  },

  /**
   * Update a playlist
   */
  async updatePlaylist(playlist) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['playlists'], 'readwrite');
      const store = transaction.objectStore('playlists');
      const request = store.put(playlist);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  },

  /**
   * Add song to playlist
   */
  async addSongToPlaylist(playlistId, songId) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['playlists'], 'readwrite');
      const store = transaction.objectStore('playlists');
      
      const getRequest = store.get(Number(playlistId));
      getRequest.onsuccess = () => {
        const playlist = getRequest.result;
        if (!playlist) {
          reject(new Error('Playlist not found'));
          return;
        }
        if (!playlist.songIds.includes(Number(songId))) {
          playlist.songIds.push(Number(songId));
          const putRequest = store.put(playlist);
          putRequest.onsuccess = () => resolve(playlist);
          putRequest.onerror = (e) => reject(e.target.error);
        } else {
          resolve(playlist); // Already in playlist
        }
      };
      getRequest.onerror = (e) => reject(e.target.error);
    });
  },

  /**
   * Remove song from playlist
   */
  async removeSongFromPlaylist(playlistId, songId) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['playlists'], 'readwrite');
      const store = transaction.objectStore('playlists');
      
      const getRequest = store.get(Number(playlistId));
      getRequest.onsuccess = () => {
        const playlist = getRequest.result;
        if (!playlist) {
          reject(new Error('Playlist not found'));
          return;
        }
        playlist.songIds = playlist.songIds.filter(id => id !== Number(songId));
        const putRequest = store.put(playlist);
        putRequest.onsuccess = () => resolve(playlist);
        putRequest.onerror = (e) => reject(e.target.error);
      };
      getRequest.onerror = (e) => reject(e.target.error);
    });
  },

  /**
   * Delete playlist
   */
  async deletePlaylist(id) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['playlists'], 'readwrite');
      const store = transaction.objectStore('playlists');
      const request = store.delete(Number(id));

      request.onsuccess = () => {
        resolve(true);
      };

      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  },

  /**
   * Clear all database data
   */
  async clearAllData() {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['songs', 'playlists'], 'readwrite');
      const songsStore = transaction.objectStore('songs');
      const playlistsStore = transaction.objectStore('playlists');

      songsStore.clear();
      playlistsStore.clear();

      transaction.oncomplete = () => {
        resolve(true);
      };

      transaction.onerror = (event) => {
        reject(event.target.error);
      };
    });
  },

  /**
   * Estimate storage usage in MB
   */
  async getStorageUsage() {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      const usedMB = (estimate.usage / (1024 * 1024)).toFixed(2);
      const totalMB = (estimate.quota / (1024 * 1024)).toFixed(2);
      return { usedMB, totalMB };
    }
    return { usedMB: 'Unknown', totalMB: 'Unknown' };
  }
};

window.Storage = Storage;
export default Storage;
