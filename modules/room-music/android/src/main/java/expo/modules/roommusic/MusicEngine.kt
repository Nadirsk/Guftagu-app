package expo.modules.roommusic

import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import android.util.Log
import java.nio.ByteOrder

/**
 * Room music, the way Mazag's TRTC "BGM" does it: the song is decoded and played on this
 * phone, and the same samples are handed to [MixingAudioRecord], which adds them to the
 * microphone before WebRTC sends it — so the room hears it in this user's voice stream.
 *
 * The local [AudioTrack] paces decoding at real time; the mixer reads from [ring], which
 * is kept in the microphone's format (rate and channel count) by [MixingAudioRecord.attach].
 * Songs loop until stopped.
 */
object MusicEngine {
  private const val TAG = "RoomMusic"

  /** 0..1 — the song's level, both in the mix and on this phone ("Volume"). */
  @Volatile var musicGain = 1f
    set(value) {
      field = value.coerceIn(0f, 1f)
      track?.setVolume(field)
    }

  /** 0..1 — this user's own voice in the mix ("Microphone"). */
  @Volatile var micGain = 1f

  /** False while the user has their mic off: the song still goes out, their voice does not. */
  @Volatile var micOpen = true

  /** The microphone's format; the mixer needs the song in it. */
  @Volatile var targetRate = 48000
  @Volatile var targetChannels = 1

  @Volatile var path: String? = null
    private set
  @Volatile var paused = false
    private set
  @Volatile var positionMs = 0L
    private set
  @Volatile var durationMs = 0L
    private set

  val ring = ShortRing(48000 * 2) // a second of stereo at 48 kHz

  private var thread: Thread? = null
  @Volatile private var stopping = false
  @Volatile private var track: AudioTrack? = null

  /** True while a song is on and not paused — the mixer adds it, the voice track stays live. */
  val isPlaying: Boolean get() = path != null && !paused

  @Synchronized
  fun play(file: String) {
    stop()
    path = file
    paused = false
    stopping = false
    positionMs = 0
    durationMs = 0
    ring.clear()
    thread = Thread({ decodeLoop(file) }, "RoomMusicDecoder").apply { start() }
  }

  fun pause() {
    if (path == null) return
    paused = true
    track?.pause()
    ring.clear()
  }

  fun resume() {
    if (path == null) return
    paused = false
    track?.play()
  }

  @Synchronized
  fun stop() {
    stopping = true
    thread?.let {
      it.interrupt()
      it.join(800)
    }
    thread = null
    path = null
    paused = false
    positionMs = 0
    ring.clear()
  }

  private fun decodeLoop(file: String) {
    val extractor = MediaExtractor()
    var codec: MediaCodec? = null
    try {
      extractor.setDataSource(file)
      val index = (0 until extractor.trackCount).firstOrNull {
        extractor.getTrackFormat(it).getString(MediaFormat.KEY_MIME)?.startsWith("audio/") == true
      } ?: throw IllegalArgumentException("No audio in $file")
      val format = extractor.getTrackFormat(index)
      extractor.selectTrack(index)
      if (format.containsKey(MediaFormat.KEY_DURATION)) durationMs = format.getLong(MediaFormat.KEY_DURATION) / 1000

      var srcRate = format.getInteger(MediaFormat.KEY_SAMPLE_RATE)
      var srcChannels = format.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
      codec = MediaCodec.createDecoderByType(format.getString(MediaFormat.KEY_MIME)!!)
      codec.configure(format, null, null, 0)
      codec.start()
      openTrack(srcRate, srcChannels)

      val info = MediaCodec.BufferInfo()
      var loopBaseUs = 0L
      var lastPtsUs = 0L
      while (!stopping) {
        if (paused) {
          Thread.sleep(30)
          continue
        }
        val inIndex = codec.dequeueInputBuffer(5_000)
        if (inIndex >= 0) {
          val buffer = codec.getInputBuffer(inIndex)!!
          var size = extractor.readSampleData(buffer, 0)
          if (size < 0) {
            // End of the song: go round again, as Mazag does.
            extractor.seekTo(0, MediaExtractor.SEEK_TO_CLOSEST_SYNC)
            loopBaseUs += lastPtsUs
            size = extractor.readSampleData(buffer, 0)
          }
          if (size >= 0) {
            codec.queueInputBuffer(inIndex, 0, size, extractor.sampleTime, 0)
            extractor.advance()
          } else {
            codec.queueInputBuffer(inIndex, 0, 0, 0, 0)
          }
        }

        val outIndex = codec.dequeueOutputBuffer(info, 5_000)
        when {
          outIndex >= 0 -> {
            val out = codec.getOutputBuffer(outIndex)!!
            out.position(info.offset)
            out.limit(info.offset + info.size)
            val shorts = ShortArray(info.size / 2)
            out.order(ByteOrder.LITTLE_ENDIAN).asShortBuffer().get(shorts)
            codec.releaseOutputBuffer(outIndex, false)
            lastPtsUs = info.presentationTimeUs
            positionMs = if (durationMs > 0) (info.presentationTimeUs / 1000) % durationMs else info.presentationTimeUs / 1000
            if (shorts.isNotEmpty()) {
              ring.write(Resampler.convert(shorts, srcRate, srcChannels, targetRate, targetChannels))
              track?.write(shorts, 0, shorts.size) // blocks: real-time pacing
            }
          }
          outIndex == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED -> {
            val f = codec.outputFormat
            srcRate = f.getInteger(MediaFormat.KEY_SAMPLE_RATE)
            srcChannels = f.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
            openTrack(srcRate, srcChannels)
          }
        }
      }
    } catch (_: InterruptedException) {
      // stop()
    } catch (t: Throwable) {
      Log.w(TAG, "Music stopped: ${t.message}")
      path = null
    } finally {
      try { codec?.stop() } catch (_: Throwable) {}
      try { codec?.release() } catch (_: Throwable) {}
      extractor.release()
      track?.let { try { it.stop() } catch (_: Throwable) {}; it.release() }
      track = null
    }
  }

