import { addCalendarMonths, evaluateMpgDevice, evaluateGlucoseControl } from '../src/index.js';
const clear = { requirementsReviewed: true, releasedAt: '2026-01-01', requirements: [], inspections: [], incidents: [] };
describe('MPG calendar deadlines', () => {
  test.each([['2024-01-31',1,'2024-02-29'],['2025-01-31',1,'2025-02-28'],['2024-02-29',12,'2025-02-28'],['2025-12-31',2,'2026-02-28']])('%s plus %s months', (date,months,expected) => expect(addCalendarMonths(date as string, months as number)).toBe(expected));
  test('rejects impossible dates and invalid intervals', () => { expect(() => addCalendarMonths('2025-02-30',1)).toThrow(); expect(() => addCalendarMonths('2025-01-01',-1)).toThrow(); });
});
describe('MPG release', () => {
  test('unknown requirements never imply clearance', () => expect(evaluateMpgDevice({...clear,requirementsReviewed:false},'2026-01-01').status).toBe('DRAFT'));
  test('requires explicit release', () => expect(evaluateMpgDevice({...clear,releasedAt:null},'2026-01-01').status).toBe('DRAFT'));
  test('deadline is inclusive; following calendar day blocks', () => {
    const input={...clear,requirements:[{id:'a',mandatory:true,dueDate:'2026-01-01'}]};
    expect(evaluateMpgDevice(input,'2026-01-01').status).toBe('RELEASED');
    expect(evaluateMpgDevice(input,'2026-01-02').status).toBe('BLOCKED');
  });
  test('missing mandatory due date blocks',()=>expect(evaluateMpgDevice({...clear,requirements:[{id:'a',mandatory:true}]},'2026-01-01').status).toBe('BLOCKED'));
  test('draft passing inspection cannot clear finalized failure',()=>expect(evaluateMpgDevice({...clear,inspections:[{requirementId:'a',result:'FAILED',performedAt:'2025-01-01',finalizedAt:'2025-01-01'},{requirementId:'a',result:'PASSED',performedAt:'2026-01-01'}]},'2026-01-01').status).toBe('BLOCKED'));
  test('resolved defect clears but unresolved safety defect blocks',()=>{
    expect(evaluateMpgDevice({...clear,incidents:[{id:'a',safetyRelevant:true}]},'2026-01-01').status).toBe('BLOCKED');
    expect(evaluateMpgDevice({...clear,incidents:[{id:'a',safetyRelevant:true,resolvedAt:'2025-12-01'}]},'2026-01-01').status).toBe('RELEASED');
  });
  test('remains blocked until every independent cause is resolved',()=>{
    const overdue={...clear,requirements:[{id:'stk',mandatory:true,dueDate:'2025-12-31'}],incidents:[{id:'defect',safetyRelevant:true}]};
    expect(evaluateMpgDevice(overdue,'2026-01-01').reasons).toHaveLength(2);
    expect(evaluateMpgDevice({...overdue,incidents:[{id:'defect',safetyRelevant:true,resolvedAt:'2026-01-01'}]},'2026-01-01').status).toBe('BLOCKED');
  });
  test('inspection ordering uses instants across time zones',()=>expect(evaluateMpgDevice({...clear,inspections:[{requirementId:'a',result:'FAILED',performedAt:'2026-01-01T10:00:00Z',finalizedAt:'2026-01-01T10:00:00Z'},{requirementId:'a',result:'PASSED',performedAt:'2026-01-01T10:30:00+02:00',finalizedAt:'2026-01-01T11:00:00Z'}]},'2026-01-01').status).toBe('BLOCKED'));
  test('glucose failure requires clarification and a strictly later passing retry',()=>{
    const failed={id:'f',performedAt:'2026-01-01T10:00:00Z',passed:false};
    const passed={id:'p',performedAt:'2026-01-01T11:00:00Z',passed:true};
    expect(evaluateMpgDevice({...clear,glucoseControls:[failed,passed]},'2026-01-01').status).toBe('BLOCKED');
    expect(evaluateMpgDevice({...clear,glucoseControls:[{...failed,resolution:'Fehler geklärt'},passed]},'2026-01-01').status).toBe('RELEASED');
  });
});
describe('glucose assessment',()=>{
 const input={measuredAt:'2026-01-01',unit:'mg/dL',rangeUnit:'mg/dL',lower:80,upper:120,value:80,solutionExpiresOn:'2026-01-01'};
 test('bounds and expiration day are inclusive',()=>{expect(evaluateGlucoseControl(input).passed).toBe(true);expect(evaluateGlucoseControl({...input,value:120}).passed).toBe(true);});
 test('outside range and expired materials fail',()=>{expect(evaluateGlucoseControl({...input,value:121}).passed).toBe(false);expect(evaluateGlucoseControl({...input,solutionExpiresOn:'2025-12-31'}).passed).toBe(false);});
 test('documents mismatched units as failed and rejects malformed values',()=>{const result=evaluateGlucoseControl({...input,rangeUnit:'mmol/L'});expect(result.passed).toBe(false);expect(result.reasons).toContain('Messwert und Sollbereich verwenden unterschiedliche Einheiten.');expect(()=>evaluateGlucoseControl({...input,value:NaN})).toThrow();expect(()=>evaluateGlucoseControl({...input,lower:130})).toThrow();});
});
