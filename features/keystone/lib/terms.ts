/** Pure term rules shared by the draft editors, amendments and schedule generation. */
export const CONTRACT_TYPES=['rookie_scale','veteran','extension','two_way','minor_league','college_nil','other'];
export const DELIVERABLE_KINDS=['social_post','appearance','photo_shoot','commercial','autograph_session','other'];
export const PAY_SCHEDULES=['game_checks','semi_monthly','lump_sum'];
const int=(v:unknown,name:string,min=0,max=Number.MAX_SAFE_INTEGER)=>{const n=Number(v);if(!Number.isSafeInteger(n)||n<min||n>max)throw new Error(name+' must be a whole number between '+min+' and '+max);return n;};
export const parseDate=(v:unknown,name:string)=>{const d=new Date(String(v??''));if(!Number.isFinite(d.getTime()))throw new Error(name+' must be a valid date');return d;};

export function validateContractTerms(t:any){
  const contractType=String(t.contractType||'');if(!CONTRACT_TYPES.includes(contractType))throw new Error('Unknown contract type');
  const startSeason=String(t.startSeason||''),endSeason=String(t.endSeason||'');
  if(!/^\d{4}$/.test(startSeason)||!/^\d{4}$/.test(endSeason))throw new Error('Seasons must be four-digit years');
  if(Number(endSeason)<Number(startSeason)||Number(endSeason)-Number(startSeason)>14)throw new Error('End season must be within 15 seasons of the start');
  const totalValueCents=int(t.totalValueCents,'Total value'),guaranteedCents=int(t.guaranteedCents,'Guaranteed amount'),signingBonusCents=int(t.signingBonusCents,'Signing bonus');
  if(guaranteedCents>totalValueCents)throw new Error('Guaranteed amount cannot exceed total value');
  if(signingBonusCents>totalValueCents)throw new Error('Signing bonus cannot exceed total value');
  return {contractType,startSeason,endSeason,totalValueCents,guaranteedCents,signingBonusCents};
}
export function validateContractYear(y:any,startSeason:string,endSeason:string){
  const season=String(y.season||'');if(!/^\d{4}$/.test(season)||Number(season)<Number(startSeason)||Number(season)>Number(endSeason))throw new Error('Season must fall within the contract seasons');
  const baseSalaryCents=int(y.baseSalaryCents,'Base salary'),rosterBonusCents=int(y.rosterBonusCents,'Roster bonus'),workoutBonusCents=int(y.workoutBonusCents,'Workout bonus'),guaranteedCents=int(y.guaranteedCents,'Guaranteed amount');
  if(guaranteedCents>baseSalaryCents+rosterBonusCents+workoutBonusCents)throw new Error('Guaranteed amount cannot exceed the year total');
  const paySchedule=String(y.paySchedule||'');if(!PAY_SCHEDULES.includes(paySchedule))throw new Error('Unknown pay schedule');
  const payPeriods=int(y.payPeriods,'Pay periods',1,366);if(paySchedule==='lump_sum'&&payPeriods!==1)throw new Error('A lump sum is one payment');
  const firstPaymentAt=y.firstPaymentAt?parseDate(y.firstPaymentAt,'First payment date'):null;
  if(firstPaymentAt&&Math.abs(firstPaymentAt.getUTCFullYear()-Number(season))>1)throw new Error('First payment must fall in the season year or the year after');
  return {season,baseSalaryCents,rosterBonusCents,workoutBonusCents,guaranteedCents,paySchedule,payPeriods,firstPaymentAt};
}
/** Due dates for one contract year. Weekly for game checks; semi-monthly snaps to the 1st and 15th. */
export function paymentDates(schedule:string,first:Date,periods:number):Date[]{
  if(!PAY_SCHEDULES.includes(schedule)||!Number.isInteger(periods)||periods<1||periods>366||!Number.isFinite(first.getTime()))throw new Error('Invalid payment schedule');
  if(schedule==='lump_sum')return [new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth(),first.getUTCDate()))];
  return Array.from({length:periods},(_,i)=>{
    if(schedule==='game_checks')return new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth(),first.getUTCDate()+7*i));
    const k=(first.getUTCDate()>=15?1:0)+i;return new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+Math.floor(k/2),k%2===0?1:15));
  });
}
export function validateDealTerms(t:any){
  const termStart=parseDate(t.termStart,'Term start'),termEnd=parseDate(t.termEnd,'Term end');
  if(termEnd<=termStart)throw new Error('Term end must follow term start');
  const totalValueCents=int(t.totalValueCents,'Total value');
  return {termStart,termEnd,totalValueCents,paymentTerms:String(t.paymentTerms||'').trim().slice(0,300),exclusivityCategory:String(t.exclusivityCategory||'').trim().slice(0,100),territory:String(t.territory||'').trim().slice(0,100)};
}
export function validateDeliverable(d:any,termStart:Date|null,termEnd:Date|null){
  const kind=String(d.kind||'');if(!DELIVERABLE_KINDS.includes(kind))throw new Error('Unknown deliverable kind');
  const dueAt=parseDate(d.dueAt,'Due date');
  if(termStart&&dueAt<termStart||termEnd&&dueAt>termEnd)throw new Error('Deliverable must be due within the deal term');
  return {kind,dueAt,notes:String(d.notes||'').trim().slice(0,500)};
}
