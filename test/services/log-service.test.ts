/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Level, Logger, getLogger } from '../../src/services/log-service';

describe('Level', () => {
  it('defines an ascending numeric scale from ALL to OFF', () => {
    expect(Level.ALL).toBe(0);
    expect(Level.TRACE).toBe(1);
    expect(Level.DEBUG).toBe(2);
    expect(Level.INFO).toBe(3);
    expect(Level.WARN).toBe(4);
    expect(Level.ERROR).toBe(5);
    expect(Level.FATAL).toBe(6);
    expect(Level.OFF).toBe(7);
  });
});

describe('Logger', () => {
  // Logger is a mutable module-level singleton: snapshot its real state once so every
  // test can restore it, rather than leaking level/target changes into other test files.
  const originalLevel = Logger.level;
  const originalTargets = { ...Logger.logTarget };

  beforeEach(() => {
    Logger.level = Level.ALL;
  });

  afterEach(() => {
    Logger.level = originalLevel;
    (Object.keys(Logger.logTarget) as unknown as number[]).forEach((key) => {
      delete Logger.logTarget[key];
    });
    Object.assign(Logger.logTarget, originalTargets);
    vi.restoreAllMocks();
  });

  describe('setLevel / getLevel', () => {
    it('updates the level for a valid value', () => {
      Logger.setLevel(Level.WARN);
      expect(Logger.getLevel()).toBe(Level.WARN);
    });

    it('leaves the level unchanged and warns for an invalid value', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      Logger.setLevel(Level.INFO);
      Logger.setLevel(999);
      expect(Logger.getLevel()).toBe(Level.INFO);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid log level'));
    });
  });

  describe('setLogTarget', () => {
    it('installs a valid target for a valid level', () => {
      const target = vi.fn();
      Logger.setLogTarget(Level.INFO, target);
      Logger.info('hi');
      expect(target).toHaveBeenCalledWith('hi');
    });

    it('rejects an invalid level, logs an error, and sets nothing', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      Logger.setLogTarget(999, vi.fn());
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid log level'));
      expect(Logger.logTarget[999]).toBeUndefined();
    });

    it('rejects a non-function target, logs an error, and leaves the existing target untouched', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const originalInfoTarget = Logger.logTarget[Level.INFO];
      Logger.setLogTarget(Level.INFO, 'not a function' as any);
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid log target function'));
      expect(Logger.logTarget[Level.INFO]).toBe(originalInfoTarget);
    });
  });

  describe('trace()', () => {
    it('calls its target when the active level permits it', () => {
      const target = vi.fn();
      Logger.setLogTarget(Level.TRACE, target);
      Logger.level = Level.TRACE;
      Logger.trace('msg');
      expect(target).toHaveBeenCalledWith('msg');
    });

    it('is suppressed once the active level is raised above TRACE', () => {
      const target = vi.fn();
      Logger.setLogTarget(Level.TRACE, target);
      Logger.level = Level.DEBUG;
      Logger.trace('msg');
      expect(target).not.toHaveBeenCalled();
    });

    it('passes context through only when provided', () => {
      const target = vi.fn();
      Logger.setLogTarget(Level.TRACE, target);
      Logger.trace('msg');
      expect(target).toHaveBeenLastCalledWith('msg');
      const context = { a: 1 };
      Logger.trace('msg2', context);
      expect(target).toHaveBeenLastCalledWith('msg2', context);
    });
  });

  describe('debug()', () => {
    it('calls its target when the active level permits it', () => {
      const target = vi.fn();
      Logger.setLogTarget(Level.DEBUG, target);
      Logger.level = Level.DEBUG;
      Logger.debug('msg');
      expect(target).toHaveBeenCalledWith('msg');
    });

    it('is suppressed once the active level is raised above DEBUG', () => {
      const target = vi.fn();
      Logger.setLogTarget(Level.DEBUG, target);
      Logger.level = Level.INFO;
      Logger.debug('msg');
      expect(target).not.toHaveBeenCalled();
    });
  });

  describe('info()', () => {
    it('calls its target when the active level permits it', () => {
      const target = vi.fn();
      Logger.setLogTarget(Level.INFO, target);
      Logger.level = Level.INFO;
      Logger.info('msg');
      expect(target).toHaveBeenCalledWith('msg');
    });

    it('is suppressed once the active level is raised above INFO', () => {
      const target = vi.fn();
      Logger.setLogTarget(Level.INFO, target);
      Logger.level = Level.WARN;
      Logger.info('msg');
      expect(target).not.toHaveBeenCalled();
    });
  });

  describe('warn()', () => {
    it('calls its target when the active level permits it', () => {
      const target = vi.fn();
      Logger.setLogTarget(Level.WARN, target);
      Logger.level = Level.WARN;
      Logger.warn('msg');
      expect(target).toHaveBeenCalledWith('msg');
    });

    it('is suppressed once the active level is raised above WARN', () => {
      const target = vi.fn();
      Logger.setLogTarget(Level.WARN, target);
      Logger.level = Level.ERROR;
      Logger.warn('msg');
      expect(target).not.toHaveBeenCalled();
    });
  });

  describe('error()', () => {
    it('calls its target when the active level permits it', () => {
      const target = vi.fn();
      Logger.setLogTarget(Level.ERROR, target);
      Logger.level = Level.ERROR;
      Logger.error('msg');
      expect(target).toHaveBeenCalledWith('msg');
    });

    it('is suppressed once the active level is raised above ERROR', () => {
      const target = vi.fn();
      Logger.setLogTarget(Level.ERROR, target);
      Logger.level = Level.FATAL;
      Logger.error('msg');
      expect(target).not.toHaveBeenCalled();
    });

    it('passes an Error as context through to the target', () => {
      const target = vi.fn();
      Logger.setLogTarget(Level.ERROR, target);
      const err = new Error('boom');
      Logger.error('failed', err);
      expect(target).toHaveBeenCalledWith('failed', err);
    });
  });

  describe('fatal()', () => {
    it('prefixes the message with FATAL: and calls its target when permitted', () => {
      const target = vi.fn();
      Logger.setLogTarget(Level.FATAL, target);
      Logger.level = Level.FATAL;
      Logger.fatal('boom');
      expect(target).toHaveBeenCalledWith('FATAL: boom');
    });

    it('is suppressed once the active level is raised above FATAL (OFF)', () => {
      const target = vi.fn();
      Logger.setLogTarget(Level.FATAL, target);
      Logger.level = Level.OFF;
      Logger.fatal('boom');
      expect(target).not.toHaveBeenCalled();
    });
  });

  describe('log()', () => {
    it('delegates to info(), including its level gate', () => {
      const target = vi.fn();
      Logger.setLogTarget(Level.INFO, target);
      Logger.level = Level.INFO;
      Logger.log('via log');
      expect(target).toHaveBeenCalledWith('via log');

      target.mockClear();
      Logger.level = Level.WARN;
      Logger.log('suppressed');
      expect(target).not.toHaveBeenCalled();
    });
  });

  describe('actualOutput fallback', () => {
    it('falls back to console.warn when no target is registered for the level', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      delete Logger.logTarget[Level.WARN];
      Logger.warn('no target registered');
      expect(warnSpy).toHaveBeenCalledWith('no target registered');
    });

    it('falls back to console.warn with context when no target is registered', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      delete Logger.logTarget[Level.ERROR];
      const context = { code: 42 };
      Logger.error('no target', context);
      expect(warnSpy).toHaveBeenCalledWith('no target', context);
    });
  });
});

