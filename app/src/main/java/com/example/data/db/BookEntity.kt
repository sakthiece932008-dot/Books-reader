package com.example.data.db

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "books")
data class BookEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val title: String,
    val author: String,
    val filePath: String,
    val fileType: String, // PDF, EPUB, TXT, SAMPLE
    val language: String, // ta, en, fr, es, hi, etc.
    val lastReadPageIndex: Int = 0,
    val totalPages: Int = 1,
    val coverResName: String = "",
    val coverUri: String = "",
    val description: String = "",
    val addedTimestamp: Long = System.currentTimeMillis()
)
