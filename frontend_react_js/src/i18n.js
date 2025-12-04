import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Simple localStorage language persistence
const LANG_STORAGE_KEY = 'ngg_lang';

const savedLng = (() => {
  try {
    const v = window.localStorage.getItem(LANG_STORAGE_KEY);
    return v || 'en';
  } catch {
    return 'en';
  }
})();

export function persistLanguage(lng) {
  try {
    window.localStorage.setItem(LANG_STORAGE_KEY, lng);
  } catch {
    // ignore
  }
}

// Translation resources
const resources = {
  en: {
    translation: {
      appTitle: 'Number Guessing Game',
      appSubtitle: 'Guess the secret number between {{min}} and {{max}}',
      themeToggleDark: '🌙 Dark',
      themeToggleLight: '☀️ Light',
      openLeaderboard: '🏆 Leaderboard',
      openAchievements: '🥇 Achievements',
      levels: 'Select level',
      levelLocked: '(locked)',
      levelUnlockedEmoji: '🔓',
      levelLockedEmoji: '🔒',
      difficultyLabel: 'Select difficulty',
      difficultyEasy: 'Easy (1-20)',
      difficultyMedium: 'Medium (1-50)',
      difficultyHard: 'Hard (1-100)',
      // Timer and Timer Challenge
      timerEnableLabel: 'Enable Timer Mode',
      timerChallengeEnableLabel: 'Enable Timer Challenge',
      timer_challenge_countdown: 'Time remaining: {{time}}',
      timerUp: "Time's up!",
      // Guessing UI
      guessLabel: 'Enter your guess',
      guessPlaceholder: 'Enter a number ({{min}}-{{max}})',
      guessButton: 'Guess',
      submitGuessTitle: 'Submit guess',
      feedback_start: 'Make a guess to begin!',
      feedback_low: 'Too low. Try a higher number.',
      feedback_high: 'Too high. Try a lower number.',
      feedback_correct: 'Correct! The number was {{secret}}. Your score: {{score}}.',
      feedback_correct_timebonus: 'Correct! The number was {{secret}}. Your score: {{score}} (Timer bonus applied: +{{bonus}}%).',
      feedback_timeout_round_over: "Time's up! Round over.",
      feedback_out_attempts: 'Out of attempts! Round over.',
      attempts_used: 'Attempts used: {{count}}',
      attempts_remaining: 'Attempts remaining: {{count}}',
      current_range: 'Current range: {{min}} to {{max}} ({{label}})',
      history_title: 'Guess History',
      history_none: 'No guesses yet.',
      history_item_aria: 'Guess {{value}}, {{result}}',
      repeat_warning: 'You already guessed {{guess}}.',
      new_game: 'New Game',
      play_again: 'Play Again',
      reset: 'Reset',
      // Hints
      hint_group: 'Hint options',
      hints_note: 'Hints reduce your score. Each hint type used applies a penalty.',
      hint_parity_btn: 'Even/Odd',
      hint_parity_aria: 'Get parity hint (even or odd)',
      hint_parity_text: 'Hint: The number is {{parity}}.',
      hint_range_btn: 'Range',
      hint_range_aria: 'Get range hint',
      hint_range_text: 'Hint: The number is between {{start}}–{{end}}.',
      hint_digit_btn: 'Starts With',
      hint_digit_aria: 'Get starting digit hint',
      hint_digit_text_single: "Hint: It's a single-digit number and starts with {{digit}}.",
      hint_digit_text_multi: 'Hint: The number starts with {{digit}}.',
      hint_proximity_btn: 'Proximity',
      hint_proximity_aria: 'Get proximity hint',
      hint_proximity_need_guess: 'Hint: Make at least one guess to get a proximity hint.',
      hint_proximity_already_correct: 'Hint: You already have the correct number!',
      hint_proximity_very_close: 'Hint: You are very close.',
      hint_proximity_hot: 'Hint: Hot.',
      hint_proximity_warm: 'Hint: Warm.',
      hint_proximity_cold: 'Hint: Cold.',
      hint_proximity_after_valid: 'Hint: Proximity available after a valid guess.',
      // Leaderboard/Achievements
      leaderboard_title: 'Leaderboard',
      leaderboard_close: 'Close',
      leaderboard_clear: 'Clear Leaderboard',
      leaderboard_clear_confirm: 'Clear all leaderboard entries? This action cannot be undone.',
      leaderboard_views: 'Leaderboard views',
      leaderboard_tab_scores: 'High Scores',
      leaderboard_tab_attempts: 'Best Attempts',
      leaderboard_empty: 'No results yet.',
      leaderboard_hint: 'Play and win a game to add your first leaderboard entry!',
      attempts_label: 'Attempts: {{count}}',
      score_label: 'Score: {{score}}',
      time_bonus_breakdown: 'Time bonus +{{percent}}%',
      difficulty_easy: 'Easy',
      difficulty_medium: 'Medium',
      difficulty_hard: 'Hard',
      // Achievements
      achievements_title: 'Achievements',
      achievements_close: 'Close',
      achievements_list_aria: 'Achievements list',
      achievements_unlocked: 'Unlocked',
      achievements_locked: 'Locked',
      achievements_unlocked_at: 'Unlocked: {{date}}',
      achievements_not_yet: 'Not yet unlocked',
      achievement_unlocked_toast: 'Achievement unlocked: {{titles}}!',
      // Achievements meta (keys)
      ach_firstTryWin_title: 'First-Try Win',
      ach_firstTryWin_desc: 'Win a round in exactly 1 attempt.',
      ach_noHintsWin_title: 'No-Hints Win',
      ach_noHintsWin_desc: 'Win a round without using any hints.',
      // Levels
      level_Beginner: 'Beginner',
      level_Intermediate: 'Intermediate',
      level_Expert: 'Expert',
      // Language selector
      language_label: 'Language',
      language_en: 'English',
      language_te: 'తెలుగు',
      language_hi: 'हिन्दी',
      themeLabel: 'Theme'
    }
  },
  te: {
    translation: {
      appTitle: 'సంఖ్య ఊహించే ఆట',
      appSubtitle: '{{min}} మరియు {{max}} మధ్య రహస్య సంఖ్యను ఊహించండి',
      themeToggleDark: '🌙 డార్క్',
      themeToggleLight: '☀️ లైట్',
      openLeaderboard: '🏆 లీడర్బోర్డ్',
      openAchievements: '🥇 విజయాలు',
      levels: 'స్థాయి ఎంచుకోండి',
      levelLocked: '(లాక్ చేయబడింది)',
      levelUnlockedEmoji: '🔓',
      levelLockedEmoji: '🔒',
      difficultyLabel: 'కష్టతరాన్ని ఎంచుకోండి',
      difficultyEasy: 'సులభం (1-20)',
      difficultyMedium: 'మధ్యస్థం (1-50)',
      difficultyHard: 'కఠినం (1-100)',
      // Timer and Timer Challenge
      timerEnableLabel: 'టైమర్ మోడ్‌ని ప్రారంభించండి',
      timerChallengeEnableLabel: 'టైమర్ ఛాలెంజ్ ప్రారంభించండి',
      timer_challenge_countdown: 'మిగిలిన సమయం: {{time}}',
      timerUp: 'సమయం ముగిసింది!',
      // Guessing UI
      guessLabel: 'మీ అంచనాను నమోదు చేయండి',
      guessPlaceholder: 'సంఖ్యను నమోదు చేయండి ({{min}}-{{max}})',
      guessButton: 'గెస్',
      submitGuessTitle: 'గెస్ సమర్పించండి',
      feedback_start: 'మొదలుకు ఒక గెస్ చేయండి!',
      feedback_low: 'చాలా తక్కువ. పెద్ద సంఖ్య ప్రయత్నించండి.',
      feedback_high: 'చాలా ఎక్కువ. చిన్న సంఖ్య ప్రయత్నించండి.',
      feedback_correct: 'సరైంది! సంఖ్య {{secret}}. మీ స్కోర్: {{score}}.',
      feedback_correct_timebonus: 'సరైంది! సంఖ్య {{secret}}. మీ స్కోర్: {{score}} (టైమర్ బోనస్: +{{bonus}}%).',
      feedback_timeout_round_over: 'సమయం ముగిసింది! రౌండ్ ముగిసింది.',
      feedback_out_attempts: 'ప్రయత్నాలు ముగిశాయి! రౌండ్ ముగిసింది.',
      attempts_used: 'ఉపయోగించిన ప్రయత్నాలు: {{count}}',
      attempts_remaining: 'మిగిలిన ప్రయత్నాలు: {{count}}',
      current_range: 'ప్రస్తుత శ్రేణి: {{min}} నుండి {{max}} ({{label}})',
      history_title: 'గెస్ చరిత్ర',
      history_none: 'ఇంకా గెస్‌లు లేవు.',
      history_item_aria: 'గెస్ {{value}}, {{result}}',
      repeat_warning: '{{guess}} మీరు ఇప్పటికే గెస్ చేశారు.',
      new_game: 'కొత్త ఆట',
      play_again: 'మళ్ళీ ఆడు',
      reset: 'రిసెట్',
      // Hints
      hint_group: 'సూచన ఎంపికలు',
      hints_note: 'సూచనల వల్ల మీ స్కోరు తగ్గుతుంది. ప్రతి రకం సూచనకు శిక్ష ఉంటుంది.',
      hint_parity_btn: 'జత/ బేసి',
      hint_parity_aria: 'జత/బేసి సూచన పొందండి',
      hint_parity_text: 'సూచన: సంఖ్య {{parity}}.',
      hint_range_btn: 'పరిధి',
      hint_range_aria: 'పరిధి సూచన పొందండి',
      hint_range_text: 'సూచన: సంఖ్య {{start}}–{{end}} మధ్య ఉంది.',
      hint_digit_btn: 'ప్రారంభ అంకె',
      hint_digit_aria: 'ప్రారంభ అంకె సూచన పొందండి',
      hint_digit_text_single: 'సూచన: ఇది ఒక అంకెల సంఖ్య మరియు {{digit}} తో ప్రారంభమవుతుంది.',
      hint_digit_text_multi: 'సూచన: సంఖ్య {{digit}} తో ప్రారంభమవుతుంది.',
      hint_proximity_btn: 'దగ్గరదనం',
      hint_proximity_aria: 'దగ్గరదనం సూచన పొందండి',
      hint_proximity_need_guess: 'సూచన: దగ్గరదనం కోసం కనీసం ఒక గెస్ చేయండి.',
      hint_proximity_already_correct: 'సూచన: మీ వద్ద ఇప్పటికే సరైన సంఖ్య ఉంది!',
      hint_proximity_very_close: 'సూచన: మీరు చాలా దగ్గరగా ఉన్నారు.',
      hint_proximity_hot: 'సూచన: హాట్.',
      hint_proximity_warm: 'సూచన: వామ్.',
      hint_proximity_cold: 'సూచన: కోల్డ్.',
      hint_proximity_after_valid: 'సూచన: చెల్లుబాటు అయ్యే గెస్ తరువాత లభ్యం.',
      // Leaderboard/Achievements
      leaderboard_title: 'లీడర్బోర్డ్',
      leaderboard_close: 'మూసివేయి',
      leaderboard_clear: 'లీడర్బోర్డ్ క్లియర్ చేయి',
      leaderboard_clear_confirm: 'అన్ని ఎంట్రీల్ని క్లియర్ చేయాలా? ఇది తిరస్కరించలేని చర్య.',
      leaderboard_views: 'లీడర్బోర్డ్ వీక్షణలు',
      leaderboard_tab_scores: 'ఉన్నత స్కోర్లు',
      leaderboard_tab_attempts: 'ఉత్తమ ప్రయత్నాలు',
      leaderboard_empty: 'ఫలితాలు లేవు.',
      leaderboard_hint: 'మీ మొదటి ఎంట్రీ కోసం ఒక ఆట గెలవండి!',
      attempts_label: 'ప్రయత్నాలు: {{count}}',
      score_label: 'స్కోర్: {{score}}',
      time_bonus_breakdown: 'సమయ బోనస్ +{{percent}}%',
      difficulty_easy: 'సులభం',
      difficulty_medium: 'మధ్యస్థం',
      difficulty_hard: 'కఠినం',
      // Achievements
      achievements_title: 'విజయాలు',
      achievements_close: 'మూసివేయి',
      achievements_list_aria: 'విజయాల జాబితా',
      achievements_unlocked: 'అన్లాక్ అయింది',
      achievements_locked: 'లాక్ అయింది',
      achievements_unlocked_at: 'అన్లాక్: {{date}}',
      achievements_not_yet: 'ఇంకా లేదు',
      achievement_unlocked_toast: 'విజయం అన్లాక్ అయింది: {{titles}}!',
      // Achievements meta
      ach_firstTryWin_title: 'మొదటి ప్రయత్నంలో విజయం',
      ach_firstTryWin_desc: 'ఖచ్చితంగా 1 ప్రయత్నంలో రౌండ్ గెలవండి.',
      ach_noHintsWin_title: 'సూచనల లేని విజయం',
      ach_noHintsWin_desc: 'ఏ సూచనలూ ఉపయోగించకుండా రౌండ్ గెలవండి.',
      // Levels
      level_Beginner: 'ప్రారంభ',
      level_Intermediate: 'మధ్యస్థ',
      level_Expert: 'నిపుణుడు',
      // Language selector
      language_label: 'భాష',
      language_en: 'English',
      language_te: 'తెలుగు',
      language_hi: 'हिन्दी',
      themeLabel: 'థీమ్'
    }
  },
  hi: {
    translation: {
      appTitle: 'संख्या अनुमान खेल',
      appSubtitle: '{{min}} और {{max}} के बीच गुप्त संख्या का अनुमान लगाएं',
      themeToggleDark: '🌙 डार्क',
      themeToggleLight: '☀️ लाइट',
      openLeaderboard: '🏆 लीडरबोर्ड',
      openAchievements: '🥇 उपलब्धियां',
      levels: 'स्तर चुनें',
      levelLocked: '(लॉक)',
      levelUnlockedEmoji: '🔓',
      levelLockedEmoji: '🔒',
      difficultyLabel: 'कठिनाई चुनें',
      difficultyEasy: 'आसान (1-20)',
      difficultyMedium: 'मध्यम (1-50)',
      difficultyHard: 'कठिन (1-100)',
      // Timer and Timer Challenge
      timerEnableLabel: 'टाइमर मोड सक्षम करें',
      timerChallengeEnableLabel: 'टाइमर चैलेंज सक्षम करें',
      timer_challenge_countdown: 'शेष समय: {{time}}',
      timerUp: 'समय समाप्त!',
      // Guessing UI
      guessLabel: 'अपना अनुमान दर्ज करें',
      guessPlaceholder: 'संख्या दर्ज करें ({{min}}-{{max}})',
      guessButton: 'अनुमान',
      submitGuessTitle: 'अनुमान सबमिट करें',
      feedback_start: 'शुरू करने के लिए अनुमान लगाएं!',
      feedback_low: 'बहुत कम. बड़ी संख्या आजमाएं.',
      feedback_high: 'बहुत अधिक. छोटी संख्या आजमाएं.',
      feedback_correct: 'सही! संख्या {{secret}} थी। आपका स्कोर: {{score}}.',
      feedback_correct_timebonus: 'सही! संख्या {{secret}} थी। आपका स्कोर: {{score}} (टाइमर बोनस: +{{bonus}}%).',
      feedback_timeout_round_over: 'समय समाप्त! राउंड खत्म.',
      feedback_out_attempts: 'प्रयास समाप्त! राउंड खत्म.',
      attempts_used: 'प्रयुक्त प्रयास: {{count}}',
      attempts_remaining: 'शेष प्रयास: {{count}}',
      current_range: 'वर्तमान सीमा: {{min}} से {{max}} ({{label}})',
      history_title: 'अनुमान इतिहास',
      history_none: 'अभी तक कोई अनुमान नहीं.',
      history_item_aria: 'अनुमान {{value}}, {{result}}',
      repeat_warning: 'आपने पहले ही {{guess}} का अनुमान लगाया है.',
      new_game: 'नया खेल',
      play_again: 'फिर से खेलें',
      reset: 'रीसेट',
      // Hints
      hint_group: 'संकेत विकल्प',
      hints_note: 'संकेत आपके स्कोर को कम करते हैं. प्रत्येक प्रकार के संकेत पर दंड लगता है.',
      hint_parity_btn: 'सम/विषम',
      hint_parity_aria: 'सम/विषम संकेत प्राप्त करें',
      hint_parity_text: 'संकेत: संख्या {{parity}} है.',
      hint_range_btn: 'सीमा',
      hint_range_aria: 'सीमा संकेत प्राप्त करें',
      hint_range_text: 'संकेत: संख्या {{start}}–{{end}} के बीच है.',
      hint_digit_btn: 'शुरुआती अंक',
      hint_digit_aria: 'शुरुआती अंक संकेत प्राप्त करें',
      hint_digit_text_single: 'संकेत: यह एक अंकों की संख्या है और {{digit}} से शुरू होती है.',
      hint_digit_text_multi: 'संख्या {{digit}} से शुरू होती है.',
      hint_proximity_btn: 'निकटता',
      hint_proximity_aria: 'निकटता संकेत प्राप्त करें',
      hint_proximity_need_guess: 'संकेत: निकटता के लिए कम से कम एक अनुमान करें.',
      hint_proximity_already_correct: 'संकेत: आपके पास पहले से सही संख्या है!',
      hint_proximity_very_close: 'संकेत: आप बहुत करीब हैं.',
      hint_proximity_hot: 'संकेत: हॉट.',
      hint_proximity_warm: 'संकेत: वॉर्म.',
      hint_proximity_cold: 'संकेत: कोल्ड.',
      hint_proximity_after_valid: 'संकेत: एक वैध अनुमान के बाद उपलब्ध.',
      // Leaderboard/Achievements
      leaderboard_title: 'लीडरबोर्ड',
      leaderboard_close: 'बंद करें',
      leaderboard_clear: 'लीडरबोर्ड साफ़ करें',
      leaderboard_clear_confirm: 'सभी प्रविष्टियां साफ़ करें? यह कार्रवाई पूर्ववत नहीं की जा सकती.',
      leaderboard_views: 'लीडरबोर्ड दृश्य',
      leaderboard_tab_scores: 'उच्च स्कोर',
      leaderboard_tab_attempts: 'श्रेष्ठ प्रयास',
      leaderboard_empty: 'अभी तक कोई परिणाम नहीं.',
      leaderboard_hint: 'अपनी पहली प्रविष्टि जोड़ने के लिए एक खेल जीतें!',
      attempts_label: 'प्रयास: {{count}}',
      score_label: 'स्कोर: {{score}}',
      time_bonus_breakdown: 'समय बोनस +{{percent}}%',
      difficulty_easy: 'आसान',
      difficulty_medium: 'मध्यम',
      difficulty_hard: 'कठिन',
      // Achievements
      achievements_title: 'उपलब्धियां',
      achievements_close: 'बंद करें',
      achievements_list_aria: 'उपलब्धियों की सूची',
      achievements_unlocked: 'अनलॉक',
      achievements_locked: 'लॉक',
      achievements_unlocked_at: 'अनलॉक: {{date}}',
      achievements_not_yet: 'अभी नहीं',
      achievement_unlocked_toast: 'उपलब्धि अनलॉक: {{titles}}!',
      // Achievements meta
      ach_firstTryWin_title: 'पहले प्रयास में जीत',
      ach_firstTryWin_desc: 'ठीक 1 प्रयास में राउंड जीतें.',
      ach_noHintsWin_title: 'बिना संकेत की जीत',
      ach_noHintsWin_desc: 'कोई संकेत उपयोग किए बिना राउंड जीतें.',
      // Levels
      level_Beginner: 'शुरुआती',
      level_Intermediate: 'मध्यमवर्ती',
      level_Expert: 'विशेषज्ञ',
      // Language selector
      language_label: 'भाषा',
      language_en: 'English',
      language_te: 'తెలుగు',
      language_hi: 'हिन्दी',
      themeLabel: 'थीम'
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLng,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

i18n.on('languageChanged', (lng) => persistLanguage(lng));

export default i18n;
