require('dotenv').config();
const LangChainIntegration = require('../lib/langchain');

async function test() {
    const langchain = new LangChainIntegration();
    
    console.log('--- Test 1: User asks to search for a tour with a budget constraint ---');
    const result1 = await langchain.generateResponse(
        "Suggest a tour under $50 in Paris",
        "Website sells various travel packages and tours."
    );
    console.log('Result 1:', JSON.stringify(result1, null, 2));

    if (result1.isToolCall) {
        console.log('\n--- Test 2: Passing tool result back to LLM ---');
        const mockToolResult = [
            { name: "Paris Eiffel Tower Night Tour", price: 45, status: "available" }
        ];

        const history = [
            { role: 'user', content: "Suggest a tour under $50 in Paris" },
            { role: 'ai', content: result1.content, toolCalls: result1.toolCalls },
            { role: 'tool', name: result1.toolCalls[0].function.name, toolCallId: result1.toolCalls[0].id, content: JSON.stringify(mockToolResult) }
        ];

        const result2 = await langchain.generateResponse(
            "", // Resuming after tool result submission
            "Website sells various travel packages and tours.",
            history
        );
        console.log('Result 2:', JSON.stringify(result2, null, 2));
    }
}

test().catch(console.error);
