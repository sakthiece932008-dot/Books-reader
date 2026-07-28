package com.example.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.ClickableText
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.NavigateBefore
import androidx.compose.material.icons.automirrored.filled.NavigateNext
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.FormatSize
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.MenuBook
import androidx.compose.material.icons.filled.Palette
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material.icons.filled.Translate
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Slider
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.components.AudioControlsBar
import com.example.ui.components.WordLookupDialog
import com.example.ui.theme.AccentGold
import com.example.ui.theme.DarkReaderBackground
import com.example.ui.theme.DarkReaderText
import com.example.ui.theme.LightReaderBackground
import com.example.ui.theme.LightReaderText
import com.example.ui.theme.SepiaBackground
import com.example.ui.theme.SepiaText
import com.example.ui.viewmodel.BookReaderViewModel
import com.example.ui.viewmodel.ReaderTheme

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun ReaderScreen(
    bookId: Long,
    viewModel: BookReaderViewModel,
    onBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val uiState by viewModel.uiState.collectAsState()
    val ttsState by viewModel.ttsManager.state.collectAsState()

    LaunchedEffect(bookId) {
        viewModel.loadBook(context, bookId)
    }

    var showThemeMenu by remember { mutableStateOf(false) }
    var showLangMenu by remember { mutableStateOf(false) }

    val bgAndTextColor = when (uiState.theme) {
        ReaderTheme.LIGHT -> LightReaderBackground to LightReaderText
        ReaderTheme.SEPIA -> SepiaBackground to SepiaText
        ReaderTheme.DARK -> DarkReaderBackground to DarkReaderText
    }

    val backgroundColor = bgAndTextColor.first
    val textColor = bgAndTextColor.second

    val targetLanguages = listOf(
        "ta" to "தமிழ் (Tamil)",
        "en" to "English",
        "hi" to "हिन्दी (Hindi)",
        "fr" to "Français",
        "es" to "Español"
    )

    Scaffold(
        topBar = {
            Column(modifier = Modifier.background(backgroundColor)) {
                TopAppBar(
                    title = {
                        Column {
                            Text(
                                text = uiState.book?.title ?: "LinguistRead",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                maxLines = 1,
                                color = textColor
                            )
                            Text(
                                text = "Reading: ${uiState.book?.title ?: "Document"} • Page ${uiState.currentPageIndex + 1} of ${uiState.totalPages}",
                                style = MaterialTheme.typography.bodySmall,
                                color = textColor.copy(alpha = 0.7f)
                            )
                        }
                    },
                    navigationIcon = {
                        IconButton(
                            onClick = onBack,
                            modifier = Modifier.testTag("reader_back_button")
                        ) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = textColor)
                        }
                    },
                    actions = {
                        // Bilingual view toggle
                        IconButton(
                            onClick = { viewModel.toggleBilingualDualView() },
                            modifier = Modifier.testTag("toggle_bilingual_view_button")
                        ) {
                            Icon(
                                imageVector = Icons.Default.MenuBook,
                                contentDescription = "Bilingual Dual View",
                                tint = if (uiState.isBilingualDualView) MaterialTheme.colorScheme.primary else textColor
                            )
                        }

                        // Theme selector
                        IconButton(
                            onClick = { showThemeMenu = true },
                            modifier = Modifier.testTag("reader_theme_button")
                        ) {
                            Icon(Icons.Default.Palette, contentDescription = "Themes", tint = textColor)
                        }

                        DropdownMenu(
                            expanded = showThemeMenu,
                            onDismissRequest = { showThemeMenu = false }
                        ) {
                            DropdownMenuItem(
                                text = { Text("Sepia (Warm Reading)") },
                                onClick = {
                                    viewModel.setReaderTheme(ReaderTheme.SEPIA)
                                    showThemeMenu = false
                                }
                            )
                            DropdownMenuItem(
                                text = { Text("Light Mode") },
                                onClick = {
                                    viewModel.setReaderTheme(ReaderTheme.LIGHT)
                                    showThemeMenu = false
                                }
                            )
                            DropdownMenuItem(
                                text = { Text("Dark Reader") },
                                onClick = {
                                    viewModel.setReaderTheme(ReaderTheme.DARK)
                                    showThemeMenu = false
                                }
                            )
                        }

                        // Target Language Selector
                        IconButton(
                            onClick = { showLangMenu = true },
                            modifier = Modifier.testTag("target_language_button")
                        ) {
                            Icon(Icons.Default.Language, contentDescription = "Target Translation Language", tint = textColor)
                        }

                        DropdownMenu(
                            expanded = showLangMenu,
                            onDismissRequest = { showLangMenu = false }
                        ) {
                            targetLanguages.forEach { (code, label) ->
                                DropdownMenuItem(
                                    text = { Text(label) },
                                    onClick = {
                                        viewModel.setTargetLanguage(code)
                                        showLangMenu = false
                                    }
                                )
                            }
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = backgroundColor)
                )

                // Top Progress Bar matching Professional Polish layout
                val readingProgress = if (uiState.totalPages > 0) {
                    (uiState.currentPageIndex + 1).toFloat() / uiState.totalPages.toFloat()
                } else 0f
                
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 4.dp),
                    color = Color.Transparent
                ) {
                    androidx.compose.material3.LinearProgressIndicator(
                        progress = { readingProgress },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(4.dp),
                        color = MaterialTheme.colorScheme.primary,
                        trackColor = MaterialTheme.colorScheme.outlineVariant,
                    )
                }
            }
        },
        bottomBar = {
            Column(modifier = Modifier.background(backgroundColor)) {
                // Audio controls bar
                AudioControlsBar(
                    ttsState = ttsState,
                    onPlay = { viewModel.speakCurrentPage() },
                    onStop = { viewModel.stopSpeaking() },
                    onRateChange = { viewModel.ttsManager.setSpeechRate(it) },
                    onPitchChange = { viewModel.ttsManager.setPitch(it) },
                    onLanguageChange = { viewModel.setTargetLanguage(it) }
                )

                // Navigation Controls Bar
                Surface(
                    color = backgroundColor,
                    tonalElevation = 4.dp,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier
                            .padding(horizontal = 16.dp, vertical = 8.dp)
                            .fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        IconButton(
                            onClick = { viewModel.goToPage(uiState.currentPageIndex - 1) },
                            enabled = uiState.currentPageIndex > 0,
                            modifier = Modifier.testTag("prev_page_button")
                        ) {
                            Icon(Icons.AutoMirrored.Filled.NavigateBefore, contentDescription = "Previous Page", tint = textColor)
                        }

                        // Page slider
                        Slider(
                            value = uiState.currentPageIndex.toFloat(),
                            onValueChange = { viewModel.goToPage(it.toInt()) },
                            valueRange = 0f..(uiState.totalPages - 1).coerceAtLeast(0).toFloat(),
                            modifier = Modifier.weight(1f).padding(horizontal = 8.dp)
                        )

                        IconButton(
                            onClick = { viewModel.goToPage(uiState.currentPageIndex + 1) },
                            enabled = uiState.currentPageIndex < uiState.totalPages - 1,
                            modifier = Modifier.testTag("next_page_button")
                        ) {
                            Icon(Icons.AutoMirrored.Filled.NavigateNext, contentDescription = "Next Page", tint = textColor)
                        }
                    }
                }
            }
        },
        containerColor = backgroundColor,
        modifier = modifier.fillMaxSize()
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(backgroundColor)
        ) {
            if (uiState.isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            } else {
                val scrollState = rememberScrollState()

                Card(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 8.dp, vertical = 4.dp),
                    shape = RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp, bottomStart = 16.dp, bottomEnd = 16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .verticalScroll(scrollState)
                            .padding(20.dp)
                    ) {
                        // Font adjustment Toolbar
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(bottom = 12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                IconButton(
                                    onClick = { viewModel.setFontSize(uiState.fontSizeSp - 2) },
                                    modifier = Modifier.testTag("decrease_font_button")
                                ) {
                                    Icon(Icons.Default.Remove, contentDescription = "Decrease Font", tint = textColor)
                                }

                                Text(
                                    text = "${uiState.fontSizeSp} sp",
                                    style = MaterialTheme.typography.labelMedium,
                                    color = textColor
                                )

                                IconButton(
                                    onClick = { viewModel.setFontSize(uiState.fontSizeSp + 2) },
                                    modifier = Modifier.testTag("increase_font_button")
                                ) {
                                    Icon(Icons.Default.Add, contentDescription = "Increase Font", tint = textColor)
                                }
                            }

                            // Translate Page button
                            OutlinedButton(
                                onClick = { viewModel.translateCurrentPage() },
                                shape = RoundedCornerShape(20.dp),
                                modifier = Modifier.testTag("translate_page_button")
                            ) {
                                Icon(Icons.Default.Translate, contentDescription = "Translate Page", modifier = Modifier.padding(end = 4.dp))
                                Text("Real-time Page Translation", fontSize = 12.sp)
                            }
                        }

                        HorizontalDivider(color = textColor.copy(alpha = 0.2f))
                        Spacer(modifier = Modifier.height(16.dp))

                        // Full Translated Page Card if present
                        if (uiState.pageTranslation.isNotBlank()) {
                            Card(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(bottom = 16.dp),
                                shape = RoundedCornerShape(20.dp),
                                colors = CardDefaults.cardColors(
                                    containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.6f)
                                )
                            ) {
                                Column(modifier = Modifier.padding(16.dp)) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(
                                            imageVector = Icons.Default.Translate,
                                            contentDescription = "Page Translation",
                                            tint = MaterialTheme.colorScheme.primary
                                        )
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text(
                                            text = "Full Page Translation (${uiState.targetLanguage.uppercase()})",
                                            style = MaterialTheme.typography.titleSmall,
                                            fontWeight = FontWeight.Bold,
                                            color = MaterialTheme.colorScheme.onPrimaryContainer
                                        )
                                    }
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Text(
                                        text = uiState.pageTranslation,
                                        style = MaterialTheme.typography.bodyLarge,
                                        fontSize = uiState.fontSizeSp.sp,
                                        color = MaterialTheme.colorScheme.onPrimaryContainer
                                    )
                                }
                            }
                        }

                        if (uiState.isTranslatingPage) {
                            Row(
                                modifier = Modifier.padding(bottom = 16.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                CircularProgressIndicator(modifier = Modifier.size(20.dp))
                                Spacer(modifier = Modifier.width(12.dp))
                                Text("Translating page into ${uiState.targetLanguage.uppercase()}...", color = textColor)
                            }
                        }

                        // Mode 1: Bilingual Dual Sentence Breakdown
                        if (uiState.isBilingualDualView) {
                            Text(
                                text = "Bilingual Parallel View (Sentence-by-Sentence Educational Breakdown)",
                                style = MaterialTheme.typography.labelLarge,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.padding(bottom = 12.dp)
                            )

                            uiState.sentenceBreakdown.forEachIndexed { index, sentence ->
                                Card(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(bottom = 12.dp)
                                        .clickable { viewModel.lookupWord(sentence.original) },
                                    shape = RoundedCornerShape(16.dp),
                                    colors = CardDefaults.cardColors(
                                        containerColor = MaterialTheme.colorScheme.surfaceVariant
                                    )
                                ) {
                                    Column(modifier = Modifier.padding(14.dp)) {
                                        Text(
                                            text = "${index + 1}. ${sentence.original}",
                                            style = MaterialTheme.typography.bodyLarge,
                                            fontSize = uiState.fontSizeSp.sp,
                                            fontWeight = FontWeight.SemiBold,
                                            color = textColor
                                        )
                                        Spacer(modifier = Modifier.height(6.dp))
                                        Text(
                                            text = "Translation: ${sentence.translation}",
                                            style = MaterialTheme.typography.bodyMedium,
                                            color = MaterialTheme.colorScheme.primary,
                                            fontWeight = FontWeight.Medium
                                        )
                                        if (sentence.transliteration.isNotBlank()) {
                                            Text(
                                                text = "Phonetics: ${sentence.transliteration}",
                                                style = MaterialTheme.typography.bodySmall,
                                                fontStyle = FontStyle.Italic,
                                                color = MaterialTheme.colorScheme.secondary
                                            )
                                        }
                                    }
                                }
                            }
                        } else {
                            // Mode 2: Interactive Text with Spoken Word Highlight
                            val words = uiState.pageText.split(" ")

                            Text(
                                text = "Tip: Tap any word or sentence below to get instant Tamil translation, phonetics & natural voice.",
                                style = MaterialTheme.typography.bodySmall,
                                fontStyle = FontStyle.Italic,
                                color = textColor.copy(alpha = 0.6f),
                                modifier = Modifier.padding(bottom = 12.dp)
                            )

                            FlowRow(
                                horizontalArrangement = Arrangement.Start,
                                verticalArrangement = Arrangement.Center,
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                words.forEach { word ->
                                    val cleanWord = word.trim()
                                    Text(
                                        text = "$cleanWord ",
                                        style = MaterialTheme.typography.bodyLarge,
                                        fontSize = uiState.fontSizeSp.sp,
                                        color = textColor,
                                        modifier = Modifier
                                            .clickable { viewModel.lookupWord(cleanWord, uiState.pageText) }
                                            .padding(vertical = 2.dp)
                                    )
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(100.dp))
                    }
                }
            }

            // Word Lookup Sheet / Dialog
            if (uiState.selectedWord != null) {
                WordLookupDialog(
                    word = uiState.selectedWord!!,
                    info = uiState.wordInfo,
                    isLoading = uiState.isLoadingWordInfo,
                    onSpeak = { wordToSpeak, lang -> viewModel.speakWord(wordToSpeak, lang) },
                    onSaveToVocabulary = { info ->
                        viewModel.saveWordToVocabulary(info)
                        viewModel.closeWordLookup()
                    },
                    onDismiss = { viewModel.closeWordLookup() },
                    modifier = Modifier.align(Alignment.BottomCenter)
                )
            }
        }
    }
}
