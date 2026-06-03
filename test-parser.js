// test-parser.js
const { parse } = require("./parser");

const cases = [
  'ls -la',
  'echo "hello world"',
  "echo 'a | b'",
  'ls | grep js | wc -l',
  '',
  '| foo',      // should throw
  'ls |',       // should throw
  'echo "oops', // should throw
];

for (const input of cases) {
  try {
    console.log(JSON.stringify(input), "=>", JSON.stringify(parse(input)));
  } catch (err) {
    console.log(JSON.stringify(input), "=> ERROR:", err.message);
  }
}