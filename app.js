function createIconsSafe() {
  try {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  } catch (e) {
    console.warn('Lucide createIcons warning:', e);
  }
}

/**
 * app.js
 * Main application logic, UI bindings, and WebRTC transfer glue.
 */

import AudioPlayerModule from './player.js';
import StorageModule from './storage.js';
import MetadataModule from './metadata.js';
import TransferManagerModule from './transfer.js';

const AudioPlayer = window.AudioPlayer || AudioPlayerModule;
const Storage = window.Storage || StorageModule;
const Metadata = window.Metadata || MetadataModule;
const TransferManager = window.TransferManager || TransferManagerModule;

// Global state
let allSongs = [];
let filteredSongs = [];
let currentPlaylist = null;
let parsedLyrics = [];
const defaultCoverSVG = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiB2aWV3Qm94PSIwIDAgMzAwIDMwMCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJiZyIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iI2ZmMmQ1NSIvPjxzdG9wIG9mZnNldD0iNTAlIiBzdG9wLWNvbG9yPSIjNzkyOGNhIi8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjNGMxZDk1Ii8+PC9saW5lYXJHcmFkaWVudD48bGluZWFyR3JhZGllbnQgaWQ9Im5vdGUiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjZmZmZmZmIi8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjZTBlMGUwIi8+PC9saW5lYXJHcmFkaWVudD48ZmlsdGVyIGlkPSJzaGFkb3ciIHg9Ii0yMCUiIHk9Ii0yMCUiIHdpZHRoPSIxNDAlIiBoZWlnaHQ9IjE0MCUiPjxmZURyb3BTaGFkb3cgZHg9IjAiIGR5PSI2IiBzdGREZXZpYXRpb249IjgiIGZsb29kLWNvbG9yPSIjMDAwMDAwIiBmbG9vZC1vcGFjaXR5PSIwLjQiLz48L2ZpbHRlcj48L2RlZnM+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIzMDAiIHJ4PSIzNiIgZmlsbD0idXJsKCNiZykiLz48Y2lyY2xlIGN4PSIxNTAiIGN5PSIxNTAiIHI9IjEwMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDgpIiBzdHJva2Utd2lkdGg9IjE2Ii8+PGNpcmNsZSBjeD0iMTUwIiBjeT0iMTUwIiByPSI2NSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDYpIiBzdHJva2Utd2lkdGg9IjE2Ii8+PHBhdGggZD0iTSAxODUgODUgViAxNzUgQSAzMCAzMCAwIDEgMSAxNTUgMTQ1IEEgMzAgMzAgMCAwIDEgMTg1IDE3NSBWIDExMCBMIDEyMCAxMjUgViAxOTUgQSAzMCAzMCAwIDEgMSA5MCAxNjUgQSAzMCAzMCAwIDAgMSAxMjAgMTk1IFYgMTAwIFoiIGZpbGw9InVybCgjbm90ZSkiIGZpbHRlcj0idXJsKCNzaGFkb3cpIi8+PC9zdmc+';utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ff2d55"/><stop offset="100%" stop-color="#5856d6"/></linearGradient></defs><rect width="120" height="120" rx="24" fill="url(#g)"/><path d="M 76 32 V 73 A 13 13 0 1 1 63 60 A 13 13 0 0 1 76 73 V 44 L 48 51 V 81 A 13 13 0 1 1 35 68 A 13 13 0 0 1 48 81 V 39 Z" fill="#ffffff"/></svg>'); // Array of { time: seconds, text: text } for synced lyrics
let currentLyricsLineIndex = -1;
let isVisualizerEnabled = true;
let isDesktop = false;

// DOM Elements
const els = {
  // Navigation & Screens
  tabItems: document.querySelectorAll('.tab-bar, .tab-item'),
  screens: document.querySelectorAll('.app-screen'),
  screenTitle: document.getElementById('screen-title'),
  
  // Library
  songsList: document.getElementById('songs-list'),
  songsCount: document.getElementById('songs-count'),
  librarySearch: document.getElementById('library-search'),
  shufflePlayBtn: document.getElementById('shuffle-play-btn'),
  manualUploadBtn: document.getElementById('manual-upload-btn'),
  nativeSongPicker: document.getElementById('native-song-picker'),
  addSongBtn: document.getElementById('add-song-btn'),

  // Playlists
  playlistsList: document.getElementById('playlists-list'),
  favPlaylistCard: document.getElementById('fav-playlist-card'),
  favCount: document.getElementById('fav-count'),
  createPlaylistBtn: document.getElementById('create-playlist-btn'),
  playlistDetailsView: document.getElementById('playlist-details-view'),
  playlistDetailsTitle: document.getElementById('playlist-details-title'),
  playlistDetailsCount: document.getElementById('playlist-details-count'),
  playlistSongsList: document.getElementById('playlist-songs-list'),
  closePlaylistDetails: document.getElementById('close-playlist-details'),
  deletePlaylistBtn: document.getElementById('delete-playlist-btn'),

  // Mini Player
  miniPlayer: document.getElementById('mini-player'),
  miniPlayerTrigger: document.getElementById('mini-player-trigger'),
  miniPlayerCover: document.getElementById('mini-player-cover'),
  miniPlayerTitle: document.getElementById('mini-player-title'),
  miniPlayerArtist: document.getElementById('mini-player-artist'),
  miniPlayBtn: document.getElementById('mini-play-btn'),
  miniNextBtn: document.getElementById('mini-next-btn'),
  miniProgressLine: document.getElementById('mini-progress-line'),

  // Now Playing Overlay
  nowPlayingSheet: document.getElementById('now-playing-sheet'),
  closeNowPlaying: document.getElementById('close-now-playing'),
  playerAlbumArt: document.getElementById('player-album-art'),
  playerTitle: document.getElementById('player-title'),
  playerArtist: document.getElementById('player-artist'),
  playerFavoriteBtn: document.getElementById('player-favorite-btn'),
  timeElapsed: document.getElementById('time-elapsed'),
  timeRemaining: document.getElementById('time-remaining'),
  timelineSlider: document.getElementById('timeline-slider'),
  timelineProgressFill: document.getElementById('timeline-progress-fill'),
  
  // Playback controls
  playerPlayBtn: document.getElementById('player-play-btn'),
  playerPrevBtn: document.getElementById('player-prev-btn'),
  playerNextBtn: document.getElementById('player-next-btn'),
  playerShuffleBtn: document.getElementById('player-shuffle-btn'),
  playerRepeatBtn: document.getElementById('player-repeat-btn'),
  
  // Extra controls
  volumeSlider: document.getElementById('volume-slider'),
  volumeProgressFill: document.getElementById('volume-progress-fill'),
  playerSpeedBtn: document.getElementById('player-speed-btn'),
  playerSleepBtnShortcut: document.getElementById('player-sleep-btn-shortcut'),

  // Visualizer
  visualizerCanvas: document.getElementById('visualizer-canvas'),
  toggleVisualizerCheckbox: document.getElementById('toggle-visualizer-checkbox'),

  // Settings Screen & Modals
  settingWifiTransfer: document.getElementById('setting-wifi-transfer'),
  settingSleepTimer: document.getElementById('setting-sleep-timer'),
  sleepTimerStatus: document.getElementById('sleep-timer-status'),
  storageUsageText: document.getElementById('storage-usage-text'),
  clearDatabaseBtn: document.getElementById('clear-database-btn'),

  // Modal overlays
  modalWifiTransfer: document.getElementById('modal-wifi-transfer'),
  closeWifiModal: document.getElementById('close-wifi-modal'),
  wifiPairingCode: document.getElementById('wifi-pairing-code'),
  wifiStatusInfo: document.getElementById('wifi-status-info'),
  receiverProgressContainer: document.getElementById('receiver-progress-container'),
  transferringFilename: document.getElementById('transferring-filename'),
  receiverProgressFill: document.getElementById('receiver-progress-fill'),
  receiverProgressPercentage: document.getElementById('receiver-progress-percentage'),

  modalSleepTimer: document.getElementById('modal-sleep-timer'),
  closeSleepModal: document.getElementById('close-sleep-modal'),
  customSleepInputWrap: document.getElementById('custom-sleep-input-wrap'),
  customSleepMinutes: document.getElementById('custom-sleep-minutes'),
  applyCustomSleep: document.getElementById('apply-custom-sleep'),

  modalEditMetadata: document.getElementById('modal-edit-metadata'),
  closeEditModal: document.getElementById('close-edit-modal'),
  editSongId: document.getElementById('edit-song-id'),
  editCoverPreview: document.getElementById('edit-cover-preview'),
  uploadCustomCoverBtn: document.getElementById('upload-custom-cover-btn'),
  customCoverInput: document.getElementById('custom-cover-input'),
  editTitle: document.getElementById('edit-title'),
  editArtist: document.getElementById('edit-artist'),
  editAlbum: document.getElementById('edit-album'),
  saveMetadataBtn: document.getElementById('save-metadata-btn'),

  modalCreatePlaylist: document.getElementById('modal-create-playlist'),
  closePlaylistModalBtn: document.getElementById('close-playlist-modal-btn'),
  newPlaylistName: document.getElementById('new-playlist-name'),
  saveNewPlaylistBtn: document.getElementById('save-new-playlist-btn'),

  // Add Songs to Playlist Modal
  playlistAddSongsBtn: document.getElementById('playlist-add-songs-btn'),
  modalAddSongsToPlaylist: document.getElementById('modal-add-songs-to-playlist'),
  closeAddSongsModalBtn: document.getElementById('close-add-songs-modal-btn'),
  addSongsSelectionList: document.getElementById('add-songs-selection-list'),
  savePlaylistSongsBtn: document.getElementById('save-playlist-songs-btn'),

  // Desktop Elements
  mobileView: document.getElementById('mobile-view'),
  desktopView: document.getElementById('desktop-view'),
  desktopPairingState: document.getElementById('desktop-pairing-state'),
  desktopTransferState: document.getElementById('desktop-transfer-state'),
  pCodeInput: document.getElementById('p-code'),
  connectToIphoneBtn: document.getElementById('connect-to-iphone-btn'),
  desktopErrorMessage: document.getElementById('desktop-error-message'),
  disconnectBtn: document.getElementById('disconnect-btn'),
  dropZone: document.getElementById('drop-zone'),
  browseFilesBtn: document.getElementById('browse-files-btn'),
  desktopFileInput: document.getElementById('desktop-file-input'),
  uploadQueueList: document.getElementById('upload-queue-list'),
};

/* ==================================================== */
/* INITIALIZATION                                       */
/* ==================================================== */

async function initApp() {
  // Mode detection: check explicit user preference in localStorage
  const savedViewMode = localStorage.getItem('app-view-mode');
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  if (savedViewMode === 'mobile') {
    isDesktop = false;
  } else if (savedViewMode === 'desktop') {
    isDesktop = true;
  } else {
    isDesktop = !isMobileUA && window.innerWidth >= 768;
  }
  
  if (isDesktop) {
    initDesktopMode();
  } else {
    await initMobileMode();
  }
  
  // Re-initialize Lucide Icons
  createIconsSafe();

  // Register Service Worker for offline capability
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('PWA Service Worker registered:', reg.scope))
      .catch(err => console.error('PWA Service Worker registration failed:', err));
  }
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  initApp();
} else {
  document.addEventListener('DOMContentLoaded', initApp);
}

