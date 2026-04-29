const logger = require('../utils/logger');
const http = require('http');
const https = require('https');

const config = {
  model: process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text',
  baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
};

const embeddingService = {
  async embedTexts(texts) {
    logger.info(`Embedding ${texts.length} text chunks using model: ${config.model}`);
    
    const embeddings = [];
    for (let i = 0; i < texts.length; i++) {
      try {
        const embedding = await this.embedText(texts[i]);
        embeddings.push(embedding);
      } catch (error) {
        logger.error(`Failed to embed chunk ${i}: ${error.message}`);
        throw error;
      }
    }
    
    logger.info(`Successfully embedded ${embeddings.length} chunks`);
    return embeddings;
  },

  async embedText(text) {
    logger.debug(`Embedding single text chunk, length: ${text.length}`);
    
    return new Promise((resolve, reject) => {
      const url = new URL('/api/embeddings', config.baseUrl);
      const data = JSON.stringify({
        model: config.model,
        prompt: text
      });
      
      const client = url.protocol === 'https:' ? https : http;
      
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      };
      
      const req = client.request(options, (res) => {
        let body = '';
        
        res.on('data', (chunk) => {
          body += chunk;
        });
        
        res.on('end', () => {
          try {
            const response = JSON.parse(body);
            
            if (response.error) {
              reject(new Error(`Ollama API error: ${response.error}`));
              return;
            }
            
            if (!response.embedding) {
              reject(new Error('Ollama API returned no embedding'));
              return;
            }
            
            resolve(response.embedding);
          } catch (error) {
            reject(new Error(`Failed to parse Ollama response: ${error.message}`));
          }
        });
      });
      
      req.on('error', (error) => {
        reject(new Error(`Ollama request failed: ${error.message}`));
      });
      
      req.write(data);
      req.end();
    });
  },

  async healthCheck() {
    return new Promise((resolve, reject) => {
      const url = new URL('/api/tags', config.baseUrl);
      const client = url.protocol === 'https:' ? https : http;
      
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: 'GET'
      };
      
      const req = client.request(options, (res) => {
        let body = '';
        
        res.on('data', (chunk) => {
          body += chunk;
        });
        
        res.on('end', () => {
          try {
            const response = JSON.parse(body);
            const models = response.models || [];
            const hasModel = models.some(m => m.name === config.model || m.name.startsWith(config.model));
            
            if (hasModel) {
              resolve({ status: 'healthy', model: config.model });
            } else {
              resolve({ 
                status: 'warning', 
                message: `Model ${config.model} not found`,
                availableModels: models.map(m => m.name)
              });
            }
          } catch (error) {
            reject(new Error(`Failed to parse Ollama response: ${error.message}`));
          }
        });
      });
      
      req.on('error', (error) => {
        reject(new Error(`Ollama health check failed: ${error.message}`));
      });
      
      req.end();
    });
  },

  getConfig() {
    return { ...config };
  }
};

module.exports = embeddingService;