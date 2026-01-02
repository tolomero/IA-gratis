import { GoogleGenerativeAI } from "@google/generative-ai";
import type { IAIService, ChatMessage } from "../types";

// The client gets the API key from the environment variable `GEMINI_API_KEY`.
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export const geminiService: IAIService = {
    name: 'Gemini',
    async chat(messages: ChatMessage[]) {
        if(!process.env.GEMINI_API_KEY){
            throw new Error("GEMINI_API_KEY environment variable is not set");
        }

        try {
            const model = genAI.getGenerativeModel({ 
                model: "gemini-2.5-flash" 
            });

            // Convertir mensajes al formato de Gemini
            // Gemini espera un historial de conversación donde alterna user/model
            const history = messages.map(msg => ({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }]
            }));

            if (history.length === 0) {
                throw new Error("No messages provided");
            }

            const chat = model.startChat({
                history: history.length > 1 ? history.slice(0, -1) : [], // Todo excepto el último mensaje
                generationConfig: {
                    temperature: 0.6,
                    topP: 0.95,
                    maxOutputTokens: 40960
                }
            });

            // Enviar el último mensaje y obtener el stream
            const lastMessage = history[history.length - 1]?.parts[0]?.text || "";
            const result = await chat.sendMessageStream(lastMessage);

            return (async function*(){
                for await (const chunk of result.stream) {
                    const text = chunk.text();
                    if (text) {
                        yield text;
                    }
                }
            })();
        } catch (error: any) {
            // Manejar errores específicos de la API
            if (error?.status === 402 || error?.message?.includes('402') || error?.message?.includes('Insufficient Balance')) {
                throw new Error("402 Insufficient Balance - Gemini account has no credits");
            }
            if (error?.status === 401 || error?.message?.includes('401')) {
                throw new Error("401 Unauthorized - Invalid Gemini API key");
            }
            throw error;
        }
    }   
}