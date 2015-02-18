/*
The MIT License (MIT)

Copyright (c) 2015 Kevin Phillips (kmp1)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

var tzx = (function () {

    "use strict";

    ////////// General Byte Manipulation Functions

    function getWord(input, i) {
        var word = (input.getByte(i + 1) << 8) | input.getByte(i);

        return word;
    }

    function getDWord(input, i) {
        var dword = (input.getByte(i + 3) << 24) | (input.getByte(i + 2) << 16) | (input.getByte(i + 1) << 8) | input.getByte(i);

        return dword;
    }

    ////////// Audio Wave Generation Functions

    var wavePosition = 0, db;

    function convertTStatesToSamples(tStates, output, machineSettings) {
        var samples = 0.5 + ((output.frequency / machineSettings.clockSpeed)) * tStates;

        return samples;
    }

    function addSampleToOutput(data, output) {
        var sample = data + 0x80;

        output.addSample(sample);
    }

    function addAnalogWaveToOutput(pulse1, pulse2, output) {
        var amp, i, t = 0;

        amp = (db * 20) / (8 * pulse1 * pulse1 * pulse1);

        for (i = wavePosition; i < pulse1; i += 1) {
            addSampleToOutput(Math.floor(0.5 - amp * (i * (i - pulse1) * (i - 2 * pulse1))), output);
            t += 1;
        }

        wavePosition = t + wavePosition - pulse1;
        t = 0;

        amp = (db * 20) / (8 * pulse2 * pulse2 * pulse2);

        for (i = wavePosition; i < pulse2; i += 1) {
            addSampleToOutput(Math.floor(0.5 - amp * (i * (i + pulse2) * (i - pulse2))), output);
            t += 1;
        }

        wavePosition = t + wavePosition - pulse2;
    }

    function addSingleAnalogPulseToOutput(pulse, output) {
        var t = 0, amp, i;

        amp = (db * 20) / (8 * pulse * pulse * pulse);

        for (i = wavePosition; i < pulse; i += 1) {
            addSampleToOutput(Math.floor(0.5 - amp * (i * (i - pulse) * (i - 2 * pulse))), output);
            t += 1;
        }

        db = -db;
        wavePosition = t + wavePosition - pulse;
    }

    function addPilotToneToOutput(pilotPulse, length, output) {
        var i, t = 0;

        if (length & 1) {
            addSingleAnalogPulseToOutput(pilotPulse, output);
            t = 1;
        }

        for (i = t; i < length; i += 2) {
            addAnalogWaveToOutput(pilotPulse, pilotPulse, output);
        }
    }

    function addDataBlockToOutput(zeroPulse, onePulse, input, offset, length, lastByteBitCount, output) {
        var i, mask, dataByte, pulse;

        for (i = offset; i < offset + length - 1; i += 1) {
            dataByte = input.getByte(i);
            mask = 0x80;
            while (mask) {
                if (mask & dataByte) {
                    pulse = onePulse;
                } else {
                    pulse = zeroPulse;
                }
                addAnalogWaveToOutput(pulse, pulse, output);
                mask >>= 1;
            }
        }

        mask = 0x80;
        dataByte = input.getByte(i);
        for (i = 0; i < lastByteBitCount; i += 1) {
            if (mask & dataByte) {
                pulse = onePulse;
            } else {
                pulse = zeroPulse;
            }
            addAnalogWaveToOutput(pulse, pulse, output);
            mask >>= 1;
        }
    }

    function addPauseToOutput(pausePulse, duration, output) {
        var i, m;

        if (duration === 0) {
            return;
        }

        if (db < 0) {
            addSingleAnalogPulseToOutput(pausePulse, output);
        }

        addAnalogWaveToOutput(pausePulse, pausePulse, output);
        m = db;
        pausePulse = 250;
        for (i = 1; i < output.frequency * duration / (pausePulse * 2000.0); i += 1) {

            db = 200 * db / (200.0 + i);

            if (db < 1) {
                db = 1;
            }
            addAnalogWaveToOutput(pausePulse, pausePulse, output);
        }
        db = m;
    }

    function addEndOfFileToneToOutput(output) {
        var i;

        for (i = 0; i < 1000; i += 1) {
            addAnalogWaveToOutput(12, 12, output);
        }
    }

    ////////// TZX Data Reading Functions

    function calculateChecksum(input, offset, length) {
        var i, dataCheckSum = 0;

        for (i = offset; i < offset + length; i += 1) {
            dataCheckSum ^= input.getByte(i);
        }
        return dataCheckSum;
    }

    function readHeader(input, version) {
        var i, sig = "", eof;

        for (i = 0; i < 7; i += 1) {

            if (i >= input.getLength()) {
                throw "Input is not a valid TZX file";
            }

            sig += String.fromCharCode(input.getByte(i));
        }

        if (sig !== "ZXTape!") {
            throw "Input is not a valid TZX file as the signature is wrong, got: '" + sig + "'";
        }

        eof = input.getByte(i);
        i += 1;

        if (eof !== 26) {
            throw "Input is not a valid TZX file as the EOF byte is wrong, got 0x" + eof.toString(16);
        }

        version.major = input.getByte(i);
        i += 1;
        version.minor = input.getByte(i);
        return i;
    }

    function readTextDescription(input, i, blockDetails) {
        var length, x, description = "";

        length = input.getByte(i + 1);
        for (x = 0; x < length; x += 1) {
            description += String.fromCharCode(input.getByte(i + 2 + x));
        }

        blockDetails.tapeDescription = description;
        return i + length + 1;
    }

    function readArchiveInfo(input, i, blockDetails) {
        var length, count = input.getByte(i + 3), x, y,
            type, stringLength, string, entryStart = i + 4;

        blockDetails.archiveInfo = [];

        length = getWord(input, i + 1);

        for (x = 0; x < count; x += 1) {

            type = input.getByte(entryStart);
            stringLength = input.getByte(entryStart + 1);

            entryStart += 2;

            string = "";
            for (y = 0; y < stringLength; y += 1) {
                string += String.fromCharCode(input.getByte(entryStart));
                entryStart += 1;
            }

            blockDetails.archiveInfo.push({
                type: type,
                info: string
            });
        }
        return i + length + 2;
    }

    function readDataBlockHeaderInformation(fileReader, flag, programType, length, startOffset) {
        var headerText = "", i;

        if (flag === 0 && (length === 19 || length === 20) && programType < 4) {
            for (i = startOffset; i < startOffset + 10; i += 1) {
                headerText += String.fromCharCode(fileReader.getByte(i));
            }

            headerText = headerText.trim();
        } else {
            headerText = "No header";
        }

        return headerText;
    }

    function readPureTone(input, i, output, blockDetails, machineSettings) {

        blockDetails.pilotPulse = getWord(input, i + 1);
        blockDetails.pilotLength = getWord(input, i + 3);

        addPilotToneToOutput(convertTStatesToSamples(blockDetails.pilotPulse, output, machineSettings), blockDetails.pilotLength, output);

        return i + 4;
    }

    function readDataBlock(input, output, pilotPulse, sync1Pulse, sync2Pulse, bit0Pulse, bit1Pulse, pilotLength,
            lastByteBitCount, blockDetails, dataBlockStart, machineSettings) {

        addPilotToneToOutput(convertTStatesToSamples(pilotPulse, output, machineSettings), pilotLength, output);

        addAnalogWaveToOutput(convertTStatesToSamples(sync1Pulse, output, machineSettings),
            convertTStatesToSamples(sync2Pulse, output, machineSettings), output);

        addDataBlockToOutput(convertTStatesToSamples(bit0Pulse, output, machineSettings),
            convertTStatesToSamples(bit1Pulse, output, machineSettings),
            input, dataBlockStart, blockDetails.blockLength, lastByteBitCount, output);

        addPauseToOutput(convertTStatesToSamples(bit1Pulse, output, machineSettings), blockDetails.pause, output);

    }

    function readPureDataBlock(input, i, output, machineSettings, blockDetails) {
        var dataStart = i + 11;

        blockDetails.bit0Pulse = getWord(input, i + 1);
        blockDetails.bit1Pulse = getWord(input, i + 3);
        blockDetails.lastByteBitCount = input.getByte(i + 5);
        blockDetails.pause = getWord(input, i + 6);
        blockDetails.blockLength = (input.getByte(i + 10) << 16) | (input.getByte(i + 9) << 8) | input.getByte(i + 8);

        blockDetails.flag = input.getByte(i + 11);
        blockDetails.checkSum = input.getByte(dataStart + blockDetails.blockLength - 1);

        blockDetails.calculatedCheckSum = calculateChecksum(input, dataStart,
            blockDetails.blockLength - 1);

        addDataBlockToOutput(convertTStatesToSamples(blockDetails.bit0Pulse, output, machineSettings),
            convertTStatesToSamples(blockDetails.bit1Pulse, output, machineSettings),
            input, dataStart, blockDetails.blockLength, blockDetails.lastByteBitCount, output);

        addPauseToOutput(convertTStatesToSamples(blockDetails.bit0Pulse, output, machineSettings), blockDetails.pause, output);

        return dataStart + blockDetails.blockLength - 1;
    }

    function readTurboSpeedDataBlock(input, i, output, machineSettings, blockDetails) {
        var pilotPulse, sync1Pulse, sync2Pulse, bit0Pulse, bit1Pulse, pilotLength,
            lastByteBitCount, dataStart = i + 18;

        pilotPulse = getWord(input, i + 1);
        sync1Pulse = getWord(input, i + 3);
        sync2Pulse = getWord(input, i + 5);
        bit0Pulse = getWord(input, i + 7);
        bit1Pulse = getWord(input, i + 9);
        pilotLength = getWord(input, i + 11);
        lastByteBitCount = input.getByte(i + 13);

        blockDetails.pause = getWord(input, i + 14);
        blockDetails.blockLength = (input.getByte(i + 18) << 16) | (input.getByte(i + 17) << 8) | input.getByte(i + 16);

        blockDetails.flag = input.getByte(i + 19);
        blockDetails.programType = input.getByte(i + 20);
        blockDetails.checkSum = input.getByte(dataStart + blockDetails.blockLength);

        blockDetails.calculatedCheckSum = calculateChecksum(input, dataStart + 1,
            blockDetails.blockLength - 1);

        blockDetails.headerText = readDataBlockHeaderInformation(input, blockDetails.flag,
            blockDetails.programType, blockDetails.blockLength, dataStart + 2);

        readDataBlock(input, output, pilotPulse,
            sync1Pulse, sync2Pulse,
            bit0Pulse, bit1Pulse, pilotLength, lastByteBitCount, blockDetails, dataStart + 1,
            machineSettings);

        return dataStart + blockDetails.blockLength;
    }

    function readStandardSpeedDataBlock(input, i, output, machineSettings, blockDetails) {
        var pilotLength, dataStart = i + 4;

        blockDetails.pause = getWord(input, i + 1);
        blockDetails.blockLength = getWord(input, i + 3);
        blockDetails.flag = input.getByte(i + 5);
        blockDetails.programType = input.getByte(i + 6);
        blockDetails.checkSum = input.getByte(dataStart + blockDetails.blockLength);

        blockDetails.calculatedCheckSum = calculateChecksum(input, dataStart + 1,
            blockDetails.blockLength - 1);

        blockDetails.headerText = readDataBlockHeaderInformation(input, blockDetails.flag,
            blockDetails.programType, blockDetails.blockLength, dataStart + 2);

        if (blockDetails.flag === 0) {
            pilotLength = machineSettings.headerPilotLength;
        } else if (blockDetails.flag === 0xff) {
            pilotLength = machineSettings.dataPilotLength;
        } else {
            throw "Invalid TZX flag byte value: " + blockDetails.flag;
        }

        readDataBlock(input, output, machineSettings.pilotPulse,
            machineSettings.sync1Pulse, machineSettings.sync2Pulse,
            machineSettings.bit0Pulse, machineSettings.bit1Pulse, pilotLength, 8, blockDetails, dataStart + 1,
            machineSettings);

        return dataStart + blockDetails.blockLength;
    }

    function readPulseSequences(input, i, output, machineSettings, blockDetails) {
        var x, y, pulseLength, pulseSamples = [];

        blockDetails.pulseCount = input.getByte(i + 1);

        for (x = i + 2; x < i + 2 + (blockDetails.pulseCount * 2); x += 2) {
            pulseLength = getWord(input, x);
            pulseSamples.push(convertTStatesToSamples(pulseLength, output, machineSettings));
        }

        y = 0;
        if (blockDetails.pulseCount & 1) {
            addSingleAnalogPulseToOutput(pulseSamples[0], output);
            y = 1;
        }
        for (x = y; x < blockDetails.pulseCount; x += 2) {
            addAnalogWaveToOutput(pulseSamples[x], pulseSamples[x + 1], output);
        }

        return i + (blockDetails.pulseCount * 2) + 1;
    }

    function readGroupStart(input, i, blockDetails) {
        var x, name = "", nameLength = input.getByte(i + 1);
        for (x = 0; x < nameLength; x += 1) {
            name += String.fromCharCode(input.getByte(i + 2 + x));
        }
        blockDetails.groupName = name;
        return i + nameLength + 1;
    }

    function createInputWrapper(input) {

        if (input.getByte === undefined) {
            return {
                getLength: function () { return input.length; },
                getByte: function (i) { return input[i]; }
            };
        }
        return input;
    }

    function convertTzxToAudio(machineSettings, inputData, output) {
        var i = 0, version = { major: -1, minor: -1}, blockDetails, loopCount = 0,
            loopStartIndex = -1, retBlockDetails = [], input = createInputWrapper(inputData);

        db = machineSettings.highAmplitude;

        while (i < input.getLength()) {

            if (i === 0) {
                i = readHeader(input, version);
            } else {

                blockDetails = {
                    blockType: input.getByte(i),
                    offset: i
                };

                switch (blockDetails.blockType) {
                case 0x10:
                    i = readStandardSpeedDataBlock(input, i, output, machineSettings, blockDetails);
                    break;
                case 0x11:
                    i = readTurboSpeedDataBlock(input, i, output, machineSettings, blockDetails);
                    break;
                case 0x12:
                    i = readPureTone(input, i, output, blockDetails, machineSettings);
                    break;
                case 0x13:
                    i = readPulseSequences(input, i, output, machineSettings, blockDetails);
                    break;
                case 0x14:
                    i = readPureDataBlock(input, i, output, machineSettings, blockDetails);
                    break;
                case 0x21:
                    i = readGroupStart(input, i, blockDetails);
                    break;
                case 0x22:
                    break;
                case 0x24:
                    loopCount = getWord(input, i + 1);
                    i = i + 2;
                    loopStartIndex = i;
                    blockDetails.loopCount = loopCount;
                    retBlockDetails.push(blockDetails);
                    break;
                case 0x25:
                    loopCount -= 1;
                    if (loopCount > 0) {
                        i = loopStartIndex;
                    }
                    break;
                case 0x2a:
                    blockDetails.stopTapeLength = getDWord(input, i + 1);
                    i = i + blockDetails.stopTapeLength + 4;
                    break;
                case 0x30:
                    i = readTextDescription(input, i, blockDetails);
                    break;
                case 0x32:
                    i = readArchiveInfo(input, i, blockDetails);
                    break;
                case 0x5a:
                    i += 9;
                    break;
                // TODO: Implement more block support here
                default:
                    throw "Unsupported block: 0x" + blockDetails.blockType.toString(16) +
                        ".  How about heading on over to github (https://github.com/kmp1/tzx.js) to help me add support?";
                }

                if (loopCount <= 0) {
                    retBlockDetails.push(blockDetails);
                }
            }
            i += 1;
        }

        addPauseToOutput(convertTStatesToSamples(machineSettings.bit1Pulse, output, machineSettings),
            1000, output);

        addEndOfFileToneToOutput(output);

        return {
            version: version,
            blocks: retBlockDetails
        };
    }

    ////////// TAP Data Reading Functions

    function readTapData(input, i, machineSettings, output, blockDetails) {
        var pilotLength, dataStart = i + 2;

        blockDetails.blockLength = getWord(input, i);
        blockDetails.flag = input.getByte(i + 2);
        blockDetails.pause = 1000;

        if (blockDetails.flag === 0) {
            pilotLength = machineSettings.headerPilotLength;
        } else if (blockDetails.flag === 0xff) {
            pilotLength = machineSettings.dataPilotLength;
        } else {
            throw "Invalid TAP flag byte value: " + blockDetails.flag;
        }

        addPilotToneToOutput(convertTStatesToSamples(machineSettings.pilotPulse, output, machineSettings), pilotLength, output);

        addAnalogWaveToOutput(convertTStatesToSamples(machineSettings.sync1Pulse, output, machineSettings),
            convertTStatesToSamples(machineSettings.sync2Pulse, output, machineSettings), output);

        addDataBlockToOutput(convertTStatesToSamples(machineSettings.bit0Pulse, output, machineSettings),
            convertTStatesToSamples(machineSettings.bit1Pulse, output, machineSettings),
            input, dataStart, blockDetails.blockLength, 8, output);

        addPauseToOutput(convertTStatesToSamples(machineSettings.bit1Pulse, output, machineSettings), blockDetails.pause, output);

        return dataStart + blockDetails.blockLength;
    }

    function convertTapToAudio(machineSettings, inputData, output) {
        var i = 0, blockDetails, retBlockDetails = [],
            input = createInputWrapper(inputData);

        db = machineSettings.highAmplitude;

        while (i < input.getLength()) {
            blockDetails = {
                blockType: 0x10,
                offset: i
            };

            i = readTapData(input, i, machineSettings, output, blockDetails);

            retBlockDetails.push(blockDetails);
        }

        addEndOfFileToneToOutput(output);

        return retBlockDetails;
    }

    return {

        /**
         * Converts a TZX to an audio file and returns some details about
         * what it has read.
         *
         * @param {Number} machineSettings The machine specific settings to use
         * @param {Object} input The input file to read from (this must be an object
         * that provides a length property and a getByte(x) function.)
         * @param {Object} output The output to write to (this must be a wav.js
         * created wave file or at least something that implements the same interface
         * - it would be fantastic to implement the interface but generate an MP3 for
         * example).
         * @return {Object} details about the TZX file that was converted
         */
        convertTzxToAudio: convertTzxToAudio,

        /**
         * Converts a TZX to an audio file and returns some details about
         * what it has read.
         *
         * @param {Number} machineSettings The machine specific settings to use
         * @param {Object} input The input file to read from (this must be an object
         * that provides a length property and a getByte(x) function.)
         * @param {Object} output The output to write to (this must be a wav.js
         * created wave file or at least something that implements the same interface
         * - it would be fantastic to implement the interface but generate an MP3 for
         * example).
         * @return {Object} details about the TAP file that was converted
         */
        convertTapToAudio: convertTapToAudio,

        MachineSettings: {
            ZXSpectrum48: {
                highAmplitude: 115,
                clockSpeed: 3500000,
                pilotPulse: 2168,
                sync1Pulse: 667,
                sync2Pulse: 735,
                bit0Pulse: 855,
                bit1Pulse: 1710,
                headerPilotLength: 8064,
                dataPilotLength: 3220
            }
            // TODO: Add some more machines here - e.g. SAM, CPC etc (there are a few supported by TZX files)
        }
    };
}());

if (typeof exports !== "undefined") {
    exports.convertTzxToAudio = tzx.convertTzxToAudio;
    exports.convertTapToAudio = tzx.convertTapToAudio;
    exports.MachineSettings = tzx.MachineSettings;
}