export function getLabelColor(hex: string): string {
  const redHex = hex.substr(0, 2);
  const greenHex = hex.substr(2, 2);
  const blueHex = hex.substr(4, 2);

  const red = parseInt(redHex, 16);
  const green = parseInt(greenHex, 16);
  const blue = parseInt(blueHex, 16);

  const redWeight = red * 299;
  const greenWeight = green * 587;
  const blueWeight = blue * 114;
  const perceivedBrightness = (redWeight + greenWeight + blueWeight) / 1000;

  const isLightBackground = perceivedBrightness >= 128;
  return isLightBackground ? '#000000' : '#ffffff';
}
