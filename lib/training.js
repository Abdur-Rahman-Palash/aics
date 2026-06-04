// Training Module for AICS: Crawling, Extraction, Chunking, Embedding

const axios = require('axios');
const cheerio = require('cheerio');
const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');
const QdrantManager = require('./qdrant');
const GeminiAI = require('./gemini');

// Fix pdf-parse import
const pdfParse = require('pdf-parse').default || require('pdf-parse');

const qdrant = new QdrantManager();
const gemini = new GeminiAI();

// Text Chunking Function
function chunkText(text, chunkSize = 1000, overlap = 100) {
    console.log('Chunking text, length:', text.length);
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
    console.log('Generated', chunks.length, 'chunks');
    return chunks;
}

// Website Crawler and Content Extractor
async function extractWebsiteContent(url) {
    try {
        console.log('Extracting website content from:', url);
        const response = await axios.get(url, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        console.log('Got response, status:', response.status);
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
        console.log('Extracted content length:', content.length);
        return content;
    } catch (error) {
        console.error('Error in extractWebsiteContent:', error);
        throw new Error('Failed to extract website content: ' + error.message);
    }
}

// PDF Text Extractor
async function extractPdfText(filePath) {
    try {
        console.log('Extracting PDF text from:', filePath);
        const dataBuffer = fs.readFileSync(filePath);
        // For pdf-parse v2.x.x, use the PDFParse class
        const PDFParser = pdfParse.PDFParse;
        const parser = new PDFParser();
        await parser.parseBuffer(dataBuffer);
        const content = parser.text.replace(/\s+/g, ' ').trim();
        console.log('PDF content length:', content.length);
        return content;
    } catch (error) {
        console.error('Error in extractPdfText:', error);
        throw new Error('Failed to extract PDF content: ' + error.message);
    }
}

// DOCX Text Extractor
async function extractDocxText(filePath) {
    try {
        console.log('Extracting DOCX text from:', filePath);
        const result = await mammoth.extractRawText({ path: filePath });
        const content = result.value.replace(/\s+/g, ' ').trim();
        console.log('DOCX content length:', content.length);
        return content;
    } catch (error) {
        console.error('Error in extractDocxText:', error);
        throw new Error('Failed to extract DOCX content: ' + error.message);
    }
}

// Generate Embeddings for Chunks
async function generateEmbeddings(chunks) {
    console.log('Generating embeddings for', chunks.length, 'chunks');
    const embeddings = [];
    for (let i = 0; i < chunks.length; i++) {
        try {
            console.log('Generating embedding for chunk', i+1, '/', chunks.length);
            const embedding = await gemini.generateEmbedding(chunks[i]);
            embeddings.push(embedding);
        } catch (error) {
            console.error('Error generating embedding for chunk', i+1, ':', error);
            throw error;
        }
    }
    console.log('Generated all embeddings');
    return embeddings;
}

// Full Training Pipeline for Website
async function trainWebsite(businessId, url, collectionName) {
    try {
        console.log('Starting trainWebsite, collection:', collectionName);
        // Step 1: Initialize Qdrant collection
        console.log('Step 1: Initializing Qdrant collection');
        await qdrant.initCollection(collectionName);

        // Step 2: Extract content from website
        console.log('Step 2: Extracting content from website');
        const content = await extractWebsiteContent(url);

        if (!content || content.length < 100) {
            throw new Error('Not enough content extracted from website');
        }

        // Step 3: Chunk the content
        console.log('Step 3: Chunking content');
        const chunks = chunkText(content);

        // Step 4: Generate embeddings
        console.log('Step 4: Generating embeddings');
        const embeddings = await generateEmbeddings(chunks);

        // Step 5: Insert into Qdrant
        console.log('Step 5: Inserting into Qdrant');
        await qdrant.insertChunks(chunks, embeddings, collectionName, 'website', url);
        console.log('trainWebsite complete!');
        return {
            success: true,
            chunksCount: chunks.length,
            source: url
        };
    } catch (error) {
        console.error('Error in trainWebsite:', error);
        throw error;
    }
}

// Full Training Pipeline for PDF/DOCX
async function trainDocument(businessId, filePath, fileName, collectionName) {
    try {
        console.log('Starting trainDocument, collection:', collectionName);
        // Step 1: Initialize Qdrant collection
        console.log('Step 1: Initializing Qdrant collection');
        await qdrant.initCollection(collectionName);

        // Step 2: Extract content from document
        console.log('Step 2: Extracting content from document');
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
        console.log('Step 3: Chunking content');
        const chunks = chunkText(content);

        // Step 4: Generate embeddings
        console.log('Step 4: Generating embeddings');
        const embeddings = await generateEmbeddings(chunks);

        // Step 5: Insert into Qdrant
        console.log('Step 5: Inserting into Qdrant');
        await qdrant.insertChunks(chunks, embeddings, collectionName, ext.slice(1), fileName);
        console.log('trainDocument complete!');
        return {
            success: true,
            chunksCount: chunks.length,
            source: fileName
        };
    } catch (error) {
        console.error('Error in trainDocument:', error);
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
