"use strict";

const { spawn } = require("child_process");

// ---------------------------------------------------------------------------
// executor.js — Steps 2 & 4
//
// runSingle() (Step 2) is given to you COMPLETE as a reference — it's the
// fork/exec/wait pattern you already had. Your task is runPipeline() (Step 4):
// connect N stages so stage[i].stdout feeds stage[i+1].stdin.
// ---------------------------------------------------------------------------

let builtins = {};
function registerBuiltins(table) {
  builtins = table;
}

// ---- Step 2: single command (COMPLETE — use as a model) -------------------
function runSingle(stage) {
  return new Promise((resolve) => {
    const { command, args } = stage;

    if (builtins[command]) {
      builtins[command](args);
      return resolve();
    }

    // stdio: "inherit" -> child uses our terminal's fd 0/1/2 directly.
    const child = spawn(command, args, { stdio: "inherit" });

    child.on("error", (err) => {
      if (err.code === "ENOENT") {
        console.error(`mini-shell: command not found: ${command}`);
      } else {
        console.error(`mini-shell: ${err.message}`);
      }
      resolve();
    });

    child.on("close", () => resolve());
  });
}

// ---- Step 4: pipeline of 2+ stages (YOUR TASK) ----------------------------
//
// THE IDEA: for `A | B | C`, A's stdout feeds B's stdin, and B's stdout feeds
// C's stdin. A reads from the terminal; C writes to the terminal. The middle
// connections are pipes.
//
// In Node you express this by choosing each child's `stdio` array, then
// connecting the resulting streams with `.pipe()`.
//
// stdio array is [fd0, fd1, fd2]:
//   "inherit" -> share the shell's terminal for that fd
//   "pipe"    -> Node gives you child.stdin / child.stdout as a stream
//   "ignore"  -> /dev/null for that fd
function runPipeline(stages) {
  return new Promise((resolve) => {
    const children = [];

    // for the first stage, read from terminal (only) "inherit"
    const firstStdin = process.stdin.isTTY ? "inherit" : "ignore";

    for (let i = 0; i < stages.length; i++) {
      const { command, args } = stages[i];
      const isFirst = i === 0;
      const isLast = i === stages.length - 1;

      let stdio;
      if (isFirst) {
        stdio = [firstStdin, "pipe", "inherit"];
      }
      else if (isLast){
        stdio = ["pipe", "inherit", "inherit"];
      }
      else {
        stdio = ["pipe", "pipe", "inherit"];
      }

      const child = spawn(command, args, { stdio });
      children.push(child); // holds processes

      child.on("error", (err) => {
        if (err.code === "ENOENT") {
          console.error(`mini-shell: command not found: ${command}`);
        } else {
          console.error(`mini-shell: ${err.message}`);
        }
      });

      if (!isFirst) {
        children[i - 1].stdout.pipe(child.stdin);
      }
    }

    // edge case: empty children
    if(children.length === 0) {
      return resolve();
    }

    // pipeline complete after last child closes
    const last = children[children.length - 1];
    last.on("close", () => resolve());
  });
}

function execute(parsed) {
  if (parsed.stages.length === 1) {
    return runSingle(parsed.stages[0]);
  }
  return runPipeline(parsed.stages);
}

module.exports = { execute, registerBuiltins };
