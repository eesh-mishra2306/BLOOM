/**
 * Curated reference notes Mochi may draw on. Each note paraphrases a public health source.
 * `reviewed: false` until a clinician signs off — this must happen before real-world testing.
 */

export interface KnowledgeSource {
  publisher: string;
  title: string;
  url: string;
}

export interface KnowledgeEntry {
  id: string;
  title: string;
  body: string;
  tags: string[];
  sources: KnowledgeSource[];
  reviewed: boolean;
}

const NHS = "NHS (UK)";

export const KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: "period-pain",
    title: "Easing period pain",
    body: "Period pain is common and is usually caused by the muscles of the womb tightening. Heat on the tummy or lower back (a hot water bottle or heat pad), a warm bath, gentle movement such as walking, stretching or yoga, light massage and rest often help. Over-the-counter pain relief such as ibuprofen or paracetamol can help when taken as the label says; a pharmacist can say what is safe for you. See a doctor if the pain is severe, stops you doing everyday things, is new or different, or doesn't ease with pain relief.",
    tags: ["period pain", "cramp", "cramps", "dysmenorrhoea", "tummy", "stomach", "abdominal", "lower back", "ache", "heat", "hot water bottle", "relief", "help", "painkiller", "ibuprofen", "paracetamol"],
    sources: [{ publisher: NHS, title: "Period pain", url: "https://www.nhs.uk/conditions/period-pain/" }],
    reviewed: false,
  },
  {
    id: "heavy-periods",
    title: "Heavy periods and when to get urgent help",
    body: "A period may be heavy if you need to change a pad or tampon every 1–2 hours, use two products together, pass clots larger than about 2.5 cm, bleed through to clothes or bedding, or bleed for more than 8 days. Heavy periods can cause tiredness and low iron, and a doctor can help. Get urgent medical help if you soak through a pad or tampon every hour for two hours or more, or feel faint or very dizzy.",
    tags: ["heavy", "heavy bleeding", "flooding", "clots", "pad every hour", "tampon", "soaking", "menorrhagia", "bleeding", "long period"],
    sources: [
      { publisher: NHS, title: "Heavy periods", url: "https://www.nhs.uk/conditions/heavy-periods/" },
      { publisher: "MSD Manual (FIGO 2018)", title: "Normal menstrual parameters", url: "https://www.merckmanuals.com/professional/multimedia/table/normal-menstrual-parameters" },
    ],
    reviewed: false,
  },
  {
    id: "normal-cycle",
    title: "What a typical cycle looks like",
    body: "A cycle is counted from the first day of one period to the first day of the next. For adults, cycles of 24 to 38 days are within the typical range, and a difference of up to 7 to 9 days between your shortest and longest cycles is considered normal. Bleeding usually lasts up to 8 days. Cycles can shift with stress, illness, travel, changes in weight or exercise, and hormonal contraception.",
    tags: ["normal", "cycle length", "how long", "regular", "typical", "28 days", "days between periods", "late", "early"],
    sources: [{ publisher: "MSD Manual (FIGO 2018)", title: "Normal menstrual parameters", url: "https://www.merckmanuals.com/professional/multimedia/table/normal-menstrual-parameters" }],
    reviewed: false,
  },
  {
    id: "irregular-periods",
    title: "Irregular or missed periods",
    body: "Periods can be irregular for many reasons, including stress, big changes in weight or exercise, hormonal contraception, polycystic ovary syndrome (PCOS), thyroid problems, breastfeeding and the years around menopause. Pregnancy is a common reason for a missed period. It's worth seeing a doctor if your periods suddenly become irregular, stop for three months or more when you're not pregnant, or you're worried.",
    tags: ["irregular", "missed period", "late period", "no period", "skipped", "delayed", "unpredictable", "stress", "thyroid"],
    sources: [{ publisher: NHS, title: "Irregular periods", url: "https://www.nhs.uk/conditions/irregular-periods/" }],
    reviewed: false,
  },
  {
    id: "pms",
    title: "Premenstrual syndrome (PMS)",
    body: "PMS covers physical and emotional changes in the days before a period, such as mood swings, feeling irritable, low or anxious, tiredness, bloating, breast tenderness, headaches and appetite changes. Regular exercise, enough sleep, regular balanced meals and ways to manage stress, like slow breathing, can ease symptoms. If symptoms are severe or affect daily life, a doctor can help; a severe form called premenstrual dysphoric disorder (PMDD) is treatable.",
    tags: ["pms", "pmdd", "mood swings", "irritable", "before period", "bloating", "tender breasts", "emotional", "cravings", "moody"],
    sources: [{ publisher: NHS, title: "Premenstrual syndrome (PMS)", url: "https://www.nhs.uk/conditions/pre-menstrual-syndrome/" }],
    reviewed: false,
  },
  {
    id: "pcos",
    title: "PCOS (often called PCOD in India)",
    body: "Polycystic ovary syndrome (PCOS) is a common hormonal condition; in India it's often called PCOD. Signs can include irregular or missed periods, extra facial or body hair, acne or oily skin, thinning hair on the head, weight gain and difficulty getting pregnant. Having some of these signs doesn't mean you have PCOS — only a doctor can diagnose it, usually with your history, blood tests and sometimes an ultrasound. It can't be cured, but symptoms can be managed with lifestyle changes and treatment.",
    tags: ["pcos", "pcod", "polycystic", "ovary", "ovaries", "hormonal", "facial hair", "hirsutism", "acne", "weight gain", "irregular periods", "cysts"],
    sources: [{ publisher: NHS, title: "Polycystic ovary syndrome", url: "https://www.nhs.uk/conditions/polycystic-ovary-syndrome-pcos/" }],
    reviewed: false,
  },
  {
    id: "endometriosis",
    title: "Endometriosis",
    body: "Endometriosis is a condition where tissue similar to the lining of the womb grows in other places, such as the ovaries and fallopian tubes. Signs can include period pain that stops you doing normal things, pelvic pain, pain during or after sex, pain when peeing or pooing during a period, and difficulty getting pregnant. It can take time to diagnose. If your period pain is severe or affecting your life, see a doctor and describe how it affects you.",
    tags: ["endometriosis", "pelvic pain", "painful sex", "severe period pain", "chronic pain", "fallopian"],
    sources: [{ publisher: NHS, title: "Endometriosis", url: "https://www.nhs.uk/conditions/endometriosis/" }],
    reviewed: false,
  },
  {
    id: "pregnancy-test",
    title: "Pregnancy tests and warning signs",
    body: "Most home pregnancy tests work from the first day of a missed period. If the result is negative but your period still hasn't come, test again a few days later or speak to a doctor. If you might be pregnant, get urgent medical help for severe pain on one side of the tummy, pain in the tip of the shoulder, or bleeding with dizziness — these can be signs of an ectopic pregnancy.",
    tags: ["pregnant", "pregnancy", "pregnancy test", "missed period", "positive", "negative", "ectopic", "shoulder pain", "one side pain"],
    sources: [
      { publisher: NHS, title: "Doing a pregnancy test", url: "https://www.nhs.uk/pregnancy/trying-for-a-baby/doing-a-pregnancy-test/" },
      { publisher: NHS, title: "Ectopic pregnancy", url: "https://www.nhs.uk/conditions/ectopic-pregnancy/" },
    ],
    reviewed: false,
  },
  {
    id: "not-contraception",
    title: "Cycle predictions are not contraception",
    body: "App predictions of fertile days are estimates and are not a reliable way to prevent pregnancy. Fertility awareness methods need proper teaching and careful tracking of several body signs, and they are less effective when not followed exactly. A doctor or family-planning clinic can explain contraception options that suit you.",
    tags: ["contraception", "fertile", "fertile window", "ovulation", "safe days", "avoid pregnancy", "birth control", "family planning"],
    sources: [{ publisher: NHS, title: "Natural family planning", url: "https://www.nhs.uk/contraception/methods-of-contraception/natural-family-planning/" }],
    reviewed: false,
  },
  {
    id: "breathing-stress",
    title: "Calming stress with slow breathing",
    body: "Slow breathing can settle the body's stress response. A simple pattern: breathe in gently through your nose, then breathe out slowly for longer than you breathed in, for three to five minutes. Regular sleep and wake times, daylight, movement and less caffeine later in the day help sleep and mood. If stress, low mood or anxiety last for weeks or affect daily life, talk to a doctor or counsellor.",
    tags: ["stress", "anxiety", "anxious", "panic", "breathing", "breathe", "calm", "relax", "sleep", "insomnia", "overwhelmed", "tension"],
    sources: [{ publisher: NHS, title: "Breathing exercises for stress", url: "https://www.nhs.uk/mental-health/self-help/guides-tools-and-activities/breathing-exercises-for-stress/" }],
    reviewed: false,
  },
  {
    id: "mental-health-india",
    title: "Mental health support in India",
    body: "Tele-MANAS is the Government of India's free, confidential mental-health helpline, open 24×7 in many languages. Call 14416 or 1-800-891-4416 to talk with a trained counsellor. If you might act on thoughts of harming yourself, or you are in danger right now, call 112.",
    tags: ["tele-manas", "helpline", "counsellor", "therapy", "depression", "sad", "low", "lonely", "suicidal", "mental health", "talk to someone"],
    sources: [{ publisher: "Ministry of Health and Family Welfare", title: "Tele-MANAS", url: "https://telemanas.mohfw.gov.in/home" }],
    reviewed: false,
  },
  {
    id: "safety-india",
    title: "Emergency help in India",
    body: "112 is India's single emergency number for police, fire and medical help; it can also be reached by SMS and through the official 112 India app. The Women Helpline 181 gives 24×7 support to women facing violence and links to emergency services. BLOOM's SOS can alert your trusted contacts, but it does not contact the police for you.",
    tags: ["emergency", "112", "181", "police", "unsafe", "followed", "harassment", "violence", "women helpline", "help", "danger", "sos"],
    sources: [
      { publisher: "Emergency Response Support System", title: "112 India", url: "https://112.gov.in" },
      { publisher: "Ministry of Women and Child Development", title: "Women Helpline 181", url: "https://www.myscheme.gov.in/schemes/whl-181" },
    ],
    reviewed: false,
  },
  {
    id: "iron-tiredness",
    title: "Tiredness, heavy periods and iron",
    body: "Heavy periods are a common cause of iron deficiency anaemia, which can make you feel tired, short of breath, pale or notice your heart racing. A simple blood test can check your iron. Don't start iron supplements without advice, because too much iron can be harmful.",
    tags: ["tired", "tiredness", "fatigue", "exhausted", "iron", "anaemia", "anemia", "weak", "breathless", "low energy"],
    sources: [{ publisher: NHS, title: "Iron deficiency anaemia", url: "https://www.nhs.uk/conditions/iron-deficiency-anaemia/" }],
    reviewed: false,
  },
  {
    id: "discharge-hygiene",
    title: "Discharge and intimate hygiene myths",
    body: "Vaginal discharge is normal and changes through the cycle. The vagina cleans itself, so douching and perfumed washes aren't needed and can upset its natural balance; plain water on the outside is enough. See a doctor or sexual-health clinic if discharge changes colour or smell, or comes with itching, soreness or pain.",
    tags: ["discharge", "white discharge", "smell", "itching", "hygiene", "douching", "intimate wash", "infection", "vaginal", "clean"],
    sources: [{ publisher: NHS, title: "Vaginal discharge", url: "https://www.nhs.uk/conditions/vaginal-discharge/" }],
    reviewed: false,
  },
];

export const KNOWLEDGE_BY_ID = new Map(KNOWLEDGE.map((k) => [k.id, k]));
