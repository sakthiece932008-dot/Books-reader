package com.example.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext

private val DarkColorScheme = darkColorScheme(
    primary = ProfessionalHighlightPurple,
    onPrimary = Color(0xFF381E72),
    primaryContainer = Color(0xFF4F378B),
    onPrimaryContainer = ProfessionalPrimaryContainer,
    secondary = ProfessionalHighlightPink,
    secondaryContainer = Color(0xFF4A4458),
    tertiary = Color(0xFFEFB8C8),
    background = DarkReaderBackground,
    surface = DarkReaderSurface,
    surfaceVariant = Color(0xFF49454F),
    onBackground = DarkReaderText,
    onSurface = DarkReaderText,
    outline = Color(0xFF938F99),
    outlineVariant = Color(0xFF49454F)
)

private val LightColorScheme = lightColorScheme(
    primary = ProfessionalPrimary,
    onPrimary = ProfessionalOnPrimary,
    primaryContainer = ProfessionalPrimaryContainer,
    onPrimaryContainer = ProfessionalOnPrimaryContainer,
    secondary = ProfessionalSecondary,
    secondaryContainer = ProfessionalSecondaryContainer,
    onSecondaryContainer = ProfessionalOnSecondaryContainer,
    tertiary = ProfessionalTertiary,
    tertiaryContainer = ProfessionalTertiaryContainer,
    onTertiaryContainer = ProfessionalOnTertiaryContainer,
    background = ProfessionalBackground,
    surface = ProfessionalSurface,
    surfaceVariant = ProfessionalSurfaceVariant,
    onBackground = ProfessionalText,
    onSurface = ProfessionalText,
    onSurfaceVariant = ProfessionalTextSubtle,
    outline = ProfessionalOutline,
    outlineVariant = ProfessionalOutlineVariant
)

@Composable
fun PolyGlotTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = false,
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }
        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
