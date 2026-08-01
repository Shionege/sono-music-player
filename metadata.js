/**
 * metadata.js
 * ID3 Tag Reader Wrapper using jsmediatags CDN library.
 * Extracts title, artist, album, cover art, and lyrics from audio files.
 */

const Metadata = {
  /**
   * Parse audio file and extract metadata
   * @param {File|Blob} file - The audio file
   * @returns {Promise<Object>} - Promise resolving to { title, artist, album, duration, cover, lyrics }
   */
  async parse(file) {
    return new Promise((resolve) => {
      // Fallback values from filename
      const filename = file.name || 'Unknown';
      const cleanName = filename.substring(0, filename.lastIndexOf('.')) || filename;
      
      // Default guess: "Artist - Title" or just "Title"
      let guessedTitle = cleanName;
      let guessedArtist = 'Unknown Artist';
      
      const parts = cleanName.split(' - ');
      if (parts.length > 1) {
        guessedArtist = parts[0].trim();
        guessedTitle = parts.slice(1).join(' - ').trim();
      }

      const fallbackMetadata = {
        title: guessedTitle,
        artist: guessedArtist,
        album: 'Unknown Album',
        duration: 0,
        cover: null,
        lyrics: ''
      };

      // Get duration first using temporary Audio element
      this.getDuration(file).then((duration) => {
        fallbackMetadata.duration = duration;

        // Check if jsmediatags is loaded
        if (typeof jsmediatags === 'undefined') {
          console.warn('jsmediatags is not loaded. Using fallback metadata.');
          resolve(fallbackMetadata);
          return;
        }

        jsmediatags.read(file, {
          onSuccess: (tag) => {
            const tags = tag.tags || {};
            
            // Extract cover art
            let coverBlob = null;
            if (tags.picture) {
              try {
                const { data, format } = tags.picture;
                const byteArray = new Uint8Array(data);
                coverBlob = new Blob([byteArray], { type: format });
              } catch (e) {
                console.error('Error parsing cover art:', e);
              }
            }

            // Extract lyrics
            let lyricsText = '';
            if (tags.lyrics) {
              lyricsText = tags.lyrics.lyrics || tags.lyrics || '';
            } else if (tags.USLT) {
              // Unsynchronised lyric/text transcription
              lyricsText = tags.USLT.lyrics || (tags.USLT.data ? tags.USLT.data.lyrics : '') || '';
            }

            resolve({
              title: tags.title || fallbackMetadata.title,
              artist: tags.artist || fallbackMetadata.artist,
              album: tags.album || fallbackMetadata.album,
              duration: duration,
              cover: coverBlob,
              lyrics: lyricsText
            });
          },
          onError: (error) => {
            console.error('Error reading tags:', error);
            resolve(fallbackMetadata); // Resolve with fallback on error
          }
        });
      }).catch((err) => {
        console.error('Error getting audio duration:', err);
        resolve(fallbackMetadata);
      });
    });
  },

  /**
   * Get audio duration in seconds
   * @param {File|Blob} file 
   * @returns {Promise<number>}
   */
  getDuration(file) {
    return new Promise((resolve) => {
      const audio = new Audio();
      const objectURL = URL.createObjectURL(file);
      audio.src = objectURL;
      
      audio.addEventListener('loadedmetadata', () => {
        URL.revokeObjectURL(objectURL);
        resolve(audio.duration || 0);
      });

      audio.addEventListener('error', () => {
        URL.revokeObjectURL(objectURL);
        resolve(0); // If audio loading fails, return 0 duration
      });
      
      // Safety timeout
      setTimeout(() => {
        resolve(0);
      }, 5000);
    });
  }
};

window.Metadata = Metadata;
export default Metadata;
