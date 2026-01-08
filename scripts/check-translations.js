#!/usr/bin/env node

/**
 * Script to check for missing translation keys across all language files.
 * Uses es-ES.json as the reference and checks all other language files.
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const LOCALES_DIR = join(__dirname, '../i18n/locales');
const REFERENCE_LOCALE = 'es-ES.json';

/**
 * Recursively extract all keys from an object, using dot notation for nested keys
 * @param {object} obj - The object to extract keys from
 * @param {string} prefix - The prefix for nested keys
 * @returns {Set<string>} Set of all keys in dot notation
 */
function extractKeys(obj, prefix = '') {
  const keys = new Set();

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      // Recursively extract keys from nested objects
      const nestedKeys = extractKeys(value, fullKey);
      nestedKeys.forEach((k) => keys.add(k));
    } else {
      // Leaf node - add the key
      keys.add(fullKey);
    }
  }

  return keys;
}

/**
 * Get a value from an object using dot notation
 * @param {object} obj - The object to get the value from
 * @param {string} path - The dot-notation path (e.g., "home.discover.title")
 * @returns {any} The value at the path, or undefined if not found
 */
function getValueByPath(obj, path) {
  return path.split('.').reduce((current, key) => {
    return current && typeof current === 'object' ? current[key] : undefined;
  }, obj);
}

/**
 * Load and parse a JSON file
 * @param {string} filePath - Path to the JSON file
 * @returns {object} Parsed JSON object
 */
function loadLocaleFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error loading file ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Main function to check translations
 */
function checkTranslations() {
  console.log('🔍 Checking translation keys...\n');

  // Load reference locale (es-ES.json)
  const referencePath = join(LOCALES_DIR, REFERENCE_LOCALE);
  const referenceData = loadLocaleFile(referencePath);

  if (!referenceData) {
    console.error(`❌ Could not load reference file: ${REFERENCE_LOCALE}`);
    process.exit(1);
  }

  // Extract all keys from reference
  const referenceKeys = extractKeys(referenceData);
  console.log(
    `📋 Reference locale (${REFERENCE_LOCALE}): ${referenceKeys.size} keys\n`
  );

  // Get all locale files
  const localeFiles = readdirSync(LOCALES_DIR)
    .filter((file) => file.endsWith('.json'))
    .filter((file) => file !== REFERENCE_LOCALE)
    .sort();

  if (localeFiles.length === 0) {
    console.log('⚠️  No other locale files found to check.');
    return;
  }

  let hasMissingKeys = false;
  const results = [];

  // Check each locale file
  for (const localeFile of localeFiles) {
    const localePath = join(LOCALES_DIR, localeFile);
    const localeData = loadLocaleFile(localePath);

    if (!localeData) {
      console.error(`❌ Could not load ${localeFile}`);
      continue;
    }

    const localeKeys = extractKeys(localeData);
    const missingKeys = [...referenceKeys].filter(
      (key) => !localeKeys.has(key)
    );

    // Also check for extra keys (keys that exist in locale but not in reference)
    const extraKeys = [...localeKeys].filter((key) => !referenceKeys.has(key));

    results.push({
      file: localeFile,
      totalKeys: localeKeys.size,
      missingKeys,
      extraKeys,
    });

    if (missingKeys.length > 0 || extraKeys.length > 0) {
      hasMissingKeys = true;
    }
  }

  // Print results
  console.log('📊 Results:\n');
  console.log('='.repeat(80));

  for (const result of results) {
    const { file, totalKeys, missingKeys, extraKeys } = result;
    const localeName = file.replace('.json', '');

    console.log(`\n🌐 ${localeName.toUpperCase()}`);
    console.log(
      `   Total keys: ${totalKeys} (reference has ${referenceKeys.size})`
    );

    if (missingKeys.length > 0) {
      console.log(`\n   ❌ Missing keys (${missingKeys.length}):`);
      missingKeys.forEach((key) => {
        const value = getValueByPath(referenceData, key);
        const preview =
          typeof value === 'string' && value.length > 50
            ? `${value.substring(0, 50)}...`
            : value;
        console.log(`      - ${key}`);
        console.log(`        Reference value: "${preview}"`);
      });
    } else {
      console.log(`   ✅ No missing keys`);
    }

    if (extraKeys.length > 0) {
      console.log(
        `\n   ⚠️  Extra keys (${extraKeys.length}) - keys not in reference:`
      );
      extraKeys.slice(0, 10).forEach((key) => {
        console.log(`      - ${key}`);
      });
      if (extraKeys.length > 10) {
        console.log(`      ... and ${extraKeys.length - 10} more`);
      }
    }
  }

  console.log('\n' + '='.repeat(80));

  // Summary
  const totalMissing = results.reduce(
    (sum, r) => sum + r.missingKeys.length,
    0
  );
  const totalExtra = results.reduce((sum, r) => sum + r.extraKeys.length, 0);

  console.log('\n📈 Summary:');
  console.log(`   Total missing keys across all locales: ${totalMissing}`);
  console.log(`   Total extra keys across all locales: ${totalExtra}`);

  if (hasMissingKeys) {
    console.log('\n❌ Some translation keys are missing!');
    process.exit(1);
  } else {
    console.log('\n✅ All translation keys are present!');
    process.exit(0);
  }
}

// Run the script
checkTranslations();
