package com.example.data.db

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "vocabulary")
data class VocabularyEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val word: String,
    val sourceLanguage: String,
    val targetLanguage: String,
    val translation: String,
    val transliteration: String,
    val definition: String = "",
    val exampleSentence: String = "",
    val mastered: Boolean = false,
    val addedTimestamp: Long = System.currentTimeMillis()
)
