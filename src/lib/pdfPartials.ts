/** Align every End label and result in a shared row below the match score. */
export function drawScorePartials(doc: any, scores: Record<string, any>, athleteColor: string) {
  const entries = Object.entries(scores || {}).sort(([a], [b]) => {
    const order = (name: string) => /TB|tie/i.test(name) ? 999 : Number(name.match(/\d+/)?.[0] || 0);
    return order(a) - order(b);
  });
  if (!entries.length) return;
  const width = doc.internal.pageSize.getWidth();
  const cellWidth = (width - 96) / entries.length;
  entries.forEach(([name, score], index) => {
    const a = Number(score.athlete || 0), o = Number(score.opponent || 0);
    const red = athleteColor === 'Vermelho' ? a : o;
    const blue = athleteColor === 'Azul' ? a : o;
    const center = 48 + cellWidth * (index + 0.5);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(96,116,142);
    doc.text(name.replace('End ', 'E'), center, 145, { align: 'center' });
    doc.setFontSize(10);
    doc.setTextColor(239,65,72); doc.text(String(red), center - 4, 158, { align: 'right' });
    doc.setTextColor(96,116,142); doc.text('-', center, 158, { align: 'center' });
    doc.setTextColor(22,128,244); doc.text(String(blue), center + 4, 158, { align: 'left' });
  });
}
