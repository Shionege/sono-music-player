/**
 * transfer.js
 * WebRTC Peer-to-Peer Wi-Fi Transfer Manager using PeerJS.
 * Connects the laptop and iPhone directly for high-speed local transfer.
 */

const TransferManager = {
  peer: null,
  connection: null,
  isReceiver: false,

  /**
   * Initialize Peer as Receiver (iPhone)
   */
  startReceiver(onCodeReady, onConnectionOpen, onFileReceived, onProgress, onError) {
    this.isReceiver = true;
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const peerId = `anywhere-music-${code}`;

    this.peer = new Peer(peerId, { debug: 0 });

    this.peer.on('open', () => {
      onCodeReady(code);
    });

    this.peer.on('connection', (conn) => {
      this.connection = conn;
      this.setupConnectionHandlers(onConnectionOpen, onFileReceived, onProgress);
    });

    this.peer.on('error', (err) => {
      console.error('[Transfer] PeerJS Receiver Error:', err);
      if (err.type === 'unavailable-id') {
        this.startReceiver(onCodeReady, onConnectionOpen, onFileReceived, onProgress, onError);
      } else {
        onError(err.message || 'Gagal mengaktifkan mode penerima. Pastikan ada koneksi internet saat memulai transfer.');
      }
    });
  },

  /**
   * Initialize Peer as Sender (Laptop) and connect to Receiver (iPhone)
   */
  startSender(code, onConnected, onProgress, onDisconnect, onError) {
    this.isReceiver = false;
    const peerId = `anywhere-music-sender-${Math.floor(1000 + Math.random() * 9000)}`;

    this.currentProgressCallback = null;
    this.currentResolveCallback = null;
    this.currentRejectCallback = null;

    this.peer = new Peer(peerId, { debug: 0 });

    this.peer.on('open', () => {
      const targetPeerId = `anywhere-music-${code.replace(/\s+/g, '')}`;
      let attempts = 0;
      const maxAttempts = 4;

      const connectWithRetry = () => {
        attempts++;
        console.log(`[Transfer] Mencoba sambungan ke iPhone. Upaya ${attempts}/${maxAttempts}...`);

        const conn = this.peer.connect(targetPeerId, { reliable: true });
        this.connection = conn;

        const timeoutId = setTimeout(() => {
          if (!conn.open) {
            conn.close();
            if (attempts < maxAttempts) {
              connectWithRetry();
            } else {
              if (this.peer) this.peer.destroy();
              onError('Koneksi timeout. Pastikan laptop dan iPhone berada di Wi-Fi yang sama, dan layar Wi-Fi Transfer iPhone tetap terbuka.');
            }
          }
        }, 5000);

        conn.on('open', () => {
          clearTimeout(timeoutId);
          this.connection = conn;

          // ✅ KRITIS: Bersihkan listener data sebelumnya untuk menghindari pemrosesan ganda
          conn.off('data');
          conn.on('data', (data) => {
            if (data.type === 'progress') {
              if (this.currentProgressCallback) {
                this.currentProgressCallback(data.percentage);
              }
            } else if (data.type === 'saved') {
              if (this.currentResolveCallback) {
                this.currentResolveCallback();
                this.currentResolveCallback = null;
              }
            }
          });

          conn.on('close', () => {
            onDisconnect();
          });

          onConnected();
        });

        conn.on('error', (err) => {
          clearTimeout(timeoutId);
          console.warn(`[Transfer] Upaya ${attempts} gagal:`, err);
          if (attempts < maxAttempts) {
            setTimeout(connectWithRetry, 800);
          } else {
            onError('Gagal menyambungkan ke iPhone. Pastikan kode benar dan menu WiFi Transfer di iPhone Anda tetap terbuka.');
          }
        });
      };

      connectWithRetry();
    });

    this.peer.on('error', (err) => {
      console.error('[Transfer] PeerJS Sender Error:', err);
      onError('Gagal menginisialisasi koneksi P2P.');
    });
  },

  setupConnectionHandlers(onConnectionOpen, onFileReceived, onProgress) {
    this.connection.off('open');
    this.connection.on('open', () => {
      onConnectionOpen();
    });

    let receivedChunks = [];
    let expectedSize = 0;
    let receivedSize = 0;
    let fileMetadata = null;

    this.connection.off('data');
    this.connection.on('data', (data) => {
      if (data.type === 'meta') {
        fileMetadata = data;
        receivedChunks = [];
        receivedSize = 0;
        expectedSize = data.size;
        onProgress(0, data.name, data.size, data.cover);
      } else if (data.type === 'chunk') {
        receivedChunks.push(data.chunk);
        receivedSize += data.chunk.byteLength;
        const percentage = Math.round((receivedSize / expectedSize) * 100);
        onProgress(percentage, fileMetadata.name, expectedSize, fileMetadata.cover);

        // Acknowledge progress back to laptop (for real-time sync)
        this.connection.send({ type: 'progress', percentage });

        if (receivedSize >= expectedSize) {
          const fileBlob = new Blob(receivedChunks, { type: fileMetadata.fileType });
          const file = new File([fileBlob], fileMetadata.name, { type: fileMetadata.fileType });
          onFileReceived(file);
          receivedChunks = [];
          onProgress(100, fileMetadata.name, expectedSize, fileMetadata.cover);
        }
      } else if (data.type === 'queue_complete') {
        onProgress(-1, '', 0, null, data.count);
      }
    });

    this.connection.on('close', () => {
      console.log('[Transfer] Koneksi receiver terputus.');
      onProgress(-2, '', 0, null, 0);
    });
  },

  /**
   * Send a file in chunks over WebRTC
   * Resolves ONLY after receiving 'saved' ack from iPhone - guarantees real-time sync
   */
  async sendFile(file, onProgress, coverBase64 = null) {
    if (!this.connection || !this.connection.open) {
      throw new Error('Koneksi terputus. Silakan hubungkan kembali.');
    }

    const CHUNK_SIZE = 64 * 1024; // 64KB for better throughput
    const reader = new FileReader();

    this.currentProgressCallback = onProgress;

    // Send metadata first so iPhone shows the song name, size, and cover thumbnail
    this.connection.send({
      type: 'meta',
      name: file.name,
      fileType: file.type || 'audio/mpeg',
      size: file.size,
      cover: coverBase64
    });

    return new Promise((resolve, reject) => {
      this.currentResolveCallback = resolve;
      this.currentRejectCallback = reject;

      let offset = 0;

      const sendNextChunk = () => {
        if (!this.connection || !this.connection.open) {
          reject(new Error('Koneksi terputus saat mengirim file.'));
          return;
        }
        const slice = file.slice(offset, offset + CHUNK_SIZE);
        reader.readAsArrayBuffer(slice);
      };

      reader.onload = (e) => {
        if (!this.connection || !this.connection.open) {
          reject(new Error('Koneksi terputus.'));
          return;
        }
        const chunk = e.target.result;
        this.connection.send({ type: 'chunk', chunk });
        offset += chunk.byteLength;

        if (offset < file.size) {
          // Throttle to prevent buffer overflow
          const channel = this.connection.dataChannel;
          if (channel && channel.bufferedAmount > 2 * 1024 * 1024) {
            setTimeout(sendNextChunk, 50);
          } else {
            sendNextChunk();
          }
        }
        // Do NOT resolve here! Wait for 'saved' acknowledgment from iPhone.
      };

      reader.onerror = (err) => reject(err);

      sendNextChunk();
    });
  },

  /**
   * Stop Wi-Fi Transfer connections and clean up all state
   */
  stop() {
    this.currentProgressCallback = null;
    this.currentResolveCallback = null;
    this.currentRejectCallback = null;
    if (this.connection) {
      this.connection.close();
      this.connection = null;
    }
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
  }
};

window.TransferManager = TransferManager;
export default TransferManager;
