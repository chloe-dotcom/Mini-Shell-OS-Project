// test-executor.js
const { execute } = require("./executor");
const { parse } = require("./parser");

async function run(line) {
  console.log(`\n=== ${line} ===`);
  await execute(parse(line));
}

(async () => {
  await run("echo hello | cat");
  await run("echo one two three | wc -w");
  await run("ls | grep js | wc -l");
  await run("echo abc | tr a-z A-Z");
  console.log("\n[all done]");
})();