// Training Module for AICS: Crawling, Extraction, Chunking, Embedding

const axios = require('axios');
const cheerio = require('cheerio');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');
const QdrantManager = require('./qdrant');
const GeminiAI = require('./gemini');

const qdrant = new QdrantManager();
const gemini = new GeminiAI();

// Text Chunking Function
function chunkText(text, chunkSize = 1000, overlap = 100) {
    const chunks = [];
    let start = 0;
    while (start < text.length) {
        let end = Math.min(start + chunkSize, text.length);
        // Try to end at a paragraph or sentence
        if (end < text.length) {
            const lastPeriod = text.lastIndexOf('.', end);
            const lastNewLine = text.lastIndexOf('\n', end);
            end = Math.max(lastPeriod + 1, lastNewLine + 1, start + chunkSize / 2);
        }
        const chunk = text.slice(start, end).trim();
        if (chunk) {
            chunks.push(chunk);
        }
        start = end - overlap;
    }
    return chunks;
}

// Website Crawler and Content Extractor
async function extractWebsiteContent(url) {
    try {
        const response = await axios.get(url, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        const $ = cheerio.load(response.data);

        // Remove unwanted elements
        $('script, style, noscript, iframe, nav, footer, header, aside').remove();

        // Extract main content
        let content = '';
        const mainSelectors = ['main', 'article', '.content', '#content', '.post', '.page-content'];
        for (const selector of mainSelectors) {
            const element = $(selector);
            if (element.length) {
                content = element.text();
                break;
            }
        }
        // Fallback to body
        if (!content) {
            content = $('body').text();
        }

        // Clean up whitespace
        content = content.replace(/\s+/g, ' ').trim();
        return content;
    } catch (error) {
        console.error('Error extracting website content:', error);
        throw new Error('Failed to extract website content: ' + error.message);
    }
}

// PDF Text Extractor
async function extractPdfText(filePath) {
    try {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdfParse(dataBuffer);
        return data.text.replace(/\s+/g, ' ').trim();
    } catch (error) {
        console.error('Error extracting PDF content:', error);
        throw new Error('Failed to extract PDF content: ' + error.message);
    }
}

// DOCX Text Extractor
async function extractDocxText(filePath) {
    try {
        const result = await mammoth.extractRawText({ path: filePath });
        return result.value.replace(/\s+/g, ' ').trim();
    } catch (error) {
        console.error('Error extracting DOCX content:', error);
        throw new Error('Failed to extract DOCX content: ' + error.message);
    }
}

// Generate Embeddings for Chunks
async function generateEmbeddings(chunks) {
    const embeddings = [];
    for (const chunk of chunks) {
        try {
            const embedding = await gemini.generateEmbedding(chunk);
            embeddings.push(embedding);
        } catch (error) {
            console.error('Error generating embedding for chunk:', error);
            throw error;
        }
    }
    return embeddings;
}

// Full Training Pipeline for Website
async function trainWebsite(businessId, url, collectionName) {
    try {
        // Step 1: Initialize Qdrant collection
        await qdrant.initCollection(collectionName);

        // Step 2: Extract content from website
        console.log(`Extracting content from ${url}...`);
        const content = await extractWebsiteContent(url);

        if (!content || content.length < 100) {
            throw new Error('Not enough content extracted from website');
        }

        // Step 3: Chunk the content
        console.log('Chunking content...');
        const chunks = chunkText(content);
        console.log(`Created ${chunks.length} chunks`);

        // Step 4: Generate embeddings
        console.log('Generating embeddings...');
        const embeddings = await generateEmbeddings(chunks);

        // Step 5: Insert into Qdrant
        console.log('Inserting into Qdrant...');
        await qdrant.insertChunks(chunks, embeddings, collectionName, 'website', url);

        console.log('Website training completed!');
        return {
            success: true,
            chunksCount: chunks.length,
            source: url
        };
    } catch (error) {
        console.error('Error training website:', error);
        throw error;
    }
}

// Full Training Pipeline for PDF/DOCX
async function trainDocument(businessId, filePath, fileName, collectionName) {
    try {
        // Step 1: Initialize Qdrant collection
        await qdrant.initCollection(collectionName);

        // Step 2: Extract content from document
        console.log(`Extracting content from ${fileName}...`);
        let content;
        const ext = path.extname(fileName).toLowerCase();
        if (ext === '.pdf') {
            content = await extractPdfText(filePath);
        } else if (ext === '.docx') {
            content = await extractDocxText(filePath);
        } else {
            throw new Error('Unsupported file format');
        }

        if (!content || content.length < 100) {
            throw new Error('Not enough content extracted from document');
        }

        // Step 3: Chunk the content
        console.log('Chunking content...');
        const chunks = chunkText(content);
        console.log(`Created ${chunks.length} chunks`);

        // Step 4: Generate embeddings
        console.log('Generating embeddings...');
        const embeddings = await generateEmbeddings(chunks);

        // Step 5: Insert into Qdrant
        console.log('Inserting into Qdrant...');
        await qdrant.insertChunks(chunks, embeddings, collectionName, ext.slice(1), fileName);

        console.log('Document training completed!');
        return {
            success: true,
            chunksCount: chunks.length,
            source: fileName
        };
    } catch (error) {
        console.error('Error training document:', error);
        throw error;
    }
}

module.exports = {
    chunkText,
    extractWebsiteContent,
    extractPdfText,
    extractDocxText,
    generateEmbeddings,
    trainWebsite,
    trainDocument
};
