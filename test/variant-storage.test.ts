import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,rmSync,readFileSync,writeFileSync,existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { verifyVariantStorage } from '../src/runtime/variant-storage.ts';
import { DiskWordFiles } from '../src/runtime/word-files.ts';

test('Variant storage rejects cross-variant directories before changing metadata or records',t=>{
  const dir=mkdtempSync(join(tmpdir(),'decwar-variant-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
  verifyVariantStorage(dir,'austin');const before=readFileSync(join(dir,'variant.json'));
  verifyVariantStorage(dir,'austin');assert.throws(()=>verifyVariantStorage(dir,'compuserve'),/Incompatible/);
  assert.deepEqual(readFileSync(join(dir,'variant.json')),before);
});
test('Verified legacy CompuServe word files may be explicitly reused; Austin cannot adopt them',t=>{
  const dir=mkdtempSync(join(tmpdir(),'decwar-variant-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const file=new DiskWordFiles(dir),words=Array<bigint>(640).fill(0n);words[9]=12345n;file.write('DECWAR.STA',words);
  assert.throws(()=>verifyVariantStorage(dir,'austin'),/Unidentified/);assert.ok(!existsSync(join(dir,'variant.json')));
  verifyVariantStorage(dir,'compuserve');assert.deepEqual(file.read('DECWAR.STA'),words);
});
test('Invalid legacy files and incompatible host formats fail without marking the directory',t=>{
  const dir=mkdtempSync(join(tmpdir(),'decwar-variant-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
  writeFileSync(join(dir,'DECWAR.STA.words'),'bad');assert.throws(()=>verifyVariantStorage(dir,'compuserve'),/framing/);
  assert.ok(!existsSync(join(dir,'variant.json')));writeFileSync(join(dir,'variant.json'),JSON.stringify({format:'future',variant:'compuserve'}));
  assert.throws(()=>verifyVariantStorage(dir,'compuserve'),/Incompatible/);
});
