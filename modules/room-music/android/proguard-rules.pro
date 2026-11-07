# MixingAudioRecord swaps WebRtcAudioRecord.audioRecord by reflection; keep the names it looks up.
-keepclassmembers class org.webrtc.audio.JavaAudioDeviceModule { private final org.webrtc.audio.WebRtcAudioRecord audioInput; }
-keepclassmembers class org.webrtc.audio.WebRtcAudioRecord { private android.media.AudioRecord audioRecord; }
