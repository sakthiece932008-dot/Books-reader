package com.example.ui.viewmodel

import android.content.Context
import android.net.Uri
import androidx.compose.ui.text.TextRange
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.data.db.BookEntity
import com.example.data.parser.BookParserManager
import com.example.data.parser.ParsedPage
import com.example.data.repository.BookRepository
import com.example.data.repository.VocabularyRepository
import com.example.data.db.VocabularyEntity
import com.example.remote.GeminiTranslationService
import com.example.remote.WordEducationalInfo
import com.example.tts.TtsManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

enum class ReaderTheme {
    LIGHT, SEPIA, DARK
}

data class SentenceTranslation(
    val original: String,
    val translation: String,
    val transliteration: String
)

data class ReaderUiState(
    val book: BookEntity? = null,
    val currentPageIndex: Int = 0,
    val totalPages: Int = 1,
    val pageText: String = "",
    val isLoading: Boolean = false,
    val theme: ReaderTheme = ReaderTheme.SEPIA,
    val fontSizeSp: Int = 18,
    val targetLanguage: String = "ta", // Tamil default
    val isBilingualDualView: Boolean = false,
    val sentenceBreakdown: List<SentenceTranslation> = emptyList(),
    val selectedWord: String? = null,
    val wordInfo: WordEducationalInfo? = null,
    val isLoadingWordInfo: Boolean = false,
    val pageTranslation: String = "",
    val isTranslatingPage: Boolean = false
)

