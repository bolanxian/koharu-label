/**
 * For NEUTRINOTyouseiSienTool v1.8.0.3  
 * <https://github.com/sigprogramming/tyouseisientool/releases/tag/v1.8.0.3>
 */
import { Zip, ZipPassThrough, strToU8 } from 'fflate'
import type SvpFile from './svp-file'
import type { TypedArray } from './ndarray'
import { fillF0 } from './utils'
const { floor } = Math

export const createScoreXML = (svp: SvpFile) => {
  const ratio = 705600000 / 480
  let notes = ''
  for (const note of svp.notes) {
    const { lyrics, pitch } = note
    const position = floor(note.onset / ratio)
    const duration = floor((note.onset + note.duration) / ratio) - position
    notes += `
    <Note position="${position}" duration="${duration}" note-number="${pitch}" lyric="${lyrics}" breath="false">
      <PhonemeTimings />
    </Note>`
  }
  return `\
<?xml version="1.0" encoding="utf-8"?>
<Score resolution="480">
  <Tempos>
    <Tempo position="0" tempo="${svp.bpm}" />
  </Tempos>
  <TimeSignatures>
    <TimeSignature position="0" beats="4" beat-type="4" />
  </TimeSignatures>
  <KeySignatures>
    <KeySignature position="0" key="0" />
  </KeySignatures>
  <Notes>${notes}
  </Notes>
</Score>`
}

export const createNtpj = () => {
  return `\
<?xml version="1.0" encoding="utf-8"?>
<Project>
  <GeneratorVersion>1.0.0</GeneratorVersion>
  <NeutrinoParameters>
    <StyleShift>0</StyleShift>
    <ModelDir>${''}</ModelDir>
  </NeutrinoParameters>
  <WorldParameters>
    <PitchShift>1</PitchShift>
    <FormantShift>1</FormantShift>
    <SmoothPitch>0</SmoothPitch>
    <SmoothFormant>0</SmoothFormant>
    <EnhanceBreathiness>0</EnhanceBreathiness>
  </WorldParameters>
  <EditFilePaths>
    <FilePath id="score">edit\\score.xml</FilePath>
    <FilePath id="pitch">edit\\pitch.bin</FilePath>
    <FilePath id="dynamics">edit\\dynamics.bin</FilePath>
  </EditFilePaths>
  <RenderInfoPath>render\\render_info.xml</RenderInfoPath>
</Project>`
}

export const createNtpjZip = (name: string, svp: SvpFile, f0: TypedArray<'float64'>) => new Promise<Uint8Array[]>((ok, reject) => {
  const parts: Uint8Array[] = []
  const zip = new Zip((error, data, final) => {
    if (error != null) { reject(error); return }
    parts.push(data)
    if (final) { ok(parts) }
  })
  const ntpl = new ZipPassThrough(`${name}/${name}.ntpj`)
  zip.add(ntpl)
  const score = new ZipPassThrough(`${name}/edit/score.xml`)
  zip.add(score)
  const pitch = new ZipPassThrough(`${name}/edit/pitch.bin`)
  zip.add(pitch)
  zip.end()

  ntpl.push(strToU8(createNtpj()), true)
  score.push(strToU8(createScoreXML(svp)), true)
  for (const { buffer, byteOffset, byteLength } of fillF0(f0, f0.byteLength)) {
    pitch.push(new Uint8Array(buffer, byteOffset, byteLength))
  }
  pitch.push(new Uint8Array(0), true)
})
