import React from "react"; 
import { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";

const COMMANDS = {
  h: "moveLeft",
  l: "moveRight",
  j: "moveDown",
  k: "moveUp",
  i: "insertMode",
  "\x1b": "normalMode", // Escape
  dd: "deleteLine",
  dw: "deleteWord",
};

let buffer = [
  "Guard => G",
  "File Leak => password123",
  "Agent => @",
  "Exit => E",
];

let cursorPos = { row: 2, col: 10 };

export default function TerminalComponent() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [term, setTerm] = useState<Terminal | null>(null);
  const [mode, setMode] = useState("normal");
  const [inputBuffer, setInputBuffer] = useState("");

  useEffect(() => {
    const t = new Terminal({
      rows: 10,
      cols: 80,
      convertEol: true,
    });
    t.open(terminalRef.current!);
    renderBuffer(t);
    t.write("\r\nWelcome, Agent. Press 'i' to enter INSERT mode.\r\n");
    t.focus();

    t.onData((key) => {
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
    });

    setTerm(t);
    return () => t.dispose();
  }, [mode]);

  const renderBuffer = (t: Terminal) => {
    t.reset();
    buffer.forEach((line, i) => {
      t.write(i === cursorPos.row ? line.slice(0, cursorPos.col) + "_" + line.slice(cursorPos.col) + "\r\n" : line + "\r\n");
    });
  };

  const handleCommand = (cmd: string, t: Terminal) => {
    switch (cmd) {
      case "moveLeft":
        cursorPos.col = Math.max(0, cursorPos.col - 1);
        break;
      case "moveRight":
        cursorPos.col = Math.min(buffer[cursorPos.row].length, cursorPos.col + 1);
        break;
      case "moveUp":
        cursorPos.row = Math.max(0, cursorPos.row - 1);
        cursorPos.col = Math.min(cursorPos.col, buffer[cursorPos.row].length);
        break;
      case "moveDown":
        cursorPos.row = Math.min(buffer.length - 1, cursorPos.row + 1);
        cursorPos.col = Math.min(cursorPos.col, buffer[cursorPos.row].length);
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
    renderBuffer(t);
  };

  return <div ref={terminalRef} style={{ height: "100vh", width: "100%" }} />;
}
