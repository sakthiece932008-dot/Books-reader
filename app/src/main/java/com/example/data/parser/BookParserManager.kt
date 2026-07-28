package com.example.data.parser

import android.content.Context
import android.graphics.Bitmap
import android.graphics.pdf.PdfRenderer
import android.net.Uri
import android.os.ParcelFileDescriptor
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.BufferedReader
import java.io.File
import java.io.FileOutputStream
import java.io.InputStreamReader
import java.util.zip.ZipInputStream

data class ParsedPage(
    val pageIndex: Int,
    val textContent: String,
    val bitmap: Bitmap? = null
)

data class ParsedBookContent(
    val title: String,
    val author: String,
    val language: String,
    val pages: List<ParsedPage>
)

object BookParserManager {

    private const val TAG = "BookParserManager"

    suspend fun parseUploadedFile(context: Context, uri: Uri, fileName: String): ParsedBookContent = withContext(Dispatchers.IO) {
        val extension = fileName.substringAfterLast('.', "").lowercase()
        when (extension) {
            "pdf" -> parsePdf(context, uri, fileName)
            "epub" -> parseEpub(context, uri, fileName)
            "txt" -> parseTxt(context, uri, fileName)
            else -> parseTxt(context, uri, fileName)
        }
    }

    private fun parsePdf(context: Context, uri: Uri, fileName: String): ParsedBookContent {
        val pages = mutableListOf<ParsedPage>()
        val tempFile = File(context.cacheDir, "temp_reader_$fileName")
        try {
            context.contentResolver.openInputStream(uri)?.use { input ->
                FileOutputStream(tempFile).use { output ->
                    input.copyTo(output)
                }
            }
            val fileDescriptor = ParcelFileDescriptor.open(tempFile, ParcelFileDescriptor.MODE_READ_ONLY)
            val pdfRenderer = PdfRenderer(fileDescriptor)
            val pageCount = pdfRenderer.pageCount

            for (i in 0 until pageCount) {
                // Generate page placeholder text or page indicator
                val sampleText = "Page ${i + 1} of PDF Document ($fileName).\n\n" +
                        "Use real-time translation or tap any word for Tamil pronunciation, phonetics, and educational tools."
                pages.add(ParsedPage(pageIndex = i, textContent = sampleText))
            }

            pdfRenderer.close()
            fileDescriptor.close()
        } catch (e: Exception) {
            Log.e(TAG, "Error parsing PDF", e)
            pages.add(ParsedPage(0, "Error opening PDF file: ${e.message}\n\nPlease verify file permissions or try uploading another document."))
        } finally {
            if (tempFile.exists()) tempFile.delete()
        }

        return ParsedBookContent(
            title = fileName.substringBeforeLast('.'),
            author = "Uploaded Document",
            language = "en",
            pages = if (pages.isEmpty()) listOf(ParsedPage(0, "Empty PDF file")) else pages
        )
    }

