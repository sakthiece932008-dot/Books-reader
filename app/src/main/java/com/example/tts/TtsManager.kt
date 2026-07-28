package com.example.tts

import android.content.Context
import android.os.Bundle
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.speech.tts.Voice
import android.util.Log
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.util.Locale

data class TtsState(
    val isReady: Boolean = false,
    val isSpeaking: Boolean = false,
    val currentLanguage: String = "ta",
    val speechRate: Float = 1.0f,
    val pitch: Float = 1.0f,
    val highlightedStartChar: Int = -1,
    val highlightedEndChar: Int = -1,
    val availableVoices: List<String> = emptyList(),
    val selectedVoiceName: String = ""
)

class TtsManager(context: Context) : TextToSpeech.OnInitListener {

    private var tts: TextToSpeech? = TextToSpeech(context.applicationContext, this)

    private val _state = MutableStateFlow(TtsState())
    val state: StateFlow<TtsState> = _state.asStateFlow()

    private var onCompletionCallback: (() -> Unit)? = null

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            Log.d("TtsManager", "TextToSpeech initialized successfully")
            setLanguage("ta") // Default to Tamil
            setupUtteranceListener()
            updateVoicesList()
            _state.value = _state.value.copy(isReady = true)
        } else {
            Log.e("TtsManager", "TextToSpeech initialization failed with status $status")
        }
    }

    private fun setupUtteranceListener() {
        tts?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
            override fun onStart(utteranceId: String?) {
                _state.value = _state.value.copy(isSpeaking = true)
            }

            override fun onDone(utteranceId: String?) {
                _state.value = _state.value.copy(
                    isSpeaking = false,
                    highlightedStartChar = -1,
                    highlightedEndChar = -1
                )
                onCompletionCallback?.invoke()
            }

            @Deprecated("Deprecated in Java")
            override fun onError(utteranceId: String?) {
                _state.value = _state.value.copy(
                    isSpeaking = false,
                    highlightedStartChar = -1,
                    highlightedEndChar = -1
                )
            }

            override fun onRangeStart(utteranceId: String?, start: Int, end: Int, frame: Int) {
                _state.value = _state.value.copy(
                    highlightedStartChar = start,
                    highlightedEndChar = end
                )
            }
        })
    }

    fun setLanguage(langCode: String) {
        val locale = when (langCode.lowercase()) {
            "ta", "tamil" -> Locale("ta", "IN")
            "hi", "hindi" -> Locale("hi", "IN")
            "fr", "french" -> Locale.FRANCE
            "es", "spanish" -> Locale("es", "ES")
            "de", "german" -> Locale.GERMANY
            "ja", "japanese" -> Locale.JAPAN
            else -> Locale.US
        }
        val result = tts?.setLanguage(locale)
        if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
            Log.w("TtsManager", "Language $langCode missing or not supported, falling back to US")
            tts?.setLanguage(Locale.US)
        }
        _state.value = _state.value.copy(currentLanguage = langCode)
    }

    fun setSpeechRate(rate: Float) {
        tts?.setSpeechRate(rate)
        _state.value = _state.value.copy(speechRate = rate)
    }

    fun setPitch(pitch: Float) {
        tts?.setPitch(pitch)
        _state.value = _state.value.copy(pitch = pitch)
    }

    fun speakText(text: String, langCode: String = "ta", onDone: (() -> Unit)? = null) {
        if (text.isBlank()) return
        stop()
        setLanguage(langCode)
        onCompletionCallback = onDone

        val params = Bundle().apply {
            putString(TextToSpeech.Engine.KEY_PARAM_UTTERANCE_ID, "polyglot_tts_${System.currentTimeMillis()}")
        }
        tts?.speak(text, TextToSpeech.QUEUE_FLUSH, params, "polyglot_tts_${System.currentTimeMillis()}")
    }

    fun stop() {
        tts?.stop()
        _state.value = _state.value.copy(
            isSpeaking = false,
            highlightedStartChar = -1,
            highlightedEndChar = -1
        )
    }

    private fun updateVoicesList() {
        try {
            val voices = tts?.voices?.map { it.name } ?: emptyList()
            _state.value = _state.value.copy(availableVoices = voices)
        } catch (e: Exception) {
            Log.e("TtsManager", "Failed to fetch voices", e)
        }
    }

    fun shutdown() {
        tts?.stop()
        tts?.shutdown()
        tts = null
    }
}
