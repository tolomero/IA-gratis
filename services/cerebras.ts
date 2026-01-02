import Cerebras from '@cerebras/cerebras_cloud_sdk';
import type { ChatMessage, IAIService } from '../types';

const cerebras = new Cerebras({
    apiKey: process.env.CEREBRAS_API_KEY
});

export const cerebrasService: IAIService = {
    name: 'Cerebras',
    async chat(messages: ChatMessage[]) {
        if(!process.env.CEREBRAS_API_KEY){
            throw new Error("CEREBRAS_API_KEY environment variable is not set");
        }

        const stream = await cerebras.chat.completions.create({
            messages: messages as any,
            model: 'zai-glm-4.6',
            stream: true,
            max_completion_tokens: 40960,
            temperature: 0.6,
            top_p: 0.95
        });
        return (async function*(){
            for await (const chunk of stream) {
                yield (chunk as any).choices[0]?.delta?.content || '';
            }
        })();
    }
};

