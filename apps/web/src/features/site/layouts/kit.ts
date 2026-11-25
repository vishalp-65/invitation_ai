import type { SiteLayout } from '@cardai/shared';

/**
 * What a host can change in each layout design, in one place: the layout reads it (defaults)
 * and the builder lists it (fields), so both always agree. Text keys are stored in
 * `doc.custom.text`, photo slots in `doc.custom.photos` (which photo, focus point, zoom).
 */

export interface KitText {
  key: string;
  label: string;
  en: string;
  hi: string;
  /** Longer text (textarea in the builder). */
  long?: boolean;
}

export interface KitPhoto {
  key: string;
  label: string;
  /** Which of the invitation's photos it shows until the host picks one. */
  from: number;
}

export interface Kit {
  text: KitText[];
  photos: KitPhoto[];
  /** Heading and handwriting fonts the host can switch between (first = the design's own). */
  fonts: { display: string[]; script: string[] };
}

const t = (key: string, label: string, en: string, hi: string, long = false): KitText => ({ key, label, en, hi, ...(long ? { long } : {}) });
const p = (key: string, label: string, from: number): KitPhoto => ({ key, label, from });

const SERIFS = ['DM Serif Display', 'Playfair Display', 'Abril Fatface', 'Cormorant Garamond', 'Bebas Neue', 'Poppins'];
const SCRIPTS = ['Dancing Script', 'Great Vibes', 'Caveat', 'Pinyon Script', 'Alex Brush', 'Allura'];

