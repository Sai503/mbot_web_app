
function normalizeAngle(angle) {
  // Normalizes an angle from -PI to PI.
  let result = (angle + Math.PI) % (2.0 * Math.PI);
  if (result <= 0.0) return result + Math.PI;
  return result - Math.PI;
}

export { normalizeAngle };
