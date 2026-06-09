import { describe, expect, it } from 'vitest';

import { classifyByHandle, classifyLab, extractConfidence } from '@/services/classify';

describe('classifyLab', () => {
  it('classifies SpaceXAI-owned facilities as xAI even when tenants are listed as users', () => {
    // Colossus 1/2: Users lists the tenants, Owner is SpaceXAI.
    expect(classifyLab('Anthropic, Cursor #confident', 'SpaceXAI')).toBe('xAI');
    expect(classifyLab('Anthropic', 'SpaceXAI')).toBe('xAI');
  });

  it('classifies by user string', () => {
    expect(classifyLab('OpenAI #confident', '')).toBe('OpenAI');
    expect(classifyLab('Google DeepMind', '')).toBe('Gemini');
    expect(classifyLab('Meta #likely', '')).toBe('Meta');
    expect(classifyLab('xAI', '')).toBe('xAI');
    expect(classifyLab('Anthropic', '')).toBe('Anthropic');
    expect(classifyLab('Microsoft', '')).toBe('OpenAI');
  });

  it('falls back to owner when users do not match', () => {
    expect(classifyLab('', 'Google')).toBe('Gemini');
    expect(classifyLab('', 'Amazon')).toBe('Anthropic');
    expect(classifyLab('', 'Oracle')).toBe('OpenAI');
  });

  it('returns Other for unknown facilities', () => {
    expect(classifyLab('Some Startup', 'Some Operator')).toBe('Other');
    expect(classifyLab('', '')).toBe('Other');
  });
});

describe('classifyByHandle', () => {
  it('classifies known handle patterns', () => {
    expect(classifyByHandle('Stargate Abilene')).toBe('OpenAI');
    expect(classifyByHandle('Colossus 2')).toBe('xAI');
    expect(classifyByHandle('Project Rainier')).toBe('Anthropic');
    expect(classifyByHandle('Prometheus')).toBe('Meta');
    expect(classifyByHandle('Mystery Site')).toBe('Other');
  });
});

describe('extractConfidence', () => {
  it('extracts Epoch confidence hashtags from either column', () => {
    expect(extractConfidence('OpenAI #confident', '')).toBe('confident');
    expect(extractConfidence('', 'Microsoft #likely')).toBe('likely');
    expect(extractConfidence('xAI #speculative', '')).toBe('speculative');
    expect(extractConfidence('OpenAI', 'Microsoft')).toBe('unknown');
  });
});
