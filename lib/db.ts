import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const dir = path.join(process.cwd(), "data");
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

export const db = new Database(path.join(dir, "app.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,
  type TEXT NOT NULL,
  content_text TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS chunks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  doc_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL,
  text TEXT NOT NULL,
  embedding TEXT
);
CREATE TABLE IF NOT EXISTS keywords (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS doc_keywords (
  doc_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  keyword_id INTEGER NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
  PRIMARY KEY (doc_id, keyword_id)
);
CREATE TABLE IF NOT EXISTS exams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  config_json TEXT NOT NULL,
  paper_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS exam_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  answers_json TEXT NOT NULL,
  score REAL NOT NULL,
  report_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS mistakes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  result_id INTEGER NOT NULL REFERENCES exam_results(id) ON DELETE CASCADE,
  question_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

// 极简 prepared-statement 增删查
export const stmt = {
  insertDoc: db.prepare("INSERT INTO documents (filename, type, content_text) VALUES (?, ?, ?)"),
  getDoc: db.prepare("SELECT * FROM documents WHERE id = ?"),
  listDocs: db.prepare("SELECT * FROM documents ORDER BY id DESC"),
  deleteDoc: db.prepare("DELETE FROM documents WHERE id = ?"),
  insertChunk: db.prepare("INSERT INTO chunks (doc_id, seq, text, embedding) VALUES (?, ?, ?, ?)"),
  getChunks: db.prepare("SELECT * FROM chunks WHERE doc_id = ? ORDER BY seq"),
  updateChunkEmbedding: db.prepare("UPDATE chunks SET embedding = ? WHERE id = ?"),
  insertKeyword: db.prepare("INSERT OR IGNORE INTO keywords (name) VALUES (?)"),
  getKeyword: db.prepare("SELECT * FROM keywords WHERE name = ?"),
  linkDocKeyword: db.prepare("INSERT OR IGNORE INTO doc_keywords (doc_id, keyword_id) VALUES (?, ?)"),
  insertExam: db.prepare("INSERT INTO exams (title, config_json, paper_json) VALUES (?, ?, ?)"),
  getExam: db.prepare("SELECT * FROM exams WHERE id = ?"),
  insertResult: db.prepare("INSERT INTO exam_results (exam_id, answers_json, score, report_json) VALUES (?, ?, ?, ?)"),
  insertMistake: db.prepare("INSERT INTO mistakes (result_id, question_json) VALUES (?, ?)"),
};
