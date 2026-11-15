/**
 * Studio glossary: 137 terms in 7 themes, short definitions written for this app.
 * Content licensed CC BY-NC-SA 4.0 (see LICENSE-CONTENT).
 */
import { Locale } from '@renderer/i18n/locale'
import { ToolPath } from '@renderer/routes'
import { GlossaryTheme } from './glossary-theme'

export interface GlossaryText {
  readonly term: string
  readonly definition: string
}

export interface GlossaryEntry {
  /** Stable id, used in links (/glossary/glaze); never translated. */
  readonly id: string
  readonly theme: GlossaryTheme
  /** Section of the app that illustrates the term. */
  readonly tool: ToolPath | null
  /**
   * False for terms that are also everyday words ("tone", "study", "format"…):
   * linking every occurrence in other definitions would mislead.
   */
  readonly crossReferenced: boolean
  readonly text: Readonly<Record<Locale, GlossaryText>>
}

interface EntryOptions {
  readonly tool?: ToolPath
  readonly everydayWord?: true
}

function entry(
  theme: GlossaryTheme,
  id: string,
  [frTerm, frDefinition]: readonly [string, string],
  [enTerm, enDefinition]: readonly [string, string],
  options: EntryOptions = {},
): GlossaryEntry {
  return {
    id,
    theme,
    tool: options.tool ?? null,
    crossReferenced: !options.everydayWord,
    text: {
      [Locale.French]: { term: frTerm, definition: frDefinition },
      [Locale.English]: { term: enTerm, definition: enDefinition },
    },
  }
}

const C = GlossaryTheme.Colour
const T = GlossaryTheme.Techniques
const M = GlossaryTheme.Materials
const S = GlossaryTheme.SupportsAndTools
const D = GlossaryTheme.Drawing
const K = GlossaryTheme.Composition
const G = GlossaryTheme.SubjectsAndGenres
const everyday = { everydayWord: true } as const

