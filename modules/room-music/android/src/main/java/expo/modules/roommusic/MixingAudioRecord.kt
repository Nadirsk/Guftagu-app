package expo.modules.roommusic

import android.app.Application
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.AudioRecordingConfiguration
import android.media.AudioTimestamp
import android.media.MediaRecorder
import android.os.Build
import android.util.Log
import com.oney.WebRTCModule.WebRTCModuleOptions
import org.webrtc.audio.JavaAudioDeviceModule
import java.nio.ByteBuffer
import java.nio.ByteOrder

/**
 * Stands in for the [AudioRecord] that WebRTC's capture thread reads the microphone from.
 * Every read goes to the real recorder, then the song from [MusicEngine] is added (and the
 * user's own voice scaled by "Microphone"), so what WebRTC sends is voice + music — the
 * same thing TRTC's background-music mixing does in Mazag.
 *
 * The capture thread looks `WebRtcAudioRecord.audioRecord` up on every read, so swapping
 * the field once recording starts ([attach]) is enough; nothing in libwebrtc changes.
 */
class MixingAudioRecord private constructor(private val inner: AudioRecord) :
  // A real but never-started recorder, only to satisfy AudioRecord's constructor; every
  // call that matters goes to [inner].
  AudioRecord(
    MediaRecorder.AudioSource.DEFAULT,
    inner.sampleRate,
    if (inner.channelCount >= 2) AudioFormat.CHANNEL_IN_STEREO else AudioFormat.CHANNEL_IN_MONO,
    AudioFormat.ENCODING_PCM_16BIT,
    AudioRecord.getMinBufferSize(
      inner.sampleRate,
      if (inner.channelCount >= 2) AudioFormat.CHANNEL_IN_STEREO else AudioFormat.CHANNEL_IN_MONO,
      AudioFormat.ENCODING_PCM_16BIT,
    ).coerceAtLeast(4096),
  ) {
  private var music = ShortArray(0)

  override fun read(audioBuffer: ByteBuffer, sizeInBytes: Int): Int {
    val n = inner.read(audioBuffer, sizeInBytes)
    if (n > 0) mix(audioBuffer, n)
    return n
  }

  override fun read(audioBuffer: ByteBuffer, sizeInBytes: Int, readMode: Int): Int {
    val n = inner.read(audioBuffer, sizeInBytes, readMode)
    if (n > 0) mix(audioBuffer, n)
    return n
  }

  private fun mix(buffer: ByteBuffer, bytes: Int) {
    val playing = MusicEngine.isPlaying
    val voice = if (MusicEngine.micOpen) MusicEngine.micGain else 0f
    if (!playing && voice == 1f) return

    val samples = bytes / 2
    val pcm = buffer.duplicate().order(ByteOrder.LITTLE_ENDIAN)
    if (music.size < samples) music = ShortArray(samples)
    val got = if (playing) MusicEngine.ring.read(music, samples) else 0
    val gain = MusicEngine.musicGain
    for (i in 0 until samples) {
      val mic = pcm.getShort(i * 2) * voice
      val song = if (i < got) music[i] * gain else 0f
      pcm.putShort(i * 2, (mic + song).toInt().coerceIn(-32768, 32767).toShort())
    }
  }

  override fun getRecordingState(): Int = inner.recordingState
  override fun getState(): Int = inner.state
  override fun getSampleRate(): Int = inner.sampleRate
  override fun getChannelCount(): Int = inner.channelCount
  override fun getAudioFormat(): Int = inner.audioFormat
  override fun getAudioSessionId(): Int = inner.audioSessionId
  override fun getBufferSizeInFrames(): Int = inner.bufferSizeInFrames
  override fun getTimestamp(outTimestamp: AudioTimestamp, timebase: Int): Int = inner.getTimestamp(outTimestamp, timebase)
  override fun getActiveRecordingConfiguration(): AudioRecordingConfiguration? =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) inner.activeRecordingConfiguration else null

  override fun startRecording() = inner.startRecording()
  override fun stop() = inner.stop()
  override fun release() {
    inner.release()
    super.release()
    attached = false
  }

  companion object {
    private const val TAG = "RoomMusic"
    private var adm: JavaAudioDeviceModule? = null

    /** True once the mixer sits on the live microphone. */
    @Volatile var attached = false
      private set

    /**
     * App start: give WebRTC our own audio device module, one that tells us when the mic
     * starts so [attach] can step in. Must run before WebRTCModule is created.
     */
    fun install(app: Application) {
      if (adm != null) return
      Log.i(TAG, "install: giving WebRTC the mixing audio device module")
      adm = JavaAudioDeviceModule.builder(app)
        .setEnableVolumeLogger(false)
        .setAudioRecordStateCallback(object : JavaAudioDeviceModule.AudioRecordStateCallback {
          override fun onWebRtcAudioRecordStart() = attach()
          override fun onWebRtcAudioRecordStop() {
            attached = false
          }
        })
        .createAudioDeviceModule()
      WebRTCModuleOptions.getInstance().audioDeviceModule = adm
    }

    /** Runs on WebRTC's capture thread when the mic starts; also callable from JS as a fallback. */
    fun attach() {
      Log.i(TAG, "attach: adm=${adm != null}")
      try {
        val input = JavaAudioDeviceModule::class.java.getDeclaredField("audioInput").apply { isAccessible = true }.get(adm)
          ?: return
        val field = input.javaClass.getDeclaredField("audioRecord").apply { isAccessible = true }
        val current = field.get(input) as? AudioRecord ?: return
        if (current is MixingAudioRecord) {
          attached = true
          return
        }
        MusicEngine.targetRate = current.sampleRate
        MusicEngine.targetChannels = current.channelCount
        MusicEngine.ring.clear()
        field.set(input, MixingAudioRecord(current))
        attached = true
        Log.i(TAG, "attached to the mic: ${current.sampleRate} Hz, ${current.channelCount} ch")
      } catch (t: Throwable) {
        // Voice keeps working untouched; music just will not reach the room.
        Log.w(TAG, "Could not attach the music mixer: ${t.message}")
        attached = false
      }
    }
  }
}
