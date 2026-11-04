import {command,audit,lockTransactionKey} from '../lib/agencyCommand';
import {validateProfile,profileChanges} from '../lib/profile';
import {DomainError} from '../lib/errors';

export const profileMutations={
 /** Edits an athlete's profile (position, team, birth date, contact details, social handles, follower counts, marketability notes).
  *  Scoped to the athlete's agents, idempotent, audited with before and after. A team name that does not exist is created once. */
 async updateAthleteProfile(_:unknown,a:any,c:any){
  const v=validateProfile(a);
  return command(c,'canManageAthletes',String(a.athleteId||''),'updateAthleteProfile',a,async tx=>{
   const before=await tx.athlete.findUnique({where:{id:a.athleteId},include:{team:{select:{id:true,name:true}}}});if(!before)throw new DomainError('Athlete not found');
   let teamId:string|null=before.teamId;
   if(v.teamName){
    await lockTransactionKey(tx,'team:'+(before.league||'')+':'+v.teamName.toLowerCase());
    const found=await tx.team.findFirst({where:{name:{equals:v.teamName,mode:'insensitive'},league:String(before.league||'')}});
    teamId=found?found.id:(await tx.team.create({data:{name:v.teamName,league:String(before.league||'')}})).id;
   }else if(v.teamId){
    if(!await tx.team.findUnique({where:{id:v.teamId},select:{id:true}}))throw new DomainError('Team not found');teamId=v.teamId;
   }else if(a.clearTeam===true)teamId=null;
   const next={preferredName:v.preferredName,position:v.position,email:v.email,phone:v.phone,dateOfBirth:v.dateOfBirth?new Date(v.dateOfBirth+'T00:00:00Z'):null,marketabilityNotes:v.marketabilityNotes,socialHandles:v.socialHandles,followerCounts:v.followerCounts,teamId};
   const cur={preferredName:before.preferredName,position:before.position,email:before.email,phone:before.phone,dateOfBirth:before.dateOfBirth,marketabilityNotes:before.marketabilityNotes,socialHandles:before.socialHandles??{},followerCounts:before.followerCounts??{},teamId:before.teamId};
   const diff=profileChanges(cur,next);if(!diff.fields.length)throw new DomainError('Nothing changed');
   const guard=await tx.athlete.updateMany({where:{id:before.id,updatedAt:before.updatedAt},data:next as any});if(guard.count!==1)throw new DomainError('This profile was changed by someone else; reload and try again');
   await audit(tx,c,'athlete.profile_updated','Athlete',before.id,JSON.parse(JSON.stringify(diff.before)),JSON.parse(JSON.stringify(diff.after)),a.idempotencyKey);
   return {id:before.id,changed:diff.fields};
  });
 },
};
export const profileTypeDefs=`
 extend type Mutation {
  updateAthleteProfile(athleteId:ID!,preferredName:String,position:String,email:String,phone:String,dateOfBirth:String,marketabilityNotes:String,social:AgencyJSON,followers:AgencyJSON,teamId:ID,teamName:String,clearTeam:Boolean,idempotencyKey:String!):AgencyJSON!
 }`;
