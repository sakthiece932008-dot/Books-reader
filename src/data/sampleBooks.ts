import { BookEntity } from '../types';

export const initialSampleBooks: Omit<BookEntity, 'id' | 'addedTimestamp'>[] = [
  {
    title: 'திருக்குறள் (Thirukkural)',
    author: 'Thiruvalluvar (திருவள்ளுவர்)',
    filePath: 'sample_thirukkural',
    fileType: 'SAMPLE',
    language: 'ta',
    lastReadPageIndex: 0,
    totalPages: 4,
    coverBg: 'from-amber-700 to-amber-900',
    description: 'Classical Tamil ethical masterpiece consisting of 1,330 couplets (Kural) across Virtue, Wealth, and Love.',
    category: 'Tamil Classics',
    chapters: [
      {
        title: 'அத்தியாயம் 1: கடவுள் வாழ்த்து (Invocation)',
        pages: [
          `அகர முதல எழுத்தெல்லாம் ஆதி பகவன் முதற்றே உலகு.\n\nகற்றதனால் ஆய பயனென்கொல் வாலறிவன் நற்றாள் தொழாஅர் எனின்.\n\nமலர்மிசை ஏகினான் மாணடி சேர்ந்தார் நிலமிசை நீடுவாழ் வார்.\n\nவேண்டுதல் வேண்டாமை இலானடி சேர்ந்தார்க்கு யாண்டும் இடும்பை இல.`,
          `இருள்சேர் இருவினையும் சேரா இறைவன் பொருள்சேர் புகழ்புரிந்தார் மாட்டு.\n\nபொறிவாயில் ஐந்தவித்தான் பொய்தீர் ஒழுக்க நெறிநின்றார் நீடுவாழ் வார்.\n\nதனக்குவமை இல்லாதான் தாள்சேர்ந்தார்க் கல்லால் மனக்கவலை மாற்றல் அரிது.`
        ]
      },
      {
        title: 'அத்தியாயம் 2: வான்சிறப்பு (Excellence of Rain)',
        pages: [
          `வானின்று உலகம் வழங்கி வருதலால் தான்அமிழ்தம் என்றுணரற் பாற்று.\n\nதுப்பார்க்குத் துப்பாய துப்பாக்கித் துப்பார்க்குத் துப்பாய தூஉம் மழை.\n\nவிண்இன்று பொய்ப்பின் விரிநீர் வியனுலகத்து உள்நின்று உடற்றும் பசி.`
        ]
      },
      {
        title: 'அத்தியாயம் 3: அறன் வலியுறுத்தல் (Power of Virtue)',
        pages: [
          `மனத்துக்கண் மாசிலன் ஆதல் அனைத்தறன் ஆகுல நீர பிற.\n\nஅழுக்காறு அவாவெகுளி இன்னாச்சொல் நான்கும் இழுக்கா இயன்றது அறம்.\n\nஅன்றறிவாம் என்னாது அறஞ்செய்க மற்றது பொன்றுங்கால் பொன்றாத் துணை.`
        ]
      }
    ]
  },
  {
    title: 'பாரதியார் கவிதைகள் (Mahakavi Bharathiyar Poems)',
    author: 'Subramania Bharathi (சுப்பிரமணிய பாரதியார்)',
    filePath: 'sample_bharathiyar',
    fileType: 'SAMPLE',
    language: 'ta',
    lastReadPageIndex: 0,
    totalPages: 3,
    coverBg: 'from-orange-600 to-red-800',
    description: 'Inspiring patriotic and freedom-loving poems by Tamil poet Mahakavi Subramania Bharathi.',
    category: 'Tamil Classics',
    chapters: [
      {
        title: 'பாடல் 1: அச்சமில்லை (Fearlessness)',
        pages: [
          `அச்சமில்லை அச்சமில்லை அச்சமென்ப தில்லையே,\nஇச்சகத்து ளோரெல்லாம் எதிர்த்து நின்ற போதினும்,\nஅச்சமில்லை அச்சமில்லை அச்சமென்ப தில்லையே!\n\nஉச்சிமீது வானிடிந்து வீழுகின்ற போதினும்,\nஅச்சமில்லை அச்சமில்லை அச்சமென்ப தில்லையே!`,
          `பச்சைஊன் கொழுத்தமின்னல் பாய்ந்துசென்று தாக்கினும்,\nஅச்சமில்லை அச்சமில்லை அச்சமென்ப தில்லையே!\n\nகற்றையாய் எழுந்ததீயில் காவுவந்து மூடினும்,\nஅச்சமில்லை அச்சமில்லை அச்சமென்ப தில்லையே!`
        ]
      },
      {
        title: 'பாடல் 2: ஓடி விளையாடு பாப்பா (Song of Freedom)',
        pages: [
          `ஓடி விளையாடு பாப்பா - நீ ஓய்ந்திருக்க லாகாது பாப்பா,\nகூடி விளையாடு பாப்பா - ஒரு குழந்தையை வையாதே பாப்பா.\n\nகாலை எழுந்தவுடன் படிப்பு - பின்பு கனிவு கொடுக்கும் நல்ல பாட்டு,\nமாலை முழுதும் விளையாட்டு - என்று வழக்கப் படுத்திக்கொள்ளு பாப்பா.`
        ]
      }
    ]
  },
  {
    title: 'பொன்னியின் செல்வன் (Ponniyin Selvan)',
    author: 'Kalki Krishnamurthy (கல்கி)',
    filePath: 'sample_ponniyin_selvan',
    fileType: 'SAMPLE',
    language: 'ta',
    lastReadPageIndex: 0,
    totalPages: 3,
    coverBg: 'from-amber-600 to-red-900',
    description: 'The monumental epic Tamil historical novel depicting the early life of Arulmozhivarman (Rajaraja Chola I).',
    category: 'Tamil Classics',
    chapters: [
      {
        title: 'அத்தியாயம் 1: ஆடிப் பெருக்கு (Aadi Flood)',
        pages: [
          `ஆடிப் பெருக்கு நாளில் சோழ நாட்டு நதிகள் பொங்கி வழிந்தன. வீரநாராயண ஏரி கடலைப்போல் கரை புரண்டு அலைமோதிக்கொண்டிருந்தது.\n\nவந்தியத்தேவன் தன் குதிரையின் மீது ஏறி, தஞ்சாவூர் கோட்டையை நோக்கிப் பிரயாணம் செய்துகொண்டிருந்தான். இளைய பிராயத்து வீரனின் நெஞ்சில் ஆயிரம் ஆசைகளும் கனவுகளும் கொந்தளித்தன.`
        ]
      },
      {
        title: 'அத்தியாயம் 2: இளவரசர் அருள்மொழிவர்மன்',
        pages: [
          `சோழப் பேரரசின் கொடியில் பாயும் புலிச்சின்னம் காற்றில் கம்பீரமாகப் பறந்துகொண்டிருந்தது. வடக்கே பகைவர்களின் அச்சுறுத்தல், தெற்கே இலங்கை யுத்தம்—ஆனால் தஞ்சைப் பெரிய மாளிகையில் இரகசிய ஆலோசனை நடந்துகொண்டிருந்தது.`
        ]
      }
    ]
  },
  {
    title: 'The Little Prince (Le Petit Prince)',
    author: 'Antoine de Saint-Exupéry',
    filePath: 'sample_little_prince',
    fileType: 'SAMPLE',
    language: 'fr',
    lastReadPageIndex: 0,
    totalPages: 3,
    coverBg: 'from-blue-600 to-indigo-900',
    description: 'A poetic tale of friendship, stars, and innocence written in French and beloved across all cultures.',
    category: 'Foreign Literature',
    chapters: [
      {
        title: 'Chapitre I: Le serpent boa',
        pages: [
          `Lorsque j'avais six ans j'ai vu, une fois, une magnifique image, dans un livre sur la Forêt Vierge qui s'appelait "Histoires Vécues". Ça représentait un serpent boa qui avalait un fauve.\n\nOn disait dans le livre: "Les serpents boas avalent leur proie tout entière, sans la mâcher. Ensuite ils ne peuvent plus bouger et ils dorment pendant les six mois de leur digestion."\n\nJ'ai alors beaucoup réfléchi sur les aventures de la jungle et, à mon tour, j'ai réussi, avec un crayon de couleur, à tracer mon premier dessin. Mon dessin numéro 1.`
        ]
      },
      {
        title: 'Chapitre II: S\'il vous plaît, dessine-moi un mouton',
        pages: [
          `J'ai ainsi vécu seul, sans personne avec qui parler véritablement, jusqu'à une panne dans le désert du Sahara, il y a six ans. Quelque chose s'était cassé dans mon moteur.\n\nLe premier soir je me suis donc endormi sur le sable à mille milles de toute terre habitée. J'étais bien plus isolé qu'un naufragé sur un radeau au milieu de l'océan.\n\nAlors vous imaginez ma surprise, au lever du jour, quand une drôle de petite voix m'a réveillé. Elle disait: "S'il vous plaît... dessine-moi un mouton!"`
        ]
      }
    ]
  },
  {
    title: 'Godaan (गोदान)',
    author: 'Munshi Premchand (मुंशी प्रेमचंद)',
    filePath: 'sample_godaan',
    fileType: 'SAMPLE',
    language: 'hi',
    lastReadPageIndex: 0,
    totalPages: 2,
    coverBg: 'from-yellow-700 to-amber-900',
    description: 'The monumental classic of modern Hindi-Urdu literature depicting the peasant life and socio-economic struggles of Indian rural society.',
    category: 'Indian Classics',
    chapters: [
      {
        title: 'अध्याय 1: होरी का स्वप्न',
        pages: [
          `होरी महतो ने दोनों बैलों को सानी-पानी देकर अपनी पत्नी धनिया से कहा—"गोबर को जरा होशियार कर देना, आज खेत पर पानी लगाना है। मैं रायसाहब के यहां जा रहा हूं।"\n\nधनिया ने कहा—"आज ही तो रुपए मिलेंगे नहीं, फिर इतनी सुबह क्यों जा रहे हो?"\n\nहोरी ने पगड़ी बांधते हुए कहा—"मालिक के दरबार में हाजिरी देना तो फर्ज है। जब तक बड़े आदमियों का सहारा न हो, तब तक गरीब की गाड़ी कैसे चले?"`
        ]
      }
    ]
  },
  {
    title: 'Don Quijote de la Mancha',
    author: 'Miguel de Cervantes',
    filePath: 'sample_don_quixote',
    fileType: 'SAMPLE',
    language: 'es',
    lastReadPageIndex: 0,
    totalPages: 2,
    coverBg: 'from-red-700 to-rose-950',
    description: 'The founding work of modern Western literature following the noble Alonso Quixano who sets out on chivalric quests.',
    category: 'World Classics',
    chapters: [
      {
        title: 'Capítulo I: El ingenioso hidalgo',
        pages: [
          `En un lugar de la Mancha, de cuyo nombre no quiero acordarme, no ha mucho tiempo que vivía un hidalgo de los de lanza en astillero, adarga antigua, rocín flaco y galgo corredor.\n\nUna olla de algo más vaca que carnero, salpicón las más noches, duelos y quebrantos los sábados, lantejas los viernes, algún palomino de añadidura los domingos, consumían las tres partes de su hacienda.`
        ]
      }
    ]
  },
  {
    title: 'Pride and Prejudice',
    author: 'Jane Austen',
    filePath: 'sample_pride_prejudice',
    fileType: 'SAMPLE',
    language: 'en',
    lastReadPageIndex: 0,
    totalPages: 2,
    coverBg: 'from-teal-700 to-emerald-950',
    description: 'A masterpiece of English literature following Elizabeth Bennet as she navigates manners, upbringing, morality, and marriage in Regency England.',
    category: 'World Classics',
    chapters: [
      {
        title: 'Chapter 1: Netherfield Park',
        pages: [
          `It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.\n\nHowever little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families, that he is considered the rightful property of some one or other of their daughters.\n\n"My dear Mr. Bennet," said his lady to him one day, "have you heard that Netherfield Park is let at last?"`
        ]
      }
    ]
  }
];
