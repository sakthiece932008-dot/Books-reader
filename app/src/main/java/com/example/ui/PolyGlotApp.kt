package com.example.ui

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.LibraryBooks
import androidx.compose.material.icons.filled.Psychology
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.example.data.db.AppDatabase
import com.example.data.repository.BookRepository
import com.example.data.repository.VocabularyRepository
import com.example.tts.TtsManager
import com.example.ui.screens.LibraryScreen
import com.example.ui.screens.ReaderScreen
import com.example.ui.screens.TutorScreen
import com.example.ui.screens.VocabularyScreen
import com.example.ui.viewmodel.BookReaderViewModel
import com.example.ui.viewmodel.BookReaderViewModelFactory
import com.example.ui.viewmodel.LibraryViewModel
import com.example.ui.viewmodel.LibraryViewModelFactory
import com.example.ui.viewmodel.TutorViewModel
import com.example.ui.viewmodel.VocabularyViewModel
import com.example.ui.viewmodel.VocabularyViewModelFactory

@Composable
fun PolyGlotApp() {
    val context = LocalContext.current
    val navController = rememberNavController()

    // Database & Repositories
    val db = remember { AppDatabase.getInstance(context) }
    val bookRepo = remember { BookRepository(db.bookDao(), db.bookmarkDao()) }
    val vocabRepo = remember { VocabularyRepository(db.vocabularyDao()) }

    // TTS Manager
    val ttsManager = remember { TtsManager(context) }

    // ViewModels
    val libraryViewModel = remember { LibraryViewModelFactory(bookRepo).create(LibraryViewModel::class.java) }
    val readerViewModel = remember { BookReaderViewModelFactory(bookRepo, vocabRepo, ttsManager).create(BookReaderViewModel::class.java) }
    val vocabularyViewModel = remember { VocabularyViewModelFactory(vocabRepo, ttsManager).create(VocabularyViewModel::class.java) }
    val tutorViewModel = remember { TutorViewModel(ttsManager) }

    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    // Show BottomBar on main screens
    val showBottomBar = currentRoute in listOf("library", "vocabulary", "tutor")

    Scaffold(
        bottomBar = {
            if (showBottomBar) {
                NavigationBar(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant,
                    contentColor = MaterialTheme.colorScheme.onSurface,
                    tonalElevation = 6.dp,
                    modifier = Modifier.testTag("main_navigation_bar")
                ) {
                    NavigationBarItem(
                        selected = currentRoute == "library",
                        onClick = {
                            navController.navigate("library") {
                                popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                        icon = { Icon(Icons.Default.LibraryBooks, contentDescription = "Library") },
                        label = { Text("Library", fontWeight = FontWeight.SemiBold) },
                        modifier = Modifier.testTag("nav_item_library")
                    )

                    NavigationBarItem(
                        selected = currentRoute == "vocabulary",
                        onClick = {
                            navController.navigate("vocabulary") {
                                popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                        icon = { Icon(Icons.Default.Psychology, contentDescription = "Vocabulary") },
                        label = { Text("Vocabulary", fontWeight = FontWeight.SemiBold) },
                        modifier = Modifier.testTag("nav_item_vocabulary")
                    )

                    NavigationBarItem(
                        selected = currentRoute == "tutor",
                        onClick = {
                            navController.navigate("tutor") {
                                popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                        icon = { Icon(Icons.Default.AutoAwesome, contentDescription = "AI Tutor") },
                        label = { Text("AI Tutor", fontWeight = FontWeight.SemiBold) },
                        modifier = Modifier.testTag("nav_item_tutor")
                    )
                }
            }
        },
        modifier = Modifier.fillMaxSize()
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = "library",
            modifier = Modifier.padding(innerPadding)
        ) {
            composable("library") {
                LibraryScreen(
                    viewModel = libraryViewModel,
                    onBookClick = { bookId ->
                        navController.navigate("reader/$bookId")
                    }
                )
            }

            composable(
                route = "reader/{bookId}",
                arguments = listOf(navArgument("bookId") { type = NavType.LongType })
            ) { backStackEntry ->
                val bookId = backStackEntry.arguments?.getLong("bookId") ?: 0L
                ReaderScreen(
                    bookId = bookId,
                    viewModel = readerViewModel,
                    onBack = { navController.popBackStack() }
                )
            }

            composable("vocabulary") {
                VocabularyScreen(
                    viewModel = vocabularyViewModel
                )
            }

            composable("tutor") {
                TutorScreen(
                    viewModel = tutorViewModel
                )
            }
        }
    }
}
