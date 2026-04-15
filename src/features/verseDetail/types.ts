/**
 * Types specific to the Verse Detail feature.
 */

export interface TranslationData {
  resourceId: number
  resourceName: string
  text: string
}

export interface TafsirData {
  resourceName: string
  text: string
}

export interface ReflectionPost {
  id: number
  body: string
  postTypeId: number
  authorName: string
  likeCount: number
}


/** A tafsir or translation resource from the /resources API */
export interface ResourceItem {
  id: number
  name: string
  language: string
}
