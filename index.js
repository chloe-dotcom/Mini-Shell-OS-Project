#!/usr/bin/env node
"use strict";

const readline = require("readline");
const { execute, registerBuiltins } = require("./executor");
const { parse } = require("./parser");

// ---------------------------------------------------------------------------
// index.js — REPL (Step 1) + built-ins. COMPLETE; no TODOs here.
// Your work for steps 3 & 4 is in parser.js and executor.js.
// ---------------------------------------------------------------------------

function prompt() {
  const cwd = process.cwd().replace(process.env.HOME, "~");
  return `mini-shell ${cwd} $ `;
}

// Built-ins run in THIS process (cd/exit/pwd change shell state, so they
// can't be child processes).
const builtins = {
  cd(args) {
    const target = args[0] || process.env.HOME || "/";
    try {
      process.chdir(target);
    } catch (err) {
      console.error(`cd: ${err.message}`);
    }
  },
  pwd() {
    console.log(process.cwd());
  },
  exit(args) {
    const code = args[0] ? parseInt(args[0], 10) : 0;
    process.exit(Number.isNaN(code) ? 0 : code);
  },
};

registerBuiltins(builtins);

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: prompt(),
  });

  rl.prompt();

  rl.on("line", async (line) => {
    let parsed;
    try {
      parsed = parse(line);
    } catch (err) {
      console.error(`mini-shell: ${err.message}`);
      rl.setPrompt(prompt());
      rl.prompt();
      return;
    }

    if (parsed) {
      rl.pause();
      await execute(parsed);
      rl.resume();
    }

    rl.setPrompt(prompt());
    rl.prompt();
  });

  rl.on("close", () => {
    console.log("\nexit");
    process.exit(0);
  });
}

main();
