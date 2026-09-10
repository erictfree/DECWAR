import test from 'node:test';
import assert from 'node:assert/strict';
import { InputAdmission } from '../src/runtime/input-admission.ts';
import { createGameSession } from '../src/runtime/game-session.ts';
import { WorldDirectory } from '../src/runtime/world-directory.ts';
import { createVariantContext } from '../src/runtime/variant.ts';
import { withVariant } from '../src/runtime/variant-execution.ts';

test('submission admission: boundary, rejection, ESC, disabled and independent clients',()=>{
  let now=0;const a=new InputAdmission(500,()=>now),b=new InputAdmission(500,()=>now);
  assert.equal(a.accept(10),true);
  now=499;assert.equal(a.accept(10),false);assert.equal(b.accept(10),true);
  assert.equal(a.accept(27),true);assert.equal(a.accept(27),true);
  now=500;assert.equal(a.accept(10),true);
  assert.equal(new InputAdmission(0).accept(10),true);
  for(const invalid of [-1,NaN,Infinity])assert.throws(()=>new InputAdmission(invalid),RangeError);
});

for(const variant of ['austin','compuserve'] as const){
  test(`${variant}: live editor discards rapid lines, preserves slash and ESC repeat`,t=>{
    let now=0,rejected=0;const output:number[]=[];
    t.mock.method(performance,'now',()=>now);
    const context=createVariantContext(variant),world=new WorldDirectory(undefined,context).load();
    const {f}=createGameSession({*read(){return null;},available(){return false;},clearInput(){},wake(){},runtimeMilliseconds(){return 0n;},write(bytes){output.push(...bytes);},disconnected:false},'full',world,1,{playable:true,inputIntervalMs:500,onInputRejected(){rejected++;}});
    function run(text:string){
      f.editor.feed(text);
      const g=f.editor.run();
      for(let i=0;i<10000;i++){
        const step=withVariant(context,()=>g.next());
        if(step.done)return;
        assert.notEqual(step.value,'input','test supplied sufficient input');
      }
      assert.fail('editor did not finish');
    }
    run('STATUS/SCAN\n');assert.equal(f.input.rawLine,'STATUS/SCAN');
    now=499;run('QUIT\n\x1b');
    assert.equal(rejected,1);assert.equal(output.filter(n=>n===7).length,1);
    assert.equal(f.input.rawLine,'STATUS/SCAN');assert.equal(f.editor.state.rptflg,-1n);
    run('\x1b');assert.equal(rejected,1);
    now=500;run('LIST\n');assert.equal(f.input.rawLine,'LIST');
    run('STATUS\x1b');assert.equal(f.input.rawLine,'STATUS');
    // Source initialization input is not a player submission.
    f.ini.install();f.ini.load('SCAN\nLIST\n');
    run('');assert.equal(f.input.rawLine,'SCAN');
    run('');assert.equal(f.input.rawLine,'LIST');assert.equal(rejected,1);
  });
}

for(const options of [{playable:false,inputIntervalMs:500},{playable:true,inputIntervalMs:0}]){
  test(`live editor has no admission policy with ${JSON.stringify(options)}`,()=>{
    const {f}=createGameSession({*read(){return null;},available(){return false;},clearInput(){},wake(){},runtimeMilliseconds(){return 0n;},write(){},disconnected:false},'full',undefined,1,options);
    for(const line of ['STATUS','SCAN','LIST']){
      f.editor.feed(line+'\n');
      for(const wait of f.editor.run())assert.notEqual(wait,'input');
      assert.equal(f.input.rawLine,line);
    }
  });
}
