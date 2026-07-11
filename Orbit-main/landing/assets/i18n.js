/* Orbit i18n plumbing (ORBIT.md Section 3 — founder-facing language layer).
   Usage:
     - Mark any element with data-i18n="key". Its textContent is swapped on language change.
     - Use data-i18n-attr="placeholder:key" to translate attributes.
     - Add a container with id="lang-selector" and call I18N.mountSelector() — or let
       the auto-init at the bottom handle both.
   Language choice persists in localStorage under "orbit.lang".
   In the real product this dictionary is replaced by Gemma's on-device translation;
   the data-i18n contract stays the same, so pages won't need to change. */

const I18N = (() => {
  const LANGS = [
    { code: "en", label: "English" },
    { code: "hi", label: "हिन्दी" },
    { code: "ta", label: "தமிழ்" },
  ];

  const STRINGS = {
    en: {
      "nav.product": "Product",
      "nav.agents": "Agents",
      "nav.workflow": "Workflow",
      "nav.onboarding": "Onboarding",
      "nav.getStarted": "Get Started",

      "hero.badge": "Built for first-time founders and MSMEs across India",
      "hero.title.pre": "The Operating System for ",
      "hero.title.accent": "Autonomous Founders",
      "hero.subtitle":
        "An AI agent team that replaces 6 full-time hires. From legal compliance to multilingual marketing, your business works in your language while you sleep.",
      "hero.cta.primary": "Get Started",
      "hero.cta.secondary": "See How It Works",
      "hero.demo": "Introducing Orbit — Watch demo",

      "agents.research.title": "Research Agent",
      "agents.research.body":
        "Validates your idea against real-world market data and identifies your niche competitors in seconds.",
      "agents.legal.title": "Legal & Compliance",
      "agents.legal.body":
        "Tracks registrations, drafts customized legal agreements, and manages your GST filings autonomously.",
      "agents.brand.title": "Brand & Marketing",
      "agents.brand.body":
        "Develops brand positioning and creates high-converting multilingual copy for ads and socials.",
      "agents.build.title": "Build Agent + Gemma",
      "agents.build.body":
        "Powered by Gemma Antigravity. Generates live, editable websites in plain language via on-device LLMs.",
      "agents.sales.title": "Sales/GTM Agent",
      "agents.sales.body":
        "Outbound scripts, CRM management, and dynamic pricing strategies tailored to your customer's context.",
      "agents.support.title": "Support Agent",
      "agents.support.body":
        "First-layer customer support grounded in your company's specific knowledge base and past tickets.",

      "multilingual.title.pre": "Businesses that feel handcrafted, ",
      "multilingual.title.accent": "run like a team",
      "multilingual.body":
        "Orbit doesn't just translate; it transcreates. Whether it's drafting your partnership deed or writing a WhatsApp campaign in Hindi, Orbit understands the local context of Indian business.",

      "ingest.title.pre": "Not starting from zero?",
      "ingest.title.accent": "Neither is Orbit.",
      "ingest.body":
        "Connect your legacy documents and Orbit's on-device LLM, Gemma, will securely index your entire history. Privacy isn't a feature; it's our core architecture.",
      "ingest.verified": "Financial profile extracted — 100% on-device",

      "loop.title": "Your business keeps improving, even when you're not building",
      "loop.footer":
        "Every action is logged in an immutable vault with instant rollback capabilities. You control the intent; Orbit handles the execution.",

      "cta.title": "Your company that runs itself, starting today.",
      "cta.body":
        "Join the waitlist for early founder access. Average onboarding takes 4 minutes once your docs are verified.",

      "footer.tagline": "The Operating System for AI-first Founders. Built in Bengaluru for the world.",

      "onboarding.welcome": "Welcome to Orbit",
      "onboarding.question": "How are you building this?",
      "onboarding.solo.title": "Solo founder",
      "onboarding.solo.body":
        "One Gemma vault, one profile. Everything private stays on your device; agents see only scoped, derived facts.",
      "onboarding.team.title": "With a team",
      "onboarding.team.body":
        "A shared workspace with per-person Gemma vaults. Invite co-founders and hires with role-scoped access — personal data never syncs.",
      "onboarding.continue": "Continue",
      "onboarding.invite.title": "Invite your team",
      "onboarding.invite.body":
        "Each person gets their own Gemma-protected profile: a role, a permission scope, and a private vault on their own device.",
      "onboarding.invite.email": "Email address",
      "onboarding.invite.role": "Role",
      "onboarding.invite.add": "Add invite",
      "onboarding.invite.send": "Send invites & create workspace",
      "onboarding.scope.title": "What each role can see",

      "workflow.title": "From idea to a running company",
      "workflow.subtitle":
        "The Manager Agent owns this roadmap end to end. Every step is visible, auditable, and rendered in your language.",
    },

    hi: {
      "nav.product": "प्रोडक्ट",
      "nav.agents": "एजेंट्स",
      "nav.workflow": "वर्कफ़्लो",
      "nav.onboarding": "ऑनबोर्डिंग",
      "nav.getStarted": "शुरू करें",

      "hero.badge": "भारत के पहली बार के फाउंडर्स और MSME के लिए बनाया गया",
      "hero.title.pre": "ऑपरेटिंग सिस्टम ",
      "hero.title.accent": "स्वायत्त फाउंडर्स के लिए",
      "hero.subtitle":
        "एक AI एजेंट टीम जो 6 फुल-टाइम कर्मचारियों की जगह लेती है। कानूनी अनुपालन से लेकर बहुभाषी मार्केटिंग तक — आपका व्यवसाय आपकी भाषा में काम करता है, जब आप सोते हैं तब भी।",
      "hero.cta.primary": "शुरू करें",
      "hero.cta.secondary": "देखें यह कैसे काम करता है",
      "hero.demo": "Orbit से मिलिए — डेमो देखें",

      "agents.research.title": "रिसर्च एजेंट",
      "agents.research.body":
        "आपके आइडिया को वास्तविक बाज़ार डेटा से परखता है और सेकंडों में आपके प्रतिस्पर्धियों की पहचान करता है।",
      "agents.legal.title": "कानूनी और अनुपालन",
      "agents.legal.body":
        "रजिस्ट्रेशन ट्रैक करता है, अनुबंध ड्राफ्ट करता है, और आपकी GST फाइलिंग स्वतः संभालता है।",
      "agents.brand.title": "ब्रांड और मार्केटिंग",
      "agents.brand.body":
        "ब्रांड पोज़िशनिंग विकसित करता है और विज्ञापनों के लिए बहुभाषी, उच्च-रूपांतरण कॉपी बनाता है।",
      "agents.build.title": "बिल्ड एजेंट + Gemma",
      "agents.build.body":
        "Gemma Antigravity द्वारा संचालित। सरल भाषा में लाइव, संपादन-योग्य वेबसाइटें बनाता है — ऑन-डिवाइस LLM के ज़रिए।",
      "agents.sales.title": "सेल्स/GTM एजेंट",
      "agents.sales.body":
        "आउटबाउंड स्क्रिप्ट, CRM प्रबंधन, और आपके ग्राहक के संदर्भ के अनुरूप डायनामिक प्राइसिंग।",
      "agents.support.title": "सपोर्ट एजेंट",
      "agents.support.body":
        "आपकी कंपनी के ज्ञान-आधार और पुराने टिकटों पर आधारित पहली-परत ग्राहक सहायता।",

      "multilingual.title.pre": "ऐसे व्यवसाय जो हस्तनिर्मित लगते हैं, ",
      "multilingual.title.accent": "टीम की तरह चलते हैं",
      "multilingual.body":
        "Orbit सिर्फ अनुवाद नहीं करता; वह भाव को ढालता है। पार्टनरशिप डीड हो या हिंदी में WhatsApp कैंपेन — Orbit भारतीय व्यवसाय का स्थानीय संदर्भ समझता है।",

      "ingest.title.pre": "शून्य से शुरुआत नहीं कर रहे?",
      "ingest.title.accent": "Orbit भी नहीं।",
      "ingest.body":
        "अपने पुराने दस्तावेज़ जोड़ें — Orbit का ऑन-डिवाइस LLM, Gemma, आपका पूरा इतिहास सुरक्षित रूप से इंडेक्स करेगा। प्राइवेसी कोई फीचर नहीं; यह हमारी मूल संरचना है।",
      "ingest.verified": "वित्तीय प्रोफ़ाइल निकाली गई — 100% ऑन-डिवाइस",

      "loop.title": "आपका व्यवसाय बेहतर होता रहता है, तब भी जब आप कुछ नहीं बना रहे",
      "loop.footer":
        "हर कार्रवाई एक अपरिवर्तनीय वॉल्ट में दर्ज होती है, तुरंत रोलबैक के साथ। इरादा आपका; निष्पादन Orbit का।",

      "cta.title": "आपकी कंपनी जो खुद चलती है — आज से शुरू।",
      "cta.body":
        "अर्ली फाउंडर एक्सेस के लिए वेटलिस्ट में शामिल हों। दस्तावेज़ सत्यापित होने के बाद औसत ऑनबोर्डिंग 4 मिनट की है।",

      "footer.tagline": "AI-first फाउंडर्स के लिए ऑपरेटिंग सिस्टम। बेंगलुरु में निर्मित, दुनिया के लिए।",

      "onboarding.welcome": "Orbit में आपका स्वागत है",
      "onboarding.question": "आप इसे कैसे बना रहे हैं?",
      "onboarding.solo.title": "अकेले फाउंडर",
      "onboarding.solo.body":
        "एक Gemma वॉल्ट, एक प्रोफ़ाइल। सब कुछ निजी आपके डिवाइस पर रहता है; एजेंट केवल सीमित, व्युत्पन्न तथ्य देखते हैं।",
      "onboarding.team.title": "टीम के साथ",
      "onboarding.team.body":
        "साझा वर्कस्पेस, प्रति-व्यक्ति Gemma वॉल्ट। सह-संस्थापकों को रोल-आधारित एक्सेस के साथ आमंत्रित करें — निजी डेटा कभी सिंक नहीं होता।",
      "onboarding.continue": "आगे बढ़ें",
      "onboarding.invite.title": "अपनी टीम को आमंत्रित करें",
      "onboarding.invite.body":
        "हर व्यक्ति को अपनी Gemma-सुरक्षित प्रोफ़ाइल मिलती है: एक रोल, एक अनुमति-सीमा, और अपने डिवाइस पर निजी वॉल्ट।",
      "onboarding.invite.email": "ईमेल पता",
      "onboarding.invite.role": "रोल",
      "onboarding.invite.add": "आमंत्रण जोड़ें",
      "onboarding.invite.send": "आमंत्रण भेजें और वर्कस्पेस बनाएं",
      "onboarding.scope.title": "प्रत्येक रोल क्या देख सकता है",

      "workflow.title": "आइडिया से चलती हुई कंपनी तक",
      "workflow.subtitle":
        "मैनेजर एजेंट इस रोडमैप का पूरा स्वामी है। हर कदम दृश्य, ऑडिट-योग्य और आपकी भाषा में प्रस्तुत है।",
    },

    ta: {
      "nav.product": "தயாரிப்பு",
      "nav.agents": "ஏஜென்ட்கள்",
      "nav.workflow": "பணிப்பாதை",
      "nav.onboarding": "தொடக்கம்",
      "nav.getStarted": "தொடங்குங்கள்",

      "hero.badge": "இந்தியாவின் முதல்முறை நிறுவனர்களுக்கும் MSME-களுக்கும் உருவாக்கப்பட்டது",
      "hero.title.pre": "இயக்க அமைப்பு ",
      "hero.title.accent": "தன்னியக்க நிறுவனர்களுக்கு",
      "hero.subtitle":
        "6 முழுநேர ஊழியர்களுக்கு பதிலான ஒரு AI ஏஜென்ட் குழு. சட்ட இணக்கம் முதல் பன்மொழி சந்தைப்படுத்தல் வரை — நீங்கள் தூங்கும்போதும் உங்கள் வணிகம் உங்கள் மொழியில் இயங்குகிறது.",
      "hero.cta.primary": "தொடங்குங்கள்",
      "hero.cta.secondary": "இது எப்படி வேலை செய்கிறது",
      "hero.demo": "Orbit அறிமுகம் — டெமோ பார்க்க",

      "agents.research.title": "ஆராய்ச்சி ஏஜென்ட்",
      "agents.research.body":
        "உங்கள் யோசனையை உண்மையான சந்தை தரவுடன் சரிபார்த்து, நொடிகளில் போட்டியாளர்களை அடையாளம் காட்டுகிறது.",
      "agents.legal.title": "சட்டம் & இணக்கம்",
      "agents.legal.body":
        "பதிவுகளை கண்காணித்து, ஒப்பந்தங்களை உருவாக்கி, உங்கள் GST தாக்கல்களை தானாக நிர்வகிக்கிறது.",
      "agents.brand.title": "பிராண்ட் & மார்க்கெட்டிங்",
      "agents.brand.body":
        "பிராண்ட் நிலைப்பாட்டை உருவாக்கி, விளம்பரங்களுக்கு பன்மொழி, உயர்-மாற்று நகலை எழுதுகிறது.",
      "agents.build.title": "பில்ட் ஏஜென்ட் + Gemma",
      "agents.build.body":
        "Gemma Antigravity இயக்கத்தில். எளிய மொழியில் நேரடி, திருத்தக்கூடிய இணையதளங்களை உருவாக்குகிறது — ஆன்-டிவைஸ் LLM மூலம்.",
      "agents.sales.title": "விற்பனை/GTM ஏஜென்ட்",
      "agents.sales.body":
        "அவுட்பவுண்ட் ஸ்கிரிப்ட்கள், CRM நிர்வாகம், உங்கள் வாடிக்கையாளரின் சூழலுக்கேற்ற விலை உத்திகள்.",
      "agents.support.title": "ஆதரவு ஏஜென்ட்",
      "agents.support.body":
        "உங்கள் நிறுவனத்தின் அறிவுத்தளம் மற்றும் பழைய டிக்கெட்டுகளின் அடிப்படையிலான முதல்-நிலை வாடிக்கையாளர் ஆதரவு.",

      "multilingual.title.pre": "கைவினை போல் தோன்றும் வணிகங்கள், ",
      "multilingual.title.accent": "குழு போல் இயங்கும்",
      "multilingual.body":
        "Orbit வெறும் மொழிபெயர்ப்பு செய்யாது; உணர்வை மாற்றி உருவாக்குகிறது. கூட்டாண்மை ஒப்பந்தமோ, தமிழில் WhatsApp பிரச்சாரமோ — இந்திய வணிகத்தின் உள்ளூர் சூழலை Orbit புரிந்துகொள்கிறது.",

      "ingest.title.pre": "பூஜ்ஜியத்திலிருந்து தொடங்கவில்லையா?",
      "ingest.title.accent": "Orbit-um இல்லை.",
      "ingest.body":
        "உங்கள் பழைய ஆவணங்களை இணைக்கவும் — Orbit-இன் ஆன்-டிவைஸ் LLM, Gemma, உங்கள் முழு வரலாற்றையும் பாதுகாப்பாக அட்டவணைப்படுத்தும். தனியுரிமை ஒரு அம்சம் அல்ல; அது எங்கள் அடிப்படை கட்டமைப்பு.",
      "ingest.verified": "நிதி விவரம் பிரித்தெடுக்கப்பட்டது — 100% ஆன்-டிவைஸ்",

      "loop.title": "நீங்கள் உருவாக்காத போதும், உங்கள் வணிகம் மேம்பட்டுக்கொண்டே இருக்கிறது",
      "loop.footer":
        "ஒவ்வொரு செயலும் மாற்ற முடியாத பெட்டகத்தில் பதிவாகிறது, உடனடி ரோல்பேக் வசதியுடன். நோக்கம் உங்களுடையது; செயல்பாடு Orbit-உடையது.",

      "cta.title": "தானாக இயங்கும் உங்கள் நிறுவனம் — இன்றே தொடங்குங்கள்.",
      "cta.body":
        "முன்கூட்டிய அணுகலுக்கு காத்திருப்புப் பட்டியலில் சேருங்கள். ஆவணங்கள் சரிபார்க்கப்பட்டதும் சராசரி தொடக்கம் 4 நிமிடங்கள்.",

      "footer.tagline": "AI-first நிறுவனர்களுக்கான இயக்க அமைப்பு. பெங்களூரில் உருவாக்கப்பட்டது, உலகிற்காக.",

      "onboarding.welcome": "Orbit-க்கு வரவேற்கிறோம்",
      "onboarding.question": "இதை எப்படி உருவாக்குகிறீர்கள்?",
      "onboarding.solo.title": "தனி நிறுவனர்",
      "onboarding.solo.body":
        "ஒரு Gemma பெட்டகம், ஒரு சுயவிவரம். தனிப்பட்ட அனைத்தும் உங்கள் சாதனத்திலேயே இருக்கும்; ஏஜென்ட்கள் வரையறுக்கப்பட்ட தகவல்களை மட்டுமே பார்க்கும்.",
      "onboarding.team.title": "குழுவுடன்",
      "onboarding.team.body":
        "பகிரப்பட்ட பணியிடம், நபருக்கு ஒரு Gemma பெட்டகம். இணை நிறுவனர்களை பங்கு-அடிப்படை அணுகலுடன் அழையுங்கள் — தனிப்பட்ட தரவு ஒருபோதும் ஒத்திசைக்காது.",
      "onboarding.continue": "தொடரவும்",
      "onboarding.invite.title": "உங்கள் குழுவை அழைக்கவும்",
      "onboarding.invite.body":
        "ஒவ்வொருவருக்கும் சொந்த Gemma-பாதுகாப்பு சுயவிவரம்: ஒரு பங்கு, அனுமதி வரம்பு, மற்றும் சொந்த சாதனத்தில் தனிப்பட்ட பெட்டகம்.",
      "onboarding.invite.email": "மின்னஞ்சல் முகவரி",
      "onboarding.invite.role": "பங்கு",
      "onboarding.invite.add": "அழைப்பு சேர்க்க",
      "onboarding.invite.send": "அழைப்புகளை அனுப்பி பணியிடத்தை உருவாக்கு",
      "onboarding.scope.title": "ஒவ்வொரு பங்கும் எதைப் பார்க்கலாம்",

      "workflow.title": "யோசனையிலிருந்து இயங்கும் நிறுவனம் வரை",
      "workflow.subtitle":
        "மேனேஜர் ஏஜென்ட் இந்த திட்டவரைபடத்தை முழுமையாக நிர்வகிக்கிறது. ஒவ்வொரு படியும் தெரியும், தணிக்கை செய்யக்கூடியது, உங்கள் மொழியில் காட்டப்படும்.",
    },
  };

  const STORAGE_KEY = "orbit.lang";

  function current() {
    return localStorage.getItem(STORAGE_KEY) || "en";
  }

  function t(key, lang) {
    const l = lang || current();
    return (STRINGS[l] && STRINGS[l][key]) || STRINGS.en[key] || key;
  }

  function apply(lang) {
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(el.getAttribute("data-i18n"), lang);
    });
    document.querySelectorAll("[data-i18n-attr]").forEach((el) => {
      const [attr, key] = el.getAttribute("data-i18n-attr").split(":");
      el.setAttribute(attr, t(key, lang));
    });
    document.querySelectorAll("#lang-selector [data-lang]").forEach((btn) => {
      const active = btn.getAttribute("data-lang") === lang;
      btn.classList.toggle("bg-primary", active);
      btn.classList.toggle("text-white", active);
      btn.classList.toggle("text-on-surface-variant", !active);
    });
  }

  function mountSelector() {
    const host = document.getElementById("lang-selector");
    if (!host) return;
    host.className =
      "flex items-center gap-1 bg-white p-1 rounded-full border border-outline-variant";
    host.innerHTML = LANGS.map(
      (l) =>
        `<button data-lang="${l.code}" class="px-3 py-1.5 rounded-full text-label-sm font-medium transition-colors hover:bg-surface-container text-on-surface-variant">${l.label}</button>`
    ).join("");
    host.querySelectorAll("[data-lang]").forEach((btn) =>
      btn.addEventListener("click", () => apply(btn.getAttribute("data-lang")))
    );
  }

  document.addEventListener("DOMContentLoaded", () => {
    mountSelector();
    apply(current());
  });

  return { t, apply, current, mountSelector, LANGS };
})();
