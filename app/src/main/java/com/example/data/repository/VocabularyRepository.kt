package com.example.data.repository

import com.example.data.db.VocabularyDao
import com.example.data.db.VocabularyEntity
import kotlinx.coroutines.flow.Flow

class VocabularyRepository(private val vocabularyDao: VocabularyDao) {

    val allVocabulary: Flow<List<VocabularyEntity>> = vocabularyDao.getAllVocabulary()

    suspend fun saveWord(vocab: VocabularyEntity): Long {
        val existing = vocabularyDao.getVocabularyByWord(vocab.word)
        return if (existing != null) {
            vocabularyDao.updateVocabulary(vocab.copy(id = existing.id))
            existing.id
        } else {
            vocabularyDao.insertVocabulary(vocab)
        }
    }

    suspend fun updateWord(vocab: VocabularyEntity) = vocabularyDao.updateVocabulary(vocab)

    suspend fun deleteWord(id: Long) = vocabularyDao.deleteVocabulary(id)
}
