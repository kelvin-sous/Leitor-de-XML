const express = require('express');
const fileUpload = require('express-fileupload');
const xml2js = require('xml2js');
const fs = require('fs');

const app = express();

app.use(express.static('public'));
app.use(fileUpload());

// Rota para a página inicial
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Rota para analisar o XML
app.post('/parseXML', (req, res) => {
    if (!req.files || !req.files.file) {
        return res.status(400).send('Nenhum arquivo enviado.');
    }

    const file = req.files.file;
    const filePath = `${__dirname}/${file.name}`;

    file.mv(filePath, (err) => {
        if (err) {
            return res.status(500).send(err);
        }

        parseXML(filePath)
            .then((data) => res.json(data))
            .catch((error) => res.status(500).send(error));
    });
});

// Função para analisar o XML
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
                        const fields = extractFields(result);
                        resolve(fields);
                    }
                });
            }
        });
    });
}

// Função para extrair campos do XML
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
