#!/usr/bin/env node
/**
 * Debug check script - validates SKILL.md content
 */
import fs from 'fs';
import path from 'path';

const rootDir = '/data/data/com.termux/files/home/RocSystem';
const skillPath = path.join(rootDir, 'skills/minimax-pelacakan/SKILL.md');

const content = fs.readFileSync(skillPath, 'utf-8');
console.log('Has timeout:', content.toLowerCase().includes('timeout'));
console.log('Has gpt-oss-120b:', content.includes('gpt-oss-120b'));
console.log('Has anti-sabotage:', content.toLowerCase().includes('anti-sabotage'));
console.log('Has tool_calls:', content.toLowerCase().includes('tool_calls'));
console.log('Has empty response:', content.toLowerCase().includes('empty response'));