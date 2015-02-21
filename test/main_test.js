var tzx = require("../src/tzx.js");
var wav = require("../node_modules/wav.js/src/wav.js");
var fs = require('fs');
var constants = require('constants');


exports.validateSettingsChecks = function (test) {
	var threw = false, output =
		{ getFrequency: function () { return 44100; }, addSample: function () {}, getSampleSize: function() { return 8; } },
		input = {
		getLength: function() { return 10; },
		getByte: function(index) { }
	};

	try {
 		tzx.convertTzxToAudio(null, input, output);
	} catch (e) {
		threw = true;
	}

	test.equal(threw, true, "Passing null argument failed");

	threw = false;
	try {
 		tzx.convertTzxToAudio(undefined, input, output);
	} catch (e) {
		threw = true;
	}

	test.equal(threw, true, "Passing no argument failed");

	threw = false;
	try {
 		tzx.convertTzxToAudio({
 			highAmplitude: 5
 		}, input, output);
	} catch (e) {
		threw = true;
	}

	test.equal(threw, true, "Passing subset argument failed");

	threw = false;
	try {
 		tzx.convertTzxToAudio({
 			highAmplitude: 5,
 			clockSpeed: 3500000
 		}, input, output);
	} catch (e) {
		threw = true;
	}

	test.equal(threw, true, "Passing subset argument failed");

	threw = false;
	try {
 		tzx.convertTzxToAudio({
 			highAmplitude: 5,
 			clockSpeed: 3500000,
 			pilotPulse: 1
 		}, input, output);
	} catch (e) {
		threw = true;
	}

	test.equal(threw, true, "Passing subset argument failed");

	threw = false;
	try {
 		tzx.convertTzxToAudio({
 			highAmplitude: 5,
 			clockSpeed: 3500000,
 			pilotPulse: 1,
 			sync1Pulse: 12
 		}, input, output);
	} catch (e) {
		threw = true;
	}

	test.equal(threw, true, "Passing subset argument failed");

	threw = false;
	try {
 		tzx.convertTzxToAudio({
 			highAmplitude: 5,
 			clockSpeed: 3500000,
 			pilotPulse: 1,
 			sync1Pulse: 12,
 			sync2Pulse: 7
 		}, input, output);
	} catch (e) {
		threw = true;
	}

	test.equal(threw, true, "Passing subset argument failed");

	threw = false;
	try {
 		tzx.convertTzxToAudio({
 			highAmplitude: 5,
 			clockSpeed: 3500000,
 			pilotPulse: 1,
 			sync1Pulse: 12,
 			sync2Pulse: 7,
 			bit0Pulse: 1
 		}, input, output);
	} catch (e) {
		threw = true;
	}

	test.equal(threw, true, "Passing subset argument failed");

	threw = false;
	try {
 		tzx.convertTzxToAudio({
 			highAmplitude: 5,
 			clockSpeed: 3500000,
 			pilotPulse: 1,
 			sync1Pulse: 12,
 			sync2Pulse: 7,
 			bit0Pulse: 1,
 			bit1Pulse: 3
 		}, input, output);
	} catch (e) {
		threw = true;
	}

	test.equal(threw, true, "Passing subset argument failed");

	threw = false;
	try {
 		tzx.convertTzxToAudio({
 			highAmplitude: 5,
 			clockSpeed: 3500000,
 			pilotPulse: 1,
 			sync1Pulse: 12,
 			sync2Pulse: 7,
 			bit0Pulse: 1,
 			bit1Pulse: 3,
 			headerPilotLength: 10
 		}, input, output);
	} catch (e) {
		threw = true;
	}

	test.equal(threw, true, "Passing subset argument failed");

	threw = false;
	try {
 		tzx.convertTzxToAudio({
 			highAmplitude: 5,
 			clockSpeed: 3500000,
 			pilotPulse: 1,
 			sync1Pulse: 12,
 			sync2Pulse: 7,
 			bit0Pulse: 1,
 			bit1Pulse: 3,
 			headerPilotLength: 10,
 			dataPilotLength: 5
 		}, input, output);
	} catch (e) {
		threw = true;
	}

	test.equal(threw, true, "Passing subset argument failed");
    test.done();
};

