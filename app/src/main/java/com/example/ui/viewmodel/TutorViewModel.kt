package com.example.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.remote.GeminiTranslationService
import com.example.tts.TtsManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class TutorMessage(
    val sender: String, // "USER" or "AI"
    val content: String,
    val timestamp: Long = System.currentTimeMillis()
)

data class TutorUiState(
    val messages: List<TutorMessage> = listOf(
        TutorMessage(
            sender = "AI",
            content = "வணக்கம்! I am your AI PolyGlot Language & Reading Companion. Ask me how to pronounce Tamil words, understand grammar rules, or clarify book passages."
        )
    ),
    val isThinking: Boolean = false
)

class TutorViewModel(
    val ttsManager: TtsManager
) : ViewModel() {

    private val _uiState = MutableStateFlow(TutorUiState())
    val uiState: StateFlow<TutorUiState> = _uiState.asStateFlow()

    fun sendMessage(userText: String, currentPassageContext: String = "") {
        if (userText.isBlank()) return
        val userMsg = TutorMessage("USER", userText)
        val currentMsgs = _uiState.value.messages + userMsg
        _uiState.value = _uiState.value.copy(
            messages = currentMsgs,
            isThinking = true
        )

        viewModelScope.launch {
            val response = GeminiTranslationService.getAIExplanation(currentPassageContext, userText)
            val aiMsg = TutorMessage("AI", response)
            _uiState.value = _uiState.value.copy(
                messages = _uiState.value.messages + aiMsg,
                isThinking = false
            )
        }
    }

    fun speakMessage(text: String, lang: String = "ta") {
        ttsManager.speakText(text, lang)
    }
}
