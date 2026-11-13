import { list } from '@keystone-6/core';
import { text, integer, select, relationship } from '@keystone-6/core/fields';
import { permissions, athleteScope, canFilterRelations, type Permission } from '../access';
import { trackingFields } from './trackingFields';
export const currencyCode = () => text({defaultValue:'USD', validation:{isRequired:true,match:{regex:/^[A-Z]{3}$/,explanation:'ISO 4217 currency required'}}});
export const cents = () => integer({defaultValue:0,validation:{min:0}});
export const bps = (value=0) => integer({defaultValue:value,validation:{min:0,max:10000}});
export const state = (values: string[], initial=values[0]) => select({type:'enum', options:values.map(value=>({label:value.replaceAll('_',' '),value})), defaultValue:initial, access:{create:()=>false,update:()=>false}});
// A relation may only be filtered through by a session that can read the list on the other side (and sees every client).
const readPermission: Record<string, Permission> = {Agency:'canManageOnboarding',AgentCertification:'canManageContracts',AgentPayout:'canManageCommissions',AgentPayoutEntry:'canManageCommissions',AgentSplit:'canManageCommissions',Amendment:'canManageAthletes',Athlete:'canManageAthletes',AuditEvent:'canReadAudit',Brand:'canManageEndorsements',ClientTrustAccount:'canManageTrust',ClientTrustEntry:'canManageTrust',CommissionInvoice:'canManageCommissions',CommissionInvoiceLine:'canManageCommissions',CommissionLedgerEntry:'canManageCommissions',Contact:'canManageAthletes',ContractYear:'canManageContracts',Deliverable:'canManageEndorsements',Document:'canManageAthletes',EndorsementDeal:'canManageEndorsements',ForecastSnapshot:'canManageOnboarding',Incentive:'canManageContracts',Interaction:'canManageAthletes',PlayingContract:'canManageContracts',RepresentationAgreement:'canManageContracts',ScheduledPayment:'canManageCommissions',Task:'canManageAthletes',Team:'canManageAthletes',TrustReconciliation:'canManageTrust',User:'canSeeOtherPeople'};
export const rel = (ref:string,many=false) => {
  const need = readPermission[ref.split('.')[0]];
  return relationship({ref,many,isFilterable:(args:any)=>canFilterRelations(args)&&(!need||permissions[need](args))});
};
export function domainList(fields:Record<string,any>, permission:Permission, scope?:string, immutable=false) {
  const manage = permissions[permission];
  const filter = (args:any): any => {const result=athleteScope(args); return typeof result==='boolean'||!scope ? result : scope==='self' ? result : scope.split('.').reverse().reduce((nested:any, key:string)=>({[key]:nested}),result);};
  return list({...(immutable?{graphql:{omit:{create:true,delete:true}}}:{}),access:{operation:{query:manage,create:immutable?()=>false:manage,update:immutable?()=>false:manage,delete:()=>false},...(scope?{filter:{query:filter,update:filter}}:{})},fields:{...fields,...trackingFields}});
}
