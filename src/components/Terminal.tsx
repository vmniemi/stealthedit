import React, { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";

const COMMANDS = {
  h: "moveLeft",
  l: "moveRight",
  j: "moveDown",
  k: "moveUp",
  i: "insertMode",
  "\x1b": "normalMode",
  dd: "deleteLine",
  dw: "deleteWord",
};

let buffer = [
  "@ = you",
  "Guard => G",
  "Terminal = T",
  "@        T",
  
];

let cursorPos = { row: 2, col: 0 };

const VimPuzzle = ({ onExit }: { onExit: () => void }) => {
  const [command, setCommand] = useState("");
  const [textBuffer, setTextBuffer] = useState([
    "user: alice",
    "password: password123",
    "email: alice@example.com",
  ]);
  const [solved, setSolved] = useState(false);

  const handleKey = (key: string) => {
    if (key === "Enter") {
      const trimmed = command.replace(/\r?\n|\r/g, "").trim();
      console.log("Entered command:", JSON.stringify(trimmed));

      const match = trimmed.match(/^:%s\/(.+?)\/(.+?)(?:\/([g]?))?$/);
      if (match) {
        const [_, search, replace, flags] = match;
        console.log(`Search: "${search}", Replace: "${replace}", Flags: "${flags}"`);

        try {
          const regex = new RegExp(search, flags === "g" ? "g" : "");
          const newBuffer = textBuffer.map((line) => {
            const replacedLine = line.replace(regex, replace);
            console.log(`Original: "${line}", Replaced: "${replacedLine}"`);
            return replacedLine;
          });

          setTextBuffer(newBuffer);
          setSolved(true);

          console.log("Updated buffer:", newBuffer);

          setTimeout(() => {
            console.log("Exiting VimPuzzle");
            onExit();
          }, 1500);
        } catch (e) {
          console.error("Regex error:", e);
        }
      } else {
        console.warn("Invalid Vim substitute command format");
      }

      setCommand("");
    } else if (key === "Backspace") {
      setCommand((prev) => prev.slice(0, -1));
    } else if (key.length === 1) {
      setCommand((prev) => prev + key);
    }
  };

  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      e.preventDefault();
      handleKey(e.key);
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [command, textBuffer]);

  return (
    <div
      style={{
        fontFamily: "monospace",
        color: "lime",
        background: "black",
        padding: 10,
        height: "100vh",
      }}
    >
      <div>Fix the password leak using a Vim command:</div>
      <br />
      {textBuffer.map((line, i) => (
        <div key={i}>{line}</div>
      ))}
      <br />
      <div>
        :<span>{command}</span>
      </div>
      {solved && <div>✅ Password fixed!</div>}
    </div>
  );
};

export default function TerminalComponent() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const [mode, setMode] = useState("normal");
  const [inputBuffer, setInputBuffer] = useState("");
  const [vimMode, setVimMode] = useState(false);

  const renderBuffer = (t: Terminal) => {
    t.reset();
    buffer.forEach((line, i) => {
      if (i === cursorPos.row) {
        const before = line.slice(0, cursorPos.col);
        const at = line[cursorPos.col] || " ";
        const after = line.slice(cursorPos.col + 1);
        t.write(`${before}\x1b[7m${at}\x1b[0m${after}\r\n`);
      } else {
        t.write(line + "\r\n");
      }
    });
  };

  const handleCommand = (cmd: string, t: Terminal) => {
    let newRow = cursorPos.row;
    let newCol = cursorPos.col;

    switch (cmd) {
      case "moveLeft":
        newCol = Math.max(0, cursorPos.col - 1);
        break;
      case "moveRight":
        newCol = Math.min(buffer[cursorPos.row].length - 1, cursorPos.col + 1);
        break;
      case "moveUp":
        newRow = Math.max(0, cursorPos.row - 1);
        break;
      case "moveDown":
        newRow = Math.min(buffer.length - 1, cursorPos.row + 1);
        break;
      case "insertMode":
        setMode("insert");
        t.write("\r\n-- INSERT MODE --\r\n");
        return;
      case "normalMode":
        setMode("normal");
        t.write("\r\n-- NORMAL MODE --\r\n");
        return;
      case "deleteLine":
        buffer[cursorPos.row] = "";
        break;
      case "deleteWord":
        const line = buffer[cursorPos.row];
        const rest = line.slice(cursorPos.col);
        const match = rest.match(/\w+/);
        if (match) {
          const word = match[0];
          buffer[cursorPos.row] =
            line.slice(0, cursorPos.col) + rest.slice(word.length);
        }
        break;
      default:
        break;
    }

    if (buffer[newRow][newCol] === "T") {
      setVimMode(true);
      t.blur();
      return;
    }

    if (buffer[newRow][newCol] !== "G") {
      buffer[cursorPos.row] = replaceChar(buffer[cursorPos.row], cursorPos.col, " ");
      buffer[newRow] = replaceChar(buffer[newRow], newCol, "@");
      cursorPos.row = newRow;
      cursorPos.col = newCol;
    }

    renderBuffer(t);
  };

  const replaceChar = (str: string, index: number, chr: string) =>
    str.substring(0, index) + chr + str.substring(index + 1);

  useEffect(() => {
    if (!terminalRef.current) return;

    const t = new Terminal({ rows: 10, cols: 80, convertEol: true });
    t.open(terminalRef.current);
    termRef.current = t;
    renderBuffer(t);
    t.write("\r\nWelcome, Agent.  h:left j:up k:down l:right to move.\r\n");
    t.focus();

    const handleInput = (key: string) => {
      if (vimMode) return;

      if (mode === "insert") {
        if (key === "\x1b") {
          setMode("normal");
          t.write("\r\n-- NORMAL MODE --\r\n");
        } else {
          buffer[cursorPos.row] =
            buffer[cursorPos.row].slice(0, cursorPos.col) +
            key +
            buffer[cursorPos.row].slice(cursorPos.col);
          cursorPos.col++;
          renderBuffer(t);
        }
      } else {
        const combined = inputBuffer + key;
        if (COMMANDS[combined]) {
          handleCommand(COMMANDS[combined], t);
          setInputBuffer("");
        } else if (COMMANDS[key]) {
          handleCommand(COMMANDS[key], t);
          setInputBuffer("");
        } else {
          setInputBuffer(combined);
        }
      }
    };

    t.onData(handleInput);
    return () => t.dispose();
  }, [mode, vimMode]);

  return (
    <div style={{ height: "100vh", width: "100vw", overflow: "hidden" }}>
      {vimMode ? (
        <VimPuzzle
          onExit={() => {
            setVimMode(false);
            termRef.current?.focus();
          }}
        />
      ) : (
        <div ref={terminalRef} />
      )}
    </div>
  );
}
