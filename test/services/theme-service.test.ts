import { describe, it, expect, beforeEach } from 'vitest';
import { applyAppearance, applyTheme, toAppearance } from '../../src/services/theme-service';

describe('theme-service', () => {
  beforeEach(() => {
    document.documentElement.className = '';
    document.documentElement.style.colorScheme = '';
    delete document.body.dataset.theme;
  });

  describe('toAppearance', () => {
    it('maps "dark" to dark', () => {
      expect(toAppearance('dark')).toBe('dark');
    });

    it('maps the stored "default" theme to light', () => {
      expect(toAppearance('default')).toBe('light');
    });

    it('maps an absent theme to light', () => {
      expect(toAppearance(null)).toBe('light');
      expect(toAppearance(undefined)).toBe('light');
    });
  });

  describe('applyAppearance', () => {
    it('adds wa-dark to <html> for dark — this is what keep-monaco-editor reads', () => {
      applyAppearance('dark');
      expect(document.documentElement.classList.contains('wa-dark')).toBe(true);
    });

    it('removes wa-dark from <html> for light', () => {
      applyAppearance('dark');
      applyAppearance('light');
      expect(document.documentElement.classList.contains('wa-dark')).toBe(false);
    });

    it('sets all three appearance carriers together', () => {
      applyAppearance('dark');
      expect(document.documentElement.classList.contains('wa-dark')).toBe(true);
      expect(document.documentElement.style.colorScheme).toBe('dark');
      expect(document.body.dataset.theme).toBe('dark');
    });

    it('leaves unrelated <html> classes alone', () => {
      document.documentElement.classList.add('wa-scroll-lock');
      applyAppearance('dark');
      applyAppearance('light');
      expect(document.documentElement.classList.contains('wa-scroll-lock')).toBe(true);
    });

    it('is idempotent', () => {
      applyAppearance('dark');
      applyAppearance('dark');
      expect(document.documentElement.className.match(/wa-dark/g)).toHaveLength(1);
    });
  });

  describe('applyTheme', () => {
    it('applies dark from the stored theme name', () => {
      applyTheme('dark');
      expect(document.documentElement.classList.contains('wa-dark')).toBe(true);
    });

    it('applies light from the stored "default" theme name', () => {
      applyTheme('dark');
      applyTheme('default');
      expect(document.documentElement.classList.contains('wa-dark')).toBe(false);
    });
  });
});