export const GLOSSARY: readonly GlossaryEntry[] = [
  // Colour
  entry(
    C,
    'hue',
    ['Teinte', 'La couleur elle-même (rouge, bleu…), sa place sur le cercle chromatique.'],
    ['Hue', 'The colour itself (red, blue…), its place on the colour wheel.'],
    { tool: ToolPath.ColorWheel },
  ),
  entry(
    C,
    'value',
    ['Valeur', 'Le degré de clarté d’une couleur, du clair au foncé.'],
    ['Value', 'How light or dark a colour is.'],
    { tool: ToolPath.ImageStudyValues },
  ),
  entry(
    C,
    'saturation',
    ['Saturation', 'La vivacité d’une couleur, du pur au terne. On dit aussi intensité ou chroma.'],
    ['Saturation', 'How vivid a colour is, from pure to dull. Also called intensity or chroma.'],
    { tool: ToolPath.ColorTheory },
  ),
  entry(
    C,
    'tone',
    ['Ton', 'Une couleur avec sa valeur et sa saturation précises : tons chauds, tons rompus…'],
    ['Tone', 'A colour with a precise value and saturation: warm tones, broken tones…'],
    everyday,
  ),
  entry(
    C,
    'nuance',
    ['Nuance', 'Une légère variation d’une couleur.'],
    ['Nuance', 'A slight variation of a colour.'],
    everyday,
  ),
  entry(
    C,
    'primary-colours',
    ['Primaires', 'En peinture, le jaune, le rouge et le bleu : aucun mélange ne permet de les obtenir.'],
    ['Primary colours', 'In paint, yellow, red and blue: no mix can produce them.'],
    { tool: ToolPath.ColorTheory },
  ),
  entry(
    C,
    'secondary-colours',
    ['Secondaires', 'Le mélange de deux primaires : orange, violet, vert.'],
    ['Secondary colours', 'A mix of two primaries: orange, violet, green.'],
    { tool: ToolPath.ColorTheory },
  ),
  entry(
    C,
    'tertiary-colours',
    ['Tertiaires', 'Une primaire mélangée à la secondaire voisine : jaune orangé, bleu violet…'],
    ['Tertiary colours', 'A primary mixed with the neighbouring secondary: yellow-orange, blue-violet…'],
    { tool: ToolPath.ColorTheory },
  ),
  entry(
    C,
    'complementary-colours',
    [
      'Complémentaires',
      'Deux couleurs opposées sur le cercle : côte à côte elles s’exaltent, mélangées elles se neutralisent.',
    ],
    [
      'Complementary colours',
      'Two colours opposite each other on the wheel: side by side they intensify each other, mixed they cancel out.',
    ],
    { tool: ToolPath.ColorTheory },
  ),
  entry(
    C,
    'near-complementary',
    ['Fausse complémentaire', 'Une voisine de la complémentaire : le contraste reste fort, en plus nuancé.'],
    ['Near-complementary', 'A neighbour of the complementary: the contrast stays strong, but subtler.'],
    { tool: ToolPath.ColorTheory },
  ),
  entry(
    C,
    'analogous-colours',
    ['Couleurs analogues', 'Des couleurs voisines sur le cercle ; elles s’accordent sans heurt.'],
    ['Analogous colours', 'Neighbouring colours on the wheel; they go together smoothly.'],
    { tool: ToolPath.ColorWheel },
  ),
  entry(
    C,
    'warm-colours',
    ['Couleurs chaudes', 'Les couleurs qui tirent vers l’orange ; elles semblent avancer.'],
    ['Warm colours', 'Colours leaning towards orange; they seem to come forward.'],
    { tool: ToolPath.ColorTemperature },
  ),
  entry(
    C,
    'cool-colours',
    ['Couleurs froides', 'Les couleurs qui tirent vers le bleu ; elles semblent reculer.'],
    ['Cool colours', 'Colours leaning towards blue; they seem to recede.'],
    { tool: ToolPath.ColorTemperature },
  ),
  entry(
    C,
    'broken-colour',
    ['Ton rompu', 'Une couleur ternie par un peu de sa complémentaire.'],
    ['Broken colour', 'A colour dulled with a little of its complementary.'],
    { tool: ToolPath.ColorTemperature },
  ),
  entry(
    C,
    'neutral',
    ['Neutre', 'Une couleur presque sans teinte : gris, brun gris.'],
    ['Neutral', 'A colour with almost no hue: grey, greyish brown.'],
  ),
  entry(
    C,
    'chromatic-black',
    ['Noir chromatique', 'Un noir obtenu en mélangeant des couleurs, plus vivant que le noir du tube.'],
    ['Chromatic black', 'A black mixed from colours, livelier than black straight from the tube.'],
  ),
  entry(
    C,
    'camaieu',
    ['Camaïeu', 'Une œuvre en plusieurs valeurs d’une seule teinte.'],
    ['Camaïeu', 'A work in several values of a single hue.'],
  ),
  entry(
    C,
    'grisaille',
    ['Grisaille', 'Une peinture en gris seulement, souvent première étape d’un tableau.'],
    ['Grisaille', 'A painting in greys only, often the first stage of a picture.'],
  ),
  entry(
    C,
    'monochrome',
    ['Monochrome', 'Une œuvre d’une seule couleur.'],
    ['Monochrome', 'A work in a single colour.'],
  ),
  entry(
    C,
    'harmony',
    ['Harmonie', 'Un accord de couleurs qui vont bien ensemble.'],
    ['Harmony', 'A combination of colours that go well together.'],
    { tool: ToolPath.ColorWheel },
  ),
  entry(
    C,
    'colour-scheme',
    ['Gamme', 'L’ensemble des couleurs utilisées dans une œuvre.'],
    ['Colour scheme', 'All the colours used in a work.'],
  ),
  entry(
    C,
    'palette',
    ['Palette', 'La plaque où l’on mélange, et aussi le choix des couleurs d’un peintre.'],
    ['Palette', 'The board you mix on, and also a painter’s choice of colours.'],
  ),
  entry(
    C,
    'limited-palette',
    ['Palette limitée', 'Très peu de tubes ; toutes les autres teintes viennent du mélange.'],
    ['Limited palette', 'Very few tubes; every other hue comes from mixing.'],
    { tool: ToolPath.ColorPalette },
  ),
  entry(
    C,
    'additive-mixing',
    [
      'Synthèse additive',
      'Le mélange de lumières (rouge, vert, bleu) : les trois ensemble donnent du blanc.',
    ],
    ['Additive mixing', 'Mixing lights (red, green, blue): all three together make white.'],
    { tool: ToolPath.ColorWheel },
  ),
  entry(
    C,
    'subtractive-mixing',
    ['Synthèse soustractive', 'Le mélange de matières (pigments) : plus on mélange, plus c’est sombre.'],
    ['Subtractive mixing', 'Mixing materials (pigments): the more you mix, the darker it gets.'],
    { tool: ToolPath.ColorWheel },
  ),
  entry(
    C,
    'simultaneous-contrast',
    ['Contraste simultané', 'Une couleur paraît changée par celle qui l’entoure.'],
    ['Simultaneous contrast', 'A colour looks different depending on the colour around it.'],
    { tool: ToolPath.ColorTheory },
  ),
  entry(
    C,
    'gamut-mask',
    ['Masque de gamme', 'Une forme tracée sur le cercle chromatique pour limiter ses couleurs.'],
    ['Gamut mask', 'A shape drawn on the colour wheel to limit your colours.'],
    { tool: ToolPath.ColorPalette },
  ),
  entry(
    C,
    'pigment',
    ['Pigment', 'La poudre colorée qui donne sa couleur à la peinture.'],
    ['Pigment', 'The coloured powder that gives paint its colour.'],
  ),
  entry(
    C,
    'binder',
    ['Liant', 'Ce qui fixe le pigment : huile, résine acrylique, gomme arabique.'],
    ['Binder', 'What holds the pigment together: oil, acrylic resin, gum arabic.'],
  ),
  entry(
    C,
    'hiding-power',
    ['Pouvoir couvrant', 'La capacité d’une peinture à masquer ce qui est dessous.'],
    ['Hiding power', 'A paint’s ability to cover what lies beneath.'],
  ),
  entry(
    C,
    'tinting-strength',
    ['Pouvoir colorant', 'La force d’une couleur dans un mélange.'],
    ['Tinting strength', 'How strong a colour is in a mix.'],
  ),
  entry(
    C,
    'transparent',
    ['Transparent', 'Se dit d’une peinture qui laisse voir le dessous.'],
    ['Transparent', 'Said of a paint that lets the layer beneath show through.'],
  ),
  entry(
    C,
    'opaque',
    ['Opaque', 'Se dit d’une peinture qui cache le dessous.'],
    ['Opaque', 'Said of a paint that hides the layer beneath.'],
  ),
  entry(
    C,
    'permanence',
    ['Permanence', 'La résistance d’une couleur à la lumière et au temps.'],
    ['Permanence', 'How well a colour withstands light and time.'],
  ),

  // Methods and techniques
  entry(
    T,
    'alla-prima',
    ['Alla prima', 'Peindre en une seule séance, frais dans frais. On dit aussi « au premier jet ».'],
    ['Alla prima', 'Painting in a single session, wet into wet, without letting layers dry.'],
  ),
  entry(
    T,
    'wet-into-wet',
    ['Frais dans frais', 'Poser une couleur sur une autre encore humide.'],
    ['Wet into wet', 'Laying a colour over another that is still wet.'],
  ),
  entry(
    T,
    'glaze',
    ['Glacis', 'Une couche fine et transparente qui teinte ce qui est dessous.'],
    ['Glaze', 'A thin, transparent layer that tints what lies beneath.'],
  ),
  entry(
    T,
    'impasto',
    ['Empâtement', 'Une matière épaisse qui garde la trace du pinceau ou du couteau.'],
    ['Impasto', 'Thick paint that keeps the marks of the brush or knife.'],
  ),
  entry(
    T,
    'scumble',
    ['Frottis', 'Une couche mince, frottée, qui laisse voir le dessous.'],
    ['Scumble', 'A thin, rubbed-on layer that lets the layer beneath show through.'],
  ),
  entry(
    T,
    'thinned-paint',
    ['Jus', 'Une peinture très diluée, pour les premières couches.'],
    ['Thinned paint', 'Very diluted paint, for the first layers.'],
  ),
  entry(
    T,
    'wash',
    ['Lavis', 'De l’encre ou de la couleur très diluée à l’eau, posée en aplats transparents.'],
    ['Wash', 'Ink or colour heavily diluted with water, laid in transparent flat areas.'],
  ),
  entry(
    T,
    'flat-area',
    ['Aplat', 'Une surface de couleur uniforme, sans modelé.'],
    ['Flat area', 'An area of even colour, without modelling.'],
  ),
  entry(
    T,
    'gradation',
    ['Dégradé', 'Un passage progressif d’une couleur ou d’une valeur à une autre.'],
    ['Gradation', 'A gradual shift from one colour or value to another.'],
  ),
  entry(
    T,
    'blending',
    ['Fondu', 'Un passage doux entre deux zones, sans limite nette.'],
    ['Blending', 'A soft transition between two areas, without a sharp edge.'],
  ),
  entry(
    T,
    'modelling',
    ['Modelé', 'Le rendu du volume par les ombres et les lumières.'],
    ['Modelling', 'Rendering volume through shadows and lights.'],
  ),
  entry(
    T,
    'chiaroscuro',
    ['Clair-obscur', 'Un fort contraste de lumière et d’ombre qui sculpte les formes.'],
    ['Chiaroscuro', 'A strong contrast of light and shadow that sculpts forms.'],
    { tool: ToolPath.ColorTheory },
  ),
  entry(
    T,
    'sfumato',
    ['Sfumato', 'Des contours fondus, vaporeux, sans trait net.'],
    ['Sfumato', 'Soft, hazy outlines with no sharp line.'],
  ),
  entry(
    T,
    'lay-in',
    ['Ébauche', 'La première mise en place des masses et des couleurs.'],
    ['Lay-in', 'The first blocking-in of masses and colours.'],
  ),
  entry(
    T,
    'underpainting',
    ['Dessous', 'Les premières couches, sur lesquelles on construit le tableau.'],
    ['Underpainting', 'The first layers, on which the painting is built.'],
    everyday,
  ),
  entry(
    T,
    'imprimatura',
    ['Imprimatura', 'Une teinte légère posée sur toute la toile pour supprimer le blanc.'],
    ['Imprimatura', 'A light tint laid over the whole canvas to get rid of the white.'],
  ),
  entry(
    T,
    'indirect-method',
    ['Méthode indirecte', 'Peindre par couches successives : ébauche, grisaille, glacis.'],
    ['Indirect method', 'Painting in successive layers: lay-in, grisaille, glazes.'],
  ),
  entry(
    T,
    'direct-method',
    ['Méthode directe', 'Peindre la couleur finale d’emblée, sans couches préparatoires.'],
    ['Direct method', 'Painting the final colour straight away, without preparatory layers.'],
  ),
  entry(
    T,
    'fat-over-lean',
    [
      'Gras sur maigre',
      'À l’huile, chaque couche doit être plus grasse que la précédente, pour éviter les craquelures.',
    ],
    ['Fat over lean', 'In oil, each layer must be fattier than the one before, to avoid cracking.'],
  ),
  entry(
    T,
    'highlight',
    ['Rehaut', 'Une touche claire ajoutée à la fin pour les lumières.'],
    ['Highlight', 'A light stroke added at the end for the lights.'],
  ),
  entry(
    T,
    'reserve',
    ['Réserve', 'En aquarelle, une zone laissée blanche volontairement.'],
    ['Reserve', 'In watercolour, an area deliberately left white.'],
  ),
  entry(
    T,
    'wet-on-wet',
    ['Mouillé sur mouillé', 'En aquarelle, la couleur posée sur un papier humide, qui se diffuse.'],
    ['Wet on wet', 'In watercolour, colour laid on damp paper, where it spreads.'],
  ),
  entry(
    T,
    'wet-on-dry',
    ['Mouillé sur sec', 'En aquarelle, la couleur posée sur papier sec, aux bords nets.'],
    ['Wet on dry', 'In watercolour, colour laid on dry paper, with crisp edges.'],
  ),
  entry(
    T,
    'dry-brush',
    ['Brosse sèche', 'Peu de peinture sur un pinceau presque sec, qui accroche le grain du support.'],
    ['Dry brush', 'Little paint on an almost dry brush, catching the grain of the surface.'],
  ),
  entry(
    T,
    'pointillism',
    ['Pointillisme', 'De petites touches de couleurs pures, que l’œil mélange à distance.'],
    ['Pointillism', 'Small dabs of pure colour that the eye mixes from a distance.'],
  ),
  entry(
    T,
    'brushwork',
    ['Touche', 'La façon dont le pinceau marque la surface : la signature du geste.'],
    ['Brushwork', 'The way the brush marks the surface: the signature of the gesture.'],
    everyday,
  ),
  entry(
    T,
    'sgraffito',
    ['Sgraffite', 'Gratter une couche pour faire apparaître celle du dessous.'],
    ['Sgraffito', 'Scratching through a layer to reveal the one beneath.'],
  ),
  entry(
    T,
    'tempera',
    ['Tempera', 'Une peinture dont le liant est le jaune d’œuf.'],
    ['Tempera', 'A paint whose binder is egg yolk.'],
  ),
  entry(
    T,
    'encaustic',
    ['Encaustique', 'Une peinture à la cire, travaillée à chaud.'],
    ['Encaustic', 'Wax-based paint, worked hot.'],
  ),
  entry(
    T,
    'fresco',
    ['Fresque', 'Une peinture sur un enduit de chaux encore frais.'],
    ['Fresco', 'Painting on lime plaster that is still wet.'],
  ),
  entry(
    T,
    'gouache',
    ['Gouache', 'Une peinture à l’eau opaque et mate.'],
    ['Gouache', 'An opaque, matt water-based paint.'],
  ),
  entry(
    T,
    'acrylic',
    ['Acrylique', 'Une peinture à l’eau qui sèche vite et devient insoluble.'],
    ['Acrylic', 'A water-based paint that dries fast and becomes insoluble.'],
  ),
  entry(
    T,
    'oil-paint',
    ['Huile', 'Une peinture dont le liant est une huile ; elle sèche lentement et se travaille longtemps.'],
    ['Oil paint', 'A paint whose binder is an oil; it dries slowly and stays workable for a long time.'],
  ),
  entry(
    T,
    'watercolour',
    ['Aquarelle', 'Une peinture à l’eau transparente, sur papier.'],
    ['Watercolour', 'A transparent water-based paint, used on paper.'],
  ),
  entry(
    T,
    'pastel',
    ['Pastel', 'Un bâtonnet de pigment presque pur, sec ou gras.'],
    ['Pastel', 'A stick of almost pure pigment, soft or oil-based.'],
  ),
  entry(
    T,
    'mixed-media',
    ['Technique mixte', 'Plusieurs techniques réunies dans une même œuvre.'],
    ['Mixed media', 'Several techniques combined in one work.'],
  ),
  entry(
    T,
    'collage',
    ['Collage', 'Des éléments (papier, tissu…) collés sur le support.'],
    ['Collage', 'Elements (paper, fabric…) glued onto the support.'],
  ),

  // Materials and products
  entry(
    M,
    'medium',
    ['Médium', 'Un produit mêlé à la peinture pour changer sa fluidité, sa brillance ou son séchage.'],
    ['Medium', 'A product mixed into paint to change its flow, sheen or drying.'],
  ),
  entry(
    M,
    'solvent',
    ['Diluant', 'Ce qui rend la peinture plus fluide : essence, eau.'],
    ['Solvent', 'What makes paint more fluid: spirits, water.'],
  ),
  entry(
    M,
    'turpentine',
    [
      'Térébenthine',
      'Un diluant de la peinture à l’huile, tiré de résine de pin ; l’essence minérale le remplace souvent.',
    ],
    ['Turpentine', 'A solvent for oil paint, distilled from pine resin; mineral spirits often replace it.'],
  ),
  entry(
    M,
    'linseed-oil',
    ['Huile de lin', 'Le liant et médium le plus courant de la peinture à l’huile.'],
    ['Linseed oil', 'The most common binder and medium for oil paint.'],
  ),
  entry(
    M,
    'drier',
    ['Siccatif', 'Un produit qui accélère le séchage de l’huile.'],
    ['Drier', 'A product that speeds up the drying of oil.'],
  ),
  entry(
    M,
    'retarder',
    ['Retardateur', 'Un produit qui ralentit le séchage de l’acrylique.'],
    ['Retarder', 'A product that slows down the drying of acrylic.'],
  ),
  entry(
    M,
    'varnish',
    ['Vernis', 'La couche finale qui protège l’œuvre et unifie sa brillance.'],
    ['Varnish', 'The final layer that protects the work and evens out its sheen.'],
  ),
  entry(
    M,
    'retouching-varnish',
    ['Vernis à retoucher', 'Un vernis léger, en cours de travail, qui ravive les couleurs ternies.'],
    ['Retouching varnish', 'A light varnish, used while working, that revives dulled colours.'],
  ),
  entry(
    M,
    'gesso',
    ['Gesso', 'La sous-couche blanche qui prépare le support. On dit aussi apprêt.'],
    ['Gesso', 'The white undercoat that prepares the support. Also called primer.'],
  ),
  entry(
    M,
    'ground',
    ['Enduit', 'La préparation du support, en général.'],
    ['Ground', 'The preparation of the support, in general.'],
  ),
  entry(
    M,
    'gum-arabic',
    ['Gomme arabique', 'Le liant de l’aquarelle et de la gouache.'],
    ['Gum arabic', 'The binder of watercolour and gouache.'],
  ),
  entry(
    M,
    'masking-fluid',
    ['Fluide à masquer', 'Un latex qui protège les réserves en aquarelle, retiré une fois sec.'],
    ['Masking fluid', 'A latex that protects reserves in watercolour, removed once dry.'],
  ),
  entry(
    M,
    'fixative',
    ['Fixatif', 'Un aérosol qui fixe le fusain, le pastel ou le crayon.'],
    ['Fixative', 'A spray that fixes charcoal, pastel or pencil.'],
  ),

  // Supports and tools
  entry(
    S,
    'stretcher',
    ['Châssis', 'Le cadre en bois sur lequel on tend la toile.'],
    ['Stretcher', 'The wooden frame the canvas is stretched over.'],
  ),
  entry(
    S,
    'canvas',
    ['Toile', 'Un tissu de lin, de coton ou mélangé, tendu sur un châssis.'],
    ['Canvas', 'Linen, cotton or blended fabric, stretched over a stretcher.'],
  ),
  entry(
    S,
    'canvas-board',
    ['Carton toilé', 'Une toile collée sur un carton rigide.'],
    ['Canvas board', 'Canvas glued onto rigid board.'],
  ),
  entry(
    S,
    'panel',
    ['Panneau', 'Un support rigide : bois, médium.'],
    ['Panel', 'A rigid support: wood, MDF.'],
    everyday,
  ),
  entry(
    S,
    'paper-texture',
    ['Grain du papier', 'La texture du papier : satiné (lisse), grain fin, torchon (rugueux).'],
    ['Paper texture', 'The surface of the paper: hot-pressed (smooth), cold-pressed (fine grain), rough.'],
  ),
  entry(
    S,
    'paper-weight',
    ['Grammage', 'Le poids du papier en g/m² ; plus il est élevé, plus le papier est épais.'],
    ['Paper weight', 'The weight of paper in g/m²; the higher it is, the thicker the paper.'],
  ),
  entry(
    S,
    'bristle-brush',
    ['Brosse', 'Un pinceau à poils raides, souvent plat.'],
    ['Bristle brush', 'A brush with stiff bristles, often flat.'],
  ),
  entry(
    S,
    'brush',
    ['Pinceau', 'Un outil à poils souples ; rond, plat, langue de chat, éventail…'],
    ['Brush', 'A tool with soft hairs; round, flat, filbert, fan…'],
  ),
  entry(
    S,
    'painting-knife',
    ['Couteau à peindre', 'Une lame souple pour poser la peinture en matière.'],
    ['Painting knife', 'A flexible blade for applying thick paint.'],
  ),
  entry(
    S,
    'palette-knife',
    ['Couteau à palette', 'Une lame pour mélanger les couleurs sur la palette.'],
    ['Palette knife', 'A blade for mixing colours on the palette.'],
  ),
  entry(
    S,
    'easel',
    ['Chevalet', 'Le support qui tient la toile pendant le travail.'],
    ['Easel', 'The stand that holds the canvas while you work.'],
  ),
  entry(
    S,
    'mahlstick',
    ['Appui-main', 'Une baguette pour poser la main sans toucher la toile.'],
    ['Mahlstick', 'A rod to rest your hand on without touching the canvas.'],
  ),

  // Drawing
  entry(
    D,
    'sketch',
    ['Croquis', 'Un dessin rapide, pris sur le vif.'],
    ['Sketch', 'A quick drawing, made from life.'],
    { tool: ToolPath.MannequinSketch },
  ),
  entry(
    D,
    'preparatory-sketch',
    ['Esquisse', 'Un premier projet d’œuvre, plus réfléchi qu’un croquis.'],
    ['Preparatory sketch', 'A first plan for a work, more considered than a sketch.'],
  ),
  entry(
    D,
    'study',
    ['Étude', 'Un dessin ou une peinture d’entraînement, souvent sur un détail.'],
    ['Study', 'A practice drawing or painting, often of a detail.'],
    everyday,
  ),
  entry(
    D,
    'construction-lines',
    ['Trait de construction', 'Les lignes qui placent les formes avant les détails.'],
    ['Construction lines', 'The lines that place the shapes before the details.'],
  ),
  entry(
    D,
    'hatching',
    ['Hachures', 'Des traits parallèles pour faire les ombres ; croisés, ce sont des contre-hachures.'],
    ['Hatching', 'Parallel lines that build up shadows; crossed, they are cross-hatching.'],
  ),
  entry(
    D,
    'blending-stump',
    ['Estompe', 'Un outil, ou un geste, pour fondre le crayon ou le fusain.'],
    ['Blending stump', 'A tool, or a gesture, for softening pencil or charcoal.'],
  ),
  entry(
    D,
    'charcoal',
    ['Fusain', 'Du charbon de bois pour dessiner.'],
    ['Charcoal', 'Charred wood for drawing.'],
  ),
  entry(D, 'sanguine', ['Sanguine', 'Une craie rouge-brun.'], ['Sanguine', 'A reddish-brown chalk.']),
  entry(
    D,
    'grid-method',
    ['Mise au carreau', 'Quadriller un modèle pour le reporter à une autre échelle.'],
    ['Grid method', 'Drawing a grid over a model to transfer it at another scale.'],
    { tool: ToolPath.ImageStudyGrid },
  ),
  entry(
    D,
    'proportions',
    ['Proportions', 'Les rapports de taille entre les parties ; le corps se mesure souvent en « têtes ».'],
    ['Proportions', 'The size ratios between parts; the body is often measured in “heads”.'],
    { tool: ToolPath.MannequinPoses },
  ),
  entry(
    D,
    'canon',
    ['Canon', 'Un système de proportions idéal.'],
    ['Canon', 'An ideal system of proportions.'],
    { tool: ToolPath.MannequinPoses },
  ),
  entry(
    D,
    'foreshortening',
    ['Raccourci', 'Une forme vue en profondeur, qui paraît écrasée.'],
    ['Foreshortening', 'A form seen in depth, which looks compressed.'],
  ),
  entry(
    D,
    'outline',
    ['Contour', 'La ligne qui délimite une forme.'],
    ['Outline', 'The line that bounds a shape.'],
    everyday,
  ),
  entry(
    D,
    'form-shadow',
    ['Ombre propre', 'L’ombre sur l’objet lui-même.'],
    ['Form shadow', 'The shadow on the object itself.'],
    { tool: ToolPath.MannequinLight },
  ),
  entry(
    D,
    'cast-shadow',
    ['Ombre portée', 'L’ombre que l’objet projette autour de lui.'],
    ['Cast shadow', 'The shadow the object throws around it.'],
    { tool: ToolPath.MannequinLight },
  ),
  entry(
    D,
    'reflected-light',
    ['Reflet', 'La lumière renvoyée dans une zone d’ombre.'],
    ['Reflected light', 'Light bounced back into an area of shadow.'],
  ),

  // Composition
  entry(
    K,
    'framing',
    ['Cadrage', 'Le choix de ce qui entre dans l’image.'],
    ['Framing', 'Choosing what goes into the picture.'],
  ),
  entry(
    K,
    'format',
    ['Format', 'La forme du support : portrait, paysage, carré.'],
    ['Format', 'The shape of the support: portrait, landscape, square.'],
    everyday,
  ),
  entry(
    K,
    'planes',
    ['Plans', 'Les zones de profondeur : premier plan, plan moyen, arrière-plan.'],
    ['Planes', 'The zones of depth: foreground, middle ground, background.'],
    everyday,
  ),
  entry(
    K,
    'horizon-line',
    ['Ligne d’horizon', 'La hauteur des yeux de l’observateur.'],
    ['Horizon line', 'The height of the viewer’s eyes.'],
  ),
  entry(
    K,
    'vanishing-point',
    ['Point de fuite', 'Le point où les parallèles semblent se rejoindre.'],
    ['Vanishing point', 'The point where parallel lines seem to meet.'],
  ),
  entry(
    K,
    'linear-perspective',
    ['Perspective linéaire', 'La profondeur rendue par les lignes de fuite.'],
    ['Linear perspective', 'Depth conveyed by receding lines.'],
  ),
  entry(
    K,
    'atmospheric-perspective',
    ['Perspective atmosphérique', 'Les lointains plus clairs, plus bleus et moins contrastés.'],
    ['Atmospheric perspective', 'Distant things look lighter, bluer and less contrasted.'],
  ),
  entry(
    K,
    'rule-of-thirds',
    ['Règle des tiers', 'Placer les éléments forts sur les tiers de l’image.'],
    ['Rule of thirds', 'Placing strong elements on the thirds of the picture.'],
  ),
  entry(
    K,
    'golden-ratio',
    ['Nombre d’or', 'Une proportion (environ 1,618) jugée harmonieuse.'],
    ['Golden ratio', 'A proportion (about 1.618) considered harmonious.'],
  ),
  entry(
    K,
    'diagonal',
    ['Diagonale', 'Une ligne de force qui dynamise la composition.'],
    ['Diagonal', 'A strong line that brings energy to the composition.'],
  ),
  entry(
    K,
    'focal-point',
    ['Point focal', 'L’endroit où le regard se pose en premier.'],
    ['Focal point', 'Where the eye lands first.'],
  ),
  entry(
    K,
    'leading-lines',
    ['Lignes de force', 'Les directions principales qui guident l’œil.'],
    ['Leading lines', 'The main directions that guide the eye.'],
  ),
  entry(
    K,
    'balance',
    ['Équilibre', 'La répartition des masses, symétrique ou non.'],
    ['Balance', 'How the masses are distributed, symmetrically or not.'],
  ),
  entry(
    K,
    'rhythm',
    ['Rythme', 'La répétition et la variation des formes et des couleurs.'],
    ['Rhythm', 'The repetition and variation of shapes and colours.'],
  ),
  entry(
    K,
    'negative-space',
    ['Espace négatif', 'Le vide autour des formes, qui compte autant qu’elles.'],
    ['Negative space', 'The empty space around shapes, which matters as much as they do.'],
  ),
  entry(
    K,
    'off-frame',
    ['Hors-champ', 'Ce qui existe hors du cadre et qu’on devine.'],
    ['Off-frame', 'What exists outside the frame and can be sensed.'],
  ),

  // Subjects and genres
  entry(G, 'still-life', ['Nature morte', 'Des objets inanimés.'], ['Still life', 'Inanimate objects.']),
  entry(
    G,
    'portrait',
    ['Portrait', 'La représentation d’une personne ; de soi-même, c’est un autoportrait.'],
    ['Portrait', 'A depiction of a person; of yourself, it is a self-portrait.'],
  ),
  entry(
    G,
    'landscape',
    ['Paysage', 'La représentation de la nature.'],
    ['Landscape', 'A depiction of nature.'],
  ),
  entry(G, 'seascape', ['Marine', 'Un paysage de mer.'], ['Seascape', 'A landscape of the sea.']),
  entry(
    G,
    'genre-scene',
    ['Scène de genre', 'Une scène de la vie quotidienne.'],
    ['Genre scene', 'A scene from everyday life.'],
  ),
  entry(
    G,
    'history-painting',
    ['Peinture d’histoire', 'Des scènes historiques, mythologiques ou religieuses.'],
    ['History painting', 'Historical, mythological or religious scenes.'],
  ),
  entry(
    G,
    'abstraction',
    ['Abstraction', 'Une œuvre sans représentation reconnaissable.'],
    ['Abstraction', 'A work with no recognisable depiction.'],
  ),
  entry(
    G,
    'figuration',
    ['Figuration', 'Une œuvre qui représente le réel.'],
    ['Figuration', 'A work that depicts reality.'],
  ),
  entry(
    G,
    'from-life',
    ['D’après nature', 'Travailler devant le sujet réel ; d’après modèle, devant une personne qui pose.'],
    ['From life', 'Working in front of the real subject; from a model, in front of a person posing.'],
  ),
]
