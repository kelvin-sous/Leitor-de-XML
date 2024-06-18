const express = require('express');
const fileUpload = require('express-fileupload');
const xml2js = require('xml2js');
const fs = require('fs');
const { Pool } = require('pg');

const app = express();

app.use(express.static('public'));
app.use(fileUpload());

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres',
    password: '0811',
    port: 5432,
});

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.post('/parseXML', (req, res) => {
    if (!req.files || !req.files.files) {
        return res.status(400).send('Nenhum arquivo enviado.');
    }

    const files = Array.isArray(req.files.files) ? req.files.files : [req.files.files];
    const promises = files.slice(0, 20).map(file => new Promise((resolve, reject) => {
        const filePath = `${__dirname}/${file.name}`;
        file.mv(filePath, (err) => {
            if (err) {
                return reject(err);
            }
            parseXML(filePath)
                .then(data => {
                    fs.unlink(filePath, () => {});
                    insertIntoDatabase(data)
                        .then(() => resolve(data))
                        .catch(error => reject(error));
                })
                .catch(error => reject(error));
        });
    }));

    Promise.all(promises)
        .then(results => {
            const totalValue = results.reduce((sum, item) => sum + parseFloat(item.vNF || 0), 0);
            res.json({ results, totalValue });
        })
        .catch(error => res.status(500).send(error));
});

function parseXML(filePath) {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                return reject(err);
            }
            xml2js.parseString(data, (err, result) => {
                if (err) {
                    return reject(err);
                }
                const fields = extractFields(result);
                resolve(fields);
            });
        });
    });
}

function extractFields(parsedXML) {
    const infNFe = parsedXML['nfeProc']?.['NFe']?.[0]?.['infNFe']?.[0];
    const ide = infNFe?.['ide']?.[0];
    const emit = infNFe?.['emit']?.[0];
    const dest = infNFe?.['dest']?.[0];
    const total = infNFe?.['total']?.[0]?.['ICMSTot']?.[0];

    const fields = {
        dhEmi: ide?.dhEmi?.[0] || null,
        emit_xNome: emit?.xNome?.[0] || null,
        dest_xNome: dest?.xNome?.[0] || null,
        vNF: total?.vNF?.[0] ? parseFloat(total.vNF[0]) : 0,
        natOp: ide?.natOp?.[0] || null
    };

    if (fields.dhEmi) {
        fields.dhEmi = new Date(fields.dhEmi).toISOString();
    }

    return fields;
}

function insertIntoDatabase(data) {
    const query = `
        INSERT INTO arq_xml (dhEmi, emit_xNome, dest_xNome, vNF, natOp)
        VALUES ($1, $2, $3, $4, $5)
    `;
    const values = [data.dhEmi, data.emit_xNome, data.dest_xNome, data.vNF, data.natOp];

    return pool.query(query, values);
}

app.get('/getAllNotes', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM arq_xml');
        const notes = result.rows;
        const totalValue = notes.reduce((sum, note) => sum + parseFloat(note.vnf || 0), 0);
        res.json({ results: notes, totalValue });
    } catch (error) {
        console.error('Erro ao buscar notas:', error);
        res.status(500).json({ error: 'Erro ao buscar notas' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor na porta ${PORT}`);
});
