import test from 'node:test';
import assert from 'node:assert/strict';
import { mainCommandFixture } from './fixtures/main-command-runtime.ts';
import { constants as K } from '../src/generated/source-data.ts';
function fixture(command:string,format:number=K.SHORT){
  const f=mainCommandFixture(command,format),b=f.main.lists;
  // Supply a real neutral planet: the parent fixture otherwise leaves LOCPLN unset.
  for(const [i,w] of [1n,1n,0n,0n].entries())f.high.write('locpln',w,1,i+1);
  f.views.high.board.setdsp(1,1,601);
  Object.assign(b.policy,{twoLabel:'true-first',reversedLoop:'zero-trip'});
  return {...f,b};
}
test('Main LIST lists visible rows and does not spend a turn',()=>{const f=fixture('LIST');f.run();assert.deepEqual(f.reports,['\r\n L  10-20   0,  0  -100\r\n\r\n*)( 12-20  +2,  0   100\r\n\r\n']);assert.equal(f.high.read('shpcon',1,K.KNTURN),1n);});
test('Main SUMMARY counts a distant unknown planet without revealing it',()=>{const f=fixture('SUMMARY');f.run();assert.deepEqual(f.reports,['\r\n  1 Federation ship\r\n\r\n  1 Empire base\r\n\r\n  1 neutral planet\r\n']);assert.equal(f.high.read('locpln',1,4),0n);});
test('Main BASES defaults to own team and reports absence',()=>{const f=fixture('BASES');f.run();assert.deepEqual(f.reports,['\r\nNo Federation bases\r\n']);});
test('Main PLANETS defaults to sensor range',()=>{const f=fixture('PLANETS');f.run();assert.deepEqual(f.reports,['\r\nNo planets\r\n']);assert.equal(f.high.read('locpln',1,4),0n);});
test('Main TARGETS shows enemy base without enemy asterisk',()=>{const f=fixture('TARGETS');f.run();assert.deepEqual(f.reports,['\r\n )( 12-20  +2,  0   100\r\n']);assert.equal(f.high.read('base',1,4,2)&1n,1n);});
test('Main LIST SHIPS excludes other object classes',()=>{const f=fixture('LIST SHIPS');f.run();assert.deepEqual(f.reports,['\r\n L  10-20   0,  0  -100\r\n\r\n']);assert.equal(f.high.read('base',1,4,2)&1n,0n);});
test('Main LIST rejects unknown keyword using copied token bytes',()=>{const f=fixture('LIST BOZO');f.run();assert.deepEqual(f.reports,['\r\nIllegal keyword BOZO\r\n']);assert.equal(f.b.events.includes('flags'),false);});
test('Main LIST refuses conflicting object modifiers',()=>{const f=fixture('LIST SHIPS BASES');f.run();assert.ok(f.b.events.includes('lsts03'));assert.equal(f.b.events.includes('flags'),false);});
test('Main LIST FRIENDLY requires explicit two-label compiler policy',()=>{const f=fixture('LIST FRIENDLY');delete f.b.policy.twoLabel;assert.throws(()=>f.run(),/two-label IF compiler policy/);});
test('Main PLANETS records discovery only after displaying a planet',()=>{const f=fixture('PLANETS');f.views.high.board.setdsp(1,1,0);f.high.write('locpln',11n,1,1);f.high.write('locpln',20n,1,2);f.high.write('locpln',3n,1,3);f.views.high.board.setdsp(11,20,601);f.run();assert.equal(f.high.read('locpln',1,4),1n);assert.ok(f.reports[0].includes('11-20'));assert.ok(f.reports[0].includes('     3'));});
test('Main LIST BASES discovers enemy base through original shared words',()=>{const f=fixture('LIST BASES');assert.equal(f.high.read('base',1,4,2),0n);f.run();assert.equal(f.high.read('base',1,4,2),1n);assert.equal(f.b.list.read('basctr',2),1n);});
test('Main LIST combines AND groups before emitting rows',()=>{const f=fixture('LIST SHIPS AND BASES',K.LONG);f.run();assert.deepEqual(f.reports,['\r\n Lexington   @10-20   0,  0  -100.0%\r\n\r\n*Emp Base    @12-20  +2,  0   100.0%\r\n\r\n']);assert.deepEqual(f.b.events,['scan','flags','scan','flags','output']);});
test('Main BASES ENEMY includes original long summary suffix',()=>{const f=fixture('BASES ENEMY',K.LONG);f.run();assert.deepEqual(f.reports,['\r\n*Emp Base    @12-20  +2,  0   100.0%\r\n\r\n  1 Empire base in game\r\n']);});
test('Main TARGETS SUMMARY counts enemies with target wording',()=>{const f=fixture('TARGETS SUMMARY',K.LONG);f.run();assert.deepEqual(f.reports,['\r\n  1 target in range\r\n']);});
test('Main LIST named ship requires explicit prior SHIP local value',()=>{const f=fixture('LIST LEXINGTON');assert.throws(()=>f.run(),/prior implicit SHIP word/);});
test('Main LIST named ship reads the original separate SHIP local',()=>{const f=fixture('LIST LEXINGTON',K.LONG);f.b.policy.implicitShip=0n;f.run();assert.deepEqual(f.reports,['\r\n Lexington   @10-20   0,  0  -100.0%\r\n']);});
test('Main LIST retains prior SHIP bits instead of silently correcting typo to SHIPS',()=>{const f=fixture('LIST LEXINGTON');f.b.policy.implicitShip=f.high.read('bits',1);f.run();assert.ok(f.b.events.includes('lsts03'));assert.equal(f.b.events.includes('flags'),false);});
test('Main LIST coordinates pass actual words through distance and row output',()=>{const f=fixture('LIST 10 20',K.LONG);f.run();assert.deepEqual(f.reports,['\r\n Lexington   @10-20   0,  0  -100.0%\r\n']);});
test('Main LIST CLOSEST excludes own ship and selects closer planet over base',()=>{const f=fixture('LIST CLOSEST',K.LONG);f.views.high.board.setdsp(1,1,0);f.high.write('locpln',11n,1,1);f.high.write('locpln',20n,1,2);f.high.write('locpln',1n,1,3);f.views.high.board.setdsp(11,20,601);f.run();assert.deepEqual(f.reports,['\r\n Neu planet  @11-20  +1,  0     1 build\r\n']);assert.equal(f.b.list.read('clsest'),1n);});
