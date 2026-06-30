const http = require('http');

// Configurações do teste
const STREAM_URL = 'http://srs:8080/live/hospedagem.m3u8';
const CONCURRENT_CLIENTS = 50; // Quantidade de acessos simultâneos simulados
const DURATION_SECONDS = 10;   // Duração do teste em segundos

let totalRequests = 0;
let totalLatency = 0;
let errors = 0;
let statusCodes = {};

// Função para buscar o stream e medir latência
function fetchM3u8() {
    return new Promise((resolve) => {
        const start = Date.now();
        const req = http.get(STREAM_URL, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                const latency = Date.now() - start;
                resolve({ status: res.statusCode, latency });
            });
        });
        
        req.on('error', (err) => {
            resolve({ status: 0, latency: Date.now() - start, error: err.message });
        });
    });
}

// Simula um único cliente fazendo requisições em loop
async function runClient() {
    const testEndTime = Date.now() + (DURATION_SECONDS * 1000);
    while (Date.now() < testEndTime) {
        const { status, latency, error } = await fetchM3u8();
        
        totalRequests++;
        statusCodes[status] = (statusCodes[status] || 0) + 1;
        
        if (status === 200) {
            totalLatency += latency;
        } else {
            errors++;
        }
        
        // Pequeno atraso (100ms) para simular o comportamento de player (evitar travar CPU do teste)
        await new Promise(r => setTimeout(r, 100));
    }
}

// Função principal de orquestração do teste
async function runLoadTest() {
    console.log(`Iniciando teste de carga no SRS (Latência)...`);
    console.log(`URL do Stream: ${STREAM_URL}`);
    console.log(`Clientes Simultâneos: ${CONCURRENT_CLIENTS}`);
    console.log(`Duração: ${DURATION_SECONDS} segundos\n`);
    
    const startTime = Date.now();
    
    const clients = [];
    for (let i = 0; i < CONCURRENT_CLIENTS; i++) {
        clients.push(runClient());
    }
    
    await Promise.all(clients);
    
    const duration = (Date.now() - startTime) / 1000;
    const successfulRequests = totalRequests - errors;
    const avgLatency = successfulRequests > 0 ? (totalLatency / successfulRequests).toFixed(2) : 0;
    const reqPerSec = (totalRequests / duration).toFixed(2);
    
    console.log('--- Resultados do Teste de Carga ---');
    console.log(`Tempo total executado: ${duration}s`);
    console.log(`Total de Requisições: ${totalRequests}`);
    console.log(`Requisições c/ Sucesso (HTTP 200): ${successfulRequests}`);
    console.log(`Erros ou Falhas: ${errors}`);
    console.log(`Latência Média: ${avgLatency} ms`);
    console.log(`Taxa de Transferência: ${reqPerSec} req/sec`);
    console.log(`Detalhes de Status HTTP:`, statusCodes);
    
    if (statusCodes['404']) {
        console.log('\nAVISO: O stream retornou erro 404 (Not Found).');
        console.log('Isso indica que nenhuma câmera está enviando vídeo via RTMP para o SRS (ou a stream_key não bate).');
        console.log('Para medir latência com dados reais, inicie um push RTMP primeiro.');
    }
}

runLoadTest();
