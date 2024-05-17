const fs = require('fs');
const xml2js = require('xml2js');

// Função para ler e analisar o XML
function parseXML(filePath) {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                reject(err);
            } else {
                xml2js.parseString(data, (err, result) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(result);
                    }
                });
            }
        });
    });
}

// Função para extrair os campos específicos do XML
function extractFields(parsedXML) {
    const infNFe = parsedXML['nfeProc']?.['NFe']?.[0]?.['infNFe']?.[0];
    const ide = infNFe?.['ide']?.[0];
    const emit = infNFe?.['emit']?.[0];
    const dest = infNFe?.['dest']?.[0];
    const total = infNFe?.['total']?.[0]?.['ICMSTot']?.[0];

    const fields = {
        dhEmi: ide?.dhEmi?.[0] || 'N/A',
        emit_xNome: emit?.xNome?.[0] || 'N/A',
        dest_xNome: dest?.xNome?.[0] || 'N/A',
        vNF: total?.vNF?.[0] || 'N/A',
    };

    return fields;
}

// Função para escrever os campos extraídos em um arquivo TXT
function writeToFile(fields, outputFilePath) {
    const content = `
Data de Emissão: ${fields.dhEmi}
Razão Social Emitidora: ${fields.emit_xNome}
Razão Social Atendido: ${fields.dest_xNome}
Valor Total da Nota: ${fields.vNF}
    `;

    fs.writeFile(outputFilePath, content.trim(), (err) => {
        if (err) {
            console.error('Erro ao escrever no arquivo:', err);
        } else {
            console.log('Arquivo criado com sucesso!');
        }
    });
}

// Função principal
async function main() {
    const inputFilePath = 'outro.xml';
    const outputFilePath = 'saida.txt';

    try {
        const parsedXML = await parseXML(inputFilePath);
        const fields = extractFields(parsedXML);
        writeToFile(fields, outputFilePath);
    } catch (error) {
        console.error('Erro:', error);
    }
}

main();