/* ==================================================== */
/* MOBILE MODE LOGIC                                    */
/* ==================================================== */

async function initMobileMode() {
  els.mobileView.classList.remove('hidden');
  els.desktopView.classList.add('hidden');

  // Load initial data
  await loadSongsFromDB();
  await loadPlaylistsFromDB();
  updateStorageUsageUI();

  // Apply saved theme color
  const savedTheme = localStorage.getItem('theme-color') || 'default';
  applyThemeColor(savedTheme);

  // Initialize Wi-Fi Transfer Receiver for Import Page
  initImportPageReceiver();

  // Initialize Equalizer & Header Segmented Controls
  setupEqualizerListeners();
  setupHeaderAndSegmentListeners();

  // Load first song in the queue to show mini-player by default
  if (allSongs.length > 0) {
    const firstSong = allSongs[0];
    AudioPlayer.setQueue(allSongs, 0, false); // Load but don't autoplay

    // Show mini-player and update its meta
    els.miniPlayer.classList.remove('hidden');
    els.miniPlayerTitle.textContent = firstSong.title;
    els.miniPlayerArtist.textContent = firstSong.artist;

    // Update player main metadata too
    els.playerTitle.textContent = firstSong.title;
    els.playerArtist.textContent = firstSong.artist;
    els.timeElapsed.textContent = '0:00';
    els.timeRemaining.textContent = formatTime(firstSong.duration);

    let coverSrc = defaultCoverSVG;
    if (firstSong.cover) {
      coverSrc = URL.createObjectURL(firstSong.cover);
      els.miniPlayerCover.addEventListener('DOMNodeRemoved', () => URL.revokeObjectURL(coverSrc));
    }
    els.miniPlayerCover.src = coverSrc;
    els.playerAlbumArt.style.backgroundImage = `url("${coverSrc}")`;
    setDynamicBackgroundColors(firstSong.cover);
  }

  // Tab switching setup
  els.tabItems.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.getAttribute('data-tab');
      if (!targetTab) return;

      if (targetTab === 'player') {
        els.nowPlayingSheet.classList.add('active');
        return;
      }

      // Update active nav item
      els.tabItems.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // Close playlist details if clicking playlists tab to bring back to main playlist list
      if (targetTab === 'playlists' && els.playlistDetailsView.classList.contains('active')) {
        els.playlistDetailsView.classList.remove('active');
        els.deletePlaylistBtn.classList.remove('hidden');
      }

      // Show target screen
      els.screens.forEach(screen => {
        screen.classList.remove('active');
        if (screen.id === `screen-${targetTab}`) {
          screen.classList.add('active');
        }
      });

      // Update Header title
      let title = 'Library';
      if (targetTab === 'import') title = 'Wi-Fi Transfer';
      if (targetTab === 'playlists') title = 'Playlists';
      if (targetTab === 'settings') title = 'Pengaturan';
      els.screenTitle.textContent = title;

      // Adjust header buttons
      if (targetTab === 'library') {
        els.addSongBtn.classList.remove('hidden');
      } else {
        els.addSongBtn.classList.add('hidden');
      }
    });
  });

  // Setup Event Listeners
  setupLibraryListeners();
  setupPlaylistListeners();
  setupPlayerListeners();
  setupSettingsListeners();
  setupP2PReceiverListeners();

  // Initialize Web Audio API for visualizer
  AudioPlayer.initVisualizer();
}

/* ==================================================== */
/* LIBRARY MANAGEMENT                                   */
/* ==================================================== */

async function loadSongsFromDB() {
  try {
    allSongs = await window.Storage.getAllSongs();
    filteredSongs = [...allSongs];
    renderSongsList();
    els.songsCount.textContent = allSongs.length;
    
    // Update Favorite count
    const favs = allSongs.filter(s => s.favorite);
    els.favCount.textContent = favs.length;
  } catch (e) {
    console.error('Error loading songs:', e);
  }
}

function renderSongsList(songs = filteredSongs) {
  els.songsList.innerHTML = '';

  if (songs.length === 0) {
    els.songsList.innerHTML = `
      <div class="empty-state">
        <i data-lucide="music" class="empty-icon"></i>
        <p>Tidak ada lagu ditemukan.</p>
        <p class="subtitle">Gunakan Wi-Fi Transfer atau tombol "+" untuk menambahkan lagu baru.</p>
      </div>
    `;
    createIconsSafe();
    return;
  }

  songs.forEach((song, index) => {
    const row = document.createElement('div');
    row.className = 'song-row';
    row.setAttribute('data-id', song.id);

    // Cover Art
    let coverSrc = defaultCoverSVG;
    if (song.cover) {
      const url = URL.createObjectURL(song.cover);
      coverSrc = url;
      // Auto revoke blob URL after element is deleted/garbage collected to prevent memory leak
      row.addEventListener('DOMNodeRemoved', () => URL.revokeObjectURL(url));
    }

    const durationText = formatTime(song.duration);

    row.innerHTML = `
      <div class="song-cover-wrap">
        <img src="${coverSrc}" class="song-cover-img" alt="Cover">
      </div>
      <div class="song-row-meta">
        <div class="song-row-title">${escapeHTML(song.title)}</div>
        <div class="song-row-artist">${escapeHTML(song.artist)}</div>
      </div>
      <div class="song-row-right">
        <span class="song-duration">${durationText}</span>
        <button class="row-action-btn song-options-trigger" data-id="${song.id}">
          <i data-lucide="more-horizontal"></i>
        </button>
      </div>
    `;

    // Row click play
    row.addEventListener('click', (e) => {
      // Don't play if clicking options button
      if (e.target.closest('.row-action-btn')) return;
      
      AudioPlayer.setQueue(songs, index, true);
    });

    els.songsList.appendChild(row);
  });

  createIconsSafe();
  
  // Setup row option trigger handlers
  document.querySelectorAll('.song-options-trigger').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const songId = btn.getAttribute('data-id');
      showSongOptions(songId);
    });
  });
}

function exportSongFile(song) {
  if (!song || !song.file) {
    alert('Berkas lagu tidak ditemukan.');
    return;
  }

  try {
    const blob = song.file;
    const cleanTitle = (song.title || 'Lagu').replace(/[/\\?%*:|"<>]/g, '');
    const cleanArtist = (song.artist || '').replace(/[/\\?%*:|"<>]/g, '');
    const ext = song.file.type && song.file.type.includes('wav') ? '.wav' : (song.file.type && song.file.type.includes('flac') ? '.flac' : '.mp3');
    const fileName = cleanArtist ? `${cleanTitle} - ${cleanArtist}${ext}` : `${cleanTitle}${ext}`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      a.remove();
      URL.revokeObjectURL(url);
    }, 1500);
  } catch (err) {
    console.error('Export error:', err);
    alert('Gagal mengekspor lagu: ' + err.message);
  }
}

function showSongOptions(songId) {
  const song = allSongs.find(s => s.id === Number(songId));
  if (!song) return;

  // We show a clean iOS bottom Action Sheet
  const actionSheet = document.createElement('div');
  actionSheet.className = 'modal-overlay';
  actionSheet.innerHTML = `
    <div class="modal-card glass" style="position: absolute; bottom: 10px; width: calc(100% - 20px); max-width: 400px; animation: slideUpMini 0.3s cubic-bezier(0.16, 1, 0.3, 1);">
      <div class="modal-body" style="padding: 10px;">
        <h3 style="font-size: 14px; text-align: center; padding: 10px 0; border-bottom: 1px solid var(--glass-border); margin-bottom: 10px; color: var(--text-secondary);">${escapeHTML(song.title)}</h3>
        <div style="display: flex; flex-direction: column; gap: 6px;">
          <button id="opt-fav" class="settings-item text-left-align-btn">
            <i data-lucide="heart" class="${song.favorite ? 'heart-icon-fill' : ''}"></i> ${song.favorite ? 'Hapus dari Favorit' : 'Jadikan Favorit'}
          </button>
          <button id="opt-edit" class="settings-item text-left-align-btn">
            <i data-lucide="edit-3"></i> Edit Metadata (Judul/Cover)
          </button>
          <button id="opt-export" class="settings-item text-left-align-btn">
            <i data-lucide="download"></i> Simpan ke Files (Export MP3)
          </button>
          <button id="opt-delete" class="settings-item text-danger text-left-align-btn">
            <i data-lucide="trash-2"></i> Hapus dari Perangkat
          </button>
          <button id="opt-cancel" class="btn-secondary btn-block" style="margin-top: 10px; padding: 12px;">Batal</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(actionSheet);
  createIconsSafe();

  // Handlers
  const closeSheet = () => actionSheet.remove();
  
  actionSheet.addEventListener('click', (e) => {
    if (e.target === actionSheet) closeSheet();
  });

  document.getElementById('opt-cancel').onclick = closeSheet;

  document.getElementById('opt-export').onclick = () => {
    closeSheet();
    exportSongFile(song);
  };

  document.getElementById('opt-fav').onclick = async () => {
    const isFav = await window.Storage.toggleFavorite(songId);
    closeSheet();
    await loadSongsFromDB();
    // Update currently playing if it matches
    const current = AudioPlayer.getCurrentSong();
    if (current && current.id === Number(songId)) {
      current.favorite = isFav;
      updateFavoriteButtonUI(isFav);
    }
  };

  document.getElementById('opt-edit').onclick = () => {
    closeSheet();
    openEditMetadataModal(songId);
  };

  document.getElementById('opt-delete').onclick = async () => {
    if (confirm(`Hapus lagu "${song.title}" secara permanen dari iPhone Anda?`)) {
      await window.Storage.deleteSong(songId);
      closeSheet();
      await loadSongsFromDB();
      // If deleted song was playing, skip it
      const current = AudioPlayer.getCurrentSong();
      if (current && current.id === Number(songId)) {
        AudioPlayer.next();
      }
      updateStorageUsageUI();
    }
  };
}

async function showAddToPlaylistDialog(songId) {
  const playlists = await window.Storage.getAllPlaylists();
  
  const dialog = document.createElement('div');
  dialog.className = 'modal-overlay';
  
  let playlistsOptions = '';
  if (playlists.length === 0) {
    playlistsOptions = '<p class="subtitle text-center" style="padding: 20px 0;">Belum ada playlist kustom. Silakan buat playlist baru terlebih dahulu.</p>';
  } else {
    playlists.forEach(pl => {
      playlistsOptions += `
        <button class="settings-item text-left-align-btn select-playlist-opt" data-pl-id="${pl.id}">
          <i data-lucide="list-music"></i> ${escapeHTML(pl.name)}
        </button>
      `;
    });
  }

  dialog.innerHTML = `
    <div class="modal-card glass">
      <div class="modal-header">
        <h2>Pilih Playlist</h2>
        <button id="close-pl-dialog-btn" class="modal-close-btn">&times;</button>
      </div>
      <div class="modal-body scrollable-modal-body" style="padding: 15px;">
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${playlistsOptions}
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(dialog);
  createIconsSafe();

  const closeDlg = () => dialog.remove();
  document.getElementById('close-pl-dialog-btn').onclick = closeDlg;

  document.querySelectorAll('.select-playlist-opt').forEach(btn => {
    btn.onclick = async () => {
      const plId = btn.getAttribute('data-pl-id');
      await window.Storage.addSongToPlaylist(plId, songId);
      alert('Berhasil ditambahkan ke playlist!');
      closeDlg();
      loadPlaylistsFromDB();
    };
  });
}

function setupLibraryListeners() {
  // Search
  els.librarySearch.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    if (q === '') {
      filteredSongs = [...allSongs];
    } else {
      filteredSongs = allSongs.filter(s => 
        s.title.toLowerCase().includes(q) || 
        s.artist.toLowerCase().includes(q) || 
        s.album.toLowerCase().includes(q)
      );
    }
    renderSongsList();
  });

  // Shuffle play
  els.shufflePlayBtn.addEventListener('click', () => {
    if (allSongs.length === 0) return;
    AudioPlayer.isShuffle = true;
    AudioPlayer.setQueue(allSongs, Math.floor(Math.random() * allSongs.length), true);
    updateShuffleRepeatUI();
  });

  // Manual local upload button (plus in header and upload button)
  const triggerPicker = () => els.nativeSongPicker.click();
  els.addSongBtn.addEventListener('click', triggerPicker);
  els.manualUploadBtn.addEventListener('click', triggerPicker);

  els.nativeSongPicker.addEventListener('change', async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Show indicator
    els.manualUploadBtn.disabled = true;
    els.manualUploadBtn.innerHTML = `<span class="wifi-pulse">Memproses...</span>`;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const metadata = await window.Metadata.parse(file);
        const songData = {
          title: metadata.title,
          artist: metadata.artist,
          album: metadata.album,
          duration: metadata.duration,
          file: file, // Store the raw audio File object (inherits Blob)
          cover: metadata.cover,
          lyrics: metadata.lyrics,
          favorite: false
        };
        await window.Storage.saveSong(songData);
      } catch (err) {
        console.error('Error importing file:', err);
      }
    }

    els.manualUploadBtn.disabled = false;
    els.manualUploadBtn.innerHTML = `<i data-lucide="upload"></i> Upload File`;
    createIconsSafe();

    await loadSongsFromDB();
    updateStorageUsageUI();
    alert(`Berhasil mengimpor ${files.length} lagu ke Library!`);
  });
}

