import { describe, expect, it } from 'vitest';
import { BASE_BANK } from '../src/model';

// Independent from Python Decimal generation: exact rational arithmetic and
// an integer half-up rounder. Reverse checks use the defining conservation law.
function roundRational(numerator: bigint, denominator: bigint, precision: number) {
  const scale=10n**BigInt(precision);
  const n=numerator*scale;
  const quotient=n/denominator, remainder=n%denominator;
  return Number(quotient+(2n*remainder>=denominator ? 1n : 0n))/Number(scale);
}
const specifications: Record<string, {unit:string; fraction:(v:bigint[])=>[bigint,bigint]; reverse:(r:number,v:number[])=>number}> = {
  packRatio: {unit:'g', fraction:v=>[v[0]*v[2],v[1]], reverse:(r,v)=>r*v[1]/v[2]-v[0]},
  arealDose: {unit:'g', fraction:v=>[v[0]*v[1],1000n],reverse:(r,v)=>r*1000/v[0]-v[1]},
  cardiacOutput: {unit:'L/min',fraction:v=>[v[0]*v[1],1000n],reverse:(r,v)=>r*1000/v[0]-v[1]},
  minuteVentilation: {unit:'L/min',fraction:v=>[v[0]*v[1],1000n],reverse:(r,v)=>r*1000/v[1]-v[0]},
  wavePeriod: {unit:'μs',fraction:v=>[1000n,v[0]],reverse:(r,v)=>r*v[0]-1000},
  deviceEnergy: {unit:'J',fraction:v=>[v[0]*v[1]*60n,1n],reverse:(r,v)=>r/(v[1]*60)-v[0]},
  massPercent: {unit:'g',fraction:v=>[v[0]*v[1],100n],reverse:(r,v)=>r/v[0]*100-v[1]},
  volumeDilution: {unit:'mL',fraction:v=>[v[1]*v[2],v[0]],reverse:(r,v)=>v[0]*r-v[1]*v[2]},
  countReduction: {unit:'%',fraction:v=>[(v[0]-v[1])*100n,v[0]],reverse:(r,v)=>v[0]*(1-r/100)-v[1]},
  cumulativeIncidence: {unit:'%',fraction:v=>[v[1]*100n,v[0]],reverse:(r,v)=>r/100*v[0]-v[1]},
};
describe('수치 검증기의 반올림 경계',()=>{
  it('0.625와 14.325의 정확한 반올림 및 아래 경계',()=>{
    expect(roundRational(625n,1000n,2)).toBe(.63);
    expect(roundRational(14325n,1000n,2)).toBe(14.33);
    expect(roundRational(14324n,1000n,2)).toBe(14.32);
  });
});
describe('계산 조건 600개 전수 독립 검증',()=>{
  for(const q of BASE_BANK.filter(q=>q.calculation)) it(`${q.id}: ${q.calculation!.kind}`,()=>{
    const c=q.calculation!; const spec=specifications[c.kind]; expect(spec).toBeDefined();
    expect(c.unit).toBe(spec.unit);
    expect(c.values.every(v=>Number.isInteger(v)&&v>=0)).toBe(true);
    const [n,d]=spec.fraction(c.values.map(BigInt)); expect(d>0n).toBe(true);
    const precision=c.precision??0;
    const expected=roundRational(n,d,precision);
    expect(c.result).toBe(expected);
    const displayed=q.choices.map(choice=>{
      expect(choice.endsWith(` ${spec.unit}`)).toBe(true);
      return Number(choice.slice(0,-spec.unit.length).trim());
    });
    expect(displayed.every(v=>Number.isFinite(v)&&v>=0)).toBe(true);
    expect(new Set(displayed).size).toBe(4);
    expect(displayed[q.answer-1]).toBe(expected);
    expect(displayed.filter(v=>Math.abs(v-expected)<1e-10)).toHaveLength(1);
    // Re-evaluate unrounded value against the governing equation, separately
    // from answer formatting and rounder.
    const unrounded=Number(n)/Number(d);
    expect(Math.abs(spec.reverse(unrounded,c.values))).toBeLessThan(1e-8);
    expect(q.explanation).toContain(`${displayed[q.answer-1]} ${c.unit}`);
    if(c.kind==='volumeDilution') {
      expect(c.values[0]).toBeGreaterThan(c.values[1]);expect(c.result).toBeLessThan(c.values[2]);
    }
    if(c.kind==='countReduction') {
      expect(c.values[0]).toBeGreaterThan(c.values[1]);expect(expected).toBeLessThanOrEqual(100);
    }
    if(c.kind==='cumulativeIncidence') expect(c.values[1]).toBeLessThan(c.values[0]);
  });
});
