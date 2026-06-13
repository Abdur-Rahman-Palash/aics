// Training Module for AICS: Crawling, Extraction, Chunking, Embedding

const axios = require('axios');
const cheerio = require('cheerio');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const XLSX = require('xlsx');
const Papa = require('papaparse');
const fs = require('fs');
const path = require('path');
const QdrantManager = require('./qdrant');
const HuggingFaceAI = require('./huggingface');

const qdrant = new QdrantManager();
const gemini = new HuggingFaceAI();

// Text Chunking Function - Fixed version!
function chunkText(text, chunkSize = 1000, overlap = 100) {
    console.log('Chunking text, length:', text.length);
    const chunks = [];
    if (text.length < chunkSize) {
        const chunk = text.trim();
        if (chunk) {
            chunks.push(chunk);
        }
        console.log('Generated', chunks.length, 'chunks');
        return chunks;
    }
    let start = 0;
    while (start < text.length) {
        let end = Math.min(start + chunkSize, text.length);
        // Try to end at a paragraph or sentence, but only if those positions are valid!
        if (end < text.length) {
            const lastPeriod = text.lastIndexOf('.', end);
            const lastNewLine = text.lastIndexOf('\n', end);
            const candidates = [start + chunkSize / 2];
            if (lastPeriod > start) candidates.push(lastPeriod + 1);
            if (lastNewLine > start) candidates.push(lastNewLine + 1);
            end = Math.max(...candidates);
        }
        // Ensure end is always > start!
        if (end <= start) {
            end = Math.min(start + chunkSize, text.length);
        }
        const chunk = text.slice(start, end).trim();
        if (chunk) {
            chunks.push(chunk);
        }
        // Calculate next start - ensure it's not going backwards!
        const nextStart = end - overlap;
        if (nextStart <= start) {
            start = end; // No overlap if we're not progressing
        } else {
            start = nextStart;
        }
    }
    console.log('Generated', chunks.length, 'chunks');
    return chunks;
}

// Website Crawler and Content Extractor (Multi-page, Cheerio-based)
async function crawlWebsite(startUrl, maxPages = 20) {
    console.log('Starting multi-page crawl from:', startUrl);
    const visited = new Set();
    const queue = [startUrl];
    const allPages = [];
    
    let baseUrl;
    try {
        baseUrl = new URL(startUrl).origin;
    } catch (e) {
        console.error('Invalid start URL:', startUrl);
        return [];
    }

    while (queue.length > 0 && visited.size < maxPages) {
        const url = queue.shift();
        if (visited.has(url)) continue;
        visited.add(url);

        try {
            console.log(`Crawling [${visited.size}/${maxPages}]: ${url}`);
            const response = await axios.get(url, {
                timeout: 8000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });

            if (!response.headers['content-type'] || !response.headers['content-type'].includes('text/html')) {
                continue;
            }

            const $ = cheerio.load(response.data);
            $('script, style, noscript, iframe, nav, footer, header, aside').remove();

            let content = '';
            const mainSelectors = ['main', 'article', '.content', '#content', '.post', '.page-content', '.post-body'];
            for (const selector of mainSelectors) {
                const element = $(selector);
                if (element.length && element.text().trim().length > 100) {
                    content = element.text();
                    break;
                }
            }
            if (!content) {
                content = $('body').text();
            }

            const cleaned = content ? content.replace(/\s+/g, ' ').trim() : '';
            if (cleaned.length > 100) {
                allPages.push({ url, content: cleaned });
            }

            // Collect internal links
            $('a[href]').each((_, el) => {
                try {
                    const href = $(el).attr('href');
                    if (href) {
                        const absoluteUrl = new URL(href, url).href;
                        // Only follow same origin links, ignore hash fragments, filter out non-HTML files
                        if (absoluteUrl.startsWith(baseUrl) && !absoluteUrl.includes('#')) {
                            const cleanUrl = absoluteUrl.split('?')[0];
                            const ext = path.extname(cleanUrl).toLowerCase();
                            const skipExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.zip', '.tar', '.gz', '.mp4', '.mp3'];
                            if (!skipExtensions.includes(ext) && !visited.has(cleanUrl) && !queue.includes(cleanUrl)) {
                                queue.push(cleanUrl);
                            }
                        }
                    }
                } catch (e) {
                    // Ignore malformed URL errors
                }
            });
        } catch (error) {
            console.warn(`Failed to crawl: ${url} — ${error.message}`);
        }
    }

    console.log(`Crawl complete: ${allPages.length} pages extracted`);
    return allPages;
}