/* ==================================================== */
/* PLAYLISTS MANAGEMENT                                 */
/* ==================================================== */

async function loadPlaylistsFromDB() {
  try {
    const playlists = await window.Storage.getAllPlaylists();
    renderPlaylists(playlists);
  } catch (e) {
    console.error('Error loading playlists:', e);
  }
}

function renderPlaylists(playlists) {
  els.playlistsList.innerHTML = '';
  
  playlists.forEach(pl => {
    // Determine Cover Art
    let coverUrl = '';
    
    if (pl.coverSongId) {
      const coverSong = allSongs.find(s => s.id === pl.coverSongId);
      if (coverSong && coverSong.cover) {
        coverUrl = URL.createObjectURL(coverSong.cover);
      }
    }
    
    if (!coverUrl && pl.songIds.length > 0) {
      const firstSong = allSongs.find(s => s.id === pl.songIds[0]);
      if (firstSong && firstSong.cover) {
        coverUrl = URL.createObjectURL(firstSong.cover);
      }
    }
    
    const hasCover = coverUrl !== '';
    const iconContent = hasCover 
      ? `<img src="${coverUrl}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 12px;">`
      : `<i data-lucide="list-music" class="playlist-icon-pic"></i>`;

    const card = document.createElement('div');
    card.className = 'playlist-card';
    
    if (hasCover) {
      card.addEventListener('DOMNodeRemoved', () => URL.revokeObjectURL(coverUrl));
    }

    card.innerHTML = `
      <div class="playlist-icon-wrap">
        ${iconContent}
      </div>
      <div class="playlist-info">
        <h3>${escapeHTML(pl.name)}</h3>
        <p>${pl.songIds.length} Lagu</p>
      </div>
    `;

    card.addEventListener('click', () => {
      openPlaylistDetails(pl);
    });

    els.playlistsList.appendChild(card);
  });
  
  createIconsSafe();
}

async function openPlaylistDetails(playlist) {
  currentPlaylist = playlist;
  els.playlistDetailsTitle.textContent = playlist.name;
  els.playlistDetailsCount.textContent = `${playlist.songIds.length} Lagu`;
  
  // Hide add songs button for Favorites, show for others
  if (playlist.id === 'favorites') {
    els.playlistAddSongsBtn.parentNode.classList.add('hidden');
  } else {
    els.playlistAddSongsBtn.parentNode.classList.remove('hidden');
  }

  els.playlistSongsList.innerHTML = '';
  
  // Resolve song objects
  const plSongs = [];
  for (const songId of playlist.songIds) {
    const song = await window.Storage.getSong(songId);
    if (song) {
      plSongs.push(song);
    }
  }

  if (plSongs.length === 0) {
    els.playlistSongsList.innerHTML = `
      <div class="empty-state">
        <i data-lucide="music" class="empty-icon"></i>
        <p>Playlist Kosong</p>
        <p class="subtitle">Tambahkan lagu dengan mengetuk tombol "Tambah Lagu" di atas.</p>
      </div>
    `;
    createIconsSafe();
  } else {
    // Render list
    plSongs.forEach((song, index) => {
      const row = document.createElement('div');
      row.className = 'song-row';
      
      let coverSrc = defaultCoverSVG;
      if (song.cover) {
        const url = URL.createObjectURL(song.cover);
        coverSrc = url;
        row.addEventListener('DOMNodeRemoved', () => URL.revokeObjectURL(url));
      }

      row.innerHTML = `
        <div class="song-cover-wrap">
          <img src="${coverSrc}" class="song-cover-img" alt="Cover">
        </div>
        <div class="song-row-meta">
          <div class="song-row-title">${escapeHTML(song.title)}</div>
          <div class="song-row-artist">${escapeHTML(song.artist)}</div>
        </div>
        <div class="song-row-right">
          <span class="song-duration">${formatTime(song.duration)}</span>
          <button class="row-action-btn pl-song-options-trigger" data-song-id="${song.id}">
            <i data-lucide="more-horizontal"></i>
          </button>
        </div>
      `;

      row.addEventListener('click', (e) => {
        if (e.target.closest('.row-action-btn')) return;
        AudioPlayer.setQueue(plSongs, index, true);
      });

      els.playlistSongsList.appendChild(row);
    });

    createIconsSafe();

    // Setup options menu inside playlist
    document.querySelectorAll('.pl-song-options-trigger').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const sid = btn.getAttribute('data-song-id');
        showPlaylistSongOptions(sid);
      };
    });
  }

  els.playlistDetailsView.classList.add('active');
}

