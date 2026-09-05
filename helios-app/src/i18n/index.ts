export type Locale = 'en' | 'zh'

const MESSAGES = {
  en: {
    'lang.english': 'English',
    'lang.chinese': '中文',
    'lang.label': 'Language',
    'lang.hint': 'Interface language. English is the default.',

    'landing.nav.why': 'Why Helios',
    'landing.nav.product': 'Product',
    'landing.nav.apps': 'Apps',
    'landing.nav.start': 'Start',
    'landing.nav.signIn': 'Sign in',
    'landing.nav.create': 'Create your space',
    'landing.home': 'Helios Space home',

    'landing.pricing.kicker': 'FREE',
    'landing.pricing.title': 'One Helios.\nCompletely free.',
    'landing.pricing.body': 'Create an account and use every app. There is no paid plan, no upgrade, and no card.',
    'landing.pricing.cardKicker': 'HELIOS',
    'landing.pricing.cardTitle': 'Free for everyone',
    'landing.pricing.cardBody': 'Word, Excel, PowerPoint, OneNote, Stocks, and the school and work apps stay on every account.',
    'landing.pricing.f1': 'All Mini Apps',
    'landing.pricing.f2': 'Unlimited documents and characters',
    'landing.pricing.f3': 'Stocks quotes',
    'landing.pricing.f4': 'Subjects, Hobbies, Live',
    'landing.pricing.f5': 'No plans and no charges',
    'landing.pricing.cta': 'Start free',

    'settings.language': 'Language',
    'writing.characters': 'characters',
  },
  zh: {
    'lang.english': 'English',
    'lang.chinese': '中文',
    'lang.label': '语言',
    'lang.hint': '界面语言。默认英文。',

    'landing.nav.why': '为什么选 Helios',
    'landing.nav.product': '产品',
    'landing.nav.apps': '应用',
    'landing.nav.start': '开始',
    'landing.nav.signIn': '登录',
    'landing.nav.create': '创建你的空间',
    'landing.home': 'Helios Space 首页',

    'landing.pricing.kicker': '免费',
    'landing.pricing.title': '一个 Helios。\n完全免费。',
    'landing.pricing.body': '注册后即可使用全部应用。没有付费套餐，没有升级，也不需要绑卡。',
    'landing.pricing.cardKicker': 'HELIOS',
    'landing.pricing.cardTitle': '人人免费',
    'landing.pricing.cardBody': 'Word、Excel、PowerPoint、OneNote、Stocks，以及学习与工作应用，每个账号都能用。',
    'landing.pricing.f1': '全部 Mini Apps',
    'landing.pricing.f2': '文稿不限篇数、不限字数',
    'landing.pricing.f3': 'Stocks 行情',
    'landing.pricing.f4': 'Subjects、Hobbies、Live',
    'landing.pricing.f5': '没有套餐，也不收钱',
    'landing.pricing.cta': '免费开始',

    'settings.language': '语言',
    'writing.characters': '字',
  },
} as const

export type MessageKey = keyof typeof MESSAGES.en

export function normalizeLocale(value: unknown): Locale {
  return value === 'zh' ? 'zh' : 'en'
}

export function t(locale: Locale, key: MessageKey): string {
  return MESSAGES[locale][key] ?? MESSAGES.en[key] ?? key
}
