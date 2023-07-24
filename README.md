# Identity Authenticator

## Introduction

A backend to perform identity authentication. The supported identities are fingerprints and faces.

## How Does It Work

The workflow is described as follow:
```
    ID BRIDGE --- BROWSER --- SERVER --- ID SERVER
            Client side <- | -> Server side
```

### ID BRIDGE

See [Digital Persona Fingerprint Bridge](https://github.com/tohenk/node-dpfb) for client side implementation.

### ID SERVER

ID SERVER is a socket.io server. Normally it is listening at port `7978`.
ID SERVER accepts commands described below.

* `count-template`, it returns same event with an object contains `count`
  property.
* `reg-template`, pass an object with `id` and `template` property as argument.
  It returns same event with an object contains `id` and `success` property.
* `unreg-template`, pass an object with `id` property as argument.
  It returns same event with an object contains `id` and `success` property.
* `has-template`, pass an object with `id` property as argument to check if
  template has been registered. It returns same event with an object contains
  `id` and `exist` property.
* `clear-template`, clear all registered fingerprint templates.
* `identify`, pass an object with `feature` and `workid` property as argument
  to identify the feature against registered fingerprint templates.
  It returns same event with an object contains `ref` (work id), `id` (internal
  id of identification process), and `data` property. To check successfull
  operation of identification, examine `matched` property of `data`.

## Usage

### Requirements

* `node-gyp` must already been installed with its dependencies (build tools),
  to do so, type `npm install -g node-gyp`.
* Digital Persona U.are.U SDK has been installed.
* OpenCV has been installed.

### Building Distribution Package

Before building, be sure the make dependencies are all up to date, issue `npm update` to do so.

#### Building for 32-bit Windows Platform

```
npm run build:dplib:win32
npm run build:opencv:win32
```

#### Building for 64-bit Windows Platform

```
npm run build:dplib:win64
npm run build:opencv:win64
```

### Running ID SERVER

The ID SERVER can be deployed in stand alone mode, which it directly identifies
fingerprint using the SDK or faces using OpenCV. The other option is to act as
proxy which queries another stand alone ID SERVER located anywhere.

ID SERVER configurations is mainly located in the `package.json` under the
scripts section. Also there is `proxy.json` configuration for proxy mode.

#### Running as stand alone server on port 7978

```
npm run idserver
```

#### Running as proxy server on port 7978

Running proxy worker on port 8001

```
npm run idworker1
```

Running proxy worker on port 8002

```
npm run idworker2
```

Running proxy server on port 7978

```
npm run idproxy
```

## Live Demo

Live demo is available [here](https://ntlab.id/demo/digital-persona-fingerprint-bridge).
