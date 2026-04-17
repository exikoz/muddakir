import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// EN namespaces
import enCommon from './locales/en/common.json'
import enToolbar from './locales/en/toolbar.json'
import enDiscovery from './locales/en/discovery.json'
import enMushaf from './locales/en/mushaf.json'
import enWorkspace from './locales/en/workspace.json'
import enVerseDetail from './locales/en/verseDetail.json'
import enAiScope from './locales/en/aiScope.json'
import enGraph from './locales/en/graph.json'
import enUser from './locales/en/user.json'
import enWelcome from './locales/en/welcome.json'

// AR namespaces
import arCommon from './locales/ar/common.json'
import arToolbar from './locales/ar/toolbar.json'
import arDiscovery from './locales/ar/discovery.json'
import arMushaf from './locales/ar/mushaf.json'
import arWorkspace from './locales/ar/workspace.json'
import arVerseDetail from './locales/ar/verseDetail.json'
import arAiScope from './locales/ar/aiScope.json'
import arGraph from './locales/ar/graph.json'
import arUser from './locales/ar/user.json'
import arWelcome from './locales/ar/welcome.json'

export const supportedLanguages = ['en', 'ar'] as const
export type SupportedLanguage = (typeof supportedLanguages)[number]

export const rtlLanguages: SupportedLanguage[] = ['ar']

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: enCommon,
        toolbar: enToolbar,
        discovery: enDiscovery,
        mushaf: enMushaf,
        workspace: enWorkspace,
        verseDetail: enVerseDetail,
        aiScope: enAiScope,
        graph: enGraph,
        user: enUser,
        welcome: enWelcome,
      },
      ar: {
        common: arCommon,
        toolbar: arToolbar,
        discovery: arDiscovery,
        mushaf: arMushaf,
        workspace: arWorkspace,
        verseDetail: arVerseDetail,
        aiScope: arAiScope,
        graph: arGraph,
        user: arUser,
        welcome: arWelcome,
      },
    },
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'toolbar', 'discovery', 'mushaf', 'workspace', 'verseDetail', 'aiScope', 'graph', 'user', 'welcome'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
  })

export default i18n
