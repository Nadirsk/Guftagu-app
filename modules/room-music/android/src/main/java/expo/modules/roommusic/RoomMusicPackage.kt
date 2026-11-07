package expo.modules.roommusic

import android.app.Application
import android.content.Context
import expo.modules.core.interfaces.ApplicationLifecycleListener
import expo.modules.core.interfaces.Package

/** Installs the music-mixing audio device module at app start, before WebRTC is created. */
class RoomMusicPackage : Package {
  override fun createApplicationLifecycleListeners(context: Context): List<ApplicationLifecycleListener> =
    listOf(object : ApplicationLifecycleListener {
      override fun onCreate(application: Application) {
        MixingAudioRecord.install(application)
      }
    })
}
