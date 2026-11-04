import { text, integer, bigInt, checkbox, timestamp, calendarDay, json } from "@keystone-6/core/fields";
import {domainList, currencyCode, cents, bps, state, rel} from "./domainFields";
export const Document = domainList({
    athlete: rel("Athlete.document_athlete", false),
    contract: rel("PlayingContract.document_contract", false),
    deal: rel("EndorsementDeal.document_deal", false),
    agreement: rel("RepresentationAgreement.document_agreement", false),
    kind: text({validation:{isRequired:true}}),
    version: integer({defaultValue:1,validation:{min:1}}),
    fileName: text(),
    mimeType: text(),
    byteSize: integer(),
    sha256: text({validation:{isRequired:true}}),
    storageKey: text({access:{read:()=>false}}),
    uploadedBy: rel("User.document_uploadedBy", false),
    verifiedAt: timestamp(),
    agentCertification_document: rel("AgentCertification.document", true),
    representationAgreement_signedDocument: rel("RepresentationAgreement.signedDocument", true),
    playingContract_document: rel("PlayingContract.document", true),
    endorsementDeal_document: rel("EndorsementDeal.document", true),
    deliverable_proof: rel("Deliverable.proof", true),
}, "canManageAthletes", 'athlete', true);