  private fun openTrack(rate: Int, channels: Int) {
    track?.let { try { it.stop() } catch (_: Throwable) {}; it.release() }
    val mask = if (channels >= 2) AudioFormat.CHANNEL_OUT_STEREO else AudioFormat.CHANNEL_OUT_MONO
    val min = AudioTrack.getMinBufferSize(rate, mask, AudioFormat.ENCODING_PCM_16BIT)
    track = AudioTrack.Builder()
      .setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build())
      .setAudioFormat(AudioFormat.Builder().setSampleRate(rate).setChannelMask(mask).setEncoding(AudioFormat.ENCODING_PCM_16BIT).build())
      .setBufferSizeInBytes(min * 2)
      .setTransferMode(AudioTrack.MODE_STREAM)
      .build()
      .also {
        it.setVolume(musicGain)
        if (!paused) it.play()
      }
  }
}

/** A lock-guarded ring of PCM16 samples; when full, the oldest are dropped. */
class ShortRing(capacity: Int) {
  private val data = ShortArray(capacity)
  private var head = 0 // next read
  private var size = 0

  @Synchronized fun clear() { head = 0; size = 0 }

  @Synchronized fun write(src: ShortArray) {
    for (s in src) {
      if (size == data.size) { head = (head + 1) % data.size; size-- }
      data[(head + size) % data.size] = s
      size++
    }
  }

  /** Fills [dst] with what is there (rest stays 0); returns how many were real samples. */
  @Synchronized fun read(dst: ShortArray, count: Int): Int {
    val n = minOf(count, size)
    for (i in 0 until n) dst[i] = data[(head + i) % data.size]
    for (i in n until count) dst[i] = 0
    head = (head + n) % data.size
    size -= n
    return n
  }
}

/** Linear resampling plus mono/stereo folding — enough for music under a voice codec. */
object Resampler {
  fun convert(src: ShortArray, srcRate: Int, srcCh: Int, dstRate: Int, dstCh: Int): ShortArray {
    val frames = src.size / srcCh
    if (frames == 0) return ShortArray(0)
    val outFrames = ((frames.toLong() * dstRate) / srcRate).toInt().coerceAtLeast(1)
    val out = ShortArray(outFrames * dstCh)
    for (f in 0 until outFrames) {
      val pos = f.toDouble() * srcRate / dstRate
      val i0 = pos.toInt().coerceAtMost(frames - 1)
      val i1 = (i0 + 1).coerceAtMost(frames - 1)
      val t = pos - i0
      for (c in 0 until dstCh) {
        val sc = if (srcCh == 1) 0 else c.coerceAtMost(srcCh - 1)
        val a: Double
        val b: Double
        if (dstCh == 1 && srcCh >= 2) {
          a = (src[i0 * srcCh].toDouble() + src[i0 * srcCh + 1]) / 2
          b = (src[i1 * srcCh].toDouble() + src[i1 * srcCh + 1]) / 2
        } else {
          a = src[i0 * srcCh + sc].toDouble()
          b = src[i1 * srcCh + sc].toDouble()
        }
        out[f * dstCh + c] = (a + (b - a) * t).toInt().coerceIn(-32768, 32767).toShort()
      }
    }
    return out
  }
}
