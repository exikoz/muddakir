/**
 * Tests for VerseExplorer - demonstrates framework-agnostic usage
 * 
 * These tests show how the core logic works without any UI framework
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { VerseExplorer } from '../verseExplorer'

describe('VerseExplorer', () => {
  let explorer: VerseExplorer

  beforeEach(() => {
    explorer = new VerseExplorer()
  })

  describe('addVerse', () => {
    it('should add a verse node', async () => {
      const node = await explorer.addVerse('1:1')
      
      expect(node).toBeTruthy()
      expect(node?.verse.verse_key).toBe('1:1')
      expect(explorer.getAllNodes()).toHaveLength(1)
    })

    it('should prevent duplicate verses', async () => {
      const node1 = await explorer.addVerse('1:1')
      const node2 = await explorer.addVerse('1:1')
      
      expect(node1?.id).toBe(node2?.id)
      expect(explorer.getAllNodes()).toHaveLength(1)
    })

    it('should track parent-child relationships', async () => {
      const parent = await explorer.addVerse('1:1')
      const child = await explorer.addVerse('2:255', parent?.id)
      
      expect(child?.parentId).toBe(parent?.id)
      expect(explorer.getChildren(parent!.id)).toHaveLength(1)
    })
  })

  describe('searchFromWord', () => {
    it('should search and auto-add top results', async () => {
      const node = await explorer.addVerse('1:1')
      
      const result = await explorer.searchFromWord(
        node!.id,
        2, // Word index
        { lemma: true, root: true, fuzzy: true, semantic: false },
        3 // Auto-add top 3
      )
      
      expect(result.nodesToAdd.length).toBeGreaterThan(0)
      expect(result.nodesToAdd.length).toBeLessThanOrEqual(3)
      
      // All added nodes should have the parent set
      result.nodesToAdd.forEach(n => {
        expect(n.parentId).toBe(node!.id)
      })
    })

    it('should not search again if node already has children', async () => {
      const node = await explorer.addVerse('1:1')
      
      // First search
      await explorer.searchFromWord(node!.id, 2, { lemma: true, root: true, fuzzy: true, semantic: false })
      
      const nodeCountBefore = explorer.getAllNodes().length
      
      // Second search - should be ignored
      const result = await explorer.searchFromWord(node!.id, 2, { lemma: true, root: true, fuzzy: true, semantic: false })
      
      expect(result.nodesToAdd).toHaveLength(0)
      expect(explorer.getAllNodes()).toHaveLength(nodeCountBefore)
    })

    it('should filter out already existing verses', async () => {
      // Add some verses manually
      await explorer.addVerse('1:1')
      await explorer.addVerse('2:255')
      const node = await explorer.addVerse('112:1')
      
      // Search - should not add 1:1 or 2:255 if they appear in results
      const result = await explorer.searchFromWord(
        node!.id,
        1,
        { lemma: true, root: true, fuzzy: true, semantic: false }
      )
      
      // Check that no duplicate verses were added
      const verseKeys = explorer.getAllNodes().map(n => n.verse.verse_key)
      const uniqueKeys = new Set(verseKeys)
      expect(verseKeys.length).toBe(uniqueKeys.size)
    })

    it('should update parent node with active word index', async () => {
      const node = await explorer.addVerse('1:1')
      
      await explorer.searchFromWord(node!.id, 2, { lemma: true, root: true, fuzzy: true, semantic: false })
      
      const updatedNode = explorer.getNode(node!.id)
      expect(updatedNode?.activeWordIndex).toBe(2)
    })
  })

  describe('deleteNode', () => {
    it('should delete a node', async () => {
      const node = await explorer.addVerse('1:1')
      
      const result = explorer.deleteNode(node!.id)
      
      expect(result.deletedIds).toContain(node!.id)
      expect(explorer.getAllNodes()).toHaveLength(0)
    })

    it('should delete all descendants recursively', async () => {
      const root = await explorer.addVerse('1:1')
      
      // Add children through search
      await explorer.searchFromWord(root!.id, 2, { lemma: true, root: true, fuzzy: true, semantic: false }, 2)
      
      const nodeCountBefore = explorer.getAllNodes().length
      expect(nodeCountBefore).toBeGreaterThan(1)
      
      // Delete root - should delete all children
      const result = explorer.deleteNode(root!.id)
      
      expect(result.deletedIds.length).toBe(nodeCountBefore)
      expect(explorer.getAllNodes()).toHaveLength(0)
    })

    it('should clear highlights when last child is deleted', async () => {
      const parent = await explorer.addVerse('1:1')
      
      // Search to add children and set highlight
      await explorer.searchFromWord(parent!.id, 2, { lemma: true, root: true, fuzzy: true, semantic: false }, 1)
      
      const children = explorer.getChildren(parent!.id)
      expect(children.length).toBeGreaterThan(0)
      
      // Delete the child
      const result = explorer.deleteNode(children[0].id)
      
      // Parent should be in the clear highlights list
      expect(result.nodesToClearHighlights).toContain(parent!.id)
      
      // Parent should have no active word index
      const updatedParent = explorer.getNode(parent!.id)
      expect(updatedParent?.activeWordIndex).toBeUndefined()
    })
  })

  describe('utility methods', () => {
    it('should check if verse exists', async () => {
      expect(explorer.hasVerse('1:1')).toBe(false)
      
      await explorer.addVerse('1:1')
      
      expect(explorer.hasVerse('1:1')).toBe(true)
    })

    it('should get node by verse key', async () => {
      const node = await explorer.addVerse('1:1')
      
      const found = explorer.getNodeByVerseKey('1:1')
      
      expect(found?.id).toBe(node?.id)
    })

    it('should get statistics', async () => {
      await explorer.addVerse('1:1')
      const parent = await explorer.addVerse('2:255')
      await explorer.addVerse('112:1', parent?.id)
      
      const stats = explorer.getStats()
      
      expect(stats.totalNodes).toBe(3)
      expect(stats.rootNodes).toBe(2)
      expect(stats.childNodes).toBe(1)
    })

    it('should export and import state', async () => {
      await explorer.addVerse('1:1')
      await explorer.addVerse('2:255')
      
      const state = explorer.exportState()
      
      const newExplorer = new VerseExplorer()
      newExplorer.importState(state)
      
      expect(newExplorer.getAllNodes()).toHaveLength(2)
      expect(newExplorer.hasVerse('1:1')).toBe(true)
      expect(newExplorer.hasVerse('2:255')).toBe(true)
    })

    it('should clear all nodes', async () => {
      await explorer.addVerse('1:1')
      await explorer.addVerse('2:255')
      
      explorer.clear()
      
      expect(explorer.getAllNodes()).toHaveLength(0)
      expect(explorer.getStats().totalNodes).toBe(0)
    })
  })
})