class BookReaderViewModel(
    private val bookRepository: BookRepository,
    private val vocabularyRepository: VocabularyRepository,
    val ttsManager: TtsManager
) : ViewModel() {

    private val _uiState = MutableStateFlow(ReaderUiState())
    val uiState: StateFlow<ReaderUiState> = _uiState.asStateFlow()

    private var cachedPages: List<ParsedPage> = emptyList()

    fun loadBook(context: Context, bookId: Long) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            val book = bookRepository.getBookById(bookId)
            if (book != null) {
                // Parse or retrieve pages
                cachedPages = if (book.fileType == "SAMPLE") {
                    val sample = BookParserManager.getPreloadedSampleBooks()
                        .find { it.title == book.title }
                    sample?.pages ?: listOf(ParsedPage(0, "Sample text not found."))
                } else {
                    try {
                        val uri = Uri.parse(book.filePath)
                        val parsed = BookParserManager.parseUploadedFile(context, uri, book.title)
                        parsed.pages
                    } catch (e: Exception) {
                        listOf(ParsedPage(0, "Unable to load document text. Please verify file access."))
                    }
                }

                val initialPageIndex = book.lastReadPageIndex.coerceIn(0, (cachedPages.size - 1).coerceAtLeast(0))
                val initialPageText = cachedPages.getOrNull(initialPageIndex)?.textContent ?: ""

                _uiState.value = _uiState.value.copy(
                    book = book,
                    currentPageIndex = initialPageIndex,
                    totalPages = cachedPages.size.coerceAtLeast(1),
                    pageText = initialPageText,
                    isLoading = false
                )

                generateBilingualSentenceBreakdown(initialPageText, _uiState.value.targetLanguage)
            } else {
                _uiState.value = _uiState.value.copy(isLoading = false)
            }
        }
    }

    fun goToPage(pageIndex: Int) {
        val total = _uiState.value.totalPages
        if (pageIndex in 0 until total) {
            val text = cachedPages.getOrNull(pageIndex)?.textContent ?: ""
            _uiState.value = _uiState.value.copy(
                currentPageIndex = pageIndex,
                pageText = text,
                pageTranslation = ""
            )
            // Save progress
            val bookId = _uiState.value.book?.id
            if (bookId != null) {
                viewModelScope.launch {
                    bookRepository.updateReadingProgress(bookId, pageIndex)
                }
            }
            generateBilingualSentenceBreakdown(text, _uiState.value.targetLanguage)
        }
    }

    fun setTargetLanguage(langCode: String) {
        _uiState.value = _uiState.value.copy(targetLanguage = langCode)
        ttsManager.setLanguage(langCode)
        generateBilingualSentenceBreakdown(_uiState.value.pageText, langCode)
    }

    fun toggleBilingualDualView() {
        _uiState.value = _uiState.value.copy(isBilingualDualView = !_uiState.value.isBilingualDualView)
    }

    fun setFontSize(sizeSp: Int) {
        _uiState.value = _uiState.value.copy(fontSizeSp = sizeSp.coerceIn(12, 32))
    }

    fun setReaderTheme(theme: ReaderTheme) {
        _uiState.value = _uiState.value.copy(theme = theme)
    }

    fun translateCurrentPage() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isTranslatingPage = true)
            val text = _uiState.value.pageText
            val target = _uiState.value.targetLanguage
            val translation = GeminiTranslationService.translateText(text, "auto", target)
            _uiState.value = _uiState.value.copy(
                pageTranslation = translation,
                isTranslatingPage = false
            )
        }
    }

    fun lookupWord(word: String, contextSentence: String = "") {
        if (word.isBlank()) return
        val cleanWord = word.trim().trim { !it.isLetterOrDigit() && it != '\'' }
        if (cleanWord.isBlank()) return

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                selectedWord = cleanWord,
                isLoadingWordInfo = true,
                wordInfo = null
            )
            val info = GeminiTranslationService.getEducationalWordDetails(
                word = cleanWord,
                contextSentence = contextSentence.ifBlank { _uiState.value.pageText },
                sourceLang = _uiState.value.book?.language ?: "auto",
                targetLang = _uiState.value.targetLanguage
            )
            _uiState.value = _uiState.value.copy(
                wordInfo = info,
                isLoadingWordInfo = false
            )
        }
    }

    fun closeWordLookup() {
        _uiState.value = _uiState.value.copy(
            selectedWord = null,
            wordInfo = null
        )
    }

    fun saveWordToVocabulary(info: WordEducationalInfo) {
        viewModelScope.launch {
            val entity = VocabularyEntity(
                word = info.word,
                sourceLanguage = _uiState.value.book?.language ?: "en",
                targetLanguage = _uiState.value.targetLanguage,
                translation = info.translation,
                transliteration = info.transliteration,
                definition = info.definition,
                exampleSentence = info.exampleSentence
            )
            vocabularyRepository.saveWord(entity)
        }
    }

    fun speakCurrentPage() {
        val text = _uiState.value.pageText
        val lang = _uiState.value.book?.language ?: "ta"
        ttsManager.speakText(text, lang)
    }

    fun speakWord(word: String, lang: String = "ta") {
        ttsManager.speakText(word, lang)
    }

    fun stopSpeaking() {
        ttsManager.stop()
    }

    private fun generateBilingualSentenceBreakdown(pageText: String, targetLang: String) {
        viewModelScope.launch {
            val sentences = pageText.split(Regex("(?<=[.!?])\\s+")).filter { it.isNotBlank() }
            val breakdownList = mutableListOf<SentenceTranslation>()

            for (s in sentences.take(10)) { // Break down top sentences for dual view
                val translation = GeminiTranslationService.translateText(s, "auto", targetLang)
                val transliteration = GeminiTranslationService.getPhoneticTransliteration(s, targetLang)
                breakdownList.add(SentenceTranslation(s, translation, transliteration))
            }

            _uiState.value = _uiState.value.copy(sentenceBreakdown = breakdownList)
        }
    }
}

class BookReaderViewModelFactory(
    private val bookRepository: BookRepository,
    private val vocabularyRepository: VocabularyRepository,
    private val ttsManager: TtsManager
) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(BookReaderViewModel::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return BookReaderViewModel(bookRepository, vocabularyRepository, ttsManager) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
