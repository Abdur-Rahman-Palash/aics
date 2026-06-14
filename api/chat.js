// Vercel API Route: /api/chat
// Handles chat messages and returns AI responses

const QdrantManager = require('../lib/qdrant');
const HuggingFaceAI = require('../lib/huggingface');
const LangChainIntegration = require('../lib/langchain'); 
const getStorage = require('../lib/storage');
const config = require('../lib/config');
const { sendWebhookEvent } = require('../lib/webhooks');
const { sendEscalationAlert } = require('../lib/alerts');

// Initialize services once when the module loads
let storage;
let qdrant;
let gemini;
let langchain;

// Initialize services async on first request
async function initializeServices() {
    if (!storage) storage = await getStorage();
    if (!qdrant) qdrant = new QdrantManager();
    if (!gemini) gemini = new HuggingFaceAI();
    if (!langchain) langchain = new LangChainIntegration();
}

// Simple function to normalize whitespace
function normalizeWhitespace(text) {
    return text.replace(/\s+/g, ' ').trim();
}

// Simple function to find matching FAQ from storage
function findMatchingFAQFromStorage(message, business) {
    if (!business || !business.faqs || business.faqs.length === 0) return null;

    const normalizedMessage = normalizeWhitespace(message.toLowerCase());

    for (const faq of business.faqs) {
        // Check English
        if (faq.questionEn) {
            const normalizedQuestionEn = normalizeWhitespace(faq.questionEn.toLowerCase());
            if (normalizedMessage.includes(normalizedQuestionEn) || normalizedQuestionEn.includes(normalizedMessage)) {
                return {
                    question: faq.questionEn,
                    answer: faq.answerEn
                };
            }
        }
        // Check Bangla
        if (faq.questionBn) {
            const normalizedQuestionBn = normalizeWhitespace(faq.questionBn);
            const normalizedMsgBn = normalizeWhitespace(message);
            if (normalizedMsgBn.includes(normalizedQuestionBn) || normalizedQuestionBn.includes(normalizedMsgBn)) {
                return {
                    question: faq.questionBn,
                    answer: faq.answerBn
                };
            }
        }
    }

    return null;
}

// Check if message is a greeting (English or Bengali)
function isGreetingMessage(message) {
    const greetingPatterns = /^(hi|hello|hey|yo|sup|greetings|good\s*(morning|afternoon|evening|night)|assalamu\s*alaikum|walaikum\s*assalam|salam|হ্যালো|হেলো|হাই|হে|নমস্কার|আসসালামু\s*আলাইকুম|ওয়ালাইকুম\s*আসসালাম|কেমন\s*আছ|কি\s*খবর)\b/i;
    return greetingPatterns.test(message.trim());
}