    private fun parseEpub(context: Context, uri: Uri, fileName: String): ParsedBookContent {
        val extractedTextBuilder = StringBuilder()
        try {
            context.contentResolver.openInputStream(uri)?.use { inputStream ->
                ZipInputStream(inputStream).use { zip ->
                    var entry = zip.nextEntry
                    while (entry != null) {
                        if (entry.name.endsWith(".xhtml") || entry.name.endsWith(".html") || entry.name.endsWith(".htm")) {
                            val reader = BufferedReader(InputStreamReader(zip, "UTF-8"))
                            val html = reader.readText()
                            // Strip HTML tags simply
                            val cleanText = html.replace(Regex("<[^>]*>"), " ")
                                .replace(Regex("\\s+"), " ")
                                .trim()
                            if (cleanText.isNotBlank()) {
                                extractedTextBuilder.append(cleanText).append("\n\n")
                            }
                        }
                        zip.closeEntry()
                        entry = zip.nextEntry
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error parsing EPUB", e)
        }

        val fullText = extractedTextBuilder.toString().ifBlank {
            "EPUB content loaded ($fileName).\n\nWelcome to PolyGlot Reader! Tap any word or sentence to translate into Tamil, view phonetics, and listen to natural voice pronunciation."
        }

        val pages = chunkTextToPages(fullText)
        return ParsedBookContent(
            title = fileName.substringBeforeLast('.'),
            author = "EPUB Author",
            language = "en",
            pages = pages
        )
    }

    private fun parseTxt(context: Context, uri: Uri, fileName: String): ParsedBookContent {
        val textBuilder = StringBuilder()
        try {
            context.contentResolver.openInputStream(uri)?.use { inputStream ->
                BufferedReader(InputStreamReader(inputStream, "UTF-8")).use { reader ->
                    var line: String?
                    while (reader.readLine().also { line = it } != null) {
                        textBuilder.append(line).append("\n")
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error reading TXT", e)
        }

        val pages = chunkTextToPages(textBuilder.toString().ifBlank { "No text content found in file." })
        return ParsedBookContent(
            title = fileName.substringBeforeLast('.'),
            author = "Document Text",
            language = "en",
            pages = pages
        )
    }

    fun chunkTextToPages(text: String, charsPerPage: Int = 1200): List<ParsedPage> {
        val pages = mutableListOf<ParsedPage>()
        if (text.isBlank()) return listOf(ParsedPage(0, "Empty document"))

        val paragraphs = text.split("\n\n")
        var currentPageText = StringBuilder()
        var pageIndex = 0

        for (para in paragraphs) {
            if (currentPageText.length + para.length > charsPerPage && currentPageText.isNotEmpty()) {
                pages.add(ParsedPage(pageIndex++, currentPageText.toString().trim()))
                currentPageText = StringBuilder()
            }
            currentPageText.append(para).append("\n\n")
        }

        if (currentPageText.isNotEmpty()) {
            pages.add(ParsedPage(pageIndex, currentPageText.toString().trim()))
        }

        return if (pages.isEmpty()) listOf(ParsedPage(0, text)) else pages
    }

    // Classical Multilingual Books
    fun getPreloadedSampleBooks(): List<ParsedBookContent> {
        return listOf(
            ParsedBookContent(
                title = "Thirukkural - திருக்குறள்",
                author = "Thiruvalluvar (திருவள்ளுவர்)",
                language = "ta",
                pages = listOf(
                    ParsedPage(
                        pageIndex = 0,
                        textContent = """
                            அதிகாரம் 1: கடவுள் வாழ்த்து (Invocation to God)

                            1. அகர முதல எழுத்தெல்லாம் ஆதி
                            பகவன் முதற்றே உலகு.
                            [Agara mudhala ezhuthellaam aadhi
                            bhagavan mudhatre ulagu.]
                            Translation: As the letter 'A' is the first of all letters, so the Eternal God is primary in the world.

                            2. கற்றதனா லாய பயனென்கொல் வாலறிவன்
                            நற்றாள் தொழாஅர் எனின்.
                            [Katradhanaal aaya payanengol vaalarivan
                            natraal thozhaar enin.]
                            Translation: What is the benefit of learning if one does not worship the good feet of the Pure All-Knowing Being?

                            3. மலர்மிசை ஏகினான் மாணடி சேர்ந்தார்
                            நிலமிசை நீடுவாழ் வார்.
                            [Malarmisai aekinaan maanadi saerndhaar
                            nilamisai needuvaazh vaar.]
                            Translation: Those who devotionally cling to the glorious feet of Him who dwells in the heart blossom will live long and prosperously on earth.
                        """.trimIndent()
                    ),
                    ParsedPage(
                        pageIndex = 1,
                        textContent = """
                            அதிகாரம் 2: வான்சிறப்பு (The Greatness of Rain)

                            4. துப்பார்க்குத் துப்பாய துப்பாக்கித் துப்பார்க்குத்
                            துப்பாய தூஉம் மழை.
                            [Thuppaarkkuth thuppaaya thuppaakkith thuppaarkkuth
                            thuppaaya thoouam mazhai.]
                            Translation: Rain creates nourishment for all who eat, and rain itself serves as sustaining food.

                            5. கெடுப்பதூஉம் கெட்டார்க்குச் சார்வாய்மற் றாங்கே
                            எடுப்பதூஉம் எல்லாம் மழை.
                            [Keduppadhooum kettaarkkuch saarvaaymat raangga
                            eduppadhooum ellaam mazhai.]
                            Translation: Rain can ruin livelihoods by withholding, and yet rain alone can restore those who are ruined.
                        """.trimIndent()
                    )
                )
            ),
            ParsedBookContent(
                title = "Silappatikaram - சிலப்பதிகாரம்",
                author = "Ilango Adigal (இளங்கோ அடிகள்)",
                language = "ta",
                pages = listOf(
                    ParsedPage(
                        pageIndex = 0,
                        textContent = """
                            மங்கள வாழ்த்துப் பாடல் (Auspicious Invocation)

                            திங்களைப் போற்றுதும் திங்களைப் போற்றுதும்
                            கொங்கு அலர்தார்ச் சென்னி குளிர்வெண் குடைபோன்ற இவ்
                            அங்கண் உலகுஅளித்த லான்.
                            [Thingalai poatrudhum thingalai poatrudhum
                            kongu alardhaarch chenni kulirven kudaippoandra iv
                            angkan ulagualiththa laan.]

                            Translation: Let us praise the Moon! Let us praise the Moon! For like the cool white parasol of the Chola king crowned with honey-blooming garland, it bestows mercy upon the spacious world.

                            ஞாயிறு போற்றுதும் ஞாயிறு போற்றுதும்
                            காவிரி நாடன் திகிரி போல் பொற்கோட்டு
                            மேரு வலம் திரிதலான்.
                            [Gnaayiru poatrudhum gnaayiru poatrudhum
                            kaaviri naadan thigiri poal porkoattu
                            maeru valam thiridhalaan.]

                            Translation: Let us praise the Sun! For like the golden chariot wheel of the ruler of the fertile Kaveri land, it circles the golden peaks of Mount Meru.
                        """.trimIndent()
                    )
                )
            ),
            ParsedBookContent(
                title = "The Little Prince - Le Petit Prince",
                author = "Antoine de Saint-Exupéry",
                language = "fr",
                pages = listOf(
                    ParsedPage(
                        pageIndex = 0,
                        textContent = """
                            Chapter 1 - Chapitre 1

                            Lorsque j'avais six ans j'ai vu, une fois, une magnifique image, dans un livre sur la Forêt Vierge qui s'appelait "Histoires Vécues".
                            [When I was six years old I saw once a magnificent picture in a book about the Primeval Forest called "True Stories".]

                            Elle représentait un serpent boa qui avalait un fauve.
                            [It represented a boa constrictor swallowing a wild beast.]

                            On disait dans le livre: "Les serpents boas avalent leur proie tout entière, sans la mâcher. Ensuite ils ne peuvent plus bouger et ils dorment pendant les six mois de leur digestion."
                            [The book said: "Boa constrictors swallow their prey whole, without chewing it. After that they cannot move and sleep six months for digestion."]
                        """.trimIndent()
                    )
                )
            ),
            ParsedBookContent(
                title = "Panchatantra Multilingual Tales",
                author = "Pandit Vishnu Sharma",
                language = "hi",
                pages = listOf(
                    ParsedPage(
                        pageIndex = 0,
                        textContent = """
                            The Monkey and the Crocodile - குரங்கும் முதளையும்

                            On the banks of a river, a wise monkey lived on a rose-apple tree.
                            [நதிக்கரையில் ஒரு ரோஜா-ஆப்பிள் மரத்தில் ஒரு புத்திசாலி குரங்கு வாழ்ந்து வந்தது.]

                            He befriended a crocodile and shared sweet fruits every day.
                            [அது ஒரு முதளையுடன் நட்பாகப் பழகி தினமும் இனிப்பான பழங்களைப் பகிர்ந்து கொண்டது.]

                            The crocodile said, "My friend, your kindness brings sweetness into my life!"
                            [முதளை கூறியது: "என் நண்பா, உனது இரக்கம் என் வாழ்க்கையில் இனிமையைக் கொண்டுவருகிறது!"]

                            Moral: A true friend is known in times of trial and sincerity.
                            [நீதி: உண்மையான நண்பன் சோதனைக் காலத்திலும் உண்மையான பண்பிலும் அறியப்படுகிறான்.]
                        """.trimIndent()
                    )
                )
            )
        )
    }
}
