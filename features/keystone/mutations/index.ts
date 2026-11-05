import { mergeSchemas } from "@graphql-tools/schema";
import type { GraphQLSchema } from 'graphql';
import {userFacingAll} from '../lib/userFacing';
import redirectToInit from "./redirectToInit";
import {agencyTypeDefs,agencyMutations,agencyQueries} from './agency';
import {requestManagerApproval,decideManagerApproval} from '../utils/managerApproval';
import ensureOnboardingRecord from './ensureOnboardingRecord';
import updateActiveUser from './updateActiveUser';
import {refundTypeDefs,refundMutations} from './refunds';
import {crmTypeDefs,crmMutations} from './crm';
import {documentTypeDefs,documentMutations} from './documents';
import {termsTypeDefs,termsMutations} from './terms';
import {conversionTypeDefs,conversionQueries,conversionMutations} from './conversion';
import {lifecycleTypeDefs,lifecycleMutations} from './lifecycle';
import {closeOutTypeDefs,closeOutMutations} from './closeOut';
import {certificationTypeDefs,certificationMutations} from './certifications';
import {profileTypeDefs,profileMutations} from './profile';
import {directoryTypeDefs,directoryMutations} from './directory';
import {payoutTypeDefs,payoutQueries,payoutMutations,voidMutations} from './payouts';
import {dealScheduleTypeDefs,dealScheduleQueries,dealScheduleMutations} from './dealSchedule';
import {forecastTypeDefs,forecastQueries,forecastMutations} from './forecast';
import {agingTypeDefs,agingQueries,agingMutations} from './aging';
import {prospectTypeDefs,prospectMutations,lostMutations} from './prospects';
import {draftingTypeDefs,draftingMutations} from './drafting';
import {reconcileTypeDefs,reconcileQueries,reconcileMutations} from './reconcile';
import {portalTypeDefs,portalQueries,portalMutations} from './portal';

const graphql = String.raw;

export function extendGraphqlSchema(baseSchema: GraphQLSchema) {
  return mergeSchemas({
    schemas: [baseSchema],
    typeDefs: graphql`
      type Query {
        redirectToInit: Boolean
      }
    ` + agencyTypeDefs + dealScheduleTypeDefs + forecastTypeDefs + refundTypeDefs + crmTypeDefs + documentTypeDefs + termsTypeDefs + reconcileTypeDefs + draftingTypeDefs + prospectTypeDefs + lifecycleTypeDefs + closeOutTypeDefs + agingTypeDefs + payoutTypeDefs + directoryTypeDefs + profileTypeDefs + certificationTypeDefs + conversionTypeDefs + portalTypeDefs + `
      extend type Mutation { ensureOnboardingRecord(entity:String!,data:AgencyJSON!):AgencyJSON! updateActiveUser(data:AgencyJSON!):AgencyJSON! }
    `,
    resolvers: {
      Query: userFacingAll({ 
        redirectToInit, ...agencyQueries, ...portalQueries,...reconcileQueries,...conversionQueries,...agingQueries,...forecastQueries,...dealScheduleQueries,...payoutQueries,
      }),
      Mutation: userFacingAll({...agencyMutations,...forecastMutations,...dealScheduleMutations,...refundMutations,...crmMutations,...documentMutations,...termsMutations,...reconcileMutations,...draftingMutations,...prospectMutations,...lifecycleMutations,...closeOutMutations,...agingMutations,...payoutMutations,...voidMutations,...directoryMutations,...profileMutations,...certificationMutations,...conversionMutations,...lostMutations,...portalMutations,ensureOnboardingRecord,updateActiveUser,requestManagerApproval,decideManagerApproval}),
    },
  });
}