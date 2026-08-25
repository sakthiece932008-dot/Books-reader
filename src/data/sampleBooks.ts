import { BookEntity } from '../types';

export const initialSampleBooks: Omit<BookEntity, 'id' | 'addedTimestamp'>[] = [
  {
    title: 'திருக்குறள் (Thirukkural)',
    author: 'Thiruvalluvar (திருவள்ளுவர்)',
    filePath: 'sample_thirukkural',
    fileType: 'SAMPLE',
    language: 'ta',
    lastReadPageIndex: 0,
    totalPages: 5,
    coverBg: 'from-amber-700 to-amber-900',
    description: 'Classical Tamil ethical masterpiece consisting of 1,330 couplets (Kural) across Virtue, Wealth, and Love.',
    category: 'Tamil Classics',
    chapters: [
      {
        title: 'அத்தியாயம் 1: கடவுள் வாழ்த்து (Invocation)',
        pages: [
          `அகர முதல எழுத்தெல்லாம் ஆதி\nபகவன் முதற்றே உலகு.\n\n[Transliteration: Agara mudhala ezhutthellaam aadhi bhagavan mudhattre ulagu]\n[Translation: As the letter 'A' is the first of all letters, so the Primordial God is first in the world.]\n\nகற்றதனால் ஆய பயனென்கொல் வாலறிவன்\nநற்றாள் தொழாஅர் எனின்.\n\n[Transliteration: Kattradhanaal aaya payanengol vaalarivan natraal thozhaar enin]\n[Translation: What profit have those who learned if they worship not the sacred feet of Him who possesses pure knowledge?]`,
          `மலர்மிசை ஏகினான் மாணடி சேர்ந்தார்\nநிலமிசை நீடுவாழ் வார்.\n\n[Transliteration: Malarmisai aeginaan maanadi saerndhaar nilamisai needuvaazh vaar]\n[Translation: They who cling to the glorious feet of Him who dwells in the lotus heart of devotion shall live long upon the earth.]\n\nவேண்டுதல் வேண்டாமை இலானடி சேர்ந்தார்க்கு\nயாண்டும் இடும்பை இல.\n\n[Transliteration: Vaenduthal vaendaamai ilaanadi saerndhaarkku yaandum idumpai ila]\n[Translation: To those who cling to the feet of Him who has neither desire nor aversion, sorrow shall never come at any time.]`
        ]
      },
      {
        title: 'அத்தியாயம் 2: வான்சிறப்பு (Excellence of Rain)',
        pages: [
          `வானின்று உலகம் வழங்கி வருதலால்\nதான்அமிழ்தம் என்றுணரற் பாற்று.\n\n[Transliteration: Vaanintru ulagam vazhangi varuthalaal thaanamizhdham endrunarar paatru]\n[Translation: Because rain sustains the world in its regular course, it is regarded as true nectar.]\n\nதுப்பார்க்குத் துப்பாய துப்பாக்கித் துப்பார்க்குத்\nதுப்பாய தூஉம் மழை.\n\n[Transliteration: Thuppaarkkuth thuppaaya thuppaakkith thuppaarkkuth thuppaaya thooumazhai]\n[Translation: Rain creates wholesome food for those who eat, and itself becomes pure water to drink.]`
        ]
      },
      {
        title: 'அத்தியாயம் 3: அறன் வலியுறுத்தல் (Virtue)',
        pages: [
          `மனத்துக்கண் மாசிலன் ஆதல் அனைத்தறன்\nஆகுல நீர பிற.\n\n[Transliteration: Manathukkan maasilan aadhal anaiththaran aagula neera pira]\n[Translation: Purity in mind is the essence of all virtue; all else is mere noisy show.]`
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
          `அச்சமில்லை அச்சமில்லை அச்சமென்ப தில்லையே\nஇச்சகத்து ளோரெல்லாம் எதிர்த்து நின்ற போதினும்,\nஅச்சமில்லை அச்சமில்லை அச்சமென்ப தில்லையே!\n\n[Transliteration: Achamillai achamillai achamennpadhu illaiyae! Ichagathuloarellaam edhirthu nindra poadhinum, achamillai achamillai achamennpadhu illaiyae!]\n[Translation: Fear we not, fear we not, fear we have none at all! Even if all the people in this world stand against us, fear we have none at all!]`,
          `உச்சிமீது வானிடிந்து வீழுகின்ற போதினும்,\nஅச்சமில்லை அச்சமில்லை அச்சமென்ப தில்லையே!\n\n[Transliteration: Uchimheedhu vaanidindhu veezhugindra poadhinum, achamillai achamillai achamennpadhu illaiyae!]\n[Translation: Even if the sky breaks and falls upon our heads, fear we not, fear we have none at all!]`
        ]
      },
      {
        title: 'பாடல் 2: ஓடி விளையாடு பாப்பா (Childrens Song)',
        pages: [
          `ஓடி விளையாடு பாப்பா - நீ\nஓய்ந்திருக்க லாகாது பாப்பா,\nகூடி விளையாடு பாப்பா - ஒரு\nகுழந்தையை வையாதே பாப்பா.\n\n[Transliteration: Odi vilaiyaadu paappa - nee oayndhirukka laagaadhu paappa, koodi vilaiyaadu paappa - oru kuzhandhaiyai vaiyaadhae paappa.]\n[Translation: Run and play, dear child - you must not stay idle. Play together in groups, dear child - never scold or hurt another child.]`
        ]
      }
    ]
  },
  {
    title: 'The Little Prince',
    author: 'Antoine de Saint-Exupéry',
    filePath: 'sample_little_prince',
    fileType: 'SAMPLE',
    language: 'en',
    lastReadPageIndex: 0,
    totalPages: 3,
    coverBg: 'from-blue-600 to-indigo-900',
    description: 'A poetic tale with watercolor illustrations by the author, where a pilot stranded in the desert meets a young prince visiting Earth.',
    category: 'Foreign Literature',
    chapters: [
      {
        title: 'Chapter I: The Picture of a Boa Constrictor',
        pages: [
          `Once when I was six years old I saw a magnificent picture in a book, called True Stories from Nature, about the primeval forest. It was a picture of a boa constrictor in the act of swallowing an animal. Here is a copy of the drawing.\n\nIn the book it said: "Boa constrictors swallow their prey whole, without chewing it. After that they are not able to move, and they sleep through the six months that they need for their digestion."\n\nI pondered deeply, then, over the adventures of the jungle. And after some work with a colored pencil I succeeded in making my first drawing. My Drawing Number One. It looked something like this...\n\nI showed my masterpiece to the grown-ups, and asked them whether the drawing frightened them.\n\nThey answered: "Frighten? Why should any one be frightened by a hat?"\n\nMy drawing was not a picture of a hat. It was a picture of a boa constrictor digesting an elephant.`
        ]
      },
      {
        title: 'Chapter II: The Little Prince Appears',
        pages: [
          `So I lived my life alone, without anyone that I could really talk to, until I had an accident with my plane in the Desert of Sahara, six years ago. Something was broken in my engine. And as I had with me neither a mechanic nor any passengers, I set myself to attempt the difficult repair all alone. It was a question of life or death for me: I had scarcely enough drinking water to last a week.\n\nThe first night, then, I went to sleep on the sand, a thousand miles from any inhabited territory. I was more isolated than a shipwrecked sailor on a raft in the middle of the ocean. Thus you can imagine my amazement, at sunrise, when I was awakened by an odd little voice.\n\nIt said: "If you please—draw me a sheep!"\n\n"What!"\n\n"Draw me a sheep..."`
        ]
      },
      {
        title: 'Chapter III: Le Petit Prince (En Français)',
        pages: [
          `Lorsque j'avais six ans j'ai vu, une fois, une magnifique image, dans un livre sur la Forêt Vierge qui s'appelait "Histoires Vécues". Ça représentait un serpent boa qui avalait un fauve. On disait dans le livre: "Les serpents boas avalent leur proie tout entière, sans la mâcher. Ensuite ils ne peuvent plus bouger et ils dorment pendant les six mois de leur digestion."\n\nJ'ai alors beaucoup réfléchi sur les aventures de la jungle et, à mon tour, j'ai réussi, avec un crayon de couleur, à tracer mon premier dessin. Mon dessin numéro 1. Il était comme ça...`
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
        title: 'அத்தியாயம் 1: ஆடிப் பெருக்கு (Chapter 1: Aadi Festival)',
        pages: [
          `ஆடிப் பெருக்கு நாளில் சோழ நாட்டு நதிகள் பொங்கி வழிந்தன. வீரநாராயண ஏரி கடலைப்போல் கரை புரண்டு அலைமோதிக்கொண்டிருந்தது.\n\n[Transliteration: Aadi perukku naalil Chola naattu nadhigal meedhu vellam pongiyadhu. Veera Narayana aeri kadalai poal alaimoadhik kondirundhadhu.]\n\nவந்தியத்தேவன் தன் குதிரையின் மீது ஏறி, தஞ்சாவூர் கோட்டையை நோக்கிப் பிரயாணம் செய்துகொண்டிருந்தான். இளைய பிராயத்து வீரனின் நெஞ்சில் ஆயிரம் ஆசைகளும் கனவுகளும் கொந்தளித்தன.`
        ]
      },
      {
        title: 'அத்தியாயம் 2: வந்தியத்தேவன் பயணம் (Chapter 2: Vandiyathevan Journey)',
        pages: [
          `சோழப் பேரரசின் கொடியில் பாய்ந்து பாயும் புலிச்சின்னம் காற்றில் கம்பீரமாகப் பறந்துகொண்டிருந்தது. வடக்கே ராஷ்டிரகூடர்களின் அச்சுறுத்தல், தெற்கே இலங்கை யுத்தம்—ஆனால் தஞ்சைப் பெரிய மாளிகையில் இரகசிய ஆலோசனை நடந்துகொண்டிருந்தது.`
        ]
      }
    ]
  },
  {
    title: 'The Art of War',
    author: 'Sun Tzu (孫子)',
    filePath: 'sample_art_of_war',
    fileType: 'SAMPLE',
    language: 'en',
    lastReadPageIndex: 0,
    totalPages: 2,
    coverBg: 'from-emerald-700 to-teal-900',
    description: 'An ancient Chinese military treatise attributed to Sun Tzu, composed of 13 chapters on military strategy and tactics.',
    category: 'Foreign Literature',
    chapters: [
      {
        title: 'Chapter I: Laying Plans',
        pages: [
          `Sun Tzu said: The art of war is of vital importance to the State. It is a matter of life and death, a road either to safety or to ruin. Hence it is a subject of inquiry which can on no account be neglected.\n\nThe art of war, then, is governed by five constant factors, to be taken into account in one's deliberations, when seeking to determine the conditions obtaining in the field.\n\nThese are: (1) The Moral Law; (2) Heaven; (3) Earth; (4) The Commander; (5) Method and discipline.\n\nAll warfare is based on deception. Hence, when able to attack, we must seem unable; when using our forces, we must seem inactive; when we are near, we must make the enemy believe we are far away; when far away, we must make him believe we are near.`
        ]
      }
    ]
  }
];
