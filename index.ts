import { cerebrasService } from './services/cerebras';
import { groqService } from './services/groq';
import type { ChatMessage, IAIService } from './types';
const services: IAIService[] = [groqService,cerebrasService];
let currentServiceIndex = 0;

function getNextService(){
    const service = services[currentServiceIndex];
    currentServiceIndex = (currentServiceIndex + 1) % services.length;
    return service;
}
const server = Bun.serve({
    port: process.env.PORT ?? 3000,
    async fetch(req) {
        const {pathname} = new URL(req.url);
        if(req.method === 'POST' && pathname === "/chat"){
            try {
                const body = await req.json() as {messages: ChatMessage[]};
                const {messages} = body;
                
                if(!messages || !Array.isArray(messages) || messages.length === 0){
                    return new Response(JSON.stringify({error: "Invalid messages format"}), {
                        status: 400,
                        headers: {'Content-Type': 'application/json'}
                    });
                }

                const service = getNextService();
                if(!service){
                    return new Response(JSON.stringify({error: "No service available"}), {
                        status: 500,
                        headers: {'Content-Type': 'application/json'}
                    });
                }

                console.log(`Using service: ${service.name}`);
                const stream = await service.chat(messages);
                
                return new Response(stream, {
                    headers: {
                        'Content-Type': 'text/event-stream',
                        'Cache-Control': 'no-cache',
                        'Connection': 'keep-alive'
                    }
                });
            } catch (error) {
                console.error('Error processing request:', error);
                return new Response(JSON.stringify({
                    error: "Something went wrong!",
                    details: error instanceof Error ? error.message : String(error)
                }), {
                    status: 500,
                    headers: {'Content-Type': 'application/json'}
                });
            }
        }
        return new Response("Not found", {status: 404});
    }
});


console.log(`Server is running on ${server.url}: ${server.port}`);