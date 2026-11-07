"""Generate ONLY the replaceable synthetic mother line, not recorded dubbing.

Optional authoring command (not needed to play):
  python3 scripts/generate-audio.py --tool-path /workspace/.audio-tools

Uses eSpeak NG's Brazilian Portuguese formant voice +f3 through its C API.
Install espeakng-loader==0.2.4 into a user-owned directory for this tool.
The engine/library/data are NOT copied into the game or required at runtime.
"""
from pathlib import Path
import argparse
import array
import ctypes
import hashlib
import json
import math
import sys
import wave

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--tool-path', type=Path)
args = parser.parse_args()
if args.tool_path:
    sys.path.insert(0, str(args.tool_path.resolve()))
import espeakng_loader

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'public/audio/mother-provisional.wav'
TEXT = 'Ei, vem tomar café pra não se atrasar!'
lib = espeakng_loader.load_library()
if lib is None:
    raise RuntimeError('eSpeak NG library unavailable; use an existing human WAV instead.')
lib.espeak_Initialize.argtypes = [ctypes.c_int, ctypes.c_int, ctypes.c_char_p, ctypes.c_int]
lib.espeak_Initialize.restype = ctypes.c_int
sample_rate = lib.espeak_Initialize(2, 0, str(Path(espeakng_loader.get_data_path()).parent).encode(), 0)
if sample_rate <= 0:
    raise RuntimeError('eSpeak NG could not initialize its local voice data.')
samples = array.array('h')
callback_type = ctypes.CFUNCTYPE(ctypes.c_int, ctypes.POINTER(ctypes.c_short), ctypes.c_int, ctypes.c_void_p)

@callback_type
def capture(data, count, _events):
    if data and count:
        samples.extend(data[:count])
    return 0

lib.espeak_SetSynthCallback.argtypes = [callback_type]
lib.espeak_SetSynthCallback(capture)
lib.espeak_SetVoiceByName.argtypes = [ctypes.c_char_p]
if lib.espeak_SetVoiceByName(b'pt-br+f3') != 0:
    raise RuntimeError('The local pt-br+f3 voice is missing.')
lib.espeak_SetParameter(1, 155, 0)  # words/minute
lib.espeak_SetParameter(2, 90, 0)   # amplitude
lib.espeak_SetParameter(3, 58, 0)   # formant pitch
lib.espeak_SetParameter(4, 38, 0)   # intonation range
lib.espeak_Synth.argtypes = [ctypes.c_char_p, ctypes.c_size_t, ctypes.c_uint, ctypes.c_int,
                             ctypes.c_uint, ctypes.c_uint, ctypes.c_void_p, ctypes.c_void_p]
encoded = TEXT.encode('utf-8') + b'\0'
if lib.espeak_Synth(encoded, len(encoded), 0, 1, 0, 1 | 0x1000, None, None) != 0:
    raise RuntimeError('Synthesis failed.')
lib.espeak_Synchronize()
lib.espeak_Terminate()
if not samples or max(abs(value) for value in samples) < 100:
    raise RuntimeError('Refusing to export empty/inaudible placeholder speech.')
# Keep the full pronunciation and a short natural tail. No borrowed recording,
# voice-cloning model, or compressed sample pack is involved in this output.
peak = max(abs(value) for value in samples)
gain = min(1.15, 24000 / peak)
samples = array.array('h', (round(value * gain) for value in samples))
if sys.byteorder != 'little':
    samples.byteswap()
DEST.parent.mkdir(parents=True, exist_ok=True)
with wave.open(str(DEST), 'wb') as output:
    output.setnchannels(1)
    output.setsampwidth(2)
    output.setframerate(sample_rate)
    output.writeframes(samples.tobytes())
manifest = {
    'file': DEST.name, 'text': TEXT, 'speaker': 'MÃE', 'language': 'pt-BR',
    'provisional': True, 'kind': 'synthetic-formant-placeholder',
    'description': 'Voz sintética provisória. Substituir por gravação humana feminina adulta natural.',
    'tool': 'eSpeak NG via espeakng-loader 0.2.4; pt-br+f3',
    'engineLicense': 'GPL-3.0-or-later; authoring tool only, not distributed with this game',
    'source': 'https://github.com/espeak-ng/espeak-ng',
    'loaderSource': 'https://github.com/thewh1teagle/espeakng-loader',
    'sampleRate': sample_rate, 'channels': 1, 'bitsPerSample': 16,
    'durationSeconds': round(len(samples) / sample_rate, 4),
    'sha256': hashlib.sha256(DEST.read_bytes()).hexdigest(),
    'bytes': DEST.stat().st_size,
    'peakDbFS': round(20 * math.log10(max(abs(x) for x in samples) / 32768), 2),
}
engine_data = Path(espeakng_loader.get_data_path())
manifest['authoringData'] = [
    {'path': name, 'sha256': hashlib.sha256((engine_data / name).read_bytes()).hexdigest()}
    for name in ['lang/roa/pt-BR', 'voices/!v/f3', 'phontab', 'phondata', 'phonindex', 'pt_dict']
]
(DEST.parent / 'voice-info.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({key: manifest[key] for key in ['file', 'provisional', 'durationSeconds', 'bytes', 'sha256']}, ensure_ascii=False))
