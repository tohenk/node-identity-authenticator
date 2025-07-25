/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2019-2025 Toha <tohenk@yahoo.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
 * of the Software, and to permit persons to whom the Software is furnished to do
 * so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

const path = require('path');
const Cmd = require('@ntlab/ntlib/cmd');

Cmd.addBool('help', 'h', 'Show program usage').setAccessible(false);
Cmd.addVar('config', '', 'Read app configuration from file', 'config-file');
Cmd.addVar('port', 'p', 'Set web server port to listen', 'port');
Cmd.addVar('face-size', '', 'Set normalized face size', 'size');

if (!Cmd.parse() || (Cmd.get('help') && usage())) {
    process.exit();
}

const fs = require('fs');
const Work = require('@ntlab/work/work');
const { Identity, Socket } = require('@ntlab/identity');
const CallbackNotifier = require('./notifier');

class App {

    config = {}

    initialize() {
        let filename;
        // read configuration from command line values
        if (process.env.ID_CONFIG && fs.existsSync(process.env.ID_CONFIG)) {
            filename = process.env.ID_CONFIG;
        } else if (Cmd.get('config') && fs.existsSync(Cmd.get('config'))) {
            filename = Cmd.get('config');
        } else if (fs.existsSync(path.join(__dirname, 'config.json'))) {
            filename = path.join(__dirname, 'config.json');
        }
        if (filename) {
            console.log('Reading configuration %s', filename);
            this.config = JSON.parse(fs.readFileSync(filename));
        }
        // check for default configuration
        if (this.config.debug === undefined) {
            this.config.debug = false;
        }
        if (Cmd.get('port')) {
            this.config.port = Cmd.get('port');
        }
        if (Cmd.get('face-size')) {
            this.config.face = parseInt(Cmd.get('face-size'));
        }
    }

    getIdentityOptions(namespace) {
        return {
            backend: new Socket({
                http: this.http,
                namespace: namespace,
                onrequest(socket, channel, data) {
                    switch (channel) {
                        case 'self-test':
                            if (data.callback) {
                                socket.callback = data.callback;
                            }
                            break;
                        case 'identify':
                            if (socket.callback) {
                                data.workid = Identity.genId();
                                socket.emit(channel, {id: data.workid, status: `Queued as ${data.workid}`});
                            }
                            break;
                    }
                },
                onresponse(socket, channel, data, res, callback) {
                    switch (channel) {
                        case 'identify':
                            if (socket.callback) {
                                CallbackNotifier.notify(socket.callback, res)
                                    .then(res => console.log(`Callback ${socket.callback}: ${res}`))
                                    .catch(err => console.error(`Callback ${socket.callback}: ${err}`));
                            } else {
                                callback();
                            }
                            break;
                        default:
                            callback();
                            break;
                    }
                }
            }),
            logger(...message) {
                console.log(...message);
            }
        }
    }

    initializeTfjs() {
        return new Promise((resolve, reject) => {
            const tfjsNode = path.dirname(require.resolve('@tensorflow/tfjs-node'));
            if (tfjsNode) {
                const tfjsDepLib = path.resolve(tfjsNode, '..', 'deps', 'lib');
                if (!process.env.PATH || !process.env.PATH.includes(tfjsDepLib)) {
                    const envpath = process.env.PATH + (process.platform === 'win32' ? ';' : ':') + tfjsDepLib;
                    process.env.PATH = envpath;
                }
            }
            resolve();
        });
    }

    createServer() {
        return new Promise((resolve, reject) => {
            const port = this.config.port || 7978;
            const { createServer } = require('http');
            this.http = createServer();
            this.http.listen(port, () => {
                resolve(this.http);
            });
        });
    }

    createFpServer() {
        return new Promise((resolve, reject) => {
            const FingerprintId = require('@ntlab/identity-fingerprint');
            this.fp = new FingerprintId({
                ...this.getIdentityOptions('fp'),
                mode: Identity.MODE_VERIFIER,
            });
            process.on('exit', code => {
                this.fp.finalize();
            });
            process.on('SIGTERM', () => {
                this.fp.finalize();
            });
            resolve();
        });
    }

    createFaceServer() {
        return new Promise((resolve, reject) => {
            const options = {mode: Identity.MODE_VERIFIER};
            if (this.config.face) {
                options.size = this.config.face;
            }
            const FaceId = require('@ntlab/identity-face-ng');
            this.face = new FaceId({...this.getIdentityOptions('face'), ...options});
            process.on('exit', code => {
                this.face.finalize();
            });
            process.on('SIGTERM', () => {
                this.face.finalize();
            });
            resolve();
        });
    }

    run() {
        Work.works([
            [w => this.initializeTfjs()],
            [w => this.createServer()],
            [w => this.createFpServer()],
            [w => this.createFaceServer()],
        ])
        .then(() => {
            console.log('Application ready, press Ctrl+C to end...');
        })
        .catch(err => {
            console.error(err);
        })
    }
}

const app = new App();

(function run() {
    app.initialize();
    app.run();
})();

// usage help

function usage() {
    console.log('Usage:');
    console.log('  node %s [options]', path.basename(process.argv[1]));
    console.log('');
    console.log('Options:');
    console.log(Cmd.dump());
    console.log('');
    return true;
}