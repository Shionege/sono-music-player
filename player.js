/**
 * player.js
 * Core Audio Player Engine
 * Manages audio playback, queue, media session (iOS lock screen), sleep timer, and visualizer.
 */

class AudioPlayer {
  constructor() {
    this.audio = new Audio();
    this.audio.preload = 'auto';

    this.queue = []; // Array of song objects
    this.shuffledQueue = []; // Shuffled version of queue
    this.currentIndex = -1;
    
    this.isShuffle = false;
    this.repeatMode = 'all'; // 'none' | 'all' | 'one'
    
    this.audioContext = null;
    this.analyser = null;
    this.eqFilters = [];
    this.eqBandGains = [0, 0, 0, 0, 0];
    this.isAudioContextInitialized = false;

    // Sleep Timer state
    this.sleepTimerId = null;
    this.sleepTimeRemaining = 0; // In seconds
    this.sleepTimerCallback = null;

    this.initEventListeners();
  }

  initEventListeners() {
    // Auto play next song when current ends
    this.audio.addEventListener('ended', () => {
      if (this.repeatMode === 'one') {
        this.play();
      } else {
        this.next();
      }
    });

    // Update Media Session state when playing/paused
    this.audio.addEventListener('play', () => {
      this.updateMediaSessionState('playing');
    });

    this.audio.addEventListener('pause', () => {
      this.updateMediaSessionState('paused');
    });
  }

  initVisualizer() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (isIOS) {
      console.log('iOS detected: Bypassing AudioContext mapping to avoid Safari muting bug.');
      return;
    }

    if (this.isAudioContextInitialized) return;

    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = this.audioContext.createMediaElementSource(this.audio);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64; // Small fftSize for clean, retro EQ bands

      // Initialize 5-band Equalizer Filters (60Hz, 230Hz, 910Hz, 3.6kHz, 14kHz)
      const frequencies = [60, 230, 910, 3600, 14000];
      const filterTypes = ['lowshelf', 'peaking', 'peaking', 'peaking', 'highshelf'];

      this.eqFilters = frequencies.map((freq, idx) => {
        const filter = this.audioContext.createBiquadFilter();
        filter.type = filterTypes[idx];
        filter.frequency.value = freq;
        filter.gain.value = this.eqBandGains[idx] || 0;
        return filter;
      });

      // Connection chain: source -> eqFilters -> analyser -> destination
      let lastNode = source;
      this.eqFilters.forEach(filter => {
        lastNode.connect(filter);
        lastNode = filter;
      });

