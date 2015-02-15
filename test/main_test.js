var tzx_js = require("../src/tzx.js");
var wav_js = require("../node_modules/wav.js/src/wav.js");
var fs = require('fs');
var constants = require('constants');

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

exports.testTzxWithOnlyBlock10Data = function(test) {

	var tzxFile = fs.readFileSync("test/input/simple.tzx");

	var wave = wav_js.create(1, 44100, wav_js.BitSize.EIGHT);

	var details = tzx_js.convertTzxToAudio(tzx_js.MachineSettings.ZXSpectrum48, {
		getLength: function() { return tzxFile.length; },
		getByte: function(index) {
			return tzxFile[index];
		}
	}, wave);

	var rawWaveData = wave.toByteArray();

	var expectedOutput = fs.readFileSync("test/expected_output/simple_tzx.wav");

	var theyMatch = compareByteArrays(expectedOutput, rawWaveData);

    test.equal(theyMatch, true, "The simple TZX with block 10 data test fails as the output does not match our expectations");

    test.done();
};

exports.testBasicTap = function(test) {
	var tapFile = fs.readFileSync("test/input/simple.tap");

	var wave = wav_js.create(1, 44100, wav_js.BitSize.EIGHT);

	var details = tzx_js.convertTapToAudio(tzx_js.MachineSettings.ZXSpectrum48,
		tapFile, wave);

	var rawWaveData = wave.toByteArray();

	var expectedOutput = fs.readFileSync("test/expected_output/simple_tap.wav");

	var theyMatch = compareByteArrays(expectedOutput, rawWaveData);

    test.equal(theyMatch, true, "The simple TAP test fails as the output does not match our expectations");

    test.done();
};

exports.testTzxWithFastDataBlock = function(test) {

	var tzxFile = fs.readFileSync("test/input/fast_index.tzx");

	var wave = wav_js.create(1, 44100, wav_js.BitSize.EIGHT);

	var details = tzx_js.convertTzxToAudio(tzx_js.MachineSettings.ZXSpectrum48,
		tzxFile, wave);

	var rawWaveData = wave.toByteArray();

	var expectedOutput = fs.readFileSync("test/expected_output/fast_index_tzx.wav");

	var theyMatch = compareByteArrays(expectedOutput, rawWaveData);

    test.equal(theyMatch, true, "The TZX with fast data test fails as the output does not match our expectations");

    test.done();
};

exports.testTzxWithStopTapeBlock = function(test) {

	var tzxFile = fs.readFileSync("test/input/stop_tape.tzx");

	var wave = wav_js.create(1, 44100, wav_js.BitSize.EIGHT);

	var details = tzx_js.convertTzxToAudio(tzx_js.MachineSettings.ZXSpectrum48,
		tzxFile, wave);

	var rawWaveData = wave.toByteArray();

	var expectedOutput = fs.readFileSync("test/expected_output/stop_tape_tzx.wav");

	var theyMatch = compareByteArrays(expectedOutput, rawWaveData);

    test.equal(theyMatch, true, "The TZX with fast data test fails as the output does not match our expectations");

    test.done();
};

exports.testTzxWithPureDataBlock = function(test) {

	var tzxFile = fs.readFileSync("test/input/pure_data.tzx");

	var wave = wav_js.create(1, 44100, wav_js.BitSize.EIGHT);

	var details = tzx_js.convertTzxToAudio(tzx_js.MachineSettings.ZXSpectrum48,
		tzxFile, wave);

	var rawWaveData = wave.toByteArray();

	var expectedOutput = fs.readFileSync("test/expected_output/pure_data_tzx.wav");

	var theyMatch = compareByteArrays(expectedOutput, rawWaveData);

    test.equal(theyMatch, true, "The TZX with fast data test fails as the output does not match our expectations");

    test.done();
};
