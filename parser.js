"use strict";

// ---------------------------------------------------------------------------
// parser.js — Step 3 (YOUR TASK)
//
// Goal: turn a raw input line into a "pipeline" — an array of command stages
// separated by the `|` operator. Each stage is { command, args }.
//
//   ls -la | grep .js | wc -l
//   => { stages: [
//        { command: "ls",   args: ["-la"] },
//        { command: "grep", args: [".js"] },
//        { command: "wc",   args: ["-l"]  },
//      ]}
//
// Two things the old naive parser (line.split(/\s+/)) got wrong and that you
// now need to handle:
//   1. Quotes:  echo "hello world"   -> ONE arg "hello world", not two.
//   2. Pipes:   a | b                -> two separate stages.
// ---------------------------------------------------------------------------

// tokenize(line) -> array of tokens.
// A token is either a word (with quotes/escapes resolved) or the operator "|".
//
// Recommended approach: a character-by-character state machine. Walk the
// string one char at a time, building up the "current" token, and track
// whether you're currently inside single or double quotes.
function tokenize(line) {
  const tokens = [];
  let current = "";        // the token currently being built
  let hasContent = false;  // have we seen ANY char for this token? (lets "" count)

  // Helper: finish the current token and push it (if non-empty / had content).
  const pushToken = () => {
    if (current.length > 0 || hasContent) tokens.push(current);
    current = "";
    hasContent = false;
  };

  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    // handle single and double quotes
    if (inSingle) {
      if (ch === "'") inSingle = false;
      else current += ch;
      continue;
    }
    if (inDouble) {
      if (ch === '"') inDouble = false;
      // backslash escapes next character
      else if (ch === "\\" && i + 1 < line.length) {
        current += line[++i];
      }
      else current += ch;
      continue;
    }

    // --- below here: NOT inside any quotes ---

    if (ch === "'") {
      inSingle = true;
      hasContent = true;
      continue;
    }
    if (ch === '"') {
      inDouble = true;
      hasContent = true;
      continue;
    }

    // a backslash outside quotes escapes the next char
    if (ch === "\\" && i + 1 < line.length) {
      current += line[++i];
      hasContent = true;
      continue;
    }

    // handle pipe special operator
    if (ch === '|') {
      pushToken();
      tokens.push('|');
      continue;
    }

    // handle whitespace: ignore
    if (/\s/.test(ch)) {
      pushToken();
      continue;
    }

    // otherwise, add to current
    current += ch;
    hasContent = true;
  }

  if (inSingle || inDouble) {
    throw new Error("syntax error: unterminated quote")
  }

  pushToken(); // flush the final token
  // console.log(`${tokens}`);
  return tokens;
}

// parse(line) -> { stages: [ { command, args }, ... ] } or null for empty input.
// Once you have tokens, group them into stages, splitting on the "|" token.
function parse(line) {
  const tokens = tokenize(line);
  if (tokens.length === 0) return null;

  const stages = [];
  let currentArgs = [];

  for (const token of tokens) {
    if (token === "|") {
      // syntax error (e.g. 'a || b')
      if (currentArgs.length === 0) {
        throw new Error("syntax error: missing argument around '|'");
      }
      else {
        stages.push(currentArgs);
        currentArgs = [];
      }
    }
    else {
      currentArgs.push(token);
    }
  }

  // handle final arguments and stage
  if (currentArgs.length === 0) {
    // syntax error, missing arguments for final command
    if (stages) {
        throw new Error("syntax error: missing argument around '|'");
    }
    else {
      return null;
    }
  }
  stages.push(currentArgs);


  return {
    stages: stages.map((argv) => ({
      command: argv[0],
      args: argv.slice(1)
    })),
  };
}

module.exports = { tokenize, parse };