// PDF Text Extractor
async function extractPdfText(filePath) {
    try {
        console.log('Extracting PDF text from:', filePath);
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdfParse(dataBuffer);
        const content = data.text.replace(/\s+/g, ' ').trim();
        console.log('PDF content length:', content.length);
        
        if (!content || content.length < 20) {
            throw new Error('This PDF appears to be scanned or contains no extractable text. Scanned PDFs are not supported on the free plan.');
        }
        
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

// TXT Text Extractor
async function extractTxtText(filePath) {
    try {
        console.log('Extracting TXT text from:', filePath);
        const content = fs.readFileSync(filePath, 'utf-8').replace(/\s+/g, ' ').trim();
        console.log('TXT content length:', content.length);
        return content;
    } catch (error) {
        console.error('Error in extractTxtText:', error);
        throw new Error('Failed to extract TXT content: ' + error.message);
    }
}

// CSV Text Extractor
async function extractCsvText(filePath) {
    try {
        console.log('Extracting CSV text from:', filePath);
        const csvContent = fs.readFileSync(filePath, 'utf-8');
        const parseResult = Papa.parse(csvContent, { header: true, skipEmptyLines: true });
        let content = '';
        parseResult.data.forEach(row => {
            const rowText = Object.entries(row).map(([key, value]) => `${key}: ${value}`).join('; ');
            content += rowText + '\n';
        });
        content = content.replace(/\s+/g, ' ').trim();
        console.log('CSV content length:', content.length);
        return content;
    } catch (error) {
        console.error('Error in extractCsvText:', error);
        throw new Error('Failed to extract CSV content: ' + error.message);
    }
}

// Excel (XLS/XLSX) Text Extractor
async function extractExcelText(filePath) {
    try {
        console.log('Extracting Excel text from:', filePath);
        const workbook = XLSX.readFile(filePath);
        let content = '';
        workbook.SheetNames.forEach(sheetName => {
            const sheet = workbook.Sheets[sheetName];
            const sheetData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            content += `Sheet: ${sheetName}\n`;
            sheetData.forEach(row => {
                content += row.map(cell => String(cell || '')).join(' | ') + '\n';
            });
        });
        content = content.replace(/\s+/g, ' ').trim();
        console.log('Excel content length:', content.length);
        return content;
    } catch (error) {
        console.error('Error in extractExcelText:', error);
        throw new Error('Failed to extract Excel content: ' + error.message);
    }
}

// XML Text Extractor
async function extractXmlText(filePath) {
    try {
        console.log('Extracting XML text from:', filePath);
        let content = fs.readFileSync(filePath, 'utf-8');
        // Remove XML tags but keep content
        content = content.replace(/<[^>]+>/g, ' ');
        content = content.replace(/\s+/g, ' ').trim();
        console.log('XML content length:', content.length);
        return content;
    } catch (error) {
        console.error('Error in extractXmlText:', error);
        throw new Error('Failed to extract XML content: ' + error.message);
    }
}

// JSON Text Extractor
async function extractJsonText(filePath) {
    try {
        console.log('Extracting JSON text from:', filePath);
        const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        let content = JSON.stringify(jsonData, null, 2);
        content = content.replace(/\s+/g, ' ').trim();
        console.log('JSON content length:', content.length);
        return content;
    } catch (error) {
        console.error('Error in extractJsonText:', error);
        throw new Error('Failed to extract JSON content: ' + error.message);
    }
}

// Markdown Text Extractor
async function extractMdText(filePath) {
    try {
        console.log('Extracting Markdown text from:', filePath);
        let content = fs.readFileSync(filePath, 'utf-8');
        // Basic Markdown cleaning - remove some formatting but keep content
        content = content.replace(/[#*_~`]/g, ' ');
        content = content.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); // Remove links, keep text
        content = content.replace(/\s+/g, ' ').trim();
        console.log('Markdown content length:', content.length);
        return content;
    } catch (error) {
        console.error('Error in extractMdText:', error);
        throw new Error('Failed to extract Markdown content: ' + error.message);
    }
}

// RTF Text Extractor - Basic implementation
async function extractRtfText(filePath) {
    try {
        console.log('Extracting RTF text from:', filePath);
        let content = fs.readFileSync(filePath, 'utf-8');
        // Remove RTF control codes
        content = content.replace(/\\[a-z]+\d*(\s|}|\\)/gi, ' ');
        content = content.replace(/[{}]/g, ' ');
        content = content.replace(/\s+/g, ' ').trim();
        console.log('RTF content length:', content.length);
        return content;
    } catch (error) {
        console.error('Error in extractRtfText:', error);
        throw new Error('Failed to extract RTF content: ' + error.message);
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

// Full Training Pipeline for Website (Multi-page)
async function trainWebsite(businessId, startUrl, collectionName) {
    try {
        console.log('Starting trainWebsite, collection:', collectionName);
        // Step 1: Initialize Qdrant collection
        console.log('Step 1: Initializing Qdrant collection');
        await qdrant.initCollection(collectionName);

        // Step 2: Extract content from website (Multi-page crawl)
        console.log('Step 2: Crawling website');
        const pages = await crawlWebsite(startUrl, 20);

        if (pages.length === 0) {
            throw new Error('No content extracted from website');
        }

        let totalChunks = 0;

        // Step 3-5: Process each page (Chunk -> Embed -> Insert)
        for (const { url, content } of pages) {
            console.log(`Processing crawled page: ${url}`);
            const chunks = chunkText(content);
            if (chunks.length > 0) {
                const embeddings = await generateEmbeddings(chunks);
                await qdrant.insertChunks(chunks, embeddings, collectionName, 'website', url);
                totalChunks += chunks.length;
            }
        }

        console.log('trainWebsite complete!');
        return {
            success: true,
            pagesCount: pages.length,
            chunksCount: totalChunks,
            source: startUrl
        };
    } catch (error) {
        console.error('Error in trainWebsite:', error);
        throw error;
    }
}

// Full Training Pipeline for PDF/DOCX/CSV/Excel/TXT
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
        } else if (ext === '.txt') {
            content = await extractTxtText(filePath);
        } else if (ext === '.csv') {
            content = await extractCsvText(filePath);
        } else if (ext === '.xlsx' || ext === '.xls') {
            content = await extractExcelText(filePath);
        } else if (ext === '.xml') {
            content = await extractXmlText(filePath);
        } else if (ext === '.json') {
            content = await extractJsonText(filePath);
        } else if (ext === '.md') {
            content = await extractMdText(filePath);
        } else if (ext === '.rtf') {
            content = await extractRtfText(filePath);
        } else {
            throw new Error('Unsupported file format: ' + ext);
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
    crawlWebsite,
    extractPdfText,
    extractDocxText,
    extractTxtText,
    extractCsvText,
    extractExcelText,
    extractXmlText,
    extractJsonText,
    extractMdText,
    extractRtfText,
    generateEmbeddings,
    trainWebsite,
    trainDocument
};
