package expo.modules.roommusic

import android.content.ContentUris
import android.net.Uri
import android.provider.MediaStore
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

/**
 * Room → Tools → Music, Mazag style, all on the phone:
 *  - `listLocal` — the songs already on the phone ("Local Music").
 *  - `importSong` — copies one into the app's own storage ("My Music"); nothing is uploaded.
 *  - `play` / `pause` / `resume` / `stop` — the song plays here and is mixed into the
 *    microphone ([MixingAudioRecord]), so the room hears it only while this user is on a seat.
 *  - `setMusicVolume` / `setMicVolume` — the Volume and Microphone sliders (0–100).
 */
class RoomMusicModule : Module() {
  private val context get() = requireNotNull(appContext.reactContext) { "No React context" }

  private val musicDir: File get() = File(context.filesDir, "room-music").apply { mkdirs() }

  override fun definition() = ModuleDefinition {
    Name("RoomMusic")

    AsyncFunction("listLocal") {
      val out = mutableListOf<Map<String, Any?>>()
      val projection = arrayOf(
        MediaStore.Audio.Media._ID,
        MediaStore.Audio.Media.TITLE,
        MediaStore.Audio.Media.ARTIST,
        MediaStore.Audio.Media.DURATION,
        MediaStore.Audio.Media.SIZE,
        MediaStore.Audio.Media.MIME_TYPE,
        MediaStore.Audio.Media.DISPLAY_NAME,
      )
      context.contentResolver.query(
        MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
        projection,
        // Real songs, not ringtones or 1-second blips.
        "${MediaStore.Audio.Media.DURATION} >= ?",
        arrayOf("10000"),
        "${MediaStore.Audio.Media.DATE_ADDED} DESC",
      )?.use { c ->
        while (c.moveToNext()) {
          val id = c.getLong(0)
          val artist = c.getString(2)
          out += mapOf(
            "id" to id.toString(),
            "uri" to ContentUris.withAppendedId(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, id).toString(),
            "title" to (c.getString(1) ?: c.getString(6) ?: "Unknown"),
            "artist" to if (artist == null || artist == "<unknown>") null else artist,
            "durationMs" to c.getLong(3),
            "size" to c.getLong(4),
            "mime" to c.getString(5),
            "fileName" to c.getString(6),
          )
        }
      }
      out
    }

    AsyncFunction("importSong") { uri: String, id: String, fileName: String? ->
      val ext = fileName?.substringAfterLast('.', "")?.takeIf { it.length in 2..5 } ?: "mp3"
      val dest = File(musicDir, "song-$id.$ext")
      if (!dest.exists()) {
        context.contentResolver.openInputStream(Uri.parse(uri)).use { input ->
          requireNotNull(input) { "Could not open that song" }
          dest.outputStream().use { input.copyTo(it) }
        }
      }
      dest.absolutePath
    }

    Function("deleteSong") { path: String ->
      if (MusicEngine.path == path) MusicEngine.stop()
      File(path).takeIf { it.parentFile == musicDir }?.delete() ?: false
    }

    Function("play") { path: String -> MusicEngine.play(path) }
    Function("pause") { MusicEngine.pause() }
    Function("resume") { MusicEngine.resume() }
    Function("stop") { MusicEngine.stop() }

    Function("setMusicVolume") { volume: Int -> MusicEngine.musicGain = volume / 100f }
    Function("setMicVolume") { volume: Int -> MusicEngine.micGain = (volume / 100f).coerceIn(0f, 1f) }
    Function("setMicOpen") { open: Boolean -> MusicEngine.micOpen = open }

    // Fallback for when the capture-start callback did not fire: call once the mic is live.
    Function("attachMixer") { MixingAudioRecord.attach(); MixingAudioRecord.attached }

    Function("status") {
      mapOf(
        "path" to MusicEngine.path,
        "playing" to MusicEngine.isPlaying,
        "paused" to MusicEngine.paused,
        "positionMs" to MusicEngine.positionMs,
        "durationMs" to MusicEngine.durationMs,
        "mixerAttached" to MixingAudioRecord.attached,
      )
    }
  }
}
