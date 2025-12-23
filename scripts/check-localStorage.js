// Debug script to check localStorage polyfill status
// Run with: node scripts/check-localStorage.js

console.log('=== localStorage Polyfill Check ===\n');

// Apply polyfill logic (same as in the codebase)
const needsPolyfill =
  typeof globalThis.localStorage === 'undefined' ||
  typeof globalThis.localStorage.getItem !== 'function';

if (needsPolyfill) {
  console.log(
    '⚠️  Applying polyfill (Node.js 25+ broken localStorage detected)...\n'
  );
  const storage = {};
  globalThis.localStorage = {
    getItem: (key) => storage[key] || null,
    setItem: (key, value) => {
      storage[key] = value;
    },
    removeItem: (key) => {
      delete storage[key];
    },
    clear: () => {
      Object.keys(storage).forEach((k) => delete storage[k]);
    },
    get length() {
      return Object.keys(storage).length;
    },
    key: (index) => Object.keys(storage)[index] || null,
  };
}

// Check if localStorage exists
console.log('1. Checking globalThis.localStorage:');
console.log('   Exists:', typeof globalThis.localStorage !== 'undefined');
console.log('   Type:', typeof globalThis.localStorage);
console.log('   Value:', globalThis.localStorage);

if (typeof globalThis.localStorage !== 'undefined') {
  console.log('\n2. Checking localStorage methods:');
  console.log('   getItem:', typeof globalThis.localStorage.getItem);
  console.log('   setItem:', typeof globalThis.localStorage.setItem);
  console.log('   removeItem:', typeof globalThis.localStorage.removeItem);
  console.log('   clear:', typeof globalThis.localStorage.clear);
  console.log('   length:', typeof globalThis.localStorage.length);
  console.log('   key:', typeof globalThis.localStorage.key);

  // Test if it works
  try {
    globalThis.localStorage.setItem('test', 'value');
    const value = globalThis.localStorage.getItem('test');
    console.log('\n3. Test write/read:');
    console.log('   Success:', value === 'value');
    globalThis.localStorage.removeItem('test');
  } catch (error) {
    console.log('\n3. Test write/read:');
    console.log('   Error:', error.message);
  }
} else {
  console.log('\n2. localStorage is undefined - polyfill needed');
}

console.log('\n=== Environment Info ===');
console.log('Node version:', process.version);
console.log('Platform:', process.platform);
