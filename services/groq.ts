import { Groq } from 'groq-sdk';
import type { IAIService, ChatMessage } from '../types';

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

export const groqService: IAIService= {
    name:"Groq",
    async chat(messages: ChatMessage[]){
        if(!process.env.GROQ_API_KEY){
            throw new Error("GROQ_API_KEY environment variable is not set");
        }

        const chatCompletion = await groq.chat.completions.create({
          messages,
          model: "moonshotai/kimi-k2-instruct-0905",
          temperature: 0.6,
          max_completion_tokens: 4096,
          top_p: 1,
          stream: true,
          stop: null
        });
        return (async function*(){
            for await (const chunk of chatCompletion) {
              yield chunk.choices[0]?.delta?.content || '';
            }
        })();
    }
}

//curl.exe -X POST http://localhost:3000/chat -H "Content-Type: application/json" -d "{\"messages\": [{\"role\": \"user\", \"content\": \"Hola, ¿cómo estás?\"}]}"