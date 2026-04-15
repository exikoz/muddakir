import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { rtlLanguages, type SupportedLanguage } from './config'

/**
 * Syncs the <html> element's `dir` and `lang` attributes
 * with the current i18next language.
 */
export function useDirection() {
  const { i18n } = useTranslation()

  useEffect(() => {
    const lang = i18n.language as SupportedLanguage
    const dir = rtlLanguages.includes(lang) ? 'rtl' : 'ltr'

    document.documentElement.lang = lang
    document.documentElement.dir = dir
  }, [i18n.language])
}
