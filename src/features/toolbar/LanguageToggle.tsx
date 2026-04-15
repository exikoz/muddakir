import { useTranslation } from 'react-i18next'
import { Globe } from 'lucide-react'
import { supportedLanguages, type SupportedLanguage } from '../../i18n/config'

const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  en: 'EN',
  ar: 'عربي',
}

export default function LanguageToggle() {
  const { i18n } = useTranslation()
  const currentLang = i18n.language as SupportedLanguage

  function cycleLang() {
    const idx = supportedLanguages.indexOf(currentLang)
    const next = supportedLanguages[(idx + 1) % supportedLanguages.length]
    i18n.changeLanguage(next)
  }

  return (
    <button
      onClick={cycleLang}
      className="h-8 px-2 rounded-lg border text-[11px] font-semibold transition-all flex items-center gap-1.5 bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-white"
      title="Switch language"
    >
      <Globe size={13} />
      <span>{LANGUAGE_LABELS[currentLang] ?? currentLang}</span>
    </button>
  )
}
