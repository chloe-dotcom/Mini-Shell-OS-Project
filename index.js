#!/usr/bin/env node
"use strict";

const readline = require("readline");
const { spawn } = require("child_process");
const path = require("path");

// ---------------------------------------------------------------------------
// Mini Shell — Steps 1 & 2
//   1. A REPL loop that reads a line, processes it, and loops.
//   2. Parse one command + args, spawn it as a child process, wait for exit.
//
// Built-ins included so the shell is usable from the start: `cd`, `pwd`, `exit`.
// (Built-ins MUST run in this process — see the note on `cd` below.)
// ---------------------------------------------------------------------------

// Build the prompt string. Shows the current working directory, like a real shell.
function prompt() {
  const cwd = process.cwd().replace(process.env.HOME, "~");
  return `mini-shell ${cwd} $ `;
}

// --- Naive parser (Step 2) ------------------------------------------------
// Split on whitespace. This is intentionally simple: no quotes, no operators
// yet. You'll replace this in the parsing step with real tokenization.
function parse(line) {
  const tokens = line.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return null;
  return { command: tokens[0], args: tokens.slice(1) };
}

// --- Built-ins ------------------------------------------------------------
// These change the state of the SHELL process itself, so they cannot be
// child processes. If `cd` ran in a forked child, the child would change its
// own cwd and exit — leaving our cwd untouched. So we handle them here.
const builtins = {
  cd(args) {
    // `cd` with no args goes to home, like bash.
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

// --- Execute one parsed command -------------------------------------------
// Returns a Promise that resolves when the command is done. For external
// commands, "done" = the child process emitted 'close'. This is Node's
// async stand-in for the blocking waitpid() a C shell would call.
function execute(parsed) {
  return new Promise((resolve) => {
    const { command, args } = parsed;

    // Built-in? Run it here, in the parent. No process spawned.
    if (builtins[command]) {
      builtins[command](args);
      return resolve();
    }

    // External command: spawn a child process.
    //   stdio: "inherit" wires the child's fd 0/1/2 straight to ours, so its
    //   input/output goes to the same terminal. Later, for pipes and
    //   redirection, you'll stop inheriting and rewire these fds yourself.
    const child = spawn(command, args, { stdio: "inherit" });

    // Fires if the program couldn't even start (e.g. command not found).
    child.on("error", (err) => {
      if (err.code === "ENOENT") {
        console.error(`mini-shell: command not found: ${command}`);
      } else {
        console.error(`mini-shell: ${err.message}`);
      }
      resolve();
    });

    // 'close' fires after the process exits AND its stdio streams are flushed.
    // This is where we "reap" the child — the moment we know it's finished.
    child.on("close", (code, signal) => {
      resolve();
    });
  });
}

// --- REPL loop (Step 1) ---------------------------------------------------
async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: prompt(),
  });

  rl.prompt();

  rl.on("line", async (line) => {
    const parsed = parse(line);

    if (parsed) {
      // Pause readline while the child owns the terminal, then resume.
      // Without this, readline and the child can fight over stdin.
      rl.pause();
      await execute(parsed);
      rl.resume();
    }

    // Refresh the prompt (cwd may have changed via `cd`) and show it again.
    rl.setPrompt(prompt());
    rl.prompt();
  });

  // Ctrl+D (end of input) exits cleanly.
  rl.on("close", () => {
    console.log("\nexit");
    process.exit(0);
  });
}

main();
