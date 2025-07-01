// Global variables to track scraping statistics
let scrapingStats = {
    totalAttempts: 0,
    successfulScrapes: 0,
    totalResponseTime: 0,
    results: []
};

function setURL(url) {
    document.getElementById('debugUrl').value = url;
}

async function debugURL() {
    const url = document.getElementById('debugUrl').value.trim();
    if (!url) {
        showResult('debugResults', 'Please enter a URL to test', 'error');
        return;
    }

    const loading = document.getElementById('debugLoading');
    const results = document.getElementById('debugResults');
    
    loading.style.display = 'block';
    results.innerHTML = '';

    try {
        const startTime = Date.now();
        
        // Test URL accessibility
        const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
        const data = await response.json();
        
        const responseTime = Date.now() - startTime;
        
        scrapingStats.totalAttempts++;
        scrapingStats.totalResponseTime += responseTime;

        if (data.status.http_code === 200) {
            scrapingStats.successfulScrapes++;
            
            const debugInfo = {
                url: url,
                status_code: data.status.http_code,
                response_time: responseTime,
                content_type: detectContentType(data.contents),
                content_length: data.contents.length,
                success: true
            };

            showDebugResult(debugInfo);
        } else {
            showResult('debugResults', `❌ Failed to access URL. Status: ${data.status.http_code}`, 'error');
        }
    } catch (error) {
        showResult('debugResults', `❌ Error testing URL: ${error.message}`, 'error');
    } finally {
        loading.style.display = 'none';
        updateStats();
    }
}

async function quickScrape() {
    const url = document.getElementById('debugUrl').value.trim();
    if (!url) {
        showResult('debugResults', 'Please enter a URL to scrape', 'error');
        return;
    }

    const loading = document.getElementById('debugLoading');
    const results = document.getElementById('debugResults');
    
    loading.style.display = 'block';
    results.innerHTML = '';

    try {
        const startTime = Date.now();
        const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
        const data = await response.json();
        const responseTime = Date.now() - startTime;

        scrapingStats.totalAttempts++;
        scrapingStats.totalResponseTime += responseTime;

        if (data.status.http_code === 200) {
            scrapingStats.successfulScrapes++;
            
            const scrapeResult = await processScrapedData(data.contents, url);
            showScrapeResult(scrapeResult, responseTime);
        } else {
            showResult('debugResults', `❌ Failed to scrape URL. Status: ${data.status.http_code}`, 'error');
        }
    } catch (error) {
        showResult('debugResults', `❌ Error scraping URL: ${error.message}`, 'error');
    } finally {
        loading.style.display = 'none';
        updateStats();
    }
}

function detectContentType(content) {
    try {
        JSON.parse(content);
        return 'application/json';
    } catch {
        if (content.includes('<html') || content.includes('<table')) {
            return 'text/html';
        }
        return 'text/plain';
    }
}

async function processScrapedData(content, url) {
    const contentType = detectContentType(content);
    
    if (contentType === 'application/json') {
        try {
            const jsonData = JSON.parse(content);
            return {
                type: 'json',
                data: jsonData,
                count: Array.isArray(jsonData) ? jsonData.length : Object.keys(jsonData).length,
                preview: JSON.stringify(jsonData, null, 2).substring(0, 500) + '...'
            };
        } catch (error) {
            return { type: 'error', message: 'Failed to parse JSON data' };
        }
    } else if (contentType === 'text/html') {
        // Simple HTML parsing to extract tables and text
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'text/html');
        
        const tables = doc.querySelectorAll('table');
        const links = doc.querySelectorAll('a[href]');
        const images = doc.querySelectorAll('img[src]');
        const text = doc.body ? doc.body.textContent.trim().substring(0, 500) : '';

        return {
            type: 'html',
            data: {
                tables_count: tables.length,
                links_count: links.length,
                images_count: images.length,
                text_preview: text + '...'
            },
            preview: `Tables: ${tables.length}, Links: ${links.length}, Images: ${images.length}`
        };
    }
    
    return {
        type: 'text',
        data: content.substring(0, 500) + '...',
        preview: 'Plain text content extracted'
    };
}

function showDebugResult(debugInfo) {
    const resultsDiv = document.getElementById('debugResults');
    resultsDiv.innerHTML = `
        <div class="results success">
            <h3>✅ URL Test Results</h3>
            <p><strong>URL:</strong> ${debugInfo.url}</p>
            <p><strong>Status Code:</strong> ${debugInfo.status_code}</p>
            <p><strong>Response Time:</strong> ${debugInfo.response_time}ms</p>
            <p><strong>Content Type:</strong> ${debugInfo.content_type}</p>
            <p><strong>Content Length:</strong> ${debugInfo.content_length} bytes</p>
            <p style="color: #27ae60; font-weight: bold; margin-top: 10px;">🎉 URL is accessible and ready for scraping!</p>
        </div>
    `;
}

function showScrapeResult(result, responseTime) {
    const resultsDiv = document.getElementById('debugResults');
    
    if (result.type === 'error') {
        resultsDiv.innerHTML = `
            <div class="results error">
                <h3>❌ Scraping Error</h3>
                <p>${result.message}</p>
            </div>
        `;
        return;
    }

    let resultHTML = `
        <div class="results success">
            <h3>🎉 Scraping Successful!</h3>
            <p><strong>Data Type:</strong> ${result.type.toUpperCase()}</p>
            <p><strong>Response Time:</strong> ${responseTime}ms</p>
            <p><strong>Preview:</strong> ${result.preview}</p>
    `;

    if (result.type === 'json' && result.count) {
        resultHTML += `<p><strong>Items Found:</strong> ${result.count}</p>`;
    }

    resultHTML += `
            <div class="data-preview">
                <strong>Data Preview:</strong><br>
                ${typeof result.data === 'object' ? JSON.stringify(result.data, null, 2) : result.data}
            </div>
        </div>
    `;

    resultsDiv.innerHTML = resultHTML;
}