export const LAYOUT_KITS: Record<SiteLayout, Kit> = {
  chat: {
    text: [
      t('chat.status', 'Status under the names', 'online', 'ऑनलाइन'),
      t('chat.greet', 'First message', 'Hi! 👋 We have some news…', 'नमस्ते! 👋 एक ख़ुशख़बरी है…'),
      t('chat.ask', "Guest's question", 'Omg!! 😍 When and where?', 'वाह!! 😍 कब और कहाँ?'),
      t('chat.dress', "Guest's dress question", 'What should I wear? 👗', 'क्या पहनूँ? 👗'),
      t('chat.rsvp', 'RSVP question', 'So… will you join us? 🥹', 'तो… आप आएँगे न? 🥹'),
      t('chat.yes', 'Yes reply', "Yes, I'll be there 🎉", 'हाँ, ज़रूर आऊँगा 🎉'),
      t('chat.no', 'No reply', "Sorry, can't make it", 'माफ़ कीजिए, नहीं आ पाऊँगा'),
    ],
    photos: [p('avatar', 'Chat picture', 0), p('first', 'First photo message', 0), p('second', 'Second photo message', 1)],
    fonts: { display: ['DM Serif Display', ...SERIFS], script: SCRIPTS },
  },
  stories: {
    text: [
      t('st.sticker', 'Cover sticker', 'Save the date', 'तारीख़ याद रखें'),
      t('st.meet', 'People story title', 'Meet', 'मिलिए'),
      t('st.countdown', 'Countdown sticker', 'Countdown', 'उलटी गिनती'),
      t('st.poll', 'Poll question', 'Will you come? 🥹', 'आप आएँगे? 🥹'),
      t('st.yes', 'Poll yes', 'Yes! 🎉', 'हाँ! 🎉'),
      t('st.no', 'Poll no', "Can't make it", 'नहीं आ पाऊँगा'),
      t('st.reply', 'Reply bar', 'Reply with your RSVP…', 'RSVP भेजें…'),
    ],
    photos: [p('cover', 'Cover story', 0), p('fn-1', 'Function 1 story', 1), p('fn-2', 'Function 2 story', 2), p('fn-3', 'Function 3 story', 3), p('countdown', 'Countdown story', 2)],
    fonts: { display: ['DM Serif Display', ...SERIFS], script: SCRIPTS },
  },
  movie: {
    text: [
      t('mv.tag', 'Tag above the title', 'A family original', 'एक पारिवारिक प्रस्तुति'),
      t('mv.match', 'Match badge', '100% Match', '100% मैच'),
      t('mv.premieres', 'Premiere line', 'Premieres', 'प्रीमियर'),
      t('mv.episodes', 'Functions heading', 'Episodes', 'एपिसोड'),
      t('mv.cast', 'People heading', 'Cast', 'कलाकार'),
      t('mv.bts', 'Photos heading', 'Behind the scenes', 'पर्दे के पीछे'),
    ],
    photos: [p('backdrop', 'Title backdrop', 0), p('ep-1', 'Episode 1 picture', 1), p('ep-2', 'Episode 2 picture', 2), p('ep-3', 'Episode 3 picture', 3)],
    fonts: { display: ['Bebas Neue', ...SERIFS], script: ['Great Vibes', ...SCRIPTS] },
  },
  scrapbook: {
    text: [
      t('sb.masthead', 'Magazine name (empty = the occasion)', '', ''),
      t('sb.exclusive', 'Cover tag', 'Exclusive', 'एक्सक्लूसिव'),
      t('sb.line', 'Cover line', 'Inside: the guest list (you’re on it)', 'अंदर: मेहमानों की सूची (आप भी हैं)'),
      t('sb.plan', 'Functions heading', 'The plan', 'कार्यक्रम'),
      t('sb.cap1', 'Polaroid 1 caption', '', ''),
      t('sb.cap2', 'Polaroid 2 caption', 'us ♡', 'हम ♡'),
      t('sb.cap3', 'Polaroid 3 caption', 'forever', 'हमेशा'),
      t('sb.cap4', 'Polaroid 4 caption', 'the family', 'परिवार'),
    ],
    photos: [p('cover', 'Magazine cover', 0), p('pol-1', 'Polaroid 1', 0), p('pol-2', 'Polaroid 2', 1), p('pol-3', 'Polaroid 3', 2), p('pol-4', 'Polaroid 4', 3)],
    fonts: { display: ['Abril Fatface', ...SERIFS], script: ['Caveat', ...SCRIPTS] },
  },
  boarding: {
    text: [
      t('bp.airline', 'Airline name', 'Celebration Airways', 'सेलिब्रेशन एयरवेज़'),
      t('bp.from', 'From', 'Home', 'घर'),
      t('bp.to', 'To (empty = the occasion)', '', ''),
      t('bp.class', 'Class', 'Family class', 'फ़ैमिली क्लास'),
      t('bp.baggage', 'Baggage allowance', 'Unlimited blessings', 'असीम आशीर्वाद'),
      t('bp.note', 'Note from the crew', 'Please be seated before the baraat lands. Dancing shoes recommended.', 'बारात पहुँचने से पहले कृपया अपनी जगह ले लें। नाचने वाले जूते साथ लाएँ।', true),
      t('bp.itinerary', 'Functions heading', 'Your itinerary', 'आपकी यात्रा'),
    ],
    photos: [p('hero', 'Window view photo', 0), p('crew', 'Crew photo', 1)],
    fonts: { display: ['Poppins', ...SERIFS], script: ['Great Vibes', ...SCRIPTS] },
  },
  newspaper: {
    text: [
      t('np.mast', 'Newspaper name', 'The Celebration Times', 'उत्सव समाचार'),
      t('np.edition', 'Edition line', 'Special edition', 'विशेष संस्करण'),
      t('np.head', 'Headline (empty = names + occasion)', '', '', true),
      t('np.deck', 'Sub-headline', 'Families confirm the happy news; the whole town is invited', 'परिवारों ने ख़ुशख़बरी की पुष्टि की; पूरा शहर आमंत्रित', true),
      t('np.weather', 'Weather box', '100% chance of celebration', 'उत्सव की 100% संभावना'),
      t('np.events', 'Functions heading', 'Events calendar', 'कार्यक्रम सूची'),
      t('np.classified', 'Classified ad', 'WANTED: you, in your finest outfit, dancing till late. Apply via RSVP.', 'चाहिए: आप, बेहतरीन पोशाक में, देर रात तक नाचते हुए। RSVP से आवेदन करें।', true),
    ],
    photos: [p('front', 'Front-page photo', 0), p('inside', 'Inside photo', 1)],
    fonts: { display: ['Playfair Display', ...SERIFS], script: SCRIPTS },
  },
  playlist: {
    text: [
      t('pl.title', 'Playlist name', 'Our celebration mix', 'हमारी उत्सव प्लेलिस्ट'),
      t('pl.now', 'Now playing label', 'Now playing', 'अभी चल रहा है'),
      t('pl.queue', 'Functions heading', 'Up next', 'आगे'),
      t('pl.lyric', 'Lyric line', 'Two hearts, one song, and a dance floor waiting for you', 'दो दिल, एक गीत, और आपका इंतज़ार करता डांस फ़्लोर', true),
      t('pl.save', 'Save button', 'Add to my plans', 'मेरी योजना में जोड़ें'),
    ],
    photos: [p('cover', 'Album cover', 0), p('back', 'Background', 1)],
    fonts: { display: ['Poppins', ...SERIFS], script: SCRIPTS },
  },
  arcade: {
    text: [
      t('ar.start', 'Start button', 'Press start', 'शुरू करें'),
      t('ar.p1', 'Player 1 label', 'Player 1', 'खिलाड़ी 1'),
      t('ar.p2', 'Player 2 label', 'Player 2', 'खिलाड़ी 2'),
      t('ar.levels', 'Functions heading', 'Select level', 'लेवल चुनें'),
      t('ar.boss', 'Last function tag', 'Final level', 'आख़िरी लेवल'),
      t('ar.win', 'RSVP prompt', 'Join the party to unlock the bonus round!', 'बोनस राउंड खोलने के लिए पार्टी में आइए!', true),
    ],
    photos: [p('p1', 'Player 1 photo', 0), p('p2', 'Player 2 photo', 1)],
    fonts: { display: ['Press Start 2P', ...SERIFS], script: SCRIPTS },
  },
  menu: {
    text: [
      t('mn.house', 'Restaurant name (empty = names)', '', ''),
      t('mn.welcome', 'Welcome line', 'Tonight’s menu, served with love', 'आज का मेन्यू, प्यार से परोसा गया'),
      t('mn.courses', 'Functions heading', 'Courses', 'व्यंजन'),
      t('mn.chef', "Chef's note", 'Every course is better with you at the table. Come hungry, leave happy.', 'हर व्यंजन आपके साथ और भी स्वादिष्ट है। भूखे आइए, ख़ुश होकर जाइए।', true),
      t('mn.bill', 'The bill', 'The bill: just your blessings', 'बिल: बस आपका आशीर्वाद'),
    ],
    photos: [p('cover', 'Menu photo', 0)],
    fonts: { display: ['Cormorant Garamond', ...SERIFS], script: ['Pinyon Script', ...SCRIPTS] },
  },
  calendar: {
    text: [
      t('cl.mark', 'Note on the date', 'Mark your calendar', 'कैलेंडर पर निशान लगाएँ'),
      t('cl.sticky', 'Sticky note', 'Don’t make other plans! ♡', 'और कोई प्लान मत बनाइए! ♡', true),
      t('cl.left', 'Countdown label', 'days to go', 'दिन बाकी'),
      t('cl.schedule', 'Functions heading', 'The big days', 'ख़ास दिन'),
    ],
    photos: [p('hero', 'Calendar photo', 0)],
    fonts: { display: ['DM Serif Display', ...SERIFS], script: ['Caveat', ...SCRIPTS] },
  },
};