function showPlaylistSongOptions(songId) {
  if (!currentPlaylist || currentPlaylist.id === 'favorites') return;
  const song = allSongs.find(s => s.id === Number(songId));
  if (!song) return;

  const actionSheet = document.createElement('div');
  actionSheet.className = 'modal-overlay';
  actionSheet.innerHTML = `
    <div class="modal-card glass" style="position: absolute; bottom: 10px; width: calc(100% - 20px); max-width: 400px; animation: slideUpMini 0.3s cubic-bezier(0.16, 1, 0.3, 1);">
      <div class="modal-body" style="padding: 10px;">
        <h3 style="font-size: 14px; text-align: center; padding: 10px 0; border-bottom: 1px solid var(--glass-border); margin-bottom: 10px; color: var(--text-secondary);">${escapeHTML(song.title)}</h3>
        <div style="display: flex; flex-direction: column; gap: 6px;">
          <button id="pl-opt-cover" class="settings-item text-left-align-btn">
            <i data-lucide="image"></i> Jadikan Cover Playlist
          </button>
          <button id="pl-opt-remove" class="settings-item text-danger text-left-align-btn">
            <i data-lucide="minus-circle"></i> Hapus dari Playlist
          </button>
          <button id="pl-opt-cancel" class="btn-secondary btn-block" style="margin-top: 10px; padding: 12px;">Batal</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(actionSheet);
  createIconsSafe();

  const closeSheet = () => actionSheet.remove();
  
  actionSheet.addEventListener('click', (e) => {
    if (e.target === actionSheet) closeSheet();
  });

  document.getElementById('pl-opt-cancel').onclick = closeSheet;

  // Set cover song
  document.getElementById('pl-opt-cover').onclick = async () => {
    currentPlaylist.coverSongId = Number(songId);
    await window.Storage.updatePlaylist(currentPlaylist);
    closeSheet();
    await openPlaylistDetails(currentPlaylist);
    await loadPlaylistsFromDB();
  };

  // Remove from playlist
  document.getElementById('pl-opt-remove').onclick = async () => {
    const updatedPl = await window.Storage.removeSongFromPlaylist(currentPlaylist.id, songId);
    closeSheet();
    await openPlaylistDetails(updatedPl);
    await loadPlaylistsFromDB();
  };
}

function setupPlaylistListeners() {
  // Favorites playlist card click
  els.favPlaylistCard.onclick = () => {
    const favSongs = allSongs.filter(s => s.favorite);
    openPlaylistDetails({
      id: 'favorites',
      name: 'Lagu Favorit',
      songIds: favSongs.map(s => s.id)
    });
    // Hide delete button for Favorites
    els.deletePlaylistBtn.classList.add('hidden');
  };

  // Open create playlist modal
  els.createPlaylistBtn.onclick = () => {
    els.newPlaylistName.value = '';
    const songSelectionList = document.getElementById('new-playlist-songs-selection');
    const coverSongSelect = document.getElementById('new-playlist-cover-song');
    
    // Reset contents
    songSelectionList.innerHTML = '';
    coverSongSelect.innerHTML = '<option value="">(Gunakan Cover Pertama)</option>';

    if (allSongs.length === 0) {
      songSelectionList.innerHTML = '<p class="subtitle text-center" style="padding:10px 0;font-size:12px;">Belum ada lagu di library Anda.</p>';
    } else {
      allSongs.forEach(song => {
        const item = document.createElement('label');
        item.style.cssText = 'display:flex;align-items:center;gap:10px;padding:6px 0;cursor:pointer;font-size:13px;color:#fff;width:100%;';
        item.innerHTML = `
          <input type="checkbox" class="new-pl-song-checkbox" value="${song.id}" style="width:18px;height:18px;accent-color:var(--primary-color);">
          <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:left;">${escapeHTML(song.title)} - <span style="color:rgba(255,255,255,0.5);">${escapeHTML(song.artist)}</span></span>
        `;
        songSelectionList.appendChild(item);
      });

      // Watch checkbox changes to dynamically update cover selection options
      const updateCoverOptions = () => {
        const selectedCheckboxes = songSelectionList.querySelectorAll('.new-pl-song-checkbox:checked');
        const selectedIds = Array.from(selectedCheckboxes).map(cb => Number(cb.value));
        
        const prevVal = coverSongSelect.value;
        coverSongSelect.innerHTML = '<option value="">(Gunakan Cover Pertama)</option>';

        selectedIds.forEach(id => {
          const song = allSongs.find(s => s.id === id);
          if (song) {
            const opt = document.createElement('option');
            opt.value = song.id;
            opt.textContent = song.title;
            coverSongSelect.appendChild(opt);
          }
        });
        
        coverSongSelect.value = prevVal;
      };

      songSelectionList.querySelectorAll('.new-pl-song-checkbox').forEach(cb => {
        cb.addEventListener('change', updateCoverOptions);
      });
    }

    els.modalCreatePlaylist.classList.remove('hidden');
  };

  els.closePlaylistModalBtn.onclick = () => {
    els.modalCreatePlaylist.classList.add('hidden');
  };

  els.saveNewPlaylistBtn.onclick = async () => {
    const name = els.newPlaylistName.value.trim();
    if (!name) return;

    // Create playlist first
    const plId = await window.Storage.createPlaylist(name);
    
    // Get chosen songs
    const songSelectionList = document.getElementById('new-playlist-songs-selection');
    const checkedBoxes = songSelectionList.querySelectorAll('.new-pl-song-checkbox:checked');
    const songIds = Array.from(checkedBoxes).map(cb => Number(cb.value));

    // Get chosen cover song
    const coverSongSelect = document.getElementById('new-playlist-cover-song');
    const coverSongId = coverSongSelect.value ? Number(coverSongSelect.value) : null;

    // Save songIds and coverSongId
    const playlist = await window.Storage.getPlaylist(plId);
    if (playlist) {
      playlist.songIds = songIds;
      if (coverSongId) {
        playlist.coverSongId = coverSongId;
      }
      await window.Storage.updatePlaylist(playlist);
    }

    els.modalCreatePlaylist.classList.add('hidden');
    await loadPlaylistsFromDB();
  };

  els.closePlaylistDetails.onclick = () => {
    els.playlistDetailsView.classList.remove('active');
    els.deletePlaylistBtn.classList.remove('hidden'); // Restore default
  };

  els.deletePlaylistBtn.onclick = async () => {
    if (!currentPlaylist || currentPlaylist.id === 'favorites') return;

    if (confirm(`Hapus playlist "${currentPlaylist.name}"? Lagu-lagu di dalamnya tidak akan terhapus.`)) {
      await window.Storage.deletePlaylist(currentPlaylist.id);
      els.playlistDetailsView.classList.remove('active');
      loadPlaylistsFromDB();
    }
  };

  // Add Songs Button Click inside playlist detail
  els.playlistAddSongsBtn.onclick = () => {
    if (!currentPlaylist) return;
    openAddSongsToPlaylistModal();
  };

  // Close Selection Modal
  els.closeAddSongsModalBtn.onclick = () => {
    els.modalAddSongsToPlaylist.classList.add('hidden');
  };

  // Save selected songs to playlist
  els.savePlaylistSongsBtn.onclick = async () => {
    if (!currentPlaylist) return;
    const checkedBoxes = els.addSongsSelectionList.querySelectorAll('.pl-song-checkbox:checked');
    const songIdsToAdd = Array.from(checkedBoxes).map(cb => Number(cb.value));

    if (songIdsToAdd.length > 0) {
      currentPlaylist.songIds = [...currentPlaylist.songIds, ...songIdsToAdd];
      await window.Storage.updatePlaylist(currentPlaylist);
      await openPlaylistDetails(currentPlaylist);
      await loadPlaylistsFromDB();
    }
    els.modalAddSongsToPlaylist.classList.add('hidden');
  };
}

async function openAddSongsToPlaylistModal() {
  const selectionList = els.addSongsSelectionList;
  selectionList.innerHTML = '';
  
  // Filter songs that are NOT in the playlist
  const eligibleSongs = allSongs.filter(s => !currentPlaylist.songIds.includes(s.id));
  
  if (eligibleSongs.length === 0) {
    selectionList.innerHTML = '<p class="subtitle text-center" style="padding: 20px 0;">Semua lagu di Library sudah ada di playlist ini.</p>';
    els.savePlaylistSongsBtn.classList.add('hidden');
  } else {
    els.savePlaylistSongsBtn.classList.remove('hidden');
    
    eligibleSongs.forEach(song => {
      const item = document.createElement('label');
      item.className = 'settings-item text-left-align-btn';
      item.style.cursor = 'pointer';
      item.style.display = 'flex';
      item.style.alignItems = 'center';
      item.style.gap = '15px';
      item.style.padding = '12px';
      item.style.marginBottom = '6px';
      
      let coverSrc = defaultCoverSVG;
      if (song.cover) {
        coverSrc = URL.createObjectURL(song.cover);
        item.addEventListener('DOMNodeRemoved', () => URL.revokeObjectURL(coverSrc));
      }

      item.innerHTML = `
        <input type="checkbox" class="pl-song-checkbox" value="${song.id}" style="width: 20px; height: 20px; accent-color: var(--primary-color);">
        <img src="${coverSrc}" style="width: 40px; height: 40px; border-radius: 6px; object-fit: cover; background-color: #111;">
        <div style="flex: 1; overflow: hidden; text-align: left;">
          <div style="font-weight: 600; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 2px;">${escapeHTML(song.title)}</div>
          <div style="font-size: 12px; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHTML(song.artist)}</div>
        </div>
      `;
      selectionList.appendChild(item);
    });
  }
  
  els.modalAddSongsToPlaylist.classList.remove('hidden');
}

/* ==================================================== */
/* AUDIO PLAYER BINDING                                 */
/* ==================================================== */

function setupPlayerListeners() {
  // Trigger slide-up panel
  els.miniPlayerTrigger.onclick = () => {
    els.nowPlayingSheet.classList.add('active');
  };

  els.closeNowPlaying.onclick = () => {
    els.nowPlayingSheet.classList.remove('active');
  };

  // Touch Drag-to-Dismiss Handler for Now Playing Sheet
  const sheet = els.nowPlayingSheet;
  let startY = 0;
  let currentY = 0;
  let isDragging = false;

  if (sheet) {
    sheet.addEventListener('touchstart', (e) => {
      const touchY = e.touches[0].clientY;
      const target = e.target;
      // Don't drag if user is interacting with timeline or volume sliders
      if (target.closest('.waveform-slider') || target.closest('.vol-slider') || target.closest('button')) {
        return;
      }

      // Allow dragging from top 60% of player screen (drag handle, header, album art, title/artist)
      if (touchY < window.innerHeight * 0.65 || target.closest('.drag-handle-wrap') || target.closest('.player-top-header') || target.closest('.album-art-container') || target.closest('.player-meta-centered')) {
        isDragging = true;
        startY = touchY;
        sheet.style.transition = 'none';
      }
    }, { passive: true });

    sheet.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      currentY = e.touches[0].clientY - startY;
      if (currentY > 0) {
        sheet.style.transform = `translateY(${currentY}px)`;
      }
    }, { passive: true });

    sheet.addEventListener('touchend', () => {
      if (!isDragging) return;
      isDragging = false;
      sheet.style.transition = 'transform 0.35s cubic-bezier(0.19, 1, 0.22, 1)';
      if (currentY > 50) {
        sheet.classList.remove('active');
        sheet.style.transform = '';
      } else {
        sheet.style.transform = 'translateY(0)';
      }
      currentY = 0;
    }, { passive: true });
  }

  // Playback control bindings
  const togglePlay = () => AudioPlayer.togglePlay();
  els.miniPlayBtn.onclick = togglePlay;
  els.playerPlayBtn.onclick = togglePlay;

  els.playerNextBtn.onclick = () => AudioPlayer.next();
  els.miniNextBtn.onclick = () => AudioPlayer.next();
  els.playerPrevBtn.onclick = () => AudioPlayer.prev();

  els.playerShuffleBtn.onclick = () => {
    const active = AudioPlayer.toggleShuffle();
    els.playerShuffleBtn.classList.toggle('active', active);
  };

  els.playerRepeatBtn.onclick = () => {
    const mode = AudioPlayer.toggleRepeat();
    updateRepeatBtnUI(mode);
  };

  // Favorite button in full player
  els.playerFavoriteBtn.onclick = async () => {
    const current = AudioPlayer.getCurrentSong();
    if (!current) return;
    const isFav = await window.Storage.toggleFavorite(current.id);
    current.favorite = isFav;
    updateFavoriteButtonUI(isFav);
    await loadSongsFromDB();
  };

  // Timeline Slider Dragging
  els.timelineSlider.addEventListener('input', (e) => {
    const pct = e.target.value;
    const dur = AudioPlayer.audio.duration || 0;
    const seekTime = (pct / 100) * dur;
    els.timeElapsed.textContent = formatTime(seekTime);
    els.timelineProgressFill.style.width = `${pct}%`;
  });

  els.timelineSlider.addEventListener('change', (e) => {
    const pct = e.target.value;
    const dur = AudioPlayer.audio.duration || 0;
    AudioPlayer.seek((pct / 100) * dur);
  });

  // Volume Slider
  els.volumeSlider.addEventListener('input', (e) => {
    const vol = e.target.value;
    AudioPlayer.setVolume(vol / 100);
    els.volumeProgressFill.style.width = `${vol}%`;
  });

  // Sync volume UI on system/bluetooth volume change
  AudioPlayer.audio.addEventListener('volumechange', () => {
    const vol = Math.round(AudioPlayer.audio.volume * 100);
    els.volumeSlider.value = vol;
    els.volumeProgressFill.style.width = `${vol}%`;
  });

  // Speed Control (cycles: 1.0x -> 1.25x -> 1.5x -> 2.0x -> 0.5x)
  const speeds = [1.0, 1.25, 1.5, 2.0, 0.5];
  let speedIdx = 0;
  els.playerSpeedBtn.onclick = () => {
    speedIdx = (speedIdx + 1) % speeds.length;
    const newSpeed = speeds[speedIdx];
    AudioPlayer.setSpeed(newSpeed);
    els.playerSpeedBtn.textContent = `${newSpeed.toFixed(1)}x`;
  };

  // Sleep Timer shortcuts
  const openSleepTimer = () => {
    els.modalSleepTimer.classList.remove('hidden');
  };
  els.playerSleepBtnShortcut.onclick = openSleepTimer;

  // Info Button Shortcut
  const infoBtn = document.getElementById('player-info-btn');
  if (infoBtn) {
    infoBtn.onclick = () => {
      const current = AudioPlayer.getCurrentSong();
      if (!current) {
        alert('Belum ada lagu yang diputar.');
        return;
      }
      showSongInfoModal(current);
    };
  }

  // Volume Mute/Max Toggle Shortcut
  const volBtn = document.getElementById('player-volboost-btn');
  if (volBtn) {
    volBtn.onclick = () => {
      const currentVol = AudioPlayer.audio.volume;
      if (currentVol > 0) {
        AudioPlayer.setVolume(0);
        volBtn.classList.add('muted');
        volBtn.innerHTML = '<i data-lucide="volume-x"></i>';
      } else {
        AudioPlayer.setVolume(1.0);
        volBtn.classList.remove('muted');
        volBtn.innerHTML = '<i data-lucide="volume-2"></i>';
      }
      createIconsSafe();
    };
  }

  // Queue List Sheet Shortcut
  const queueBtn = document.getElementById('player-queue-btn');
  if (queueBtn) {
    queueBtn.onclick = () => {
      showQueueSheet();
    };
  }

  // Options Menu Shortcut on Now Playing Sheet
  const optionsBtn = document.getElementById('player-options-btn');
  if (optionsBtn) {
    optionsBtn.onclick = () => {
      const current = AudioPlayer.getCurrentSong();
      if (current) {
        showSongOptions(current.id);
      }
    };
  }

  // Track player time updates
  AudioPlayer.audio.addEventListener('timeupdate', () => {
    updatePlaybackProgressUI();
  });

  // Handle Play/Pause visual changes
  AudioPlayer.audio.addEventListener('play', () => {
    setPlaybackStateUI(true);
    requestAnimationFrame(renderVisualizerFrame);
  });

  AudioPlayer.audio.addEventListener('pause', () => {
    setPlaybackStateUI(false);
  });

  // Event fired when song starts playing
  AudioPlayer.onSongChange = (song) => {
    // Show mini player
    els.miniPlayer.classList.remove('hidden');
    
    // Update Meta Title & Artists
    els.miniPlayerTitle.textContent = song.title;
    els.miniPlayerArtist.textContent = song.artist;
    els.playerTitle.textContent = song.title;
    els.playerArtist.textContent = song.artist;

    // Favorite status
    updateFavoriteButtonUI(song.favorite);

    // Cover Art
    let coverSrc = defaultCoverSVG;
    if (song.cover) {
      coverSrc = URL.createObjectURL(song.cover);
    }
    
    els.miniPlayerCover.src = coverSrc;
    els.playerAlbumArt.style.backgroundImage = `url("${coverSrc}")`;
    
    // Set dynamic mesh background based on album art colors
    setDynamicBackgroundColors(song.cover);

    // Reset progress
    els.timelineSlider.value = 0;
    els.timelineProgressFill.style.width = '0%';
    els.miniProgressLine.style.width = '0%';
    els.timeElapsed.textContent = '0:00';
    els.timeRemaining.textContent = '-' + formatTime(song.duration || 0);

    // Initial check for shuffle/repeat UI
    updateShuffleRepeatUI();
  };
}

function setPlaybackStateUI(isPlaying) {
  // Update button icons
  const playIcon = '<i data-lucide="play" class="play-icon"></i>';
  const pauseIcon = '<i data-lucide="pause" class="pause-icon"></i>';
  
  els.playerPlayBtn.innerHTML = isPlaying ? pauseIcon : playIcon;
  els.miniPlayBtn.innerHTML = isPlaying ? pauseIcon : playIcon;
  createIconsSafe();

  // Scale album art (iOS effect)
  if (isPlaying) {
    els.playerAlbumArt.classList.remove('paused');
  } else {
    els.playerAlbumArt.classList.add('paused');
  }
}

function updatePlaybackProgressUI() {
  const audio = AudioPlayer.audio;
  const elapsed = audio.currentTime || 0;
  const duration = audio.duration || 0;

  const elapsedInt = Math.floor(elapsed);
  const durationInt = Math.floor(duration);
  const remainingInt = Math.max(0, durationInt - elapsedInt);

  els.timeElapsed.textContent = formatTime(elapsedInt);
  els.timeRemaining.textContent = '-' + formatTime(remainingInt);

  if (duration > 0) {
    const pct = (elapsed / duration) * 100;
    
    // Update sliders if not dragging
    if (document.activeElement !== els.timelineSlider) {
      els.timelineSlider.value = pct;
      if (els.timelineProgressFill) els.timelineProgressFill.style.width = `${pct}%`;
    }
    
    if (els.miniProgressLine) els.miniProgressLine.style.width = `${pct}%`;
  }

  // Draw audio waveform seekbar (Gambar 1)
  drawWaveformTrack();
}

function drawWaveformTrack() {
  const canvas = document.getElementById('waveform-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  const rect = canvas.parentNode.getBoundingClientRect();
  if (rect.width === 0) return;
  canvas.width = rect.width;
  canvas.height = rect.height || 52;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  const audio = AudioPlayer.audio;
  const elapsed = audio.currentTime || 0;
  const duration = audio.duration || 1;
  const progressPct = elapsed / duration;
  
  const barWidth = 2;
  const gap = 2;
  const numBars = Math.floor(canvas.width / (barWidth + gap));
  
  for (let i = 0; i < numBars; i++) {
    const hFactor = Math.abs(Math.sin(i * 12.34 + 5.67) * Math.cos(i * 0.8 + 1.2));
    const barHeight = Math.max(8, hFactor * (canvas.height - 14));
    
    const x = i * (barWidth + gap);
    const y = (canvas.height - barHeight) / 2;
    
    const barPct = i / numBars;
    if (barPct <= progressPct) {
      ctx.fillStyle = '#ffffff';
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    }
    
    ctx.beginPath();
    ctx.roundRect(x, y, barWidth, barHeight, [1]);
    ctx.fill();
  }
}

function updateShuffleRepeatUI() {
  els.playerShuffleBtn.classList.toggle('active', AudioPlayer.isShuffle);
  updateRepeatBtnUI(AudioPlayer.repeatMode);
}

function updateRepeatBtnUI(mode) {
  const icon = els.playerRepeatBtn.querySelector('i');
  
  if (mode === 'none') {
    els.playerRepeatBtn.classList.remove('active');
    els.playerRepeatBtn.innerHTML = '<i data-lucide="repeat"></i>';
  } else if (mode === 'all') {
    els.playerRepeatBtn.classList.add('active');
    els.playerRepeatBtn.innerHTML = '<i data-lucide="repeat"></i>';
  } else if (mode === 'one') {
    els.playerRepeatBtn.classList.add('active');
    els.playerRepeatBtn.innerHTML = '<i data-lucide="repeat-1"></i>';
  }
  
  createIconsSafe();
}

function updateFavoriteButtonUI(isFav) {
  els.playerFavoriteBtn.classList.toggle('active', isFav);
  const icon = els.playerFavoriteBtn.querySelector('i');
  if (isFav) {
    icon.style.fill = 'var(--primary-color)';
  } else {
    icon.style.fill = 'none';
  }
}

/* ==================================================== */
/* DYNAMIC MESH GRADIENT EXTRACTOR                      */
/* ==================================================== */

function setDynamicBackgroundColors(coverBlob) {
  if (!coverBlob) {
    // Reset to default deep pink/purple colors
    document.querySelector('.ball1').style.background = 'radial-gradient(circle, var(--primary-color) 0%, transparent 70%)';
    document.querySelector('.ball2').style.background = 'radial-gradient(circle, #3b226e 0%, transparent 70%)';
    return;
  }

  const img = new Image();
  const url = URL.createObjectURL(coverBlob);
  img.src = url;

  img.onload = () => {
    URL.revokeObjectURL(url);
    
    // Create tiny canvas to sample colors
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 5;
    canvas.height = 5;
    ctx.drawImage(img, 0, 0, 5, 5);

    // Get 3 sample pixels
    const p1 = ctx.getImageData(0, 0, 1, 1).data;
    const p2 = ctx.getImageData(4, 4, 1, 1).data;
    const p3 = ctx.getImageData(2, 2, 1, 1).data;

    // Apply colors to CSS gradient balls
    document.querySelector('.ball1').style.background = `radial-gradient(circle, rgba(${p1[0]}, ${p1[1]}, ${p1[2]}, 0.45) 0%, transparent 70%)`;
    document.querySelector('.ball2').style.background = `radial-gradient(circle, rgba(${p2[0]}, ${p2[1]}, ${p2[2]}, 0.35) 0%, transparent 70%)`;
    document.querySelector('.ball3').style.background = `radial-gradient(circle, rgba(${p3[0]}, ${p3[1]}, ${p3[2]}, 0.3) 0%, transparent 70%)`;
  };
}

/* ==================================================== */
/* EQUALIZER WAVE VISUALIZER (CANVAS)                   */
/* ==================================================== */

function renderVisualizerFrame() {
  if (!isVisualizerEnabled || AudioPlayer.audio.paused) return;

  const canvas = els.visualizerCanvas;
  const ctx = canvas.getContext('2d');
  
  // Fit canvas resolution to parent wrapper size
  const rect = canvas.parentNode.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = 60;

  let analyserData = AudioPlayer.getAnalyserData();
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  
  if (isIOS && isVisualizerEnabled) {
    analyserData = new Uint8Array(32);
    for (let i = 0; i < analyserData.length; i++) {
      // Menghasilkan data random yang elegan agar visualizer tetap berdendang
      analyserData[i] = Math.floor(Math.random() * 150) + 30;
    }
  }
  
  if (!analyserData) {
    // Loop fallback empty drawing
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    requestAnimationFrame(renderVisualizerFrame);
    return;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const barWidth = (canvas.width / analyserData.length) * 1.5;
  let barHeight;
  let x = 0;

  // Draw double sided mirrored visualizer bars
  for (let i = 0; i < analyserData.length; i++) {
    // Scale data range (0-255) to canvas height
    barHeight = (analyserData[i] / 255) * canvas.height * 0.8;

    // Gradient Pelangi Gambar 1 (Merah di atas -> Oranye -> Kuning -> Hijau di bawah)
    const grad = ctx.createLinearGradient(0, canvas.height, 0, 0);
    grad.addColorStop(0, '#30d158');   // Green bottom
    grad.addColorStop(0.35, '#ffd60a'); // Yellow
    grad.addColorStop(0.7, '#ff9f0a');  // Orange
    grad.addColorStop(1, '#ff453a');    // Red top
    
    ctx.fillStyle = grad;
    
    // Draw bar
    const roundY = canvas.height - barHeight;
    ctx.beginPath();
    ctx.roundRect(x + 1, roundY, Math.max(2, barWidth - 2), barHeight, [2, 2, 0, 0]);
    ctx.fill();

    x += barWidth;
  }

  requestAnimationFrame(renderVisualizerFrame);
}

/* ==================================================== */
/* SETTINGS & MODALS HANDLERS                           */
/* ==================================================== */

function setupSettingsListeners() {
  // WiFi Transfer
  els.settingWifiTransfer.onclick = () => {
    openWifiModal();
  };

  // Sleep Timer Selection
  els.settingSleepTimer.onclick = () => {
    els.modalSleepTimer.classList.remove('hidden');
  };

  els.closeSleepModal.onclick = () => {
    els.modalSleepTimer.classList.add('hidden');
    els.customSleepInputWrap.classList.add('hidden');
  };

  document.querySelectorAll('.sleep-option').forEach(btn => {
    btn.onclick = () => {
      const min = btn.getAttribute('data-minutes');
      
      if (min === 'custom') {
        els.customSleepInputWrap.classList.remove('hidden');
      } else {
        setSleepTimer(parseInt(min));
      }
    };
  });

  els.applyCustomSleep.onclick = () => {
    const val = parseInt(els.customSleepMinutes.value);
    if (val > 0) {
      setSleepTimer(val);
    }
  };

  // Toggle Visualizer Checkbox
  els.toggleVisualizerCheckbox.addEventListener('change', (e) => {
    isVisualizerEnabled = e.target.checked;
    els.visualizerStatus.textContent = isVisualizerEnabled ? 'Aktif (Efek Gelombang)' : 'Nonaktif';
    if (isVisualizerEnabled) {
      els.visualizerCanvas.classList.remove('hidden');
      requestAnimationFrame(renderVisualizerFrame);
    } else {
      els.visualizerCanvas.classList.add('hidden');
    }
  });

  // Handle Theme Dot clicks
  document.querySelectorAll('.theme-dot').forEach(dot => {
    dot.onclick = () => {
      const theme = dot.getAttribute('data-theme');
      localStorage.setItem('theme-color', theme);
      applyThemeColor(theme);
    };
  });

  // Clear Storage Database
  els.clearDatabaseBtn.onclick = async () => {
    if (confirm('APAKAH ANDA YAKIN? Semua lagu yang diimpor dan playlist akan dihapus permanen dari perangkat iPhone Anda!')) {
      await window.Storage.clearAllData();
      alert('Semua data berhasil dibersihkan.');
      location.reload();
    }
  };
}

function applyThemeColor(themeName) {
  const themes = {
    default: { primary: '#ff2d55', glow: 'rgba(255, 45, 85, 0.35)' },
    purple: { primary: '#af52de', glow: 'rgba(175, 82, 222, 0.35)' },
    blue: { primary: '#007aff', glow: 'rgba(0, 122, 255, 0.35)' },
    green: { primary: '#34c759', glow: 'rgba(52, 199, 89, 0.35)' },
    orange: { primary: '#ff9500', glow: 'rgba(255, 149, 0, 0.35)' }
  };
  const activeTheme = themes[themeName] || themes.default;
  document.documentElement.style.setProperty('--primary-color', activeTheme.primary);
  document.documentElement.style.setProperty('--primary-color-glow', activeTheme.glow);
  
  // Highlight active dot
  document.querySelectorAll('.theme-dot').forEach(dot => {
    if (dot.getAttribute('data-theme') === themeName) {
      dot.classList.add('active');
      dot.style.borderColor = '#ffffff';
    } else {
      dot.classList.remove('active');
      dot.style.borderColor = 'transparent';
    }
  });
}

function setupEqualizerListeners() {
  const eqModal = document.getElementById('modal-equalizer');
  const closeEqBtn = document.getElementById('close-eq-modal');
  const playerEqBtn = document.getElementById('player-eq-btn');
  const settingEqBtn = document.getElementById('setting-visualizer');

  const openEqModal = () => {
    AudioPlayer.initVisualizer();
    if (eqModal) eqModal.classList.remove('hidden');
  };

  if (playerEqBtn) playerEqBtn.onclick = openEqModal;
  if (settingEqBtn) settingEqBtn.onclick = openEqModal;
  if (closeEqBtn) closeEqBtn.onclick = () => eqModal.classList.add('hidden');

  // Preset Buttons
  document.querySelectorAll('.eq-preset-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.eq-preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const preset = btn.getAttribute('data-preset');
      AudioPlayer.setEQPreset(preset);

      // Update slider positions
      const currentGains = AudioPlayer.eqBandGains || [0,0,0,0,0];
      currentGains.forEach((gain, i) => {
        const slider = document.getElementById(`eq-band-${i}`);
        const gainLbl = document.getElementById(`eq-gain-${i}`);
        if (slider) slider.value = gain;
        if (gainLbl) gainLbl.textContent = `${gain >= 0 ? '+' : ''}${gain} dB`;
      });
    };
  });

  // Manual 5-Band Sliders
  [0, 1, 2, 3, 4].forEach(i => {
    const slider = document.getElementById(`eq-band-${i}`);
    const gainLbl = document.getElementById(`eq-gain-${i}`);
    if (slider) {
      slider.oninput = (e) => {
        const val = parseInt(e.target.value);
        if (gainLbl) gainLbl.textContent = `${val >= 0 ? '+' : ''}${val} dB`;

        // Switch active preset button to Custom
        document.querySelectorAll('.eq-preset-btn').forEach(b => b.classList.remove('active'));

        const currentGains = AudioPlayer.eqBandGains ? [...AudioPlayer.eqBandGains] : [0,0,0,0,0];
        currentGains[i] = val;
        AudioPlayer.setEQBands(currentGains);
      };
    }
  });
}

function showSongInfoModal(song) {
  if (!song) return;
  const fileSizeMB = song.file ? (song.file.size / (1024 * 1024)).toFixed(2) : '-';
  const fileType = song.file ? (song.file.type || 'audio/mpeg') : 'Audio';

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-card glass" style="max-width: 380px;">
      <div class="modal-header">
        <h2>Informasi Lagu</h2>
        <button id="close-info-modal-btn" class="modal-close-btn">&times;</button>
      </div>
      <div class="modal-body" style="padding: 15px; display: flex; flex-direction: column; gap: 10px; font-size: 14px;">
        <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--glass-border); padding-bottom:8px;">
          <span style="color:var(--text-secondary);">Judul:</span>
          <span style="font-weight:600; text-align:right;">${escapeHTML(song.title)}</span>
        </div>
        <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--glass-border); padding-bottom:8px;">
          <span style="color:var(--text-secondary);">Artis:</span>
          <span style="font-weight:500; text-align:right;">${escapeHTML(song.artist)}</span>
        </div>
        <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--glass-border); padding-bottom:8px;">
          <span style="color:var(--text-secondary);">Album:</span>
          <span style="font-weight:500; text-align:right;">${escapeHTML(song.album || '-')}</span>
        </div>
        <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--glass-border); padding-bottom:8px;">
          <span style="color:var(--text-secondary);">Durasi:</span>
          <span style="font-weight:500; text-align:right;">${formatTime(song.duration)}</span>
        </div>
        <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--glass-border); padding-bottom:8px;">
          <span style="color:var(--text-secondary);">Ukuran Berkas:</span>
          <span style="font-weight:500; text-align:right;">${fileSizeMB} MB</span>
        </div>
        <div style="display:flex; justify-content:space-between; padding-bottom:4px;">
          <span style="color:var(--text-secondary);">Format Audio:</span>
          <span style="font-weight:500; text-align:right;">${fileType}</span>
        </div>
        <button id="close-info-btn-action" class="btn-primary btn-block" style="margin-top: 10px;">Tutup</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  const close = () => modal.remove();
  document.getElementById('close-info-modal-btn').onclick = close;
  document.getElementById('close-info-btn-action').onclick = close;
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
}

function showQueueSheet() {
  const queue = AudioPlayer.queue || [];
  const currentIdx = AudioPlayer.currentIndex;

  const sheet = document.createElement('div');
  sheet.className = 'modal-overlay';

  let queueItemsHTML = '';
  if (queue.length === 0) {
    queueItemsHTML = '<p class="subtitle text-center" style="padding:20px 0;">Daftar putar kosong.</p>';
  } else {
    queue.forEach((song, idx) => {
      const isCurrent = idx === currentIdx;
      queueItemsHTML += `
        <div class="song-row queue-item-row" data-idx="${idx}" style="padding:8px 12px; border-radius:10px; cursor:pointer; background:${isCurrent ? 'rgba(255,45,85,0.15)' : 'transparent'}; border:${isCurrent ? '1px solid var(--primary-color)' : 'none'}; margin-bottom:4px;">
          <div style="flex:1; overflow:hidden;">
            <div style="font-weight:${isCurrent ? '700' : '500'}; color:${isCurrent ? 'var(--primary-color)' : '#fff'}; font-size:14px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              ${isCurrent ? '▶ ' : ''}${escapeHTML(song.title)}
            </div>
            <div style="font-size:12px; color:var(--text-secondary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHTML(song.artist)}</div>
          </div>
          <span style="font-size:12px; color:var(--text-secondary);">${formatTime(song.duration)}</span>
        </div>
      `;
    });
  }

  sheet.innerHTML = `
    <div class="modal-card glass" style="position: absolute; bottom: 10px; width: calc(100% - 20px); max-width: 400px; max-height: 450px; display: flex; flex-direction: column; animation: slideUpMini 0.3s cubic-bezier(0.16, 1, 0.3, 1);">
      <div class="modal-header">
        <h2>Daftar Putar (${queue.length})</h2>
        <button id="close-queue-sheet-btn" class="modal-close-btn">&times;</button>
      </div>
      <div class="modal-body scrollable-modal-body" style="padding: 10px; overflow-y: auto; flex: 1;">
        <div style="display: flex; flex-direction: column;">
          ${queueItemsHTML}
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(sheet);

  const close = () => sheet.remove();
  document.getElementById('close-queue-sheet-btn').onclick = close;
  sheet.addEventListener('click', (e) => { if (e.target === sheet) close(); });

  sheet.querySelectorAll('.queue-item-row').forEach(row => {
    row.onclick = () => {
      const idx = Number(row.getAttribute('data-idx'));
      AudioPlayer.playIndex(idx);
      close();
    };
  });
}

