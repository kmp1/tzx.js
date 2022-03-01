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
/*jslint passfail: false,
    ass: false,
    bitwise: true,
    continue: false,
    debug: false,
    eqeq: false,
    evil: false,
    forin: false,
    newcap: false,
    nomen: false,
    plusplus: false,
    regexp: false,
    unparam: false,
    sloppy: false,
    stupid: false,
    sub: false,
    todo: true,
    vars: false,
    white: false,
    maxlen: 80 */
// NOTE ABOUT JSLINT: So I do typeof blah, blah, blah in some places which
// JS Lint does not like.  Apparently you should be using the === undefined
// approach but I cannot do that as I want this to work in old browsers where
// that check is not safe, so I am ignoring JS Lint in these cases (sorry
// Douglas)
var tzx = (function () {

    "use strict";

    function convert(machineSettings, inputData, output, isTap) {
        var input,

            // At 44.1kHz, there would be 79.36508 (to 5 decimal places)
            // t-states in a single sample point in the output wave - this is
            // what this calculation is figuring out.  Mostly we have t-states
            // and will need sample points.
            ticksPerSample = machineSettings.clockSpeed / output.getFrequency();

        /****** Functions For Validating Input Data ******/

        function validateMachineSettings() {
            if (machineSettings === null ||
                    typeof machineSettings === "undefined") {
                throw "No machine settings passed in - you must pass in a " +
                    "property bag of settings to describe the target machine" +
                    " (e.g. a ZX Spectrum 48k has a pre-canned machine " +
                    "settings object here: tzx.MachineSettings.ZXSpectrum48";
            }

            if (!machineSettings.hasOwnProperty("highAmplitude")) {
                throw "machineSettings does not contain the property '" +
                    "highAmplitude' - this is a value for the high amplitude " +
                    "level in the output audio (for example 115 works mostly).";
            }
            if (!machineSettings.hasOwnProperty("clockSpeed")) {
                throw "machineSettings does not contain the property '" +
                    "clockSpeed' - this is the clock speed, in Hz, for " +
                    "example 3500000 for a ZX Specturm 48k";
            }
            if (!machineSettings.hasOwnProperty("pilotPulse")) {
                throw "machineSettings does not contain the property '" +
                    "pilotPulse' - this is the length, in t-states of the " +
                    "pilot pulse, for example 2168 for a ZX Specturm 48";
            }
            if (!machineSettings.hasOwnProperty("sync1Pulse")) {
                throw "machineSettings does not contain the property '" +
                    "sync1Pulse' - this is the length, in t-states of the " +
                    "sync 1 pulse, for example 667 for a ZX Specturm 48";
            }
            if (!machineSettings.hasOwnProperty("sync2Pulse")) {
                throw "machineSettings does not contain the property '" +
                    "sync2Pulse' - this is the length, in t-states of the " +
                    "sync 2 pulse, for example 735 for a ZX Specturm 48";
            }
            if (!machineSettings.hasOwnProperty("bit0Pulse")) {
                throw "machineSettings does not contain the property '" +
                    "bit0Pulse' - this is the length, in t-states of the " +
                    "0 bit pulse, for example 855 for a ZX Specturm 48";
            }
            if (!machineSettings.hasOwnProperty("bit1Pulse")) {
                throw "machineSettings does not contain the property '" +
                    "bit1Pulse' - this is the length, in t-states of the " +
                    "1 bit pulse, for example 1710 for a ZX Specturm 48";
            }
            if (!machineSettings.hasOwnProperty("headerPilotLength")) {
                throw "machineSettings does not contain the property '" +
                    "headerPilotLength' - this is the length, in t-states of " +
                    "a header data block's pilot pulse, for example 8064 for " +
                    "a ZX Specturm 48";
            }
            if (!machineSettings.hasOwnProperty("dataPilotLength")) {
                throw "machineSettings does not contain the property '" +
                    "dataPilotLength' - this is the length, in t-states of " +
                    "a data data block's pilot pulse, for example 3220 for " +
                    "a ZX Specturm 48";
            }
            if (!machineSettings.hasOwnProperty("is48k")) {
                throw "machineSettings does not contain the property '" +
                    "is48k' - this is a boolean that is true if the machine" +
                    "is a ZX Spectrum 48k - all other machines should be false";
            }
        }

        function validateOutput() {

            if (output === null || typeof output === "undefined") {
                throw "No output passed in - you must pass in an " +
                    "object that has getFrequency and addSample functions.";
            }

            if (!output.hasOwnProperty("getFrequency")) {
                throw "output does not contain the function '" +
                    "getFrequency()' - this should be a function that " +
                    "returns an integer representing the sampling frequency " +
                    "for example 44100";
            }

            if (typeof output.getFrequency !== "function") {
                throw "output contains getFrequency but it is not a function.";
            }

            if (!output.hasOwnProperty("addSample")) {
                throw "output does not contain the function '" +
                    "addSample(sample)' - this should be a function that " +
                    "takes a single argument for the sample point to add.";
            }

            if (typeof output.addSample !== "function") {
                throw "output contains addSample but it is not a function.";
            }

            if (!output.hasOwnProperty("getSampleSize")) {
                throw "output does not contain the function '" +
                    "getSampleSize()' - this should be a function that " +
                    "returns the number of bits in a sample in the output.";
            }

            if (typeof output.getSampleSize !== "function") {
                throw "output contains getSampleSize but it is not a " +
                    "function.";
            }
        }

        function validateInputAndGetWrapperIfPossible() {
            var wrapped;

            if (inputData === null || typeof inputData === "undefined") {
                throw "No input passed in - you must pass in an " +
                    "object that has getLength and getByte functions.";
            }

            // If they have passed in an array we can, most likely, just deal
            // with it, hence this array check.  The only problem will be if
            // there is a stop-the-tape situation - then it will throw an
            // exception and they'll need to wrap their array themselves - I
            // suppose we could have an extra optional argument which is the
            // callback function for stop the tape so you could pass in an array
            // and a callback but I'm not sure if that is actually any easier
            // than wrapping it up yourself so I'll just not bother

            if (Object.prototype.toString.call(inputData).toLowerCase() ===
                    "[object Array]") {
                wrapped = {
                    getLength: function () { return inputData.length; },
                    getByte: function (i) { return inputData[i]; }
                };
            } else {

                if (!inputData.hasOwnProperty("getLength")) {
                    throw "input does not contain the function '" +
                        "getLength()' - this should be a function that " +
                        "returns an integer representing the number of bytes " +
                        "in the input data.";
                }

                if (typeof inputData.getLength !== "function") {
                    throw "input contains getLength but it is not a function.";
                }

                if (!inputData.hasOwnProperty("getByte")) {
                    throw "input does not contain the function '" +
                        "getByte(i)' - this should be a function that " +
                        "takes a single argument for the index to read the " +
                        "byte from and returns the value of that byte.";
                }

                if (typeof inputData.getByte !== "function") {
                    throw "input contains getByte but it is not a function.";
                }

                wrapped = inputData;
            }

            return wrapped;
        }

        function handleDeprecatedBlock(blockName) {
            throw "The block " + blockName + " is deprecated and, as such, " +
                " tzx.js doesn't support it - you should upgrade the tzx file.";
        }

        /****** End of Functions For Validating Input Data ******/

        /****** Functions For Dealing With Input Data ******/

        function getInputLength() {
            return input.getLength();
        }

        function getByte(i) {
            var b = input.getByte(i);

            return b;
        }

        function getWord(i) {
            var word = (getByte(i + 1) << 8) | getByte(i);

            return word;
        }

        function get3Bytes(i) {
            var threeBytes = (getByte(i + 2) << 16) |
                (getByte(i + 1) << 8) |
                getByte(i);

            return threeBytes;
        }

        function getDWord(i) {
            var dword = (getByte(i + 3) << 24) |
                (getByte(i + 2) << 16) |
                (getByte(i + 1) << 8) |
                getByte(i);

            return dword;
        }

        function calculateChecksum(offset, length) {
            var i, dataCheckSum = 0;

            for (i = offset; i < offset + length; i += 1) {
                dataCheckSum ^= getByte(i);
            }
            return dataCheckSum;
        }

        /****** End Of Functions For Dealing With Input Data ******/

        /****** A class that deals with generating audio output ******/
        function HandlerWrapper() {

            var wavePosition = 0, db = machineSettings.highAmplitude,
                loopCount = 0, loopStartIndex = -1;

            function getSamples(tStates) {
                var samples = tStates / ticksPerSample;

                return samples;
            }

            function addSampleToOutput(data) {
                var sample;

                if (output.getSampleSize() === 8) {
                    sample = data + 0x80;
                } else {
                    sample = data;
                }

                output.addSample(sample);
            }

            function addAnalogWaveToOutput(pulse1, pulse2) {
                var amp, i, t = 0;

                amp = (db * 20) / (8 * pulse1 * pulse1 * pulse1);

                for (i = wavePosition; i < pulse1; i += 1) {

                    addSampleToOutput(Math.floor(0.5 -
                        amp * (i * (i - pulse1) * (i - 2 * pulse1))));
                    t += 1;
                }

                wavePosition = t + wavePosition - pulse1;
                t = 0;

                amp = (db * 20) / (8 * pulse2 * pulse2 * pulse2);

                for (i = wavePosition; i < pulse2; i += 1) {

                    addSampleToOutput(Math.floor(0.5 -
                        amp * (i * (i + pulse2) * (i - pulse2))));
                    t += 1;
                }

                wavePosition = t + wavePosition - pulse2;
                
            }

            function addSquareWaveToOutput(pulse1, pulse2) {
                var i, t = 0;
                
                for (i = wavePosition; i < pulse1; i += 1) {

                    addSampleToOutput(-80);
                    t += 1;
                }

                wavePosition = t + wavePosition - pulse1;
                t = 0;

                  for (i = wavePosition; i < pulse2; i += 1) {

                    addSampleToOutput(80);
                    t += 1;
                }
            }

            function addSingleAnalogPulseToOutput(pulse) {
                var t = 0, amp, i;

                amp = (db * 20) / (8 * pulse * pulse * pulse);

                for (i = wavePosition; i < pulse; i += 1) {

                    addSampleToOutput(Math.floor(0.5 -
                        amp * (i * (i - pulse) * (i - 2 * pulse))));
                    t += 1;
                }

                db = -db;
                wavePosition = t + wavePosition - pulse;
            }

            function addPauseToOutput(pausePulse, duration) {
                var i, m, max;

                if (duration === 0) {
                    return;
                }

                if (db < 0) {
                    addSingleAnalogPulseToOutput(pausePulse);
                }

                m = db;
                db=0;
                pausePulse = 250;
                max = output.getFrequency() * duration / (pausePulse * 2000.0);
                for (i = 1; i < max; i += 1) {

                    db = 200 * db / (200.0 + i);

                    if (db < 1) {
                        db = 1;
                    }
                    addAnalogWaveToOutput(pausePulse, pausePulse);
                }
                db = m;
                machineSettings.highAmplitude=db;
            }

            function addPilotToneToOutput(pilotPulse, length) {
                var i, t = 0;

                if (length & 1) {
                    addSingleAnalogPulseToOutput(pilotPulse);
                    t = 1;
                }

                for (i = t; i < length; i += 2) {
                    addAnalogWaveToOutput(pilotPulse, pilotPulse);
                }
            }

            function addDataBlockToOutput(zero, one, offs, len, lastByteBits) {
                var i, mask, dataByte, pulse;

                for (i = offs; i < offs + len - 1; i += 1) {
                    dataByte = getByte(i);
                    mask = 0x80;
                    while (mask) {
                        if (mask & dataByte) {
                            pulse = one;
                        } else {
                            pulse = zero;
                        }
                        addAnalogWaveToOutput(pulse, pulse);
                        mask >>= 1;
                    }
                }

                mask = 0x80;
                dataByte = getByte(i);
                for (i = 0; i < lastByteBits; i += 1) {
                    if (mask & dataByte) {
                        pulse = one;
                    } else {
                        pulse = zero;
                    }
                    addAnalogWaveToOutput(pulse, pulse);
                    mask >>= 1;
                }
            }
            function addDataBlockToOutputMSX(zero, one,pulses,bits,offs,len, lastByteBits) {
                var md,i,nstart,a,start,nstop,b,stop,m,pu,mask, dataByte,
                pulses0=((0b11110000&pulses)>>4)/2,
                pulses1=(0b00001111&pulses)/2;
                nstart=(0b11000000&bits)>>6;
                start=(0b00100000&bits)>>5;
                nstop=(0b00011000&bits)>>3;
                stop=(0b00000100&bits)>>2;


                for (i = offs; i < offs + len; i += 1)
                 {
                    for (a= 1; a<=nstart; a +=1)
                    {

                        if (start)
                         {
                            for (pu = 1; pu<=pulses1; pu +=1)
                            addAnalogWaveToOutput(one, one);
                        }
                         else
                        {
                            for (pu = 1; pu<=pulses0; pu +=1)
                            addAnalogWaveToOutput(zero,zero);
                        }
                    }
                    dataByte = getByte(i);
                    mask = 0x1;
                    for (m = 1; m < 9; m += 1)
                    {
                        md = (mask&dataByte);
                        if (mask & dataByte)
                         {
                            for (pu = 1; pu<=pulses1; pu +=1)
                            addAnalogWaveToOutput(one, one);
                        }
                         else
                        {
                            for (pu = 1; pu<=pulses0; pu +=1)
                            addAnalogWaveToOutput(zero, zero);
                        }
                        
                        mask <<= 1;
                    }
                    for (a= 1; a<=nstop; a +=1)
                    {

                        if (stop)
                         {
                            for (pu = 1; pu<=pulses1; pu +=1)
                            addAnalogWaveToOutput(one,one);
                        }
                         else
                        {
                            for (pu = 1; pu<=pulses0; pu +=1)
                            addAnalogWaveToOutput(zero,zero);
                        }
                    }
                }

            }
            function addEndOfFileToneToOutput() {
                var i;

                for (i = 0; i < 1000; i += 1) {
                    db = 100000 * db / (100000 + i);
                    addAnalogWaveToOutput(12, 12);
                }
            }

            function readDataBlockHeaderInformation(flag, progType, len, offs) {
                var headerText = "", i;

                if (flag === 0 && (len === 19 || len === 20) && progType < 4) {
                    for (i = offs; i < offs + 10; i += 1) {
                        headerText += String.fromCharCode(getByte(i));
                    }

                    headerText = headerText.trim();
                } else {
                    headerText = "No header";
                }

                return headerText;
            }

            function stopTheTape() {
                if (typeof output.stopTheTapeTrigger === "undefined") {
                    throw "We encountered a stop the tape situation but " +
                        "the output passed in does not have a " +
                        "stopTheTapeTrigger function defined - we do not pass" +
                        "anything to this function or care about what it " +
                        "returns so you just need to define it on the output.";
                }
                stopTheTapeTrigger=blockDetails.groupName;
                output.stopTheTapeTrigger();
            }

            function addSilenceToOutput(time) {
                var x = 0, sampleCount = (output.getFrequency() / 1000) * time;

                for (x = 0; x < sampleCount; x += 1) {
                    addSampleToOutput(-0x80);
                }
            }

            return {

                /**
                 * Handles a finishing off a file
                 * @param {Boolean} addPause True to add a pause before the
                 * final block
                 */
                finishFile: function (addPause) {
                    
                    if (addPause) {
                        addPauseToOutput(getSamples(machineSettings.bit1Pulse),
                            1000);
                    }
                },

                /**
                 * Handles a TZX header block
                 * @param {Object} version The version object to store
                 * @return {Integer} The index at the end of this block
                 */
                tzxHeader: function (version) {
                    var i, sig = "", eof;

                    for (i = 0; i < 7; i += 1) {

                        if (i >= getInputLength()) {
                            throw "Input is not a valid TZX file";
                        }

                        sig += String.fromCharCode(getByte(i));
                    }

                    if (sig !== "ZXTape!") {
                        throw "Input is not a valid TZX file as the signature" +
                            " is wrong, got: '" + sig + "'";
                    }

                    eof = getByte(i);
                    i += 1;

                    if (eof !== 26) {
                        throw "Input is not a valid TZX file as the EOF byte" +
                            " is wrong, got 0x" + eof.toString(16);
                    }

                    version.major = getByte(i);
                    i += 1;
                    version.minor = getByte(i);
                    return i;
                },

                /**
                 * Handles block ID 10 Standard speed data block
                 * @param {Integer} i The index at which the block ID is
                 * @param {Object} blockDetails The details object to fill
                 * @return {Integer} The index at the end of this block
                 */
                block10: function (i, blockDetails) {
                    var pilotLength, dataStart = i + 4;

                    blockDetails.pause = getWord(i + 1);
                    blockDetails.blockLength = getWord(i + 3);
                    blockDetails.flag = getByte(i + 5);
                    blockDetails.programType = getByte(i + 6);
                    blockDetails.checkSum = getByte(dataStart +
                        blockDetails.blockLength);

                    blockDetails.calculatedCheckSum =
                        calculateChecksum(dataStart + 1,
                            blockDetails.blockLength - 1);

                    blockDetails.headerText =
                        readDataBlockHeaderInformation(blockDetails.flag,
                            blockDetails.programType,
                            blockDetails.blockLength,
                            dataStart + 2);

                    if (blockDetails.flag < 128) {
                        pilotLength = machineSettings.headerPilotLength;
                    } else {
                        pilotLength = machineSettings.dataPilotLength;
                    } 
                    
                    addPilotToneToOutput(getSamples(machineSettings.pilotPulse),
                        pilotLength);

                    addAnalogWaveToOutput(
                        getSamples(machineSettings.sync1Pulse),
                        getSamples(machineSettings.sync2Pulse)
                    );

                    addDataBlockToOutput(getSamples(machineSettings.bit0Pulse),
                        getSamples(machineSettings.bit1Pulse),
                        dataStart + 1,
                        blockDetails.blockLength,
                        8);

                    addPauseToOutput(getSamples(machineSettings.bit1Pulse),
                        blockDetails.pause);

                    return i + 4 + blockDetails.blockLength;
                },

                /**
                 * Handles block ID 11 Turbo speed data block
                 * @param {Integer} i The index at which the block ID is
                 * @param {Object} blockDetails The details object to fill
                 * @return {Integer} The index at the end of this block
                 */
                block11: function (i, blockDetails) {
                    var pilotPulse, sync1Pulse, sync2Pulse, bit0Pulse,
                        bit1Pulse, pilotLength, lastByteBitCount,
                        dataStart;

                    dataStart = i + 18;

                    pilotPulse = getWord(i + 1);
                    sync1Pulse = getWord(i + 3);
                    sync2Pulse = getWord(i + 5);
                    bit0Pulse = getWord(i + 7);
                    bit1Pulse = getWord(i + 9);
                    pilotLength = getWord(i + 11);
                    lastByteBitCount = getByte(i + 13);

                    blockDetails.pause = getWord(i + 14);
                    blockDetails.blockLength = get3Bytes(i + 16);

                    blockDetails.flag = getByte(i + 19);
                    blockDetails.programType = getByte(i + 20);
                    blockDetails.checkSum = getByte(dataStart +
                        blockDetails.blockLength);

                    blockDetails.calculatedCheckSum = calculateChecksum(
                        dataStart + 1,
                        blockDetails.blockLength - 1
                    );

                    blockDetails.headerText = readDataBlockHeaderInformation(
                        blockDetails.flag,
                        blockDetails.programType,
                        blockDetails.blockLength,
                        dataStart + 2
                    );

                    addPilotToneToOutput(getSamples(pilotPulse), pilotLength);

                    addAnalogWaveToOutput(getSamples(sync1Pulse),
                        getSamples(sync2Pulse));

                    addDataBlockToOutput(getSamples(bit0Pulse),
                        getSamples(bit1Pulse),
                        dataStart + 1,
                        blockDetails.blockLength,
                        lastByteBitCount);

                    addPauseToOutput(getSamples(bit1Pulse), blockDetails.pause);

                    return dataStart + blockDetails.blockLength;
                },

                /**
                 * Handles block ID 12 Pure tone
                 * @param {Integer} i The index at which the block ID is
                 * @param {Object} blockDetails The details object to fill
                 * @return {Integer} The index at the end of this block
                 */
                block12: function (i, blockDetails) {

                    blockDetails.pilotPulse = getWord(i + 1);
                    blockDetails.pilotLength = getWord(i + 3);

                    addPilotToneToOutput(getSamples(blockDetails.pilotPulse),
                        blockDetails.pilotLength);

                    return i + 4;
                },

                /**
                 * Handles block ID 13 Sequence of pulses of various lengths
                 * @param {Integer} i The index at which the block ID is
                 * @param {Object} blockDetails The details object to fill
                 * @return {Integer} The index at the end of this block
                 */
                block13: function (i, blockDetails) {
                    var x, y, pulseLength, pulseSamples = [], max;

                    blockDetails.pulseCount = getByte(i + 1);

                    max = i + 2 + (blockDetails.pulseCount * 2);
                    for (x = i + 2; x < max; x += 2) {
                        pulseLength = getWord(x);
                        pulseSamples.push(getSamples(pulseLength));
                    }

                    y = 0;
                    if (blockDetails.pulseCount & 1) {
                        addSingleAnalogPulseToOutput(pulseSamples[0]);
                        y = 1;
                    }

                    for (x = y; x < blockDetails.pulseCount; x += 2) {
                        addAnalogWaveToOutput(pulseSamples[x],
                            pulseSamples[x + 1]);
                    }

                    return i + (blockDetails.pulseCount * 2) + 1;
                },

                /**
                 * Handles block ID 14 Pure data block
                 * @param {Integer} i The index at which the block ID is
                 * @param {Object} blockDetails The details object to fill
                 * @return {Integer} The index at the end of this block
                 */
                block14: function (i, blockDetails) {
                    var dataStart = i + 11;

                    blockDetails.bit0Pulse = getWord(i + 1);
                    blockDetails.bit1Pulse = getWord(i + 3);
                    blockDetails.lastByteBitCount = getByte(i + 5);
                    blockDetails.pause = getWord(i + 6);
                    blockDetails.blockLength = get3Bytes(i + 8);

                    blockDetails.flag = getByte(i + 11);
                    blockDetails.checkSum = getByte(dataStart +
                        blockDetails.blockLength - 1);

                    blockDetails.calculatedCheckSum = calculateChecksum(
                        dataStart,
                        blockDetails.blockLength - 1
                    );

                    addDataBlockToOutput(getSamples(blockDetails.bit0Pulse),
                        getSamples(blockDetails.bit1Pulse),
                        dataStart,
                        blockDetails.blockLength,
                        blockDetails.lastByteBitCount);

                    addPauseToOutput(getSamples(blockDetails.bit0Pulse),
                        blockDetails.pause);

                    return dataStart + blockDetails.blockLength - 1;
                },

                /**
                 * Handles block ID 15 Direct recording block
                 * @param {Integer} i The index at which the block ID is
                 * @param {Object} blockDetails The details object to fill
                 * @return {Integer} The index at the end of this block
                 */
                block15: function (i, blockDetails) {
                    var x, n, y, firstBit, pulse1 = 0, pulse2 = 0, mask;

                    blockDetails.tStateCount = getWord(i + 1);
                    blockDetails.pause = getWord(i + 3);
                    blockDetails.lastByteBitCount = getByte(i + 5);

                    n = blockDetails.pause + 0x10000 *
                        blockDetails.lastByteBitCount;
                    firstBit = (getByte(i + 6) & 0x80);

                    for (x = 0; x < n; x += 1) {
                        mask  = 0x80;
                        while (mask) {
                            y = !(getByte(i + x + 6) & mask);
                            if (firstBit === y) {
                                pulse2 += 1;
                            } else {
                                if (pulse2) {
                                    addAnalogWaveToOutput(
                                        getSamples(pulse1 *
                                            blockDetails.tStateCount),
                                        getSamples(pulse2 *
                                            blockDetails.tStateCount)
                                    );
                                    pulse1 = 0;
                                    pulse2 = 0;
                                } else {
                                    pulse1 += 1;
                                }
                            }

                            mask >>= 1;
                        }
                    }

                    if (pulse2) {
                        addAnalogWaveToOutput(getSamples(pulse1 *
                            blockDetails.tStateCount),
                            getSamples(pulse2 * blockDetails.tStateCount));
                    }
                },

                /** Handles block ID 16 C64 ROM type data block (DEPRECATED) */
                block16: function () {
                    handleDeprecatedBlock("ID 16 C64 ROM type data block");
                },

                /** Handles block ID 17 C64 turbo tape data block (DEPRECATED)*/
                block17: function () {
                    handleDeprecatedBlock("ID 17 C64 turbo tape data block");
                },

                /**
                 * Handles block ID 20 Pause (silence) or 'Stop the tape'
                 * @param {Integer} i The index at which the block ID is
                 * @param {Object} blockDetails The details object to fill
                 * @return {Integer} The index at the end of this block
                 */
                block20: function (i, blockDetails) {
                    blockDetails.pause = getWord(i + 1);

                    if (blockDetails.pause === 0) {
                        stopTheTape();
                    } else {
                        addSilenceToOutput(blockDetails.pause);
                    }

                    return i + 2;
                },

                /**
                 * Handles block ID 21 Group start
                 * @param {Integer} i The index at which the block ID is
                 * @param {Object} blockDetails The details object to fill
                 * @return {Integer} The index at the end of this block
                 */
                block21: function (i, blockDetails) {
                    var x, name = "", nameLength = getByte(i + 1);

                    for (x = 0; x < nameLength; x += 1) {
                        name += String.fromCharCode(getByte(i + 2 + x));
                    }
                    blockDetails.groupName = name;
                    return i + nameLength + 1;
                },

                /**
                 * Handles block ID 22 Group end
                 * @param {Integer} i The index at which the block ID is
                 * @param {Object} blockDetails The details object to fill
                 * @return {Integer} The index at the end of this block
                 */
                block22: function (i) {
                    return i;
                },

                /**
                 * Handles block ID 24 Loop start
                 * @param {Integer} i The index at which the block ID is
                 * @param {Object} blockDetails The details object to fill
                 * @return {Integer} The index at the end of this block
                 */
                block24: function (i, blockDetails) {

                    loopCount = getWord(i + 1);
                    loopStartIndex = i + 2;
                    blockDetails.loopCount = loopCount;
                    return i + 2;
                },

                /**
                 * Handles block ID 25 Loop end
                 * @param {Integer} i The index at which the block ID is
                 * @param {Object} blockDetails The details object to fill
                 * @return {Integer} The index at the end of this block
                 */
                block25: function (i) {

                    loopCount -= 1;
                    if (loopCount > 0) {
                        return loopStartIndex;
                    }
                    return i;
                },

                /**
                 * Handles block ID 2a Stop the tape if in 48K mode
                 * @param {Integer} i The index at which the block ID is
                 * @param {Object} blockDetails The details object to fill
                 * @return {Integer} The index at the end of this block
                 */
                block2a: function (i, blockDetails) {

                    if (machineSettings.is48k) {
                        stopTheTape();
                    }

                    blockDetails.stopTapeLength = getDWord(i + 1);
                    return i + blockDetails.stopTapeLength + 4;
                },

                /**
                 * Handles block ID 30 Text description
                 * @param {Integer} i The index at which the block ID is
                 * @param {Object} blockDetails The details object to fill
                 * @return {Integer} The index at the end of this block
                 */
                block30: function (i, blockDetails) {
                    var length, x, description = "";

                    length = getByte(i + 1);
                    for (x = 0; x < length; x += 1) {
                        description += String.fromCharCode(getByte(i + 2 + x));
                    }

                    blockDetails.tapeDescription = description;
                    return i + length + 1;
                },

                /**
                 * Handles block ID 31 Message block
                 * @param {Integer} i The index at which the block ID is
                 * @param {Object} blockDetails The details object to fill
                 * @return {Integer} The index at the end of this block
                 */
                block31: function (i, blockDetails) {
                    var length, x, message = "";

                    blockDetails.duration = getByte(i + 1);
                    length = getByte(i + 2);
                    for (x = 0; x < length; x += 1) {
                        message += String.fromCharCode(getByte(i + 3 + x));
                    }

                    blockDetails.message = message;
                    return i + length + 2;
                },

                /**
                 * Handles block ID 32 Archive info
                 * @param {Integer} i The index at which the block ID is
                 * @param {Object} blockDetails The details object to fill
                 * @return {Integer} The index at the end of this block
                 */
                block32: function (i, blockDetails) {
                    var length, count, x, y, type, strLength, string, start;

                    start = i + 4;
                    count = getByte(i + 3);
                    blockDetails.archiveInfo = [];

                    length = getWord(i + 1);

                    for (x = 0; x < count; x += 1) {

                        type = getByte(start);
                        strLength = getByte(start + 1);

                        start += 2;

                        string = "";
                        for (y = 0; y < strLength; y += 1) {
                            string += String.fromCharCode(getByte(start));
                            start += 1;
                        }

                        blockDetails.archiveInfo.push({
                            type: type,
                            info: string
                        });
                    }
                    return i + length + 2;
                },

                /**
                 * Handles block ID 33 Hardware type
                 * @param {Integer} i The index at which the block ID is
                 * @param {Object} blockDetails The details object to fill
                 * @return {Integer} The index at the end of this block
                 */
                block33: function (i, blockDetails) {
                    var count, x, hardwareInfo = [];

                    count = getByte(i + 1);

                    for (x = 0; x < count; x += 3) {

                        blockDetails.hardwareInfo.push({
                            type: getByte(i + x),
                            id: getByte(i + x + 1),
                            info: getByte(i + x + 2)
                        });
                    }

                    blockDetails.hardwareInfo = hardwareInfo;

                    return i + (count * 3) + 1;
                },

                /** Handles block ID 34 Emulation info (DEPRECATED) */
                block34: function () {
                    handleDeprecatedBlock("ID 34 Emulation info");
                },

                /**
                 * Handles block ID 35 Custom info block
                 * @param {Integer} i The index at which the block ID is
                 * @param {Object} blockDetails The details object to fill
                 * @return {Integer} The index at the end of this block
                 */
                block35: function (i, blockDetails) {
                    var x, id = "", info = [];

                    for (x = 1; x <= 0x10; x += 1) {
                        id += String.fromCharCode(getByte(i + x));
                    }

                    blockDetails.customInfoIdentification = id;
                    blockDetails.customInfoLength = getWord(i + 0x11);

                    for (x = 0; x < blockDetails.customInfoLength; x += 1) {
                        info.push(getByte(i + 0x15 + x));
                    }

                    blockDetails.customInfo = info;

                    return i + blockDetails.customInfoLength + 0x14;
                },

                /** Handles block ID 40 Snapshot block (DEPRECATED) */
                block40: function () {
                    handleDeprecatedBlock("ID 40 Snapshot block");
                },
                /**
                 * Handles block ID 4b Standard speed data block
                 * @param {Integer} i The index at which the block ID is
                 * @param {Object} blockDetails The details object to fill
                 * @return {Integer} The index at the end of this block
                 */
                block4b: function (i, blockDetails) {
                    blockDetails.blockLength = getDWord (i+0x1);
                    blockDetails.pause = getWord(i + 0x5);
                    blockDetails.pilotPulse = getWord(i + 0x7);
                    blockDetails.pilotLength = getWord(i + 0x9);
                    blockDetails.bit0Pulse = getWord(i + 0xb);
                    blockDetails.bit1Pulse = getWord(i + 0xd);
                    blockDetails.pulses = getByte(i + 0xf);
                    blockDetails.bits = getByte(i+0x10);
                    
                    var dataStart = i + 0x11,pil,sil;
                    machineSettings.clockSpeed=3528000;
                    machineSettings.highAmplitude= -115;
          
                    addPilotToneToOutput(getSamples(blockDetails.pilotPulse),
                        (blockDetails.pilotLength/2));

                    addDataBlockToOutputMSX(getSamples(blockDetails.bit0Pulse),
                            getSamples(blockDetails.bit1Pulse),
                            (blockDetails.pulses),
                            (blockDetails.bits),
                            dataStart,
                            (blockDetails.blockLength-12),
                            0);
                
                    addPauseToOutput(getSamples(blockDetails.bit1Pulse),
                        blockDetails.pause);

                    
                    return i + 4 + blockDetails.blockLength;
                },

                /**
                 * Handles block ID 5A "Glue" block (90 dec, ASCII Letter 'Z')
                 * @param {Integer} i The index at which the block ID is
                 * @param {Object} blockDetails The details object to fill
                 * @return {Integer} The index at the end of this block
                 */
                block5a: function (i, blockDetails) {
                    var x = 0, id = "";

                    // This is a "glue" block, the value should be
                    // XTape!<eof><majver><minver>
                    // So 9 bytes

                    for (x = 1; x <= 7; x += 1) {
                        id += String.fromCharCode(getByte(i + x));
                    }

                    blockDetails.glueIdentifier = id;
                    blockDetails.glueEof = getByte(i + 7);
                    blockDetails.glueMajor = getByte(i + 8);
                    blockDetails.glueMinor = getByte(i + 9);

                    return i + 9;
                },

                /**
                 * Handles a TAP file data block
                 * @param {Integer} i The index at which the block ID is
                 * @param {Object} blockDetails The details object to fill
                 * @return {Integer} The index at the end of this block
                 */
                tapDataBlock: function (i, blockDetails) {
                    var pilotLength, dataStart = i + 2;

                    blockDetails.blockLength = getWord(i);
                    blockDetails.flag = getByte(i + 2);
                    blockDetails.pause = 1000;

                    if (blockDetails.flag === 0) {
                        pilotLength = machineSettings.headerPilotLength;
                    } else if (blockDetails.flag === 0xff) {
                        pilotLength = machineSettings.dataPilotLength;
                    } else {
                        throw "Invalid TAP flag byte value: " +
                            blockDetails.flag;
                    }

                    addPilotToneToOutput(getSamples(machineSettings.pilotPulse),
                        pilotLength);

                    addAnalogWaveToOutput(
                        getSamples(machineSettings.sync1Pulse),
                        getSamples(machineSettings.sync2Pulse)
                    );

                    addDataBlockToOutput(
                        getSamples(machineSettings.bit0Pulse),
                        getSamples(machineSettings.bit1Pulse),
                        dataStart,
                        blockDetails.blockLength,
                        8
                    );

                    addPauseToOutput(getSamples(machineSettings.bit1Pulse),
                        blockDetails.pause);

                    return dataStart + blockDetails.blockLength;
                }
            };
        }

        /****** End of Functions For Dealing With Generating Output ******/

        /** Convert a TZX File */
        function convertTzx() {
            var i = 0, details, blockDetails, n, handle = new HandlerWrapper();

            details = { version: {}, blocks: [] };

            while (i < getInputLength()) {

                if (i === 0) {
                    i = handle.tzxHeader(details.version);
                } else {
                    machineSettings.clockSpeed=3500000;
                    machineSettings.highAmplitude= 115;
                    blockDetails = {
                        blockType: getByte(i),
                        offset: i
                    };

                    n = "block" + blockDetails.blockType.toString(16);

                    if (!handle.hasOwnProperty(n)) {
                        throw "Block 0x" + blockDetails.blockType.toString(16) +
                            " is not currently implemented - how about " +
                            "going to github " +
                            "(https://github.com/kmp1/tzx.js) and helping out?";
                    }
                    i = handle[n](i, blockDetails);

                    details.blocks.push(blockDetails);
                }

                i += 1;
            }

            handle.finishFile(true);
            return details;
        }

        /** Convert a TAP File */
        function convertTap() {
            var i = 0, blocks = [], blockDetails, handle = new HandlerWrapper();

            while (i < getInputLength()) {
                blockDetails = {
                    blockType: 0x10,
                    offset: i
                };

                i = handle.tapDataBlock(i, blockDetails);

                blocks.push(blockDetails);
            }

            handle.finishFile(false);
            return blocks;
        }

        validateMachineSettings();
        validateOutput();
        input = validateInputAndGetWrapperIfPossible();

        if (isTap) {
            return convertTap();
        }

        return convertTzx();
    }

    return {

        /**
         * Converts a TZX to an audio file and returns some details about
         * what it has read.
         *
         * @param {Object} machineSettings The machine specific settings to use
         * @param {Object} input The input file to read from (this must be an
         * object that provides getLength() and getByte(x) functions or an
         * array.)
         * @param {Object} output The output to write to (this must be a wav.js
         * created wave file or at least something that implements the same
         * interface - it would be fantastic to implement the interface but
         * generate an MP3 forexample).
         * @return {Object} details about the TZX file that was converted
         */
        convertTzxToAudio: function (machineSettings, input, output) {
            return convert(machineSettings, input, output, false);
        },

        /**
         * Converts a TAP to an audio file and returns some details about
         * what it has read.
         *
         * @param {Object} machineSettings The machine specific settings to use
         * @param {Object} input The input file to read from (this must be an
         * object that provides getLength() and getByte(x) functions or an
         * array.)
         * @param {Object} output The output to write to (this must be a wav.js
         * created wave file or at least something that implements the same
         * interface - it would be fantastic to implement the interface but
         * generate an MP3 forexample).
         * @return {Array} A list of block objects for each block that was
         * converted in the TAP file.
         */
        convertTapToAudio: function (machineSettings, input, output) {
            return convert(machineSettings, input, output, true);
        },

        /**
         * This is contains a bunch of pre-canned machine property holders to
         * save client client having to figure out the various values. <br/>
         * <br/>
         * Currently available are:<ul>
         * <li>ZXSpectrum48 </li>
         * <li>ZXSpectrum128 </li>
         * </ul>
         * These are the properties that must be present in this settings bag:
         *  <br/> <ul>
         * <li>highAmplitude </li>
         * <li>clockSpeed </li>
         * <li>pilotPulse </li>
         * <li>sync1Pulse </li>
         * <li>sync2Pulse </li>
         * <li>bit0Pulse </li>
         * <li>bit1Pulse </li>
         * <li>headerPilotLength </li>
         * <li>dataPilotLength </li>
         * <li>is48k </li></ul>
         */
        MachineSettings: {
            ZXSpectrum48: {
                highAmplitude: 115,
                clockSpeed: 3500000,
                pilotPulse: 2168,
                sync1Pulse: 667,
                sync2Pulse: 735,
                bit0Pulse: 855,
                bit1Pulse: 1710,
                headerPilotLength: 8063,
                dataPilotLength: 3223,
                is48k: true
            },
            ZXSpectrum128: {
                highAmplitude: 115,
                clockSpeed: 3500000,
                pilotPulse: 2168,
                sync1Pulse: 667,
                sync2Pulse: 735,
                bit0Pulse: 855,
                bit1Pulse: 1710,
                headerPilotLength: 8063,
                dataPilotLength: 3223,
                is48k: false
            }
            // TODO: Add some more machines here - e.g. SAM, CPC etc
        }
    };
}());

if (typeof exports !== 'undefined') {
    exports.convertTzxToAudio = tzx.convertTzxToAudio;
    exports.convertTapToAudio = tzx.convertTapToAudio;
    exports.MachineSettings = tzx.MachineSettings;
}