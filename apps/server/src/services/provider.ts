import type { PersonaMemory, ProjectMemory } from './memory';
import type { ConversationMessage } from './conversations';
import { converseWithBedrock } from './bedrock';

type Context = {
  mode: 'shared' | 'private';
  text: string;
  memory: { project: ProjectMemory; user?: PersonaMemory };
  history: ConversationMessage[];
};

export async function generateChatResponse(ctx: Context): Promise<string> {
  const personaSummary = ctx.memory.user?.facts.slice(-3).map((f) => `• ${f.text}`).join('\n') || 'No personal notes yet.';
  const projectSummary = [
    `Episode focus: ${ctx.memory.project.episodeFocus}`,
    `Running gags: ${ctx.memory.project.runningGags.join(', ')}`,
    `Open threads: ${ctx.memory.project.openThreads.join(', ')}`
  ].join('\n');

  const systemPrompt = [
    'You are BotButt, a pink-powered assistant for the Screaming Smoldering Butt Bitches.',
    'Use music-collaboration tone, reference their jokes, and help them craft lyrics/cartoons.',
    'Always respect privacy mode: shared messages are visible to everyone; private stays 1:1.',
    projectSummary,
    'Personal notes: ',
    personaSummary
  ].join('\n');

  return converseWithBedrock({
    history: ctx.history,
    prompt: ctx.text,
    context: systemPrompt
  });
}