      lastNode.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);

      this.isAudioContextInitialized = true;
      console.log('AudioContext, Analyser, and 5-band Equalizer initialized successfully.');
    } catch (e) {
      console.warn('Could not initialize Web Audio API for visualizer & EQ:', e);
    }
  }

  /**
   * Set the queue of songs and option to start playing a specific song
   */
  setQueue(songs, startIndex = 0, autoPlay = true) {
    this.queue = [...songs];
    
    if (this.isShuffle) {
      this.generateShuffledQueue(startIndex);
      const shuffledIndex = this.shuffledQueue.findIndex(s => s.id === songs[startIndex].id);
      this.currentIndex = shuffledIndex !== -1 ? shuffledIndex : 0;
    } else {
      this.currentIndex = startIndex;
    }

    this.loadCurrentSong(autoPlay);
  }

  generateShuffledQueue(preserveIndex) {
    const preserveSong = this.queue[preserveIndex];
    const remainingSongs = this.queue.filter((_, i) => i !== preserveIndex);
    
    // Fisher-Yates Shuffle
    for (let i = remainingSongs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [remainingSongs[i], remainingSongs[j]] = [remainingSongs[j], remainingSongs[i]];
    }

    this.shuffledQueue = preserveSong ? [preserveSong, ...remainingSongs] : [...remainingSongs];
  }

  getCurrentQueue() {
    return this.isShuffle ? this.shuffledQueue : this.queue;
  }

  getCurrentSong() {
    const currentQueue = this.getCurrentQueue();
    if (this.currentIndex >= 0 && this.currentIndex < currentQueue.length) {
      return currentQueue[this.currentIndex];
    }
    return null;
  }

  async loadCurrentSong(autoPlay = true) {
    const song = this.getCurrentSong();
    if (!song) return;

    // Revoke old URL if existing to free memory
    if (this.currentSongURL) {
      URL.revokeObjectURL(this.currentSongURL);
    }

    // Create URL from Blob
    this.currentSongURL = URL.createObjectURL(song.file);
    this.audio.src = this.currentSongURL;
    this.audio.load();

    // Reset playback rate
    this.audio.playbackRate = this.playbackRate || 1.0;

    // Trigger UI updates
    if (this.onSongChange) {
      this.onSongChange(song);
    }

    // Update iOS Media Session
    this.updateMediaSessionMetadata(song);

    if (autoPlay) {
      await this.play();
    }
  }

  async play() {
    // Initialize audio context on first user interaction
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    try {
      await this.audio.play();
    } catch (e) {
      console.error('Playback failed:', e);
    }
  }

  pause() {
    this.audio.pause();
  }

  togglePlay() {
    if (this.audio.paused) {
      this.play();
    } else {
      this.pause();
    }
  }

  next() {
    const currentQueue = this.getCurrentQueue();
    if (currentQueue.length === 0) return;

    this.currentIndex++;
    if (this.currentIndex >= currentQueue.length) {
      if (this.repeatMode === 'all') {
        this.currentIndex = 0;
      } else {
        this.currentIndex = currentQueue.length - 1;
        this.pause();
        return;
      }
    }
    this.loadCurrentSong(true);
  }

  prev() {
    const currentQueue = this.getCurrentQueue();
    if (currentQueue.length === 0) return;

    // If song is more than 3 seconds in, restart the song instead of going to previous
    if (this.audio.currentTime > 3) {
      this.seek(0);
      return;
    }

    this.currentIndex--;
    if (this.currentIndex < 0) {
      if (this.repeatMode === 'all') {
        this.currentIndex = currentQueue.length - 1;
      } else {
        this.currentIndex = 0;
      }
    }
    this.loadCurrentSong(true);
  }

  seek(seconds) {
    this.audio.currentTime = seconds;
  }

  setVolume(value) {
    this.audio.volume = value; // 0.0 to 1.0
  }

  setSpeed(rate) {
    this.playbackRate = rate;
    this.audio.playbackRate = rate;
  }

  toggleShuffle() {
    this.isShuffle = !this.isShuffle;
    const currentSong = this.getCurrentSong();
    
    if (this.isShuffle) {
      // Generate shuffle list preserving current song
      const indexInNormal = this.queue.findIndex(s => s.id === currentSong.id);
      this.generateShuffledQueue(indexInNormal !== -1 ? indexInNormal : 0);
      this.currentIndex = 0;
    } else {
      // Return to normal queue
      const indexInNormal = this.queue.findIndex(s => s.id === currentSong.id);
      this.currentIndex = indexInNormal !== -1 ? indexInNormal : 0;
    }

    return this.isShuffle;
  }

  toggleRepeat() {
    if (this.repeatMode === 'none') {
      this.repeatMode = 'all';
    } else if (this.repeatMode === 'all') {
      this.repeatMode = 'one';
    } else {
      this.repeatMode = 'none';
    }
    return this.repeatMode;
  }

  /**
   * Set Sleep Timer
   * @param {number} minutes - Minutes to countdown, 0 to cancel
   * @param {Function} tickCallback - Callback function called every second with remaining seconds
   */
  setSleepTimer(minutes, tickCallback) {
    // Clear existing timer
    if (this.sleepTimerId) {
      clearInterval(this.sleepTimerId);
      this.sleepTimerId = null;
    }

    this.sleepTimerCallback = tickCallback;

    if (minutes <= 0) {
      this.sleepTimeRemaining = 0;
      if (this.sleepTimerCallback) this.sleepTimerCallback(0);
      return;
    }

    this.sleepTimeRemaining = minutes * 60;
    if (this.sleepTimerCallback) this.sleepTimerCallback(this.sleepTimeRemaining);

    this.sleepTimerId = setInterval(() => {
      this.sleepTimeRemaining--;

      if (this.sleepTimerCallback) {
        this.sleepTimerCallback(this.sleepTimeRemaining);
      }

      if (this.sleepTimeRemaining <= 0) {
        clearInterval(this.sleepTimerId);
        this.sleepTimerId = null;
        this.pause();
        // Fade out music slowly
        this.fadeOutAndPause();
      }
    }, 1000);
  }

  fadeOutAndPause() {
    const originalVolume = this.audio.volume;
    let vol = originalVolume;
    const fadeInterval = setInterval(() => {
      if (vol > 0.05) {
        vol -= 0.05;
        this.audio.volume = vol;
      } else {
        clearInterval(fadeInterval);
        this.audio.pause();
        this.audio.volume = originalVolume; // Restore volume
      }
    }, 100);
  }

  /**
   * Update iOS Media Session Metadata (Lock Screen)
   */
  updateMediaSessionMetadata(song) {
    if (!('mediaSession' in navigator)) return;

    const metadata = {
      title: song.title,
      artist: song.artist,
      album: song.album
    };

    if (song.cover) {
      // Create Object URL for cover art blob
      if (this.coverURL) {
        URL.revokeObjectURL(this.coverURL);
      }
      this.coverURL = URL.createObjectURL(song.cover);
      metadata.artwork = [
        { src: this.coverURL, sizes: '512x512', type: song.cover.type }
      ];
    } else {
      // Fallback placeholder artwork
      metadata.artwork = [
        { src: 'placeholder.png', sizes: '512x512', type: 'image/png' }
      ];
    }

    navigator.mediaSession.metadata = new MediaMetadata(metadata);

    // Setup action handlers
    navigator.mediaSession.setActionHandler('play', () => this.play());
    navigator.mediaSession.setActionHandler('pause', () => this.pause());
    navigator.mediaSession.setActionHandler('previoustrack', () => this.prev());
    navigator.mediaSession.setActionHandler('nexttrack', () => this.next());
    
    try {
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.fastSeek && 'fastSeek' in this.audio) {
          this.audio.fastSeek(details.seekTime);
          return;
        }
        this.seek(details.seekTime);
      });
    } catch (e) {
      console.warn('seekto media action not supported.');
    }
  }

  updateMediaSessionState(state) {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = state;
  }

  /**
   * Get FFT frequency data for visualizer
   */
  getAnalyserData() {
    if (!this.analyser) return null;
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(dataArray);
    return dataArray;
  }

  /**
   * Set 5-Band Equalizer Gains (dB)
   * @param {Array<number>} bandGains - 5 gain values [-12 to +12]
   */
  setEQBands(bandGains) {
    this.eqBandGains = [...bandGains];
    if (this.eqFilters && this.eqFilters.length === 5) {
      this.eqFilters.forEach((filter, i) => {
        if (filter && bandGains[i] !== undefined) {
          filter.gain.setValueAtTime(bandGains[i], this.audioContext ? this.audioContext.currentTime : 0);
        }
      });
    }
  }

  /**
   * Set Equalizer Preset Profile
   * @param {string} presetName - 'flat' | 'bassBoost' | 'vocalBoost' | 'rock' | 'pop' | 'jazz' | 'electronic'
   */
  setEQPreset(presetName) {
    const presets = {
      flat: [0, 0, 0, 0, 0],
      bassBoost: [7, 5, 1, 0, 0],
      vocalBoost: [-2, 1, 5, 3, 1],
      rock: [6, 3, -1, 3, 6],
      pop: [-1, 2, 5, 2, -1],
      jazz: [4, 2, 1, 2, 4],
      electronic: [6, 4, 0, 4, 6],
    };
    if (presets[presetName]) {
      this.setEQBands(presets[presetName]);
    }
  }
}

window.AudioPlayer = new AudioPlayer();
export default window.AudioPlayer;
