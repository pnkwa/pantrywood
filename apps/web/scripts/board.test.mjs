import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BOARD_COLS,
  BOARD_ROWS,
  addPiece,
  bringToFront,
  freeSpot,
  isNoteDone,
  markRestocked,
  movePiece,
  resizePiece,
} from "../src/lib/board/board.ts";

const note = (id, links = []) => ({ id, kind: "note", w: 5, h: 5, pin: "magnet", paper: "butter", text: "", links });

test("new pieces hang in the first free gap, in front of the rest", () => {
  const board = addPiece(addPiece({ pieces: [] }, note("a")), note("b"));
  const [first, second] = board.pieces;
  assert.deepEqual([first.x, first.y, first.z], [0, 0, 1]);
  assert.deepEqual([second.x, second.y, second.z], [5, 0, 2]);
});

test("a full board falls back to the top-left corner", () => {
  assert.deepEqual(freeSpot([{ x: 0, y: 0, w: BOARD_COLS, h: BOARD_ROWS }], 3, 3), { x: 0, y: 0 });
});

test("pieces stay on the board and keep a minimum size", () => {
  const board = addPiece({ pieces: [] }, note("a"));
  const moved = movePiece(board, "a", 99, -4).pieces[0];
  assert.deepEqual([moved.x, moved.y], [BOARD_COLS - 5, 0]);
  const shrunk = resizePiece(board, "a", 1, 1).pieces[0];
  assert.deepEqual([shrunk.w, shrunk.h], [3, 3]);
});

test("slips and accessories keep their size", () => {
  const board = addPiece({ pieces: [] }, { id: "s", kind: "slip", w: 5, h: 8, pin: "clip", receiptId: "r" });
  assert.deepEqual([resizePiece(board, "s", 9, 9).pieces[0].w], [5]);
});

test("bring to front puts a piece above every other one", () => {
  const board = addPiece(addPiece({ pieces: [] }, note("a")), note("b"));
  const front = bringToFront(board, "a");
  assert.ok(front.pieces[0].z > front.pieces[1].z);
});

test("a note ticks itself off once every linked product is restocked", () => {
  const board = addPiece({ pieces: [] }, note("a", [{ productId: 1, restocked: false }, { productId: 2, restocked: false }]));
  const once = markRestocked(board, 1);
  assert.equal(isNoteDone(once.pieces[0]), false);
  assert.equal(isNoteDone(markRestocked(once, 2).pieces[0]), true);
  assert.equal(isNoteDone(note("plain")), false);
});

test("a restock ticks checklist lines for that product only", () => {
  const list = {
    id: "c",
    kind: "checklist",
    w: 6,
    h: 6,
    pin: "washi",
    title: "Restock",
    lines: [
      { id: "1", text: "eggs", done: false, productId: 2 },
      { id: "2", text: "dish soap", done: false, productId: 39 },
      { id: "3", text: "a treat", done: false, productId: null },
    ],
  };
  const lines = markRestocked(addPiece({ pieces: [] }, list), 2).pieces[0].lines;
  assert.deepEqual(lines.map((line) => line.done), [true, false, false]);
});
