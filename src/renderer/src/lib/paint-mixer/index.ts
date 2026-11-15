/**
 * Paint colour engine: colour spaces, colour difference, Kubelka-Munk mixing,
 * recipe solver and palette suggestions for a whole image. Pure functions, no DOM.
 */
export { linearToRgb, rgbToLab, rgbToLinear, type Lab, type LinearRgb, type Rgb } from './color'
export { deltaE2000, deltaE76 } from './delta-e'
export { mixReflectance, prepareTube, type TubeOptics } from './kubelka-munk'
export { simpleRatio } from './ratio'
export {
  evaluateMix,
  solveMix,
  type MixEvaluation,
  type MixRecipe,
  type MixSolution,
  type MixableTube,
  type RecipeItem,
} from './solver'
export { allColours, dominantColours, type PixelData, type WeightedColour } from './image-colours'
export {
  proposePaints,
  type PaintProposals,
  type PoolPaint,
  type Proposal,
  type ProposalOptions,
} from './paint-proposals'
