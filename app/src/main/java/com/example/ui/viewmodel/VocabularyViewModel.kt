package com.example.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.data.db.VocabularyEntity
import com.example.data.repository.VocabularyRepository
import com.example.tts.TtsManager
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class VocabularyViewModel(
    private val repository: VocabularyRepository,
    val ttsManager: TtsManager
) : ViewModel() {

    val vocabularyList: StateFlow<List<VocabularyEntity>> = repository.allVocabulary
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    fun toggleMastered(vocab: VocabularyEntity) {
        viewModelScope.launch {
            repository.updateWord(vocab.copy(mastered = !vocab.mastered))
        }
    }

    fun deleteWord(id: Long) {
        viewModelScope.launch {
            repository.deleteWord(id)
        }
    }

    fun speakWord(word: String, lang: String = "ta") {
        ttsManager.speakText(word, lang)
    }
}

class VocabularyViewModelFactory(
    private val repository: VocabularyRepository,
    private val ttsManager: TtsManager
) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(VocabularyViewModel::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return VocabularyViewModel(repository, ttsManager) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
