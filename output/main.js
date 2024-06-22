"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var ws_1 = require("ws");
var ts = require("typescript");
var compile = function (source) {
    var result = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
    return result;
};
if (!fs.existsSync('mods/')) {
    fs.mkdirSync('mods');
}
var wss = new ws_1.WebSocketServer({
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
wss.on('connection', function (ws) {
    ws.on('error', console.error);
    ws.on('close', function () { });
    ws.on('message', function (data) {
        var infoString = data.toString(); // from buf
        var info = JSON.parse(infoString);
        console.log(info);
    });
    var message = [];
    var modsFolder = fs.readdirSync('mods/');
    modsFolder.forEach(function (modName) {
        var mod = {
            name: modName,
            author: 'Unknown author',
            description: '',
            version: 1,
            scripts: [],
        };
        if (!fs.lstatSync("mods/".concat(modName)).isDirectory()) {
            return;
        }
        var modFolder = fs.readdirSync("mods/".concat(modName));
        modFolder.forEach(function (modFile) {
            if (modFile === "mod.json") {
                try {
                    var fileContents = fs.readFileSync("mods/".concat(modName, "/").concat(modFile));
                    var parsed = JSON.parse(fileContents.toString());
                    mod.author = parsed.author || mod.author;
                    mod.description = parsed.description || mod.description;
                    mod.version = parsed.version || mod.version;
                }
                catch (e) {
                    console.log("Failing to parse ".concat(modFile, ", using defaults."));
                }
            }
            else if (modFile.endsWith('.ts')) {
                try {
                    var fileContents = fs.readFileSync("mods/".concat(modName, "/").concat(modFile));
                    var compiled = compile(fileContents.toString()).outputText;
                    var scriptdata = {
                        name: modFile.slice(0, -3),
                        code: compiled,
                    };
                    mod.scripts.push(scriptdata);
                }
                catch (e) {
                    console.log("Failed compiling ".concat(modFile, "!\n").concat(e));
                }
            }
        });
        message.push(mod);
    });
    ws.send(JSON.stringify({ type: 'connect', data: message }));
});
fs.watch('mods/', { recursive: true }, function (eventType, filename) {
    if (filename) {
        console.log("File ".concat(filename, " changed"), eventType);
        if (eventType === 'rename') {
            if (!filename.includes('\\')) {
                if (!fs.existsSync("mods/".concat(filename))) {
                    broadcastChanges(JSON.stringify({
                        type: 'deletemod',
                        data: filename,
                    }));
                }
                else {
                    if (fs.lstatSync("mods/".concat(filename)).isDirectory()) {
                        broadcastChanges(JSON.stringify({
                            type: 'newmod',
                            data: filename,
                        }));
                    }
                }
            }
            else {
                var parts = filename.split('\\');
                var modName = parts.shift();
                var file = parts.join('\\');
                if (file.endsWith('.ts')) {
                    if (!fs.existsSync("mods/".concat(filename))) {
                        broadcastChanges(JSON.stringify({
                            type: 'deletescript',
                            data: { mod: modName, script: file.slice(0, -3) },
                        }));
                    }
                    else {
                        try {
                            var fileContents = fs.readFileSync("mods\\".concat(filename));
                            var compiled = compile(fileContents.toString()).outputText;
                            var scriptdata = {
                                name: file.slice(0, -3),
                                code: compiled,
                            };
                            broadcastChanges(JSON.stringify({
                                type: 'addscript',
                                data: { mod: modName, script: scriptdata },
                            }));
                        }
                        catch (e) {
                            console.log("Failed compiling ".concat(file, "!\n").concat(e));
                        }
                    }
                }
            }
        }
        else {
            var parts = filename.split('\\');
            var modName = parts.shift();
            var file = parts.join('\\');
            if (fs.existsSync("mods/".concat(filename)) && fs.lstatSync("mods/".concat(filename)).isDirectory()) {
                return;
            }
            var fileContents = fs.readFileSync("mods/".concat(filename));
            if (file === 'mod.json') {
                try {
                    var parsed = JSON.parse(fileContents.toString());
                    broadcastChanges(JSON.stringify({
                        type: 'updatemoddata',
                        data: { mod: modName, data: parsed },
                    }));
                }
                catch (e) {
                    console.log("Failing to parse ".concat(filename, ", using defaults."));
                }
            }
            else if (file.endsWith('.ts')) {
                try {
                    var fileContents_1 = fs.readFileSync("mods/".concat(filename));
                    var compiled = compile(fileContents_1.toString()).outputText;
                    var scriptdata = {
                        name: file.slice(0, -3),
                        code: compiled,
                    };
                    broadcastChanges(JSON.stringify({
                        type: 'updatescript',
                        data: { mod: modName, script: scriptdata },
                    }));
                }
                catch (e) {
                    console.log("Failed compiling ".concat(file, "!\n").concat(e));
                }
            }
        }
    }
});
var broadcastChanges = function (message) {
    wss.clients.forEach(function (client) {
        if (client.readyState === 1) {
            client.send(message);
        }
    });
};