exports.validateOutputChecks = function (test) {
	var threw = false, settings = tzx.MachineSettings.ZXSpectrum48, input = {
		getLength: function() { return 10; },
		getByte: function(index) { }
	};

	try {
 		tzx.convertTzxToAudio(settings, input, null);
	} catch (e) {
		threw = true;
	}

	test.equal(threw, true, "Passing null argument failed");

	threw = false;
	try {
 		tzx.convertTzxToAudio(settings, input);
	} catch (e) {
		threw = true;
	}

	test.equal(threw, true, "Passing no argument failed");

	threw = false;
	try {
 		tzx.convertTzxToAudio(settings, input, {});
	} catch (e) {
		threw = true;
	}

	test.equal(threw, true, "Passing empty failed");

	threw = false;
	try {
 		tzx.convertTzxToAudio(settings, input, { getFrequency: 100 });
	} catch (e) {
		threw = true;
	}

	test.equal(threw, true, "Passing property failed");

	threw = false;
	try {
 		tzx.convertTapToAudio(settings, input, { getFrequency: function () { return 100; } });
	} catch (e) {
		threw = true;
	}

	test.equal(threw, true, "Missing function failed");

	threw = false;
	try {
 		tzx.convertTzxToAudio(settings, input, { getFrequency: function () { return 100; }, addSample: 100 });
	} catch (e) {
		threw = true;
	}

	test.equal(threw, true, "Passing function and property failed");

	threw = false;
	try {
 		tzx.convertTzxToAudio(settings, input, { getFrequency: function () { return 100; }, addSample: function () {} });
	} catch (e) {
		threw = true;
	}

	test.equal(threw, true, "Missing getSampleSize function");

	threw = false;
	try {
 		tzx.convertTzxToAudio(settings, input, { getFrequency: function () { return 100; }, addSample: function () {}, getSampleSize: 8 });
	} catch (e) {
		threw = true;
	}

	test.equal(threw, true, "Passing function and property failed");

    test.done();
};

exports.validateInputChecks = function (test) {
	var threw = false, output =
		{ getFrequency: function () { return 44100; }, addSample: function () {}, getSampleSize: function() { return 8; } },
		settings = tzx.MachineSettings.ZXSpectrum48;

	try {
 		tzx.convertTzxToAudio(settings, null, output);
	} catch (e) {
		threw = true;
	}

	test.equal(threw, true, "Passing null argument failed");

	threw = false;
	try {
 		tzx.convertTzxToAudio(settings, undefined, output);
	} catch (e) {
		threw = true;
	}

	test.equal(threw, true, "Passing no argument failed");

	threw = false;
	try {
 		tzx.convertTzxToAudio(settings, {}, output);
	} catch (e) {
		threw = true;
	}

	test.equal(threw, true, "Passing empty failed");

	threw = false;
	try {
 		tzx.convertTzxToAudio(settings, { getLength: 100 }, output);
	} catch (e) {
		threw = true;
	}

	test.equal(threw, true, "Passing property failed");

	threw = false;
	try {
 		tzx.convertTzxToAudio(settings, { getLength: function () { return 100; } }, output);
	} catch (e) {
		threw = true;
	}

	test.equal(threw, true, "Missing function failed");

	threw = false;
	try {
 		tzx.convertTzxToAudio(settings, { getLength: function () { return 100; }, getByte: 100 }, output);
	} catch (e) {
		threw = true;
	}

	test.equal(threw, true, "Passing function and property failed");

    test.done();
};

function compareByteArrays(array1, array2) {
	if (array2.length != array1.length) {
		return false;
	}

	for (var i = 0; i < array1.length; i += 1) {
		if (array1[i] !== array2[i]) {
			return false;
		}
	}

	return true;
}

function createInputObject(input) {

	var tzxFile = fs.readFileSync(input);

	return {
		getLength: function() { return tzxFile.length; },
		getByte: function(index) {
			return tzxFile[index];
		}
	};
}

exports.testTzxWithOnlyBlock10Data = function(test) {

	var wave = wav.create(1, 44100, wav.SampleSize.EIGHT);

	var details = tzx.convertTzxToAudio(tzx.MachineSettings.ZXSpectrum48,
		createInputObject("test/input/simple.tzx"), wave);

	var rawWaveData = wave.toByteArray();

	var expectedOutput = fs.readFileSync("test/expected_output/simple_tzx.wav");

	var theyMatch = compareByteArrays(expectedOutput, rawWaveData);

    test.equal(theyMatch, true, "The simple TZX with block 10 data test fails as the output does not match our expectations");

    test.done();
};

exports.testBasicTap = function(test) {

	var wave = wav.create(1, 44100, wav.SampleSize.EIGHT);

	var details = tzx.convertTapToAudio(tzx.MachineSettings.ZXSpectrum48,
		createInputObject("test/input/simple.tap"), wave);

	var rawWaveData = wave.toByteArray();

	var expectedOutput = fs.readFileSync("test/expected_output/simple_tap.wav");

	var theyMatch = compareByteArrays(expectedOutput, rawWaveData);

    test.equal(theyMatch, true, "The simple TAP test fails as the output does not match our expectations");

    test.done();
};

exports.testTzxWithFastDataBlock = function(test) {

	var wave = wav.create(1, 44100, wav.SampleSize.EIGHT);

	var details = tzx.convertTzxToAudio(tzx.MachineSettings.ZXSpectrum48,
		createInputObject("test/input/fast_index.tzx"), wave);

	var rawWaveData = wave.toByteArray();

	var expectedOutput = fs.readFileSync("test/expected_output/fast_index_tzx.wav");

	var theyMatch = compareByteArrays(expectedOutput, rawWaveData);

    test.equal(theyMatch, true, "The TZX with fast data test fails as the output does not match our expectations");

    test.done();
};

