package com.example.data.repository

import com.example.data.db.BookDao
import com.example.data.db.BookEntity
import com.example.data.db.BookmarkDao
import com.example.data.db.BookmarkEntity
import kotlinx.coroutines.flow.Flow

class BookRepository(
    private val bookDao: BookDao,
    private val bookmarkDao: BookmarkDao
) {
    val allBooks: Flow<List<BookEntity>> = bookDao.getAllBooks()

    suspend fun getBookById(id: Long): BookEntity? = bookDao.getBookById(id)

    suspend fun insertBook(book: BookEntity): Long = bookDao.insertBook(book)

    suspend fun updateBook(book: BookEntity) = bookDao.updateBook(book)

    suspend fun updateReadingProgress(bookId: Long, pageIndex: Int) = bookDao.updateReadingProgress(bookId, pageIndex)

    suspend fun deleteBook(id: Long) = bookDao.deleteBookById(id)

    fun getBookmarks(bookId: Long): Flow<List<BookmarkEntity>> = bookmarkDao.getBookmarksForBook(bookId)

    suspend fun addBookmark(bookmark: BookmarkEntity): Long = bookmarkDao.insertBookmark(bookmark)

    suspend fun deleteBookmark(id: Long) = bookmarkDao.deleteBookmark(id)
}
