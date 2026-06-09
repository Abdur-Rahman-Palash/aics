const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  // Remove null characters and other control characters except newlines and tabs
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
};

// Test Bengali text
const testBengali = "আমি বাংলায় কথা বলতে পারি! এটি একটি পরীক্ষা স্ট্রিং।";
const result = sanitizeString(testBengali);
console.log("Original:", testBengali);
console.log("Sanitized:", result);
console.log("Are they equal?", testBengali === result);