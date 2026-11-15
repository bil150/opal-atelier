/**
 * Reads ONE tube from the text lines of a zone of a manufacturer's chart (extracted from a PDF):
 * name, Colour Index pigment code(s), ASTM lightfastness and opacity.
 * Nothing is guessed: what isn't recognised stays empty. Understands English and French labels.
 */
import { Opacity, TUBE_LIMITS, toLightfastness, toOpacity, type Lightfastness } from './tube'

export interface TubeText {
  readonly name: string
  readonly pigment: string
  readonly lightfastness: Lightfastness | null
  readonly opacity: Opacity | null
}

/** Colour Index: P + family (B blue, Br brown, Bk black, G green, O orange, R red, V violet, W white, Y yellow, M metal) + number. */
const PIGMENT = /\bP(Br|Bk|B|G|O|R|V|W|Y|M)\s?-?\s?(\d{1,3}(?::\d)?)(?!\d)/gi

/** "ASTM I", "LF: II", "Lightfastness III", "Solidité à la lumière 2"… */
const LIGHT =
  /(?:ASTM|\bLF\b|L\.F\.|light\s*-?\s*fast\w*|solidit[ée]\w*(?:\s+à\s+la\s+lumi[èe]re)?|durabilit[ée]\w*)\W{0,15}?(III|II|I|3|2|1)(?![A-Za-z0-9])/gi

/**
 * "Opacity: ST", "Opacité : SO". The label ends with a lookahead rather than \b:
 * in JavaScript \b does not see "é" as a letter, so "Opacité" never matched in the original code.
 */
const LABELLED_OPACITY = /\b(?:transparen(?:cy|ce)|opacit(?:y|é))(?![\p{L}\p{N}])\W{0,6}(ST|SO|T|O)\b/giu
const OPACITY_WORDS =
  /\b(?:semi[\s-]?opa(?:que|co)|semi[\s-]?transparent[es]?|semi[\s-]?transluc\w*|translucide?s?|translucent|opaque[s]?|opaco|transparent[es]?|transparente?s?)\b/gi
const OTHER_LABELS =
  /\b(?:ASTM|lightfast\w*|pigments?|opacit(?:y|é)|transparen(?:cy|ce)|solidit[ée]\w*|durabilit[ée]\w*)(?![\p{L}\p{N}])\s*:?/giu

const MAX_PIGMENT_CODES = 3

function normalisePigment(family: string, number: string): string {
  const f = family.toLowerCase()
  return `P${f === 'br' ? 'Br' : f === 'bk' ? 'Bk' : f.toUpperCase()}${number}`
}

function readOpacity(text: string): Opacity | null {
  const lower = text.toLowerCase()
  if (/semi[\s-]?opa(?:que|co)/.test(lower)) return Opacity.SemiOpaque
  if (/semi[\s-]?transparent|semi[\s-]?transluc|translucide?|translucent/.test(lower))
    return Opacity.SemiTransparent
  if (/\bopaque|\bopaco/.test(lower)) return Opacity.Opaque
  if (/\btransparent/.test(lower)) return Opacity.Transparent
  // An abbreviation only counts after a label…
  const labelled = new RegExp(LABELLED_OPACITY.source, LABELLED_OPACITY.flags).exec(text)
  if (labelled) return toOpacity(labelled[1])
  // …or as an isolated upper-case "ST" / "SO".
  if (/(^|[^A-Za-z])ST([^A-Za-z]|$)/.test(text)) return Opacity.SemiTransparent
  if (/(^|[^A-Za-z])SO([^A-Za-z]|$)/.test(text)) return Opacity.SemiOpaque
  return null
}

/** `lines`: the zone's text lines, top to bottom. */
export function readTubeText(lines: readonly string[]): TubeText {
  const clean = lines.map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean)
  const all = clean.join(' \n ')

  const codes: string[] = []
  for (const match of all.matchAll(PIGMENT)) {
    const [, family = '', number = ''] = match
    const code = normalisePigment(family, number.replace(/\s/g, ''))
    if (!codes.includes(code)) codes.push(code)
  }
  const pigment = codes.slice(0, MAX_PIGMENT_CODES).join('/').slice(0, TUBE_LIMITS.pigment)

  const light = new RegExp(LIGHT.source, LIGHT.flags).exec(all)
  const lightfastness = toLightfastness(light?.[1])

  // Name: the first line that still has letters once the recognised information is removed.
  let name = ''
  for (const line of clean) {
    const rest = line
      .replace(PIGMENT, ' ')
      .replace(LIGHT, ' ')
      .replace(LABELLED_OPACITY, ' ')
      .replace(OPACITY_WORDS, ' ')
      .replace(OTHER_LABELS, ' ')
      .replace(/^\s*(?:nom|name|couleur|colou?r)\s*:\s*/i, '')
      .replace(/[|•·()[\]{}]/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/^[\s\-–—:;,./]+|[\s\-–—:;,./]+$/g, '')
    if (/[A-Za-zÀ-ÿ]{3,}/.test(rest)) {
      name = rest.slice(0, TUBE_LIMITS.name)
      break
    }
  }

  return { name, pigment, lightfastness, opacity: readOpacity(all) }
}
