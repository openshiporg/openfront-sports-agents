import { mergeSchemas } from "@graphql-tools/schema";
import type { GraphQLSchema } from 'graphql';
import redirectToInit from "./redirectToInit";
import {agencyTypeDefs,agencyMutations,agencyQueries} from './agency';
import {requestManagerApproval,decideManagerApproval} from '../utils/managerApproval';
import ensureOnboardingRecord from './ensureOnboardingRecord';
import updateActiveUser from './updateActiveUser';
import {portalTypeDefs,portalQueries,portalMutations} from './portal';

const graphql = String.raw;

export function extendGraphqlSchema(baseSchema: GraphQLSchema) {
  return mergeSchemas({
    schemas: [baseSchema],
    typeDefs: graphql`
      type Query {
        redirectToInit: Boolean
      }
    ` + agencyTypeDefs + portalTypeDefs + `
      extend type Mutation { ensureOnboardingRecord(entity:String!,data:AgencyJSON!):AgencyJSON! updateActiveUser(data:AgencyJSON!):AgencyJSON! }
    `,
    resolvers: {
      Query: { 
        redirectToInit, ...agencyQueries, ...portalQueries,
      },
      Mutation: {...agencyMutations,...portalMutations,ensureOnboardingRecord,updateActiveUser,requestManagerApproval,decideManagerApproval},
    },
  });
}