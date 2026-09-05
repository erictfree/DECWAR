import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,rmSync,writeFileSync,readFileSync,readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MemoryWordFiles,DiskWordFiles } from '../src/runtime/word-files.ts';
import { MIN_INTEGER,MAX_INTEGER,WORD_MASK } from '../src/compat/word36.ts';
import { acquireDataDirectory } from '../src/runtime/data-directory.ts';

test('Word storage preserves all 36 bits across disk reopen and replaces whole files',t=>{
  const directory=mkdtempSync(join(tmpdir(),'decwar-words-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));
  const files=new DiskWordFiles(directory),words=[0n,1n,-1n,MIN_INTEGER,MAX_INTEGER,0o123456701234n];
  assert.equal(files.read('DECWAR.STA'),undefined);files.write('DECWAR.STA',words);
  assert.deepEqual(new DiskWordFiles(directory).read('DECWAR.STA'),words);
  files.write('DECWAR.STA',[2n]);assert.deepEqual(files.read('DECWAR.STA'),[2n]);assert.deepEqual(readdirSync(directory),['DECWAR.STA.words']);
  assert.equal(readFileSync(join(directory,'DECWAR.STA.words'),'utf8'),'DECWAR-WORDS-1\n000000002\n');
});
test('Bad disk data is rejected and an invalid write leaves the prior file intact',t=>{
  const directory=mkdtempSync(join(tmpdir(),'decwar-words-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));
  const files=new DiskWordFiles(directory);files.write('DECWAR.STA',[-1n]);
  assert.throws(()=>files.write('DECWAR.STA',[WORD_MASK+1n]),/outside 36 bits/);assert.deepEqual(files.read('DECWAR.STA'),[-1n]);
  for(const text of ['DECWAR-WORDS-2\n000000001\n','DECWAR-WORDS-1\n1000000000\n','DECWAR-WORDS-1\n000000001']){
    writeFileSync(join(directory,'DECWAR.STA.words'),text);assert.throws(()=>files.read('DECWAR.STA'),/Invalid word-file/);
  }
});
test('Memory word files isolate buffers and both stores reject paths outside source filenames',t=>{
  const directory=mkdtempSync(join(tmpdir(),'decwar-words-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));
  for(const files of [new MemoryWordFiles(),new DiskWordFiles(directory)]){
    const words=[1n,WORD_MASK];files.write('DECWAR.STA',words);words[0]=2n;
    const loaded=files.read('DECWAR.STA')!;assert.deepEqual(loaded,[1n,-1n]);loaded[0]=3n;assert.deepEqual(files.read('DECWAR.STA'),[1n,-1n]);
    assert.throws(()=>files.read('../BAD.STA'),/Invalid source word-file name/);
    assert.throws(()=>files.write('/BAD.STA',[]),/Invalid source word-file name/);
  }
});
test('Data directory ownership excludes a second host and releases for later use',t=>{
  const directory=mkdtempSync(join(tmpdir(),'decwar-owner-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));
  const release=acquireDataDirectory(directory);assert.throws(()=>acquireDataDirectory(directory),/already in use/);
  release();release();acquireDataDirectory(directory)();assert.deepEqual(readdirSync(directory),[]);
});
