package com.example.ui.viewmodel

import android.content.Context
import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.data.db.BookEntity
import com.example.data.parser.BookParserManager
import com.example.data.repository.BookRepository
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class LibraryViewModel(
    private val repository: BookRepository
) : ViewModel() {

    val books: StateFlow<List<BookEntity>> = repository.allBooks
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    fun seedSampleBooksIfEmpty() {
        viewModelScope.launch {
            // Check if DB is empty
            // We insert sample classical books
            val sampleBooks = BookParserManager.getPreloadedSampleBooks()
            sampleBooks.forEach { sample ->
                val entity = BookEntity(
                    title = sample.title,
                    author = sample.author,
                    filePath = "sample_${sample.title}",
                    fileType = "SAMPLE",
                    language = sample.language,
                    totalPages = sample.pages.size,
                    description = "Classical Tamil & Multilingual educational edition."
                )
                repository.insertBook(entity)
            }
        }
    }

    fun importUserFile(context: Context, uri: Uri, fileName: String) {
        viewModelScope.launch {
            val parsed = BookParserManager.parseUploadedFile(context, uri, fileName)
            val extension = fileName.substringAfterLast('.', "TXT").uppercase()

            val entity = BookEntity(
                title = parsed.title,
                author = parsed.author,
                filePath = uri.toString(),
                fileType = extension,
                language = parsed.language,
                totalPages = parsed.pages.size,
                description = "Uploaded $extension document."
            )
            repository.insertBook(entity)
        }
    }

    fun deleteBook(id: Long) {
        viewModelScope.launch {
            repository.deleteBook(id)
        }
    }
}

class LibraryViewModelFactory(private val repository: BookRepository) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(LibraryViewModel::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return LibraryViewModel(repository) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