describe('getLogger', () => {
  const originalTargets = { ...Logger.logTarget };
  const originalLevel = Logger.level;

  beforeEach(() => {
    Logger.level = Level.ALL;
  });

  afterEach(() => {
    Logger.level = originalLevel;
    (Object.keys(Logger.logTarget) as unknown as number[]).forEach((key) => {
      delete Logger.logTarget[key];
    });
    Object.assign(Logger.logTarget, originalTargets);
    vi.restoreAllMocks();
  });

  it('prefixes [namespace] onto every level and delegates to Logger', () => {
    const target = vi.fn();
    Logger.setLogTarget(Level.INFO, target);
    const log = getLogger('my-ns');
    log.info('hello');
    expect(target).toHaveBeenCalledWith('[my-ns] hello');
  });

  it('honors the underlying level gate', () => {
    const target = vi.fn();
    Logger.setLogTarget(Level.DEBUG, target);
    Logger.level = Level.INFO;
    const log = getLogger('ns');
    log.debug('suppressed');
    expect(target).not.toHaveBeenCalled();
  });

  it('log() prefixes and routes through info()', () => {
    const target = vi.fn();
    Logger.setLogTarget(Level.INFO, target);
    const log = getLogger('ns2');
    log.log('via log');
    expect(target).toHaveBeenCalledWith('[ns2] via log');
  });

  it('passes context through for namespaced calls', () => {
    const target = vi.fn();
    Logger.setLogTarget(Level.ERROR, target);
    const log = getLogger('ns3');
    const err = new Error('oops');
    log.error('failed', err);
    expect(target).toHaveBeenCalledWith('[ns3] failed', err);
  });

  it('fatal() applies the namespace tag inside the FATAL: prefix', () => {
    // getLogger wraps the message as "[ns] boom" first, then Logger.fatal prepends
    // "FATAL: " to that whole string — so FATAL: ends up outermost.
    const target = vi.fn();
    Logger.setLogTarget(Level.FATAL, target);
    const log = getLogger('ns4');
    log.fatal('boom');
    expect(target).toHaveBeenCalledWith('FATAL: [ns4] boom');
  });
});
