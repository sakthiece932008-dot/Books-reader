package com.example.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Speed
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material.icons.filled.VolumeUp
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Slider
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.tts.TtsState

@Composable
fun AudioControlsBar(
    ttsState: TtsState,
    onPlay: () -> Unit,
    onStop: () -> Unit,
    onRateChange: (Float) -> Unit,
    onPitchChange: (Float) -> Unit,
    onLanguageChange: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    var expandedLangMenu by remember { mutableStateOf(false) }

    val languages = listOf(
        "ta" to "தமிழ் (Tamil)",
        "en" to "English",
        "hi" to "हिन्दी (Hindi)",
        "fr" to "Français",
        "es" to "Español",
        "de" to "Deutsch",
        "ja" to "日本語 (Japanese)"
    )

    val currentLangLabel = languages.find { it.first == ttsState.currentLanguage }?.second ?: "தமிழ் (Tamil)"

    Surface(
        modifier = modifier
            .fillMaxWidth()
            .testTag("audio_controls_bar"),
        shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp),
        tonalElevation = 8.dp,
        color = MaterialTheme.colorScheme.surfaceVariant
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 20.dp, vertical = 14.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Player Control Bar Header Row (Voice tone, Central Controls, Speed)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Left: Voice Tone / Language Indicator
                Column {
                    Text(
                        text = "VOICE TONE",
                        style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp),
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = "Natural • $currentLangLabel",
                        style = MaterialTheme.typography.bodySmall,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.primary
                    )
                }

                // Center: Play / Pause Button with rounded 20.dp pill shape & skip icons
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // Language picker mini button
                    IconButton(
                        onClick = { expandedLangMenu = true },
                        modifier = Modifier.testTag("tts_language_selector_button")
                    ) {
                        Icon(Icons.Default.Language, contentDescription = "Language", tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    }

                    DropdownMenu(
                        expanded = expandedLangMenu,
                        onDismissRequest = { expandedLangMenu = false }
                    ) {
                        languages.forEach { (code, label) ->
                            DropdownMenuItem(
                                text = { Text(label) },
                                onClick = {
                                    onLanguageChange(code)
                                    expandedLangMenu = false
                                }
                            )
                        }
                    }

                    // Main Play/Pause Button
                    Surface(
                        onClick = onPlay,
                        shape = RoundedCornerShape(20.dp),
                        color = if (ttsState.isSpeaking) MaterialTheme.colorScheme.errorContainer else MaterialTheme.colorScheme.primary,
                        contentColor = if (ttsState.isSpeaking) MaterialTheme.colorScheme.onErrorContainer else MaterialTheme.colorScheme.onPrimary,
                        shadowElevation = 4.dp,
                        modifier = Modifier
                            .height(52.dp)
                            .padding(horizontal = 4.dp)
                            .testTag("tts_play_pause_button")
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.Center
                        ) {
                            Icon(
                                imageVector = if (ttsState.isSpeaking) Icons.Default.Pause else Icons.Default.PlayArrow,
                                contentDescription = if (ttsState.isSpeaking) "Pause" else "Play",
                                modifier = Modifier.size(28.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = if (ttsState.isSpeaking) "Pause" else "Read Aloud",
                                fontWeight = FontWeight.Bold,
                                style = MaterialTheme.typography.labelLarge
                            )
                        }
                    }

                    if (ttsState.isSpeaking) {
                        IconButton(
                            onClick = onStop,
                            modifier = Modifier.testTag("tts_stop_button")
                        ) {
                            Icon(Icons.Default.Stop, contentDescription = "Stop TTS", tint = MaterialTheme.colorScheme.error)
                        }
                    }
                }

                // Right: Speed Indicator
                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        text = "SPEED",
                        style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp),
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = "${"%.1f".format(ttsState.speechRate)}x",
                        style = MaterialTheme.typography.bodySmall,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Speech rate slider
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.Default.Speed,
                    contentDescription = "Speech Rate",
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Slider(
                    value = ttsState.speechRate,
                    onValueChange = onRateChange,
                    valueRange = 0.5f..2.0f,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }
    }
}
