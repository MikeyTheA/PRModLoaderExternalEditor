import * as fs from 'fs';
import { WebSocketServer } from 'ws';
import * as ts from 'typescript';

const compile = (source: string) => {
    let result = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
    return result;
};

type ModData = {
    name: String;
    author: String;
    description: String;
    version: Number;
    scripts: Array<ScriptData>;
};

type ScriptData = {
    name: String;
    code: String;
};

if (!fs.existsSync('mods/')) {
    fs.mkdirSync('mods');
}

const wss = new WebSocketServer({
    port: 5828,
    perMessageDeflate: {
        zlibDeflateOptions: {
            // See zlib defaults.
            chunkSize: 1024,
            memLevel: 7,
            level: 3,
        },
        zlibInflateOptions: {
            chunkSize: 10 * 1024,
        },
        // Other options settable:
        clientNoContextTakeover: true, // Defaults to negotiated value.
        serverNoContextTakeover: true, // Defaults to negotiated value.
        serverMaxWindowBits: 10, // Defaults to negotiated value.
        // Below options specified as default values.
        concurrencyLimit: 10, // Limits zlib concurrency for perf.
        threshold: 1024, // Size (in bytes) below which messages
        // should not be compressed if context takeover is disabled.
    },
});

wss.on('connection', (ws) => {
    ws.on('error', console.error);

    ws.on('close', () => {});

    ws.on('message', (data) => {
        const infoString = data.toString(); // from buf
        const info = JSON.parse(infoString);
        console.log(info);
    });

    const message: Array<ModData> = [];

    const modsFolder = fs.readdirSync('mods/');
    modsFolder.forEach((modName) => {
        const mod: ModData = {
            name: modName,
            author: 'Unknown author',
            description: '',
            version: 1,
            scripts: [],
        };

        if (!fs.lstatSync(`mods/${modName}`).isDirectory()) {
            return;
        }

        const modFolder = fs.readdirSync(`mods/${modName}`);
        modFolder.forEach((modFile) => {
            if (modFile === `mod.json`) {
                try {
                    const fileContents = fs.readFileSync(`mods/${modName}/${modFile}`);
                    const parsed = JSON.parse(fileContents.toString());
                    mod.author = parsed.author || mod.author;
                    mod.description = parsed.description || mod.description;
                    mod.version = parsed.version || mod.version;
                } catch (e) {
                    console.log(`Failing to parse ${modFile}, using defaults.`);
                }
            } else if (modFile.endsWith('.ts')) {
                try {
                    const fileContents = fs.readFileSync(`mods/${modName}/${modFile}`);
                    const compiled = compile(fileContents.toString()).outputText;
                    const scriptdata: ScriptData = {
                        name: modFile.slice(0, -3),
                        code: compiled,
                    };
                    mod.scripts.push(scriptdata);
                } catch (e) {
                    console.log(`Failed compiling ${modFile}!\n${e}`);
                }
            }
        });

        message.push(mod);
    });
    ws.send(JSON.stringify({ type: 'connect', data: message }));
});

fs.watch('mods/', { recursive: true }, (eventType, filename) => {
    if (filename) {
        console.log(`File ${filename} changed`, eventType);
        if (eventType === 'rename') {
            if (!filename.includes('\\')) {
                if (!fs.existsSync(`mods/${filename}`)) {
                    broadcastChanges(
                        JSON.stringify({
                            type: 'deletemod',
                            data: filename,
                        })
                    );
                } else {
                    if (fs.lstatSync(`mods/${filename}`).isDirectory()) {
                        broadcastChanges(
                            JSON.stringify({
                                type: 'newmod',
                                data: filename,
                            })
                        );
                    }
                }
            } else {
                const parts = filename.split('\\');
                const modName = parts.shift();
                const file = parts.join('\\');
                if (file.endsWith('.ts')) {
                    if (!fs.existsSync(`mods/${filename}`)) {
                        broadcastChanges(
                            JSON.stringify({
                                type: 'deletescript',
                                data: { mod: modName, script: file.slice(0, -3) },
                            })
                        );
                    } else {
                        try {
                            const fileContents = fs.readFileSync(`mods\\${filename}`);
                            const compiled = compile(fileContents.toString()).outputText;
                            const scriptdata: ScriptData = {
                                name: file.slice(0, -3),
                                code: compiled,
                            };
                            broadcastChanges(
                                JSON.stringify({
                                    type: 'addscript',
                                    data: { mod: modName, script: scriptdata },
                                })
                            );
                        } catch (e) {
                            console.log(`Failed compiling ${file}!\n${e}`);
                        }
                    }
                }
            }
        } else {
            const parts = filename.split('\\');
            const modName = parts.shift();
            const file = parts.join('\\');

            if (fs.existsSync(`mods/${filename}`) && fs.lstatSync(`mods/${filename}`).isDirectory()) {
                return;
            }

            const fileContents = fs.readFileSync(`mods/${filename}`);
            if (file === 'mod.json') {
                try {
                    const parsed = JSON.parse(fileContents.toString());
                    broadcastChanges(
                        JSON.stringify({
                            type: 'updatemoddata',
                            data: { mod: modName, data: parsed },
                        })
                    );
                } catch (e) {
                    console.log(`Failing to parse ${filename}, using defaults.`);
                }
            } else if (file.endsWith('.ts')) {
                try {
                    const fileContents = fs.readFileSync(`mods/${filename}`);
                    const compiled = compile(fileContents.toString()).outputText;
                    const scriptdata: ScriptData = {
                        name: file.slice(0, -3),
                        code: compiled,
                    };
                    broadcastChanges(
                        JSON.stringify({
                            type: 'updatescript',
                            data: { mod: modName, script: scriptdata },
                        })
                    );
                } catch (e) {
                    console.log(`Failed compiling ${file}!\n${e}`);
                }
            }
        }
    }
});

const broadcastChanges = (message: String) => {
    wss.clients.forEach((client) => {
        if (client.readyState === 1) {
            client.send(message);
        }
    });
};
