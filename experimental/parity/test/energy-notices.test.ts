import test from 'node:test';
import assert from 'node:assert/strict';
import { energyNotices, noticeChecks, noticeSequence, type NoticeStep } from '../energy-notices.ts';
import type { ShipStatus } from '../../automated-player/observations.ts';

function step(index: number): NoticeStep {
  const b = [0,1,1,2,2,2,3,3][index], a = [1,1,2,2,2,3,3,4][index];
  const state = (energy: number, h: number): ShipStatus => ({energy,position:{v:7,h},shieldsUp:true,shieldPercent:100,hullDamage:0,torpedoes:10,condition:'Green',docked:false,stardate:10,observedAt:1});
  const notice = a !== b ? 'Yorktown  transfers 9.0 units of energy to the  Vulcan \r\n' : '';
  return {label:noticeSequence[index][0],command:noticeSequence[index][1],response:'',
    before:{donor:{status:state(5000-b*10,2),text:''},receiver:{status:state(4952+b*9,3),text:''}},
    after:{donor:{status:state(5000-a*10,2),text:''},receiver:{status:state(4952+a*9,3),text:`Radio\t\t${index===1||index===2?'Off':'On'}\r\n\r\n${notice}`}}};
}
test('ENERGY notices remain required with RADIO OFF and sender gagging', () => {
  for(let i=0;i<8;i++) assert.ok(Object.values(noticeChecks(step(i),i)).every(Boolean));
  for(const i of [2,5]) {
    const s=step(i);s.after.receiver.text=s.after.receiver.text.replace(/Yorktown[^\r\n]*\r\n/,'');
    assert.equal(noticeChecks(s,i).receiverNotices,false);
  }
});
test('Notice checks retain exact whitespace, numeric content, duplicates and recipient direction', () => {
  const s=step(0);s.after.receiver.text=s.after.receiver.text.replace('Yorktown  transfers','Yorktown transfers');
  assert.equal(noticeChecks(s,0).receiverNotices,false);
  const duplicate=step(0);duplicate.after.receiver.text+=energyNotices(duplicate.after.receiver.text)[0];
  assert.equal(noticeChecks(duplicate,0).receiverNotices,false);
  const wrong=step(0);wrong.after.donor.text=energyNotices(wrong.after.receiver.text)[0];
  assert.equal(noticeChecks(wrong,0).donorNotices,false);
  wrong.after.receiver.status.energy+=1;
  assert.equal(noticeChecks(wrong,0).energy,false);
});
