import { mergeSchemas } from "@graphql-tools/schema";
import type { GraphQLSchema } from 'graphql';
import redirectToInit from "./redirectToInit";
import {agencyTypeDefs,agencyMutations,agencyQueries} from './agency';
import {requestManagerApproval,decideManagerApproval} from '../utils/managerApproval';
import ensureOnboardingRecord from './ensureOnboardingRecord';
import updateActiveUser from './updateActiveUser';
import {refundTypeDefs,refundMutations} from './refunds';
import {crmTypeDefs,crmMutations} from './crm';
import {documentTypeDefs,documentMutations} from './documents';
import {termsTypeDefs,termsMutations} from './terms';
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
    ` + agencyTypeDefs + refundTypeDefs + crmTypeDefs + documentTypeDefs + termsTypeDefs + reconcileTypeDefs + draftingTypeDefs + prospectTypeDefs + portalTypeDefs + `
      extend type Mutation { ensureOnboardingRecord(entity:String!,data:AgencyJSON!):AgencyJSON! updateActiveUser(data:AgencyJSON!):AgencyJSON! }
    `,
    resolvers: {
      Query: { 
        redirectToInit, ...agencyQueries, ...portalQueries,...reconcileQueries,
      },
      Mutation: {...agencyMutations,...refundMutations,...crmMutations,...documentMutations,...termsMutations,...reconcileMutations,...draftingMutations,...prospectMutations,...lostMutations,...portalMutations,ensureOnboardingRecord,updateActiveUser,requestManagerApproval,decideManagerApproval},
    },
  });
}