/**
 * Translation completeness tests.
 * Ensures every key in the English (source) locale exists in all other locales,
 * and that no locale has empty-string values.
 */

import { describe, it, expect } from 'vitest'

import enCommon from '../locales/en/common.json'
import enToolbar from '../locales/en/toolbar.json'
import enDiscovery from '../locales/en/discovery.json'
import enMushaf from '../locales/en/mushaf.json'
import enWorkspace from '../locales/en/workspace.json'
import enVerseDetail from '../locales/en/verseDetail.json'
import enAiScope from '../locales/en/aiScope.json'
import enGraph from '../locales/en/graph.json'

import arCommon from '../locales/ar/common.json'
import arToolbar from '../locales/ar/toolbar.json'
import arDiscovery from '../locales/ar/discovery.json'
import arMushaf from '../locales/ar/mushaf.json'
import arWorkspace from '../locales/ar/workspace.json'
import arVerseDetail from '../locales/ar/verseDetail.json'
import arAiScope from '../locales/ar/aiScope.json'
import arGraph from '../locales/ar/graph.json'

const EN: Record<string, Record<string, string>> = {
  common: enCommon,
  toolbar: enToolbar,
  discovery: enDiscovery,
  mushaf: enMushaf,
  workspace: enWorkspace,
  verseDetail: enVerseDetail,
  aiScope: enAiScope,
  graph: enGraph,
}

const AR: Record<string, Record<string, string>> = {
  common: arCommon,
  toolbar: arToolbar,
  discovery: arDiscovery,
  mushaf: arMushaf,
  workspace: arWorkspace,
  verseDetail: arVerseDetail,
  aiScope: arAiScope,
  graph: arGraph,
}

const LOCALES: Record<string, Record<string, Record<string, string>>> = {
  en: EN,
  ar: AR,
}

const namespaces = Object.keys(EN)

describe('Translation completeness', () => {
  namespaces.forEach(ns => {
    describe(`namespace: ${ns}`, () => {
      const enKeys = Object.keys(EN[ns]).sort()

      it('English (source) should have at least one key', () => {
        expect(enKeys.length).toBeGreaterThan(0)
      })

      Object.entries(LOCALES).forEach(([lang, localeData]) => {
        if (lang === 'en') return

        it(`${lang} should have all keys from English`, () => {
          const targetKeys = Object.keys(localeData[ns])
          const missing = enKeys.filter(k => !targetKeys.includes(k))
          expect(missing, `Missing keys in ${lang}/${ns}: ${missing.join(', ')}`).toEqual([])
        })

        it(`${lang} should not have extra keys absent from English`, () => {
          const targetKeys = Object.keys(localeData[ns])
          const extra = targetKeys.filter(k => !enKeys.includes(k))
          expect(extra, `Extra keys in ${lang}/${ns}: ${extra.join(', ')}`).toEqual([])
        })

        it(`${lang} should have no empty values`, () => {
          const empty = Object.entries(localeData[ns])
            .filter(([, v]) => typeof v === 'string' && v.trim() === '')
            .map(([k]) => k)
          expect(empty, `Empty values in ${lang}/${ns}: ${empty.join(', ')}`).toEqual([])
        })
      })
    })
  })
})
