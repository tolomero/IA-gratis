import { cerebrasService } from './services/cerebras';
import { geminiService } from './services/gemini';
import { groqService } from './services/groq';
import type { ChatMessage, IAIService } from './types';
const services: IAIService[] = [groqService,cerebrasService,geminiService];
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

                // Intentar con cada servicio hasta que uno funcione
                // Empezar desde el servicio actual para mantener la rotación
                const startIndex = currentServiceIndex;
                const maxAttempts = services.length;
                let lastError: Error | null = null;
                
                for (let attempt = 0; attempt < maxAttempts; attempt++) {
                    // Calcular el índice del servicio a intentar (circular)
                    const serviceIndex = (startIndex + attempt) % services.length;
                    const service = services[serviceIndex];
                    
                    if(!service){
                        break;
                    }

                    try {
                        console.log(`Attempt ${attempt + 1}: Using service: ${service.name}`);
                        const stream = await service.chat(messages);
                        
                        // Si tiene éxito, actualizar el índice para la próxima request
                        currentServiceIndex = (serviceIndex + 1) % services.length;
                        
                        return new Response(stream, {
                            headers: {
                                'Content-Type': 'text/event-stream',
                                'Cache-Control': 'no-cache',
                                'Connection': 'keep-alive'
                            }
                        });
                    } catch (error) {
                        lastError = error instanceof Error ? error : new Error(String(error));
                        console.error(`Service ${service.name} failed:`, lastError.message);
                        
                        // Si es un error de saldo/autenticación, intentar con el siguiente servicio
                        if (lastError.message.includes('402') || 
                            lastError.message.includes('Insufficient Balance') ||
                            lastError.message.includes('401') ||
                            lastError.message.includes('Unauthorized')) {
                            console.log(`Service ${service.name} unavailable, trying next service...`);
                            continue;
                        }
                        // Si es otro tipo de error, lanzarlo
                        throw error;
                    }
                }

                // Si todos los servicios fallaron, actualizar el índice
                currentServiceIndex = (startIndex + maxAttempts) % services.length;
                
                return new Response(JSON.stringify({
                    error: "All services failed",
                    details: lastError?.message || "No services available"
                }), {
                    status: 503,
                    headers: {'Content-Type': 'application/json'}
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