function showQuickMenuSheet() {
  const sheet = document.createElement('div');
  sheet.className = 'modal-overlay';
  sheet.innerHTML = `
    <div class="modal-card glass" style="position: absolute; bottom: 10px; width: calc(100% - 20px); max-width: 400px; animation: slideUpMini 0.3s cubic-bezier(0.16, 1, 0.3, 1);">
      <div class="modal-body" style="padding: 10px;">
        <h3 style="font-size: 14px; text-align: center; padding: 10px 0; border-bottom: 1px solid var(--glass-border); margin-bottom: 10px; color: var(--text-secondary);">Menu Akses Cepat</h3>
        <div style="display: flex; flex-direction: column; gap: 6px;">
          <button id="qm-wifi" class="settings-item text-left-align-btn">
            <i data-lucide="wifi"></i> Wi-Fi Transfer
          </button>
          <button id="qm-upload" class="settings-item text-left-align-btn">
            <i data-lucide="upload"></i> Import File dari iPhone (Files)
          </button>
          <button id="qm-playlists" class="settings-item text-left-align-btn">
            <i data-lucide="list-music"></i> Kelola Playlist
          </button>
          <button id="qm-settings" class="settings-item text-left-align-btn">
            <i data-lucide="settings"></i> Pengaturan Aplikasi
          </button>
          <button id="qm-desktop" class="settings-item text-left-align-btn" style="color: var(--primary-color);">
            <i data-lucide="laptop"></i> Mode Kirim File dari PC (Laptop)
          </button>
          <button id="qm-cancel" class="btn-secondary btn-block" style="margin-top: 10px; padding: 12px;">Batal</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(sheet);
  createIconsSafe();

  const close = () => sheet.remove();
  sheet.addEventListener('click', (e) => { if (e.target === sheet) close(); });
  document.getElementById('qm-cancel').onclick = close;

  document.getElementById('qm-wifi').onclick = () => {
    close();
    openWifiModal();
  };
  document.getElementById('qm-upload').onclick = () => {
    close();
    els.nativeSongPicker.value = '';
    els.nativeSongPicker.click();
  };
  document.getElementById('qm-playlists').onclick = () => {
    close();
    const tab = document.querySelector('.tab-item[data-tab="playlists"]');
    if (tab) tab.click();
  };
  document.getElementById('qm-settings').onclick = () => {
    close();
    const tab = document.querySelector('.tab-item[data-tab="settings"]');
    if (tab) tab.click();
  };
  document.getElementById('qm-desktop').onclick = () => {
    close();
    localStorage.setItem('app-view-mode', 'desktop');
    location.reload();
  };
}

function setupHeaderAndSegmentListeners() {
  const searchBtn = document.getElementById('header-search-trigger');
  const searchWrap = document.getElementById('search-bar-wrap');
  if (searchBtn && searchWrap) {
    searchBtn.onclick = () => {
      searchWrap.classList.toggle('hidden');
      if (!searchWrap.classList.contains('hidden')) {
        const input = document.getElementById('library-search');
        if (input) input.focus();
      }
    };
  }

  // Header quick menu trigger
  const menuBtn = document.getElementById('header-menu-trigger');
  if (menuBtn) {
    menuBtn.onclick = () => {
      showQuickMenuSheet();
    };
  }

  // Mini player rewind button
  const miniPrevBtn = document.getElementById('mini-prev-btn');
  if (miniPrevBtn) {
    miniPrevBtn.onclick = (e) => {
      e.stopPropagation();
      AudioPlayer.prev();
    };
  }

  // Segmented control (Songs | Artists | Albums)
  document.querySelectorAll('.segment-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.segment-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const segment = btn.getAttribute('data-segment');
      if (segment === 'songs') {
        renderSongsList(allSongs);
      } else if (segment === 'artists') {
        const sorted = [...allSongs].sort((a,b) => (a.artist || '').localeCompare(b.artist || ''));
        renderSongsList(sorted);
      } else if (segment === 'albums') {
        const sorted = [...allSongs].sort((a,b) => (a.album || '').localeCompare(b.album || ''));
        renderSongsList(sorted);
      }
    };
  });
}

function setSleepTimer(minutes) {
  els.modalSleepTimer.classList.add('hidden');
  els.customSleepInputWrap.classList.add('hidden');

  AudioPlayer.initVisualizer(); // ensure audio context is active
  
  AudioPlayer.setSleepTimer(minutes, (secondsLeft) => {
    if (secondsLeft <= 0) {
      els.sleepTimerStatus.textContent = 'Mati';
      els.playerSleepBtnShortcut.classList.remove('active');
    } else {
      const m = Math.floor(secondsLeft / 60);
      const s = secondsLeft % 60;
      const display = `${m}:${s.toString().padStart(2, '0')}`;
      els.sleepTimerStatus.textContent = `Aktif (${display})`;
      els.playerSleepBtnShortcut.classList.add('active');
    }
  });
}

async function updateStorageUsageUI() {
  try {
    const { usedMB, totalMB } = await window.Storage.getStorageUsage();
    els.storageUsageText.textContent = `Digunakan: ${usedMB} MB / Quota: ${totalMB} MB`;
  } catch (e) {
    console.error('Failed to get storage usage:', e);
  }
}

/* ==================================================== */
/* METADATA EDITOR MODAL                                */
/* ==================================================== */

async function openEditMetadataModal(songId) {
  const song = await window.Storage.getSong(songId);
  if (!song) return;

  els.editSongId.value = song.id;
  els.editTitle.value = song.title;
  els.editArtist.value = song.artist;
  els.editAlbum.value = song.album;

  // Cover image Preview
  let coverSrc = defaultCoverSVG;
  if (song.cover) {
    coverSrc = URL.createObjectURL(song.cover);
  }
  els.editCoverPreview.src = coverSrc;

  // Show Modal
  els.modalEditMetadata.classList.remove('hidden');

  // Trigger file upload picker for cover
  els.uploadCustomCoverBtn.onclick = () => {
    els.customCoverInput.value = '';
    els.customCoverInput.click();
  };

  // Store temporary new cover blob
  let newCoverBlob = null;
  els.customCoverInput.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
      newCoverBlob = file;
      els.editCoverPreview.src = URL.createObjectURL(file);
    }
  };

  els.closeEditModal.onclick = () => {
    els.modalEditMetadata.classList.add('hidden');
    if (song.cover && coverSrc.startsWith('blob:')) {
      URL.revokeObjectURL(coverSrc);
    }
  };

  // Save metadata
  els.saveMetadataBtn.onclick = async () => {
    song.title = els.editTitle.value.trim() || song.title;
    song.artist = els.editArtist.value.trim() || song.artist;
    song.album = els.editAlbum.value.trim() || song.album;

    if (newCoverBlob) {
      song.cover = newCoverBlob;
    }

    await window.Storage.updateSong(song);
    els.modalEditMetadata.classList.add('hidden');
    
    // Reload Library
    await loadSongsFromDB();

    // If edited song is playing, update currently playing info
    const current = AudioPlayer.getCurrentSong();
    if (current && current.id === song.id) {
      AudioPlayer.onSongChange(song);
    }
  };
}

/* ==================================================== */
/* WIFI P2P TRANSFER (RECEIVER ON IPHONE)               */
/* ==================================================== */

function initImportPageReceiver() {
  const codeEl = document.getElementById('import-pairing-code');
  const statusEl = document.getElementById('import-status-info');
  const progressCard = document.getElementById('import-progress-card');
  const songNameEl = document.getElementById('import-transferring-filename');
  const sizeTextEl = document.getElementById('import-receiver-size-text');
  const pctEl = document.getElementById('import-receiver-pct');
  const fillEl = document.getElementById('import-progress-fill');
  const doneContainer = document.getElementById('import-done-container');
  const doneItems = document.getElementById('import-done-items');
  const pickFileBtn = document.getElementById('import-pick-file-btn');

  if (pickFileBtn) {
    pickFileBtn.onclick = () => {
      els.nativeSongPicker.value = '';
      els.nativeSongPicker.click();
    };
  }

  if (!codeEl) return;

  statusEl.innerHTML = '<span class="status-dot dot-waiting"></span> Menghubungkan ke server signaling...';

  window.TransferManager.startReceiver(
    // 1. Code ready
    (code) => {
      codeEl.textContent = `${code.substring(0,3)} ${code.substring(3)}`;
      statusEl.innerHTML = '<span class="status-dot dot-waiting"></span> Menunggu sambungan dari laptop...';
    },
    // 2. Connected
    () => {
      statusEl.innerHTML = '<span class="status-dot dot-connected"></span> Laptop Tersambung! Siap menerima lagu...';
    },
    // 3. File received (fully assembled)
    async (file) => {
      if (progressCard) progressCard.classList.add('hidden');
      statusEl.innerHTML = '<span class="status-dot dot-connected"></span> Memproses & menyimpan lagu...';

      try {
        const metadata = await window.Metadata.parse(file);
        const songData = {
          title: metadata.title,
          artist: metadata.artist,
          album: metadata.album,
          duration: metadata.duration,
          file: file,
          cover: metadata.cover,
          lyrics: metadata.lyrics,
          favorite: false
        };
        await window.Storage.saveSong(songData);
        await loadSongsFromDB();
        updateStorageUsageUI();

        // Send 'saved' acknowledgment back to laptop
        if (window.TransferManager.connection && window.TransferManager.connection.open) {
          window.TransferManager.connection.send({ type: 'saved', name: file.name });
        }

        // Add item to history list in Import page
        if (doneContainer && doneItems) {
          doneContainer.classList.remove('hidden');
          const item = document.createElement('div');
          item.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.07);font-size:13px;color:#fff;';
          item.innerHTML = `<span style="color:#30d158;font-weight:bold;">✓</span> <span style="flex:1;text-align:left;font-weight:500;">${escapeHTML(metadata.title || file.name.replace(/\.[^.]+$/,''))}</span> <span style="font-size:11px;color:rgba(255,255,255,0.5);">${(file.size / (1024*1024)).toFixed(1)} MB</span>`;
          doneItems.insertBefore(item, doneItems.firstChild);
        }

        statusEl.innerHTML = '<span class="status-dot dot-connected"></span> Tersimpan! Siap menerima lagu berikutnya.';
      } catch (err) {
        console.error('Error saving received file:', err);
        statusEl.innerHTML = '<span class="status-dot dot-waiting"></span> Gagal memproses lagu.';
      }
    },
    // 4. File progress
    (percentage, fileName, totalSize, coverBase64, queueCount) => {
      if (percentage === -1) {
        if (progressCard) progressCard.classList.add('hidden');
        statusEl.innerHTML = `<span class="status-dot dot-connected"></span> Selesai! Berhasil mengimpor ${queueCount} lagu.`;
        alert(`🎉 Transfer Selesai!\nBerhasil mengimpor ${queueCount} lagu baru ke Library.`);
        return;
      }

      if (percentage === -2) {
        if (progressCard) progressCard.classList.add('hidden');
        statusEl.innerHTML = `<span class="status-dot dot-waiting"></span> WiFi Terputus! Silakan hubungkan kembali.`;
        alert(`❌ WiFi Terputus!\nKoneksi ke laptop terputus secara tiba-tiba.`);
        return;
      }

      if (progressCard) progressCard.classList.remove('hidden');
      if (songNameEl) songNameEl.textContent = fileName ? fileName.replace(/\.[^.]+$/, '') : 'Lagu...';

      // Update Cover art thumbnail
      const songArtEl = document.getElementById('import-song-art');
      if (songArtEl) {
        if (coverBase64) {
          songArtEl.innerHTML = `<img src="${coverBase64}" style="width:100%;height:100%;object-fit:cover;border-radius:6px;" alt="cover">`;
        } else {
          songArtEl.innerHTML = `<i data-lucide="music" style="width:24px;height:24px;color:var(--primary-color);"></i>`;
          createIconsSafe();
        }
      }

      if (sizeTextEl && totalSize) {
        const receivedMB = ((totalSize * percentage / 100) / (1024 * 1024)).toFixed(1);
        const totalMB = (totalSize / (1024 * 1024)).toFixed(1);
        sizeTextEl.textContent = `${receivedMB} MB / ${totalMB} MB`;
      }

      if (fillEl) fillEl.style.width = `${percentage}%`;
      if (pctEl) pctEl.textContent = `${percentage}%`;
    },
    // 5. Error
    (errText) => {
      statusEl.innerHTML = `<span class="text-danger">Koneksi terputus: ${errText}</span>`;
      if (progressCard) progressCard.classList.add('hidden');
    }
  );
}

function openWifiModal() {
  initImportPageReceiver();
}

function setupP2PReceiverListeners() {
  // Handled by initImportPageReceiver
}


/* ==================================================== */
/* DESKTOP MODE LOGIC (LAPTOP SENDER)                   */
/* ==================================================== */

let activeConnectionCode = '';
let filesToSendQueue = [];
let isSendingFile = false;

function initDesktopMode() {
  els.mobileView.classList.add('hidden');
  els.desktopView.classList.remove('hidden');

  setupDesktopListeners();
}

function setupDesktopListeners() {
  const switchMobileBtn = document.getElementById('switch-to-mobile-btn');
  if (switchMobileBtn) {
    switchMobileBtn.onclick = () => {
      localStorage.setItem('app-view-mode', 'mobile');
      location.reload();
    };
  }

  // Form Connection Click
  els.connectToIphoneBtn.onclick = () => {
    const rawCode = els.pCodeInput.value.replace(/\s+/g, '');
    if (rawCode.length !== 6 || isNaN(rawCode)) {
      showDesktopError('Kode harus berupa 6 digit angka.');
      return;
    }

    hideDesktopError();
    els.connectToIphoneBtn.disabled = true;
    els.connectToIphoneBtn.textContent = 'Menghubungkan...';

    // Start PeerJS sender
    window.TransferManager.startSender(
      rawCode,
      // Connected success callback
      () => {
        activeConnectionCode = rawCode;
        els.desktopPairingState.classList.remove('active');
        els.desktopPairingState.classList.add('hidden');
        els.desktopTransferState.classList.remove('hidden');
        createIconsSafe();
      },
      // Transfer progress feedback (acknowledged from iPhone)
      (percentage) => {
        // Updated inside send file loop
      },
      // Disconnect callback
      () => {
        resetDesktopUI();
        alert('Koneksi ke iPhone terputus.');
      },
      // Connection error callback
      (errText) => {
        showDesktopError(errText);
        els.connectToIphoneBtn.disabled = false;
        els.connectToIphoneBtn.textContent = 'Hubungkan ke iPhone';
      }
    );
  };

  // Disconnect button
  els.disconnectBtn.onclick = () => {
    window.TransferManager.stop();
    resetDesktopUI();
  };

  // Drag-and-drop Events
  const dragEvents = ['dragenter', 'dragover', 'dragleave', 'drop'];
  dragEvents.forEach(evtName => {
    els.dropZone.addEventListener(evtName, (e) => {
      e.preventDefault();
      e.stopPropagation();
    }, false);
  });

  els.dropZone.addEventListener('dragenter', () => els.dropZone.classList.add('highlight'));
  els.dropZone.addEventListener('dragover', () => els.dropZone.classList.add('highlight'));
  els.dropZone.addEventListener('dragleave', () => els.dropZone.classList.remove('highlight'));
  els.dropZone.addEventListener('drop', (e) => {
    els.dropZone.classList.remove('highlight');
    const dt = e.dataTransfer;
    const files = dt.files;
    handleDroppedFiles(files);
  });

  // Manual browse files click
  els.browseFilesBtn.onclick = () => els.desktopFileInput.click();
  els.desktopFileInput.onchange = (e) => {
    handleDroppedFiles(e.target.files);
  };
}

function resetDesktopUI() {
  els.desktopPairingState.classList.remove('hidden');
  els.desktopPairingState.classList.add('active');
  els.desktopTransferState.classList.add('hidden');
  els.connectToIphoneBtn.disabled = false;
  els.connectToIphoneBtn.textContent = 'Hubungkan ke iPhone';
  els.pCodeInput.value = '';
  els.uploadQueueList.innerHTML = '<div class="queue-empty-state">Belum ada file yang ditransfer.</div>';
  filesToSendQueue = [];
  isSendingFile = false;
  activeConnectionCode = '';
}

function showDesktopError(msg) {
  els.desktopErrorMessage.textContent = msg;
  els.desktopErrorMessage.classList.remove('hidden');
}

function hideDesktopError() {
  els.desktopErrorMessage.classList.add('hidden');
}

function handleDroppedFiles(files) {
  if (!files || files.length === 0) return;

  const audioFiles = Array.from(files).filter(f => f.type.startsWith('audio/') || /\.(mp3|m4a|flac|wav|ogg|aac)$/i.test(f.name));
  if (audioFiles.length === 0) {
    alert('Format file salah! Hanya seret file musik (.mp3, .m4a, .flac, .wav).');
    return;
  }

  // Clear empty state
  const empty = els.uploadQueueList.querySelector('.queue-empty-state');
  if (empty) empty.remove();

  audioFiles.forEach(file => {
    const queueId = `q-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
    filesToSendQueue.push({ id: queueId, file });

    const cleanName = file.name.replace(/\.[^.]+$/, '');
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);

    const card = document.createElement('div');
    card.className = 'upload-card';
    card.id = queueId;
    card.innerHTML = `
      <div class="upload-card-art" id="art-${queueId}">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
      </div>
      <div class="upload-card-body">
        <div class="upload-card-top">
          <span class="upload-card-name" title="${escapeHTML(file.name)}">${escapeHTML(cleanName)}</span>
          <span class="upload-card-status status-waiting" id="status-${queueId}">Menunggu</span>
        </div>
        <div class="upload-card-progress-bar hidden" id="bar-wrap-${queueId}">
          <div class="upload-card-bar-fill" id="bar-${queueId}" style="width:0%"></div>
        </div>
        <div class="upload-card-meta">
          <span id="detail-${queueId}">${fileSizeMB} MB</span>
        </div>
      </div>
    `;
    els.uploadQueueList.appendChild(card);

    // Extract album art thumbnail
    if (typeof jsmediatags !== 'undefined') {
      try {
        jsmediatags.read(file, {
          onSuccess: (tag) => {
            if (tag.tags && tag.tags.picture) {
              try {
                const { data, format } = tag.tags.picture;
                const blob = new Blob([new Uint8Array(data)], { type: format });
                const url = URL.createObjectURL(blob);
                const artEl = document.getElementById(`art-${queueId}`);
                if (artEl) {
                  artEl.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;border-radius:6px;" alt="cover">`;
                }
              } catch(e) {}
            }
          },
          onError: () => {}
        });
      } catch(e) {}
    }
  });

  updateQueueSummary();
  processUploadQueue();
}