// Simple keyword-based response generator for fallback
function generateFriendlyFallbackResponse(message, contextParts) {
    // Handle basic questions first (English and Bengali)
    const messageLower = message.toLowerCase();
    if (messageLower.includes('who are you') || messageLower.includes('tumi ke') || messageLower.includes('tomake') || messageLower.includes('tumi')) {
        return "আমি আপনার AI কাস্টমার সাপোর্ট সহকারী! আমি এই ওয়েবসাইট এবং এর সেবা সম্পর্কে আপনার যেকোনো প্রশ্নে সহায়তা করতে এখানে আছি!";
    }
    if (isGreetingMessage(message)) {
        return "Assalamu Alaikum! আজকে আমি কিভাবে আপনাকে সাহায্য করতে পারি?";
    }
    
    if (contextParts.length === 0) {
        return "I'm sorry, but I can only assist with questions related to this website and its services. If you need further assistance, please complete the contact form below. Once your request is submitted, our team will review it and send a response to your email. You may also receive an instant acknowledgment message confirming that your request has been successfully submitted.";
    }

    // Try to find a relevant chunk based on keywords in the user's message
    let bestChunk = null;
    let bestScore = 0;

    for (const part of contextParts) {
        const partLower = part.toLowerCase();
        let score = 0;
        // Count keywords in the chunk
        if (messageLower.includes('create') && partLower.includes('create')) score += 2;
        if (messageLower.includes('invoice') && partLower.includes('invoice')) score += 2;
        if (messageLower.includes('payment') && partLower.includes('payment')) score += 2;
        if (messageLower.includes('product') && partLower.includes('product')) score += 2;
        if (messageLower.includes('store') && partLower.includes('store')) score += 2;
        if (messageLower.includes('dashboard') && partLower.includes('dashboard')) score += 2;
        if (messageLower.includes('click') && partLower.includes('click')) score += 1;
        if (messageLower.includes('button') && partLower.includes('button')) score += 1;
        if (messageLower.includes('go') && partLower.includes('go')) score += 1;

        if (score > bestScore) {
            bestScore = score;
            bestChunk = part;
        }
    }

    if (bestChunk && bestScore > 0) {
        // Clean up the chunk to make it user-friendly
        let cleanChunk = bestChunk.replace(/\[website\] Source:.*?\s*/, '');
        cleanChunk = cleanChunk.replace(/\[.*?\]/g, ''); // Remove any [type] tags
        cleanChunk = cleanChunk.replace(/https?:\/\/[^\s]+/g, ''); // Remove URLs
        cleanChunk = cleanChunk.replace(/`/g, ''); // Remove backticks
        cleanChunk = cleanChunk.replace(/\s+/g, ' ').trim();

        // Extract key phrases or steps
        // For invoice questions, extract steps like "Go to Dashboard, Click Invoice module"
        if (messageLower.includes('invoice') && messageLower.includes('create')) {
            const steps = [];
            if (cleanChunk.toLowerCase().includes('dashboard')) steps.push('Go to Dashboard');
            if (cleanChunk.toLowerCase().includes('invoice')) steps.push('Click on Invoice module');
            if (cleanChunk.toLowerCase().includes('create')) steps.push('Look for a CREATE button');
            
            if (steps.length > 0) {
                return "Here's how to create an invoice:\n\n" + steps.join('\n');
            }
        }

        // Extract relevant sentences
        const sentences = cleanChunk.split(/[.!?]+/).map(s => s.trim()).filter(s => s);
        if (sentences.length > 0) {
            let relevantSentences = sentences.slice(0, 4); // Take top 4 relevant sentences
            return "Here's what I found to help you:\n\n" + relevantSentences.join('. ') + '.';
        }
    }

    // If no relevant chunk, just return a friendly message
    return "Here's what I found to help you:\n\n" + contextParts[0].substring(0, 300);
}

module.exports = async (req, res) => {
    // Initialize services (if not already initialized)
    await initializeServices();
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Declare conversation at top to avoid ReferenceError!
    let conversation = null;

    try {
        const startTime = Date.now();
        let { message, file, businessId, conversationId, visitor, toolCallId, toolName, toolResult } = req.body;

        if (!message && !file && !toolCallId) {
            return res.status(400).json({ error: 'Message, file, or toolCallId is required' });
        }

        // Get business from storage if ID is provided
        let business = null;
        if (businessId) {
            business = await storage.getBusiness(businessId);
        }

        // Get or create conversation
        if (businessId) {
            if (conversationId) {
                conversation = await storage.getConversation(businessId, conversationId);
            }
            if (!conversation) {
                conversation = await storage.createConversation(businessId, visitor);
            }
        }

        // Handle toolResult if submitted by client
        if (toolCallId && toolName && toolResult) {
            const toolMessageData = {
                role: 'tool',
                name: toolName,
                toolCallId: toolCallId,
                content: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult)
            };
            if (conversation && businessId) {
                await storage.addMessageToConversation(businessId, conversation.id, toolMessageData);
                // Reload conversation history
                conversation = await storage.getConversation(businessId, conversation.id);
            }
            // Use placeholder message for vector search / processing if no text message was sent
            if (!message) {
                message = `[Tool result for ${toolName}]`;
            }
        }

        // First, try to find a matching FAQ from storage (db.json) directly
        const directMatch = message && !toolCallId ? findMatchingFAQFromStorage(message, business) : null;

        // Build context - start with empty
        let contextParts = [];
        let similarItems = [];
        let confidenceScore = 0;
        let aiResponse = null;
        let needsHumanHelp = false;

        // Handle file upload
        if (file) {
            console.log('[CHAT] Received file upload:', file.name);
            // For file uploads, provide a smooth, friendly answer and mark for human review
            aiResponse = `Thanks for sharing "${file.name}"! I’ve received your website file and our team will review it. If you want, please add a few details about what you need so I can help more smoothly.`;
            needsHumanHelp = true;
            message = `[File uploaded: ${file.name}]`; // Use this for storage
        } else {
            // Proceed with normal text message handling
            try {
                // Only try if Hugging Face API key is available (we're using local vector storage now!)
                if (config.huggingface.apiKey) {
                    // Determine which collection to use
                    let collectionName = config.qdrant.collectionName; // Default
                    if (business) {
                        collectionName = business.qdrantCollection;
                    }
                    console.log('[CHAT] Using collection:', collectionName);

                    // Generate embedding for user message
                    const queryEmbedding = await gemini.generateEmbedding(message);
                    console.log('[CHAT] Generated query embedding');

                    // Search Local Vector Storage for similar content (FAQs + chunks)
                    similarItems = await qdrant.searchSimilar(queryEmbedding, 10, collectionName);
                    console.log('[CHAT] Found similar items:', JSON.stringify(similarItems, null, 2));

                    // Process similar items
                    for (const item of similarItems) {
                        if (item.type === 'faq' && item.question && item.answer) {
                            contextParts.push(`FAQ - Q: ${item.question}\nA: ${item.answer}`);
                        } else if (item.content) {
                            contextParts.push(`[${item.type}] Source: ${item.source || 'Unknown'}\n${item.content}`);
                        }
                    }

                    // Only keep the top 5 context parts to keep prompts focused
                    contextParts = contextParts.slice(0, 5);

                    // Calculate confidence score based on top similarity
                    if (similarItems.length > 0) {
                        confidenceScore = similarItems[0].score || 0;
                    }
                    console.log('[CHAT] Confidence score:', confidenceScore);
                    console.log('[CHAT] Context parts:', contextParts);
                }
            } catch (error) {
                console.error('[CHAT] Error in vector search:', error);
                // Continue without them - we'll use fallback responses
            }

            let context = 'No relevant context available.';
            if (contextParts.length > 0) {
                context = contextParts.join('\n\n---\n\n');
            }

            // ─── Step 1: Greeting check — always respond friendly, skip all other checks ───
            const greeting = isGreetingMessage(message);
            console.log('[CHAT] isGreeting:', greeting);

            // ─── Step 2: Check similarity threshold ───
            const SIMILARITY_THRESHOLD = 0.07; // Lowered from 0.1 to suit MiniLM-L6-v2 score range
            const hasRelevantSimilarity = greeting || similarItems.some(item => item.score >= SIMILARITY_THRESHOLD);
            console.log('[CHAT] hasRelevantSimilarity:', hasRelevantSimilarity);
            console.log('[CHAT] All similarity scores:', similarItems.map(item => item.score));

            // ─── Step 3: Use AI to classify relevance (two-layer validation) ───
            let isQuestionRelated = false;

            // Greetings are always related — skip classification
            if (greeting) {
                isQuestionRelated = true;
            } else if (contextParts.length > 0 && config.huggingface.apiKey) {
                try {
                    isQuestionRelated = await gemini.classifyQuestionRelevance(message, contextParts);
                } catch (error) {
                    console.error('[CHAT] Error classifying relevance:', error);
                    // If classification fails (rate limit, etc.), trust the similarity score
                    isQuestionRelated = hasRelevantSimilarity;
                }
            } else if (contextParts.length === 0) {
                console.log('[CHAT] No context parts found, defaulting to isQuestionRelated = true');
                isQuestionRelated = true;
            }

            // If similarity score is good, mark as related even if classification says no
            if (hasRelevantSimilarity && !isQuestionRelated) {
                console.log('[CHAT] Similarity score is good, overriding classification to related!');
                isQuestionRelated = true;
            }
            console.log('[CHAT] isQuestionRelated:', isQuestionRelated);

            // ─── Step 4: Decide if human help is needed ───
            // Only true if BOTH similarity is low AND classification says unrelated AND not a greeting
            const humanTransferMessage = "I'm sorry, but I can only assist with questions related to this website and its services. If you need further assistance, please complete the contact form below. Once your request is submitted, our team will review it and send a response to your email. You may also receive an instant acknowledgment message confirming that your request has been successfully submitted.";
            let needsHumanHelp = false;
            let handoffReason = null;

            if (!greeting && !hasRelevantSimilarity && !isQuestionRelated) {
                needsHumanHelp = true;
                handoffReason = "Low confidence or off-topic question";
            }

            // Anger/Frustration detection in user message
            const userLower = message.toLowerCase();
            const isAngry = /angry|terrible|horrible|useless|worst|garbage|rubbish|scam|hate|frustrated|nonsense|stupid|human|person|agent|representative|manager|speak\s+to\s+someone/i.test(userLower);
            if (isAngry) {
                needsHumanHelp = true;
                handoffReason = "User anger/frustration keywords detected";
            }

            // Repetition detection
            if (conversation && conversation.messages) {
                const userMsgs = conversation.messages.filter(m => m.role === 'user');
                if (userMsgs.length >= 2) {
                    const lastMsg = userMsgs[userMsgs.length - 1].content;
                    const secondLastMsg = userMsgs[userMsgs.length - 2].content;
                    if (message === lastMsg && message === secondLastMsg) {
                        needsHumanHelp = true;
                        handoffReason = "Repetitive user queries detected";
                    }
                }
            }

            console.log('[CHAT] needsHumanHelp:', needsHumanHelp, 'Reason:', handoffReason);

            // ─── Step 5: Generate AI response ───
            try {
                if (greeting) {
                    // Greeting — respond directly without going through AI classification
                    aiResponse = "Assalamu Alaikum! আজকে আমি কিভাবে আপনাকে সাহায্য করতে পারি?";

                } else if (needsHumanHelp && !isQuestionRelated) {
                    // Unrelated question — generate helpful response with suggestions
                    if (config.huggingface.apiKey) {
                        try {
                            aiResponse = await gemini.generateUnrelatedResponse(message);
                            console.log('[CHAT] Unrelated response generated:', aiResponse);
                        } catch (error) {
                            console.warn('[CHAT] Error generating unrelated response:', error);
                            aiResponse = humanTransferMessage;
                        }
                    } else {
                        aiResponse = humanTransferMessage;
                    }

                } else if (directMatch) {
                    // Direct FAQ match — use AI to make it friendly
                    if (config.huggingface.apiKey) {
                        try {
                            const contextWithFAQ = `FAQ - Q: ${directMatch.question}\nA: ${directMatch.answer}`;
                            aiResponse = await gemini.generateResponse(message, contextWithFAQ);
                        } catch (error) {
                            console.warn('[CHAT] Gemini failed for direct match, using raw answer:', error);
                            aiResponse = directMatch.answer;
                        }
                    } else {
                        aiResponse = directMatch.answer;
                    }
                    confidenceScore = 1.0;
                    needsHumanHelp = false;

                } else {
                    // Context found or general query — use LangChain (Groq / tool calling enabled)
                    if (config.huggingface.apiKey) {
                        let conversationHistory = [];
                        if (conversation && conversation.messages) {
                            conversationHistory = conversation.messages;
                        }

                        try {
                            console.log('[CHAT] Calling langchain.generateResponse');
                            let llmResult = await langchain.generateResponse(
                                message || '',
                                context,
                                conversationHistory
                            );
                            console.log('[CHAT] First llmResult:', JSON.stringify(llmResult, null, 2));
                            
                            // ALWAYS use the LLM's content response if it's available
                            if (llmResult.content && llmResult.content.trim().length > 0) {
                                aiResponse = llmResult.content;
                            } else if (llmResult.isToolCall) {
                                const toolCalls = llmResult.toolCalls;
                                const validTools = ['searchProducts', 'bookAppointment', 'trackOrder', 'fillForm', 'showBookingForm', 'showContactForm', 'showFeedbackForm'];
                                const toolResults = [];
                                let hasInvalidTool = false;
                                
                                for (const toolCall of toolCalls) {
                                    const toolName = toolCall.function.name;
                                    const toolArgs = JSON.parse(toolCall.function.arguments);
                                    
                                    let toolResult = null;
                                    
                                    if (!validTools.includes(toolName)) {
                                        console.warn(`[CHAT] Invalid tool call: ${toolName}`);
                                        toolResult = { error: `Tool '${toolName}' is not available. Please ask another question.` };
                                        hasInvalidTool = true;
                                    } else {
                                        try {
                                            if (toolName === 'searchProducts') {
                                                toolResult = await storage.searchProducts(businessId, toolArgs.query, toolArgs.maxBudget);
                                            } else if (toolName === 'bookAppointment') {
                                                toolResult = await storage.addBooking(businessId, {
                                                    visitor: visitor,
                                                    dateTime: toolArgs.dateTime,
                                                    name: toolArgs.name,
                                                    notes: toolArgs.notes
                                                });
                                            } else if (toolName === 'trackOrder') {
                                                toolResult = await storage.getOrder(businessId, toolArgs.orderId);
                                            } else if (toolName === 'fillForm') {
                                                toolResult = await storage.addFormSubmission(businessId, {
                                                    formId: toolArgs.formId,
                                                    data: toolArgs.data,
                                                    visitor: visitor
                                                });
                                            } else {
                                                toolResult = { success: true, message: `${toolName} tool available for client-side execution` };
                                            }
                                        } catch (toolError) {
                                            console.error(`[CHAT] Error executing tool ${toolName}:`, toolError);
                                            toolResult = { error: toolError.message };
                                        }
                                    }
                                    
                                    toolResults.push({
                                        toolCallId: toolCall.id,
                                        toolName: toolName,
                                        result: toolResult
                                    });
                                    
                                    // Add tool message to conversation
                                    if (conversation && businessId) {
                                        await storage.addMessageToConversation(businessId, conversation.id, {
                                            role: 'tool',
                                            name: toolName,
                                            toolCallId: toolCall.id,
                                            content: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult)
                                        });
                                    }
                                }
                                
                                if (hasInvalidTool) {
                                    aiResponse = "I'm sorry, but I can only assist with questions related to this website and its services. If you need further assistance, please complete the contact form below.";
                                } else {
                                    // Just use a simple success message instead of calling LLM again
                                    aiResponse = 'Action completed successfully!';
                                }
                            } else {
                                aiResponse = llmResult.content;
                            }
                        } catch (langchainError) {
                            console.warn('[CHAT] Langchain failed, falling back to direct gemini.js', langchainError);
                            try {
                                aiResponse = await gemini.generateResponse(message, context);
                            } catch (geminiError) {
                                console.warn('[CHAT] Gemini API failed, using friendly fallback:', geminiError);
                                aiResponse = generateFriendlyFallbackResponse(message, contextParts);
                                needsHumanHelp = false;
                            }
                        }

                        // Check if AI response mentions escalation or contact-form fallback
                        const hasHumanKeywords = /human|escalate|talk\s+to|contact\s+support|assist\s+further|can't help|don't know|don't have information|contact\s+form|complete the contact form below/i.test(aiResponse);
                        if (hasHumanKeywords) {
                            needsHumanHelp = true;
                            if (!handoffReason) handoffReason = "AI recommended human support";
                        }
                    } else {
                        aiResponse = contextParts.length > 0 
                            ? "Here's what I found that might help:\n" + contextParts[0].substring(0, 500)
                            : "I'm sorry, I can only assist with questions related to this website and its services.";
                        needsHumanHelp = true;
                        if (!handoffReason) handoffReason = "AI service fallback triggered";
                    }
                }

            } catch (error) {
                console.error('[CHAT] Error generating response:', error);
                console.error('[CHAT] Error stack:', error.stack);
                aiResponse = "I'm sorry, but I can only assist with questions related to this website and its services. If you need further assistance, please complete the contact form below. Once your request is submitted, our team will review it and send a response to your email. You may also receive an instant acknowledgment message confirming that your request has been successfully submitted.";
                needsHumanHelp = true;
            }
        }

        // ─── Step 6: Record analytics ───
        try {
            let hitFaqId = null;
            const topFAQ = similarItems.find(item => item.type === 'faq' && item.score > 0.7);
            if (topFAQ) {
                hitFaqId = topFAQ.faqId;
            }
            const responseTime = Date.now() - startTime;
            if (businessId) {
                await storage.recordAnalytics(businessId, {
                    totalMessages: true,
                    aiResolved: !needsHumanHelp,
                    humanEscalated: needsHumanHelp,
                    faqId: hitFaqId,
                    responseTime: responseTime,
                    message: {
                        content: message,
                        role: 'user',
                        aiResponse: aiResponse
                    }
                });
            }
        } catch (error) {
            // Error recording analytics — non-fatal
        }

        // ─── Step 7: Store unanswered question if needed ───
        if (businessId && needsHumanHelp && !directMatch) {
            try {
                await storage.addUnansweredQuestion(businessId, message);
            } catch (dupeErr) {
                console.warn('[CHAT] Duplicate unanswered question, skipping');
            }
        }

        // ─── Step 8: Save messages to conversation ───
        if (conversation && businessId) {
            const userMessageData = { role: 'user', content: message };
            if (file) {
                userMessageData.file = file; // Store the file data
            }
            await storage.addMessageToConversation(businessId, conversation.id, userMessageData);
            await storage.addMessageToConversation(businessId, conversation.id, {
                role: 'ai',
                content: aiResponse,
                confidence: confidenceScore
            });

            if (needsHumanHelp) {
                await storage.updateConversation(businessId, conversation.id, {
                    status: 'pending'
                });

                // Trigger smart handoff notifications asynchronously
                sendEscalationAlert(businessId, conversation.id, handoffReason || "AI escalation keyword triggered")
                    .catch(err => console.error('[CHAT] Handoff alert error:', err));
            }

            // Send webhook event for new message
            await sendWebhookEvent(businessId, 'new_message', {
                conversationId: conversation.id,
                userMessage: userMessageData,
                aiResponse: aiResponse,
                needsHumanHelp,
                confidence: confidenceScore
            });

            // Trigger webhook event for human requested
            if (needsHumanHelp) {
                await sendWebhookEvent(businessId, 'human_requested', {
                    conversationId: conversation.id,
                    reason: handoffReason || "AI escalation keyword triggered",
                    visitor: conversation.visitor
                });
            }
        }

        return res.status(200).json({
            success: true,
            response: aiResponse,
            needsHumanHelp,
            confidence: confidenceScore,
            conversationId: conversation ? conversation.id : null,
            context: similarItems,
            contextParts
        });

    } catch (error) {
        console.error('[CHAT] FATAL ERROR:', error);
        console.error('[CHAT] FATAL ERROR STACK:', error.stack);
        return res.status(200).json({
            success: true,
            response: "I'm sorry, but I can only assist with questions related to this website and its services. If you need further assistance, please complete the contact form below. Once your request is submitted, our team will review it and send a response to your email. You may also receive an instant acknowledgment message confirming that your request has been successfully submitted.",
            needsHumanHelp: true,
            confidence: 0,
            conversationId: conversation ? conversation.id : null,
            context: []
        });
    }
};