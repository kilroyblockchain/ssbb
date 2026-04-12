import fs from 'fs';
import path from 'path';
import { config } from '../config.js';
import { readObject, writeObject } from './s3.js';

const LOCAL_DIR = path.join(process.cwd(), 'data', 'conversations');

export type ConversationMode = 'shared' | 'private';
export type ConversationMessage = {
  id: string;
  author: 'butt' | 'bot';
  text: string;
  createdAt: string;
  mode: ConversationMode;
  conversationId: string;
  userEmail?: string;   // which Butt Bitch sent this (absent on bot messages and old records)
};

function localPath(conversationId: string) {
  if (!fs.existsSync(LOCAL_DIR)) fs.mkdirSync(LOCAL_DIR, { recursive: true });
  return path.join(LOCAL_DIR, `${conversationId}.jsonl`);
}

function getConversationKey(conversationId: string) {
  return `${config.conversationPrefix}/${conversationId}.jsonl`;
}

function wantsS3() {
  return Boolean(config.mediaBucket);
}

export async function fetchConversation(conversationId: string): Promise<ConversationMessage[]> {
  let data: string | null = null;
  if (wantsS3()) {
    data = await readObject(config.mediaBucket, getConversationKey(conversationId));
  }
  if (!data) {
    try {
      data = fs.existsSync(localPath(conversationId)) ? fs.readFileSync(localPath(conversationId), 'utf8') : '';
    } catch {
      data = '';
    }
  }
  if (!data) return [];
  return data
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line) as ConversationMessage;
      } catch {
        return null;
      }
    })
    .filter(Boolean) as ConversationMessage[];
}

async function persist(conversationId: string, lines: string) {
  if (wantsS3()) {
    await writeObject(config.mediaBucket, getConversationKey(conversationId), lines);
  }
  fs.writeFileSync(localPath(conversationId), lines);
}

export async function appendToConversation(conversationId: string, message: ConversationMessage) {
  const history = await fetchConversation(conversationId);
  history.push(message);
  const serialized = history.map((m) => JSON.stringify(m)).join('\n');
  await persist(conversationId, serialized);
}