function updateQueueSummary() {
  const summaryEl = document.getElementById('queue-summary');
  if (!summaryEl) return;
  const total = els.uploadQueueList.querySelectorAll('.upload-card').length;
  const done = els.uploadQueueList.querySelectorAll('.status-done').length;
  summaryEl.textContent = total > 0 ? `${done}/${total} selesai` : '';
}

function getCoverBase64Promise(file) {
  return new Promise((resolve) => {
    if (typeof jsmediatags === 'undefined') {
      resolve(null);
      return;
    }
    try {
      jsmediatags.read(file, {
        onSuccess: (tag) => {
          if (tag.tags && tag.tags.picture) {
            try {
              const { data, format } = tag.tags.picture;
              const byteArray = new Uint8Array(data);
              const blob = new Blob([byteArray], { type: format });
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.readAsDataURL(blob);
            } catch (e) {
              resolve(null);
            }
          } else {
            resolve(null);
          }
        },
        onError: () => resolve(null)
      });
    } catch (e) {
      resolve(null);
    }
  });
}

async function processUploadQueue() {
  if (isSendingFile || filesToSendQueue.length === 0) {
    // Jika antrean kosong dan proses baru selesai, kirim notifikasi selesai ke iPhone
    if (filesToSendQueue.length === 0) {
      const totalDone = els.uploadQueueList.querySelectorAll('.status-done').length;
      if (totalDone > 0 && window.TransferManager.connection && window.TransferManager.connection.open) {
        window.TransferManager.connection.send({ type: 'queue_complete', count: totalDone });
      }
    }
    return;
  }

  isSendingFile = true;
  const current = filesToSendQueue[0];
  const { id: queueId, file } = current;

  const statusEl = document.getElementById(`status-${queueId}`);
  const barWrap = document.getElementById(`bar-wrap-${queueId}`);
  const barFill = document.getElementById(`bar-${queueId}`);
  const detailEl = document.getElementById(`detail-${queueId}`);
  const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
  const startTime = Date.now();

  const coverBase64 = await getCoverBase64Promise(file);

  try {
    if (statusEl) { statusEl.textContent = 'Memulai...'; statusEl.className = 'upload-card-status status-uploading'; }
    if (barWrap) barWrap.classList.remove('hidden');

    await window.TransferManager.sendFile(file, (percentage) => {
      const elapsedSec = (Date.now() - startTime) / 1000;
      const sentBytes = file.size * (percentage / 100);
      const sentMB = (sentBytes / (1024 * 1024)).toFixed(1);

      let speedText = '';
      if (elapsedSec > 0.5) {
        const bps = sentBytes / elapsedSec;
        speedText = bps > 1024 * 1024
          ? ` · ${(bps / (1024 * 1024)).toFixed(1)} MB/s`
          : ` · ${(bps / 1024).toFixed(0)} KB/s`;
      }

      if (statusEl) statusEl.textContent = `${percentage}%`;
      if (barFill) barFill.style.width = `${percentage}%`;
      if (detailEl) detailEl.textContent = `${sentMB} / ${fileSizeMB} MB${speedText}`;
    }, coverBase64);

    if (statusEl) { statusEl.textContent = '✓ Tersimpan'; statusEl.className = 'upload-card-status status-done'; }
    if (barFill) { barFill.style.width = '100%'; barFill.style.background = 'var(--success-color, #30d158)'; }
    if (detailEl) detailEl.textContent = `${fileSizeMB} MB · ✓ Tersimpan di iPhone`;
  } catch (err) {
    console.error('[Queue] File send error:', err);
    if (statusEl) { statusEl.textContent = 'Gagal!'; statusEl.className = 'upload-card-status status-error'; }
    if (detailEl) detailEl.textContent = 'Transfer gagal';
  }

  updateQueueSummary();
  filesToSendQueue.shift();
  isSendingFile = false;
  processUploadQueue();
}

/* ==================================================== */
/* HELPERS                                              */
/* ==================================================== */

function formatTime(seconds) {
  if (isNaN(seconds) || seconds === Infinity) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// Fade out startup splash screen smoothly & ultra fast
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const splash = document.getElementById('splash-screen');
    if (splash) {
      splash.style.opacity = '0';
      setTimeout(() => {
        splash.remove();
      }, 300);
    }
  }, 250); // 250ms ultra-fast startup
});