function addURL() {
    const urlList = document.getElementById('urlList');
    const newItem = document.createElement('div');
    newItem.className = 'url-item';
    newItem.innerHTML = `
        <input type="url" placeholder="https://example.com" />
        <select>
            <option value="auto">Auto-detect</option>
            <option value="html_table">HTML Table</option>
            <option value="json_api">JSON API</option>
            <option value="dynamic_content">Dynamic Content</option>
        </select>
        <button class="btn btn-small btn-danger" onclick="removeURL(this)">Remove</button>
    `;
    urlList.appendChild(newItem);
}

function removeURL(button) {
    button.parentElement.remove();
}

async function scrapeMultiple() {
    const urlItems = document.querySelectorAll('#urlList .url-item');
    const urls = [];
    
    urlItems.forEach(item => {
        const url = item.querySelector('input').value.trim();
        const type = item.querySelector('select').value;
        if (url) {
            urls.push({ url, type });
        }
    });

    if (urls.length === 0) {
        showResult('batchResults', 'Please add at least one URL to scrape', 'error');
        return;
    }

    const loading = document.getElementById('batchLoading');
    const results = document.getElementById('batchResults');
    
    loading.style.display = 'block';
    results.innerHTML = '';

    const batchResults = [];

    for (let i = 0; i < urls.length; i++) {
        const { url, type } = urls[i];
        
        try {
            const startTime = Date.now();
            const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
            const data = await response.json();
            const responseTime = Date.now() - startTime;

            scrapingStats.totalAttempts++;
            scrapingStats.totalResponseTime += responseTime;

            if (data.status.http_code === 200) {
                scrapingStats.successfulScrapes++;
                const scrapeResult = await processScrapedData(data.contents, url);
                batchResults.push({
                    url,
                    success: true,
                    data: scrapeResult,
                    responseTime,
                    type: type === 'auto' ? scrapeResult.type : type
                });
            } else {
                batchResults.push({
                    url,
                    success: false,
                    error: `HTTP ${data.status.http_code}`,
                    responseTime: 0
                });
            }
        } catch (error) {
            batchResults.push({
                url,
                success: false,
                error: error.message,
                responseTime: 0
            });
        }

        // Add small delay between requests
        if (i < urls.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    loading.style.display = 'none';
    showBatchResults(batchResults);
    updateStats();
}

function showBatchResults(results) {
    const resultsDiv = document.getElementById('batchResults');
    const successCount = results.filter(r => r.success).length;
    
    let html = `
        <div class="results success">
            <h3>📊 Batch Scraping Complete</h3>
            <p><strong>Total URLs:</strong> ${results.length}</p>
            <p><strong>Successful:</strong> ${successCount}</p>
            <p><strong>Failed:</strong> ${results.length - successCount}</p>
            <p><strong>Success Rate:</strong> ${((successCount / results.length) * 100).toFixed(1)}%</p>
        </div>
    `;

    results.forEach((result, index) => {
        if (result.success) {
            html += `
                <div class="results success" style="margin-top: 15px;">
                    <h4>✅ URL ${index + 1}: Success</h4>
                    <p><strong>URL:</strong> ${result.url}</p>
                    <p><strong>Type:</strong> ${result.type}</p>
                    <p><strong>Response Time:</strong> ${result.responseTime}ms</p>
                    <p><strong>Preview:</strong> ${result.data.preview}</p>
                </div>
            `;
        } else {
            html += `
                <div class="results error" style="margin-top: 15px;">
                    <h4>❌ URL ${index + 1}: Failed</h4>
                    <p><strong>URL:</strong> ${result.url}</p>
                    <p><strong>Error:</strong> ${result.error}</p>
                </div>
            `;
        }
    });

    resultsDiv.innerHTML = html;
}

function clearResults() {
    document.getElementById('batchResults').innerHTML = '';
    document.getElementById('debugResults').innerHTML = '';
}

function showResult(elementId, message, type) {
    const element = document.getElementById(elementId);
    element.innerHTML = `
        <div class="results ${type}">
            <p>${message}</p>
        </div>
    `;
}

function updateStats() {
    document.getElementById('totalAttempts').textContent = scrapingStats.totalAttempts;
    document.getElementById('successfulScrapes').textContent = scrapingStats.successfulScrapes;
    
    const successRate = scrapingStats.totalAttempts > 0 
        ? ((scrapingStats.successfulScrapes / scrapingStats.totalAttempts) * 100).toFixed(1)
        : 0;
    document.getElementById('successRate').textContent = successRate + '%';
    
    const avgResponseTime = scrapingStats.totalAttempts > 0
        ? Math.round(scrapingStats.totalResponseTime / scrapingStats.totalAttempts)
        : 0;
    document.getElementById('avgResponseTime').textContent = avgResponseTime + 'ms';
}

// Initialize with one URL input
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DataMiner Pro loaded successfully!');
    console.log('Developed by Sai Rama Lakshmi © 2025');
